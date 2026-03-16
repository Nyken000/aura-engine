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
    ruleBookUris: string[] = [];
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

    async getActiveRuleBookUris() {
        return this.ruleBookUris;
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

    const kaelSnapshot = repository.participantSnapshots[0].participants.find(
        (participant) => participant.id === "player:user-1",
    );
    assert.ok(kaelSnapshot);
    assert.equal(kaelSnapshot?.hp, 14);
    assert.equal(kaelSnapshot?.conditions?.[0]?.name, "Envenenado");
    assert.equal(kaelSnapshot?.conditions?.[0]?.duration_rounds, 2);
});

test("stream runtime closes combat through atomic transition when combat_ended arrives", async () => {
    const repository = new FakeEngineStreamRepository({
        character: buildCharacter(),
        sessionPlayers: buildSessionPlayers(),
        sessionCombatState: buildActiveCombatState(),
    });

    const modelGateway = createModelGatewayFromText(
        JSON.stringify({
            narrative_response:
                "El último enemigo cae y la escaramuza termina entre jadeos y acero.",
            dice_roll_required: { needed: false },
            state_changes: { hp_delta: 0, inventory_added: [], inventory_removed: [] },
            combat: null,
            combat_events: {
                combat_ended: {
                    winner_side: "players",
                    summary: "Los héroes aseguran la zona cuando el último enemigo cae.",
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
            content: "Remato al último enemigo.",
            sessionId: "session-1",
        },
    });

    assert.equal(response.status, 200);

    const bodyText = await readStreamResponse(response);
    assert.match(bodyText, /"done":true/);

    assert.deepEqual(
        repository.tacticalRows.map((row) => row.event_type),
        ["combat_ended"],
    );

    assert.equal(repository.combatTransitions.length, 1);
    assert.equal(repository.combatTransitions[0].turnPlayerId, null);
    assert.equal(repository.combatTransitions[0].combatState.status, "ended");

    assert.equal(repository.participantSnapshots.length, 0);
});

test("stream runtime short-circuits duplicate session submits by client_event_id", async () => {
    const repository = new FakeEngineStreamRepository({
        character: buildCharacter(),
        sessionPlayers: buildSessionPlayers(),
        sessionCombatState: buildActiveCombatState(),
        recentSessionEvents: [
            {
                id: "event-1",
                role: "user",
                content: "Ataco al capitán goblin.",
                created_at: new Date().toISOString(),
                session_id: "session-1",
                character_id: "char-1",
                client_event_id: "client-event-duplicate",
                event_index: 11,
                payload: { sender_name: "Kael" },
            },
        ],
    });

    let gatewayCalled = false;
    const modelGateway: EngineStreamModelGateway = {
        async generateContentStream() {
            gatewayCalled = true;
            throw new Error("Model should not be called for duplicate retries");
        },
    };

    const response = await processEngineStream({
        repository,
        modelGateway,
        userId: "user-1",
        body: {
            characterId: "char-1",
            content: "Ataco al capitán goblin.",
            sessionId: "session-1",
            clientEventId: "client-event-duplicate",
        },
    });

    assert.equal(response.status, 200);
    assert.equal(gatewayCalled, false);
    assert.equal(repository.narrativeEvents.length, 0);
    assert.equal(repository.characterUpdates.length, 0);

    const payload = (await response.json()) as {
        ok?: boolean;
        duplicate?: boolean;
        system_only?: boolean;
    };

    assert.equal(payload.ok, true);
    assert.equal(payload.duplicate, true);
    assert.equal(payload.system_only, true);
});