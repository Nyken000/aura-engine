import test from "node:test";
import assert from "node:assert/strict";

import {
    processEngineStream,
    readStreamResponse,
    type CharacterRecord,
    type CharacterUpdatePatch,
    type EngineStreamModelGateway,
    type EngineStreamRepository,
    type NarrativeEventInsert,
    type NarrativeEventRow,
    type PersistCombatEventsParams,
    type PersistCombatEventsResult,
    type RuleMatchRecord,
} from "./stream-runtime";
import {
    persistSessionCombatEvents,
} from "@/server/combat/session-combat-events";
import type {
    JsonObject,
    SessionCombatParticipant,
    SessionCombatStateRecord,
    SessionPlayerRow,
} from "@/server/combat/session-combat";
import type { SessionCombatTransitionEvent } from "@/server/combat/session-combat-transitions";

type InsertRow = {
    event_type: string;
    content: string;
    payload?: JsonObject;
};

function createModelGatewayFromText(
    fullText: string,
    chunkSize = 120,
): EngineStreamModelGateway {
    return {
        async generateContentStream() {
            async function* stream() {
                for (let index = 0; index < fullText.length; index += chunkSize) {
                    const chunk = fullText.slice(index, index + chunkSize);
                    yield {
                        text() {
                            return chunk;
                        },
                    };
                }
            }

            return stream();
        },
    };
}

function buildCombatEventSupabaseDouble(rows: InsertRow[]) {
    return {
        from(table: string) {
            assert.equal(table, "narrative_events");
            return {
                insert: async (insertRows: InsertRow[]) => {
                    rows.push(...insertRows);
                    return { error: null };
                },
            };
        },
    };
}

class FakeEngineStreamRepository implements EngineStreamRepository {
    character: CharacterRecord;
    recentSessionEvents: NarrativeEventRow[] = [];
    recentCharacterEvents: NarrativeEventRow[] = [];
    sessionPlayers: SessionPlayerRow[] = [];
    sessionCombatState: SessionCombatStateRecord | null = null;
    relevantRules: RuleMatchRecord[] = [];

    narrativeEvents: NarrativeEventInsert[] = [];
    characterUpdates: Array<{ characterId: string; patch: CharacterUpdatePatch }> = [];
    participantSnapshots: Array<{
        sessionId: string;
        participants: SessionCombatParticipant[];
    }> = [];
    upsertedCombatStates: SessionCombatStateRecord[] = [];
    combatTransitions: Array<{
        sessionId: string;
        combatState: SessionCombatStateRecord;
        turnPlayerId: string | null;
        turnAdvancedEvent?: SessionCombatTransitionEvent;
    }> = [];
    tacticalRows: InsertRow[] = [];

    constructor(params: {
        character: CharacterRecord;
        sessionPlayers?: SessionPlayerRow[];
        sessionCombatState?: SessionCombatStateRecord | null;
        recentSessionEvents?: NarrativeEventRow[];
        recentCharacterEvents?: NarrativeEventRow[];
    }) {
        this.character = params.character;
        this.sessionPlayers = params.sessionPlayers ?? [];
        this.sessionCombatState = params.sessionCombatState ?? null;
        this.recentSessionEvents = params.recentSessionEvents ?? [];
        this.recentCharacterEvents = params.recentCharacterEvents ?? [];
    }

    async getCharacterWithWorld(characterId: string) {
        return this.character.id === characterId ? this.character : null;
    }

    async getRecentSessionEvents() {
        return this.recentSessionEvents;
    }

    async getRecentCharacterEvents() {
        return this.recentCharacterEvents;
    }

    async getSessionPlayers() {
        return this.sessionPlayers;
    }

    async getSessionCombatState() {
        return this.sessionCombatState;
    }

    async searchRelevantRules() {
        return this.relevantRules;
    }

    async insertNarrativeEvents(rows: NarrativeEventInsert[]) {
        this.narrativeEvents.push(...rows);
    }

    async updateCharacter(characterId: string, patch: CharacterUpdatePatch) {
        this.characterUpdates.push({ characterId, patch });

        if (this.character.id === characterId) {
            this.character = {
                ...this.character,
                ...(typeof patch.hp_current === "number"
                    ? { hp_current: patch.hp_current }
                    : {}),
                ...(patch.inventory ? { inventory: patch.inventory } : {}),
                ...(patch.combat_state ? { combat_state: patch.combat_state } : {}),
            };
        }
    }

    async updateSessionCombatParticipants(
        sessionId: string,
        participants: SessionCombatParticipant[],
    ) {
        this.participantSnapshots.push({
            sessionId,
            participants: participants.map((participant) => ({
                ...participant,
                conditions: Array.isArray(participant.conditions)
                    ? participant.conditions.map((condition) => ({ ...condition }))
                    : [],
            })),
        });

        if (this.sessionCombatState) {
            this.sessionCombatState = {
                ...this.sessionCombatState,
                participants: participants.map((participant) => ({
                    ...participant,
                    conditions: Array.isArray(participant.conditions)
                        ? participant.conditions.map((condition) => ({ ...condition }))
                        : [],
                })),
            };
        }
    }

    async upsertSessionCombatState(state: SessionCombatStateRecord) {
        this.upsertedCombatStates.push(state);
        this.sessionCombatState = state;
    }

    async persistCombatTransition(params: {
        sessionId: string;
        combatState: SessionCombatStateRecord;
        turnPlayerId: string | null;
        turnAdvancedEvent?: SessionCombatTransitionEvent;
    }) {
        this.combatTransitions.push(params);
        this.sessionCombatState = params.combatState;
    }

    async persistCombatEvents(
        params: PersistCombatEventsParams,
    ): Promise<PersistCombatEventsResult> {
        const result = await persistSessionCombatEvents({
            supabase: buildCombatEventSupabaseDouble(this.tacticalRows) as never,
            worldId: params.worldId,
            characterId: params.characterId,
            sessionId: params.sessionId,
            resolution: params.resolution,
            currentState: params.currentState,
            actingParticipant: params.actingParticipant,
        });

        this.sessionCombatState = result.combatState;

        return result;
    }
}

class ConcurrentDuplicateRepository extends FakeEngineStreamRepository {
    private insertedClientEventIds = new Set<string>();
    private firstInsertGate: Promise<void> | null = null;
    private releaseFirstInsert: (() => void) | null = null;

    async insertNarrativeEvents(rows: NarrativeEventInsert[]) {
        const firstRow = rows[0];
        const clientEventId = firstRow?.client_event_id ?? null;

        if (!clientEventId) {
            await super.insertNarrativeEvents(rows);
            return;
        }

        if (this.insertedClientEventIds.has(clientEventId)) {
            throw new Error(
                'duplicate key value violates unique constraint "uq_narrative_events_session_client_event_id" for client_event_id',
            );
        }

        this.insertedClientEventIds.add(clientEventId);

        if (!this.firstInsertGate) {
            this.firstInsertGate = new Promise<void>((resolve) => {
                this.releaseFirstInsert = resolve;
            });

            await this.firstInsertGate;
        }

        await super.insertNarrativeEvents(rows);
    }

    unblockFirstInsert() {
        this.releaseFirstInsert?.();
    }
}

function buildCharacter(): CharacterRecord {
    return {
        id: "char-1",
        user_id: "user-1",
        name: "Kael",
        campaign_id: null,
        hp_current: 20,
        hp_max: 20,
        inventory: [{ name: "Espada larga", type: "weapon" }],
        stats: {
            dex: 14,
            str: 16,
            con: 14,
            int: 10,
            wis: 12,
            cha: 11,
            race: "Humano",
            class: "Guerrero",
        },
        worlds: {
            id: "world-1",
            name: "Eldoria",
            description: "Un reino en guerra.",
        },
        combat_state: null,
    };
}

function buildSessionPlayers(): SessionPlayerRow[] {
    return [
        {
            user_id: "user-1",
            profiles: { username: "eskdr" },
            characters: {
                id: "char-1",
                name: "Kael",
                hp_current: 20,
                hp_max: 20,
                stats: { dex: 14 },
                inventory: [{ name: "Espada larga" }],
            },
        },
        {
            user_id: "user-2",
            profiles: { username: "lyra" },
            characters: {
                id: "char-2",
                name: "Lyra",
                hp_current: 18,
                hp_max: 18,
                stats: { dex: 16 },
                inventory: [{ name: "Báculo" }],
            },
        },
    ];
}

function buildActiveCombatState(): SessionCombatStateRecord {
    return {
        session_id: "session-1",
        status: "active",
        round: 2,
        turn_index: 0,
        participants: [
            {
                id: "player:user-1",
                user_id: "user-1",
                character_id: "char-1",
                name: "Kael",
                hp: 20,
                max_hp: 20,
                ac: 15,
                initiative: 17,
                is_player: true,
                is_defeated: false,
                conditions: [],
            },
            {
                id: "player:user-2",
                user_id: "user-2",
                character_id: "char-2",
                name: "Lyra",
                hp: 18,
                max_hp: 18,
                ac: 14,
                initiative: 15,
                is_player: true,
                is_defeated: false,
                conditions: [],
            },
            {
                id: "enemy:Goblin Captain:0",
                name: "Goblin Captain",
                hp: 22,
                max_hp: 22,
                ac: 13,
                initiative: 12,
                is_player: false,
                is_defeated: false,
                conditions: [],
            },
        ],
    };
}

test("stream runtime persists tactical events, character HP sync and shared participant snapshot", async () => {
    const repository = new FakeEngineStreamRepository({
        character: buildCharacter(),
        sessionPlayers: buildSessionPlayers(),
        sessionCombatState: buildActiveCombatState(),
    });

    const modelGateway = createModelGatewayFromText(
        JSON.stringify({
            narrative_response:
                "El capitán goblin apuñala a Kael y el veneno corre por la herida.",
            dice_roll_required: { needed: false },
            state_changes: { hp_delta: 0, inventory_added: [], inventory_removed: [] },
            combat: null,
            combat_events: {
                damage_applied: {
                    actor: {
                        participant_id: "enemy:Goblin Captain:0",
                        name: "Goblin Captain",
                    },
                    target: {
                        participant_id: "player:user-1",
                        character_id: "char-1",
                        name: "Kael",
                    },
                    amount: 6,
                    damage_type: "piercing",
                    summary: "Kael recibe una puñalada precisa.",
                },
                condition_applied: {
                    actor: {
                        participant_id: "enemy:Goblin Captain:0",
                        name: "Goblin Captain",
                    },
                    target: {
                        participant_id: "player:user-1",
                        character_id: "char-1",
                        name: "Kael",
                    },
                    condition_name: "Envenenado",
                    duration_rounds: 2,
                    source: "Daga envenenada",
                    summary: "El filo deja un veneno activo en la herida.",
                },
            },
        }),
    );

    const response = await processEngineStream({
        repository,
        modelGateway,
        userId: "user-1",
        body: {
            characterId: "char-1",
            content: "Ataco al capitán goblin.",
            sessionId: "session-1",
            clientEventId: "client-event-1",
        },
    });

    assert.equal(response.status, 200);


    const bodyText = await readStreamResponse(response);
    assert.match(bodyText, /"done":true/);

    assert.equal(repository.narrativeEvents.length, 2);
    assert.equal(repository.narrativeEvents[0].event_type, "player_message");
    assert.equal(repository.narrativeEvents[1].event_type, "gm_message");

    assert.deepEqual(
        repository.tacticalRows.map((row) => row.event_type),
        ["damage_applied", "condition_applied"],
    );

    const hpPatch = repository.characterUpdates.find(
        (update) =>
            update.characterId === "char-1" && update.patch.hp_current === 14,
    );
    assert.ok(hpPatch);

    assert.equal(repository.participantSnapshots.length, 1);
    const updatedKael = repository.participantSnapshots[0].participants.find(
        (participant) => participant.character_id === "char-1",
    );
    assert.equal(updatedKael?.hp, 14);
    assert.deepEqual(updatedKael?.conditions, [
        {
            id: 'envenenado',
            name: "Envenenado",
            source: "Daga envenenada",
            duration_rounds: 2,
            applied_by_participant_id: 'enemy:Goblin Captain:0',
            applied_at_round: 2,
            summary: 'El filo deja un veneno activo en la herida.'
        },
    ]);
});

test("stream runtime marks combat as ended when combat_events resolves the encounter", async () => {
    const repository = new FakeEngineStreamRepository({
        character: buildCharacter(),
        sessionPlayers: buildSessionPlayers(),
        sessionCombatState: buildActiveCombatState(),
    });

    const modelGateway = createModelGatewayFromText(
        JSON.stringify({
            narrative_response:
                "El último goblin cae y el campo de batalla queda en silencio.",
            dice_roll_required: { needed: false },
            state_changes: { hp_delta: 0, inventory_added: [], inventory_removed: [] },
            combat: { end: true, start: false, participants: [], turn_index: 0, round: 3 },
            combat_events: {
                combat_ended: {
                    winner_side: "players",
                    reason: "Todos los enemigos fueron derrotados",
                    summary: "Los aventureros aseguran la zona.",
                },
            },
        }),
    );

    const response = await processEngineStream({
        repository,
        modelGateway,
        userId: "user-1",
        body: {
            characterId: "char-1",
            content: "Remato al último goblin.",
            sessionId: "session-1",
            clientEventId: "client-event-2",
        },
    });

    assert.equal(response.status, 200);


    const bodyText = await readStreamResponse(response);
    assert.match(bodyText, /"combat_ended":true/);

    assert.equal(repository.narrativeEvents.length, 2);
    assert.equal(repository.tacticalRows.length, 1);
    assert.equal(repository.tacticalRows[0].event_type, "combat_ended");

    assert.equal(repository.participantSnapshots.length, 1);
    assert.equal(repository.participantSnapshots[0].participants.length, 3);

    const combatState = repository.sessionCombatState;
    assert.ok(combatState);
    assert.equal(combatState?.status, "ended");
});

test("stream runtime requests dice roll when the model asks for it", async () => {
    const repository = new FakeEngineStreamRepository({
        character: buildCharacter(),
    });

    const modelGateway = createModelGatewayFromText(
        JSON.stringify({
            narrative_response:
                "La cerradura parece compleja. Necesitas una tirada para abrirla.",
            state_changes: { hp_delta: 0, inventory_added: [], inventory_removed: [] },
            dice_roll_required: {
                needed: true,
                stat: "dex",
                skill: "lockpicking",
                dc: 15,
                reason: "Abrir una cerradura fina y antigua.",
            },
            combat: null,
            combat_events: null,
        }),
    );

    const response = await processEngineStream({
        repository,
        modelGateway,
        userId: "user-1",
        body: {
            characterId: "char-1",
            content: "Intento abrir la puerta.",
            clientEventId: "client-event-3",
        },
    });

    assert.equal(response.status, 200);


    const bodyText = await readStreamResponse(response);
    assert.match(bodyText, /"done":true/);

    assert.equal(repository.narrativeEvents.length, 2);
    const assistantEvent = repository.narrativeEvents[1];
    assert.equal(assistantEvent.event_type, "gm_message");
    assert.deepEqual(assistantEvent.dice_roll_required, {
        needed: true,
        stat: "dex",
        skill: "lockpicking",
        dc: 15,
        reason: "Abrir una cerradura fina y antigua.",
    });
});

test("stream runtime applies hp and inventory changes outside session combat", async () => {
    const repository = new FakeEngineStreamRepository({
        character: buildCharacter(),
    });

    const modelGateway = createModelGatewayFromText(
        JSON.stringify({
            narrative_response:
                "Bebes una poción, recuperas fuerzas y encuentras una llave pequeña.",
            state_changes: {
                hp_delta: 4,
                inventory_added: ["Llave de hierro"],
                inventory_removed: ["Poción"],
            },
            dice_roll_required: { needed: false },
            combat: null,
            combat_events: null,
        }),
    );

    repository.character.inventory = [
        { name: "Poción de curación", type: "consumable" },
        { name: "Espada larga", type: "weapon" },
    ];
    repository.character.hp_current = 10;

    const response = await processEngineStream({
        repository,
        modelGateway,
        userId: "user-1",
        body: {
            characterId: "char-1",
            content: "Bebo una poción y reviso el cofre.",
            clientEventId: "client-event-4",
        },
    });

    assert.equal(response.status, 200);


    const bodyText = await readStreamResponse(response);
    assert.match(bodyText, /"done":true/);

    assert.equal(repository.narrativeEvents.length, 2);

    const hpAndInventoryPatch = repository.characterUpdates.find(
        (update) =>
            update.characterId === "char-1" &&
            update.patch.hp_current === 14 &&
            Array.isArray(update.patch.inventory),
    );

    assert.ok(hpAndInventoryPatch);
    assert.deepEqual(hpAndInventoryPatch?.patch.inventory, [
        { name: "Espada larga", type: "weapon" },
        { name: "Llave de hierro", type: "item" },
    ]);
});

test("stream runtime creates local combat state when the model starts combat outside session mode", async () => {
    const repository = new FakeEngineStreamRepository({
        character: buildCharacter(),
    });

    const modelGateway = createModelGatewayFromText(
        JSON.stringify({
            narrative_response:
                "Tres bandidos saltan desde la maleza. ¡Comienza el combate!",
            state_changes: { hp_delta: 0, inventory_added: [], inventory_removed: [] },
            dice_roll_required: { needed: false },
            combat: {
                start: true,
                end: false,
                round: 1,
                turn_index: 0,
                participants: [
                    {
                        name: "Bandido 1",
                        hp: 12,
                        max_hp: 12,
                        ac: 12,
                        initiative: 14,
                    },
                    {
                        name: "Bandido 2",
                        hp: 12,
                        max_hp: 12,
                        ac: 12,
                        initiative: 11,
                    },
                ],
            },
            combat_events: null,
        }),
    );

    const response = await processEngineStream({
        repository,
        modelGateway,
        userId: "user-1",
        body: {
            characterId: "char-1",
            content: "Avanzo por el sendero del bosque.",
            clientEventId: "client-event-5",
        },
    });

    assert.equal(response.status, 200);
    await readStreamResponse(response);

    const combatPatch = repository.characterUpdates.find(
        (update) =>
            update.characterId === "char-1" && !!update.patch.combat_state,
    );

    assert.ok(combatPatch);
    assert.deepEqual(combatPatch?.patch.combat_state, {
        in_combat: true,
        round: 1,
        turn: 0,
        participants: [
            {
                name: "Bandido 1",
                hp: 12,
                max_hp: 12,
                ac: 12,
                initiative: 14,
                is_player: false,
                is_defeated: false,
            },
            {
                name: "Bandido 2",
                hp: 12,
                max_hp: 12,
                ac: 12,
                initiative: 11,
                is_player: false,
                is_defeated: false,
            },
        ],
    });
});

test("stream runtime advances shared session turn only on explicit system marker", async () => {
    const repository = new FakeEngineStreamRepository({
        character: buildCharacter(),
        sessionPlayers: buildSessionPlayers(),
        sessionCombatState: buildActiveCombatState(),
        recentSessionEvents: [],
    });

    const modelGateway = createModelGatewayFromText(
        JSON.stringify({
            narrative_response:
                "Kael se reposiciona y deja una apertura para Lyra.",
            state_changes: { hp_delta: 0, inventory_added: [], inventory_removed: [] },
            dice_roll_required: { needed: false },
            combat: null,
            combat_events: null,
        }),
    );

    const markerResponse = await processEngineStream({
        repository,
        modelGateway,
        userId: "user-1",
        body: {
            characterId: "char-1",
            content: "[SISTEMA_TURNO_SIGUIENTE]",
            sessionId: "session-1",
            clientEventId: "client-event-turn-1",
        },
    });

    assert.equal(markerResponse.status, 200);
    assert.equal(repository.combatTransitions.length, 1);

    const turnTransition = repository.combatTransitions[0];
    assert.equal(turnTransition.sessionId, "session-1");
    assert.equal(turnTransition.turnPlayerId, "user-2");
    assert.equal(turnTransition.combatState.turn_index, 1);
    assert.equal(turnTransition.combatState.round, 2);
    assert.deepEqual(turnTransition.turnAdvancedEvent?.payload, {
        sender_name: "Sistema",
        combat_turn: 1,
        round: 2,
    });
});

test("stream runtime registers initiative in shared session state", async () => {
    const initiativeState: SessionCombatStateRecord = {
        session_id: "session-1",
        status: "initiative",
        round: 1,
        turn_index: 0,
        participants: [
            {
                id: "player:user-1",
                user_id: "user-1",
                character_id: "char-1",
                name: "Kael",
                hp: 20,
                max_hp: 20,
                ac: 15,
                initiative: null,
                is_player: true,
                is_defeated: false,
                conditions: [],
            },
            {
                id: "player:user-2",
                user_id: "user-2",
                character_id: "char-2",
                name: "Lyra",
                hp: 18,
                max_hp: 18,
                ac: 14,
                initiative: 16,
                is_player: true,
                is_defeated: false,
                conditions: [],
            },
            {
                id: "enemy:Bandit Captain:0",
                name: "Bandit Captain",
                hp: 30,
                max_hp: 30,
                ac: 14,
                initiative: 5,
                is_player: false,
                is_defeated: false,
                conditions: [],
            },
        ],
    };

    const repository = new FakeEngineStreamRepository({
        character: buildCharacter(),
        sessionPlayers: buildSessionPlayers(),
        sessionCombatState: initiativeState,
        recentSessionEvents: [],
    });

    const modelGateway = createModelGatewayFromText(
        JSON.stringify({
            narrative_response: "No debería llamarse en esta ruta.",
            state_changes: { hp_delta: 0, inventory_added: [], inventory_removed: [] },
            dice_roll_required: { needed: false },
            combat: null,
            combat_events: null,
        }),
    );

    const response = await processEngineStream({
        repository,
        modelGateway,
        userId: "user-1",
        body: {
            characterId: "char-1",
            content: "[SISTEMA_INICIATIVA: 18]",
            sessionId: "session-1",
            clientEventId: "client-event-init-1",
        },
    });

    assert.equal(response.status, 200);
    await readStreamResponse(response);
    assert.equal(repository.combatTransitions.length, 1);

    const transition = repository.combatTransitions[0];
    assert.equal(transition.combatState.status, "active");
    assert.equal(transition.combatState.turn_index, 0);
    assert.equal(transition.turnPlayerId, "user-1");

    const initiatives = transition.combatState.participants.map((participant) => ({
        id: participant.id,
        initiative: participant.initiative,
    }));

    assert.deepEqual(initiatives[0], {
        id: "player:user-1",
        initiative: 18,
    });
});

test("stream runtime detects duplicate session client_event_id before inserting", async () => {
    const repository = new FakeEngineStreamRepository({
        character: buildCharacter(),
        sessionPlayers: buildSessionPlayers(),
        sessionCombatState: buildActiveCombatState(),
        recentSessionEvents: [
            {
                id: "evt-1",
                session_id: "session-1",
                role: "user",
                content: "Mensaje duplicado",
                client_event_id: "client-dup-1",
                event_index: 42,
            },
        ],
    });

    const modelGateway = createModelGatewayFromText(
        JSON.stringify({
            narrative_response: "No debería generarse.",
            state_changes: { hp_delta: 0, inventory_added: [], inventory_removed: [] },
            dice_roll_required: { needed: false },
            combat: null,
            combat_events: null,
        }),
    );

    const response = await processEngineStream({
        repository,
        modelGateway,
        userId: "user-1",
        body: {
            characterId: "char-1",
            content: "Mensaje duplicado",
            sessionId: "session-1",
            clientEventId: "client-dup-1",
        },
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
        ok: boolean;
        duplicate?: boolean;
        system_only?: boolean;
    };

    assert.equal(payload.ok, true);
    assert.equal(payload.duplicate, true);
    assert.equal(payload.system_only, true);
    assert.equal(repository.narrativeEvents.length, 0);
});

test("stream runtime tolerates concurrent duplicate insert races via unique constraint handling", async () => {
    const repository = new ConcurrentDuplicateRepository({
        character: buildCharacter(),
        sessionPlayers: buildSessionPlayers(),
        sessionCombatState: buildActiveCombatState(),
        recentSessionEvents: [],
    });

    const modelGateway = createModelGatewayFromText(
        JSON.stringify({
            narrative_response: "Respuesta narrativa válida.",
            state_changes: { hp_delta: 0, inventory_added: [], inventory_removed: [] },
            dice_roll_required: { needed: false },
            combat: null,
            combat_events: null,
        }),
    );

    const firstRequest = processEngineStream({
        repository,
        modelGateway,
        userId: "user-1",
        body: {
            characterId: "char-1",
            content: "Ataco al objetivo.",
            sessionId: "session-1",
            clientEventId: "client-race-1",
        },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const secondRequest = processEngineStream({
        repository,
        modelGateway,
        userId: "user-1",
        body: {
            characterId: "char-1",
            content: "Ataco al objetivo.",
            sessionId: "session-1",
            clientEventId: "client-race-1",
        },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    repository.unblockFirstInsert();

    const [firstResponse, secondResponse] = await Promise.all([
        firstRequest,
        secondRequest,
    ]);

    assert.equal(firstResponse.status, 200);
    assert.equal(secondResponse.status, 200);

    const firstBody = await readStreamResponse(firstResponse);
    assert.match(firstBody, /"done":true/);

    const secondPayload = (await secondResponse.json()) as {
        ok: boolean;
        duplicate?: boolean;
        system_only?: boolean;
    };
    assert.equal(secondPayload.ok, true);
    assert.equal(secondPayload.duplicate, true);
    assert.equal(secondPayload.system_only, true);

    assert.equal(repository.narrativeEvents.length, 2);
    assert.equal(repository.narrativeEvents[0].client_event_id, "client-race-1");
    assert.notEqual(repository.narrativeEvents[1].client_event_id, "client-race-1");
});

test("stream runtime resolves persisted dice results without asking for another roll", async () => {
    const repository = new FakeEngineStreamRepository({
        character: buildCharacter(),
    });

    let promptObserved = "";

    const modelGateway: EngineStreamModelGateway = {
        async generateContentStream({ prompt }) {
            promptObserved = prompt;
            async function* stream() {
                yield {
                    text() {
                        return JSON.stringify({
                            narrative_response:
                                "La ganzúa cede y la cerradura se abre con un clic seco.",
                            state_changes: {
                                hp_delta: 0,
                                inventory_added: [],
                                inventory_removed: [],
                            },
                            dice_roll_required: { needed: false },
                            combat: null,
                            combat_events: null,
                        });
                    },
                };
            }

            return stream();
        },
    };

    const response = await processEngineStream({
        repository,
        modelGateway,
        userId: "user-1",
        body: {
            characterId: "char-1",
            content:
                'Intento abrir la cerradura. [DICE_RESULT: {"stat":"dex","skill":"lockpicking","total":18,"dc":15,"success":true,"critical":null}]',
            clientEventId: "client-event-dice-1",
        },
    });

    assert.equal(response.status, 200);


    const bodyText = await readStreamResponse(response);
    assert.match(bodyText, /"done":true/);
    assert.match(promptObserved, /ya realizó la tirada solicitada/i);
    assert.doesNotMatch(promptObserved, /pide otra tirada/i);

    assert.equal(repository.narrativeEvents.length, 2);
    assert.equal(repository.narrativeEvents[0].event_type, "player_message");
    assert.deepEqual(repository.narrativeEvents[0].payload, {
        dice_result: {
            stat: "dex",
            skill: "lockpicking",
            total: 18,
            dc: 15,
            success: true,
            critical: null,
        },
    });

    const assistantEvent = repository.narrativeEvents[1];
    assert.equal(assistantEvent.event_type, "gm_message");
    assert.equal(assistantEvent.dice_roll_required, null);
});

test("stream runtime does not start model stream for explicit turn advancement marker", async () => {
    const repository = new FakeEngineStreamRepository({
        character: buildCharacter(),
        sessionPlayers: buildSessionPlayers(),
        sessionCombatState: buildActiveCombatState(),
        recentSessionEvents: [],
    });

    let called = false;

    const modelGateway: EngineStreamModelGateway = {
        async generateContentStream() {
            called = true;
            async function* stream() {
                yield {
                    text() {
                        return JSON.stringify({
                            narrative_response: "No debería ejecutarse.",
                            state_changes: {
                                hp_delta: 0,
                                inventory_added: [],
                                inventory_removed: [],
                            },
                            dice_roll_required: { needed: false },
                            combat: null,
                            combat_events: null,
                        });
                    },
                };
            }

            return stream();
        },
    };

    const response = await processEngineStream({
        repository,
        modelGateway,
        userId: "user-1",
        body: {
            characterId: "char-1",
            content: "[SISTEMA_TURNO_SIGUIENTE]",
            sessionId: "session-1",
            clientEventId: "client-turn-marker-1",
        },
    });

    assert.equal(response.status, 200);

    assert.equal(called, false);
    assert.equal(repository.combatTransitions.length, 1);
});

test("stream runtime emits model errors through SSE payload", async () => {
    const repository = new FakeEngineStreamRepository({
        character: buildCharacter(),
    });

    const modelGateway: EngineStreamModelGateway = {
        async generateContentStream() {
            throw new Error("Fallo del modelo");
        },
    };

    const response = await processEngineStream({
        repository,
        modelGateway,
        userId: "user-1",
        body: {
            characterId: "char-1",
            content: "Exploro la cueva.",
            clientEventId: "client-event-error-1",
        },
    });

    assert.equal(response.status, 200);
    const bodyText = await readStreamResponse(response);
    assert.match(bodyText, /Fallo del modelo/);
});