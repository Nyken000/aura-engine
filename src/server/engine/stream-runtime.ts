import { getCampaignById } from "@/utils/game/campaigns";
import {
    buildDiceResultFeedbackMessage,
    parseDiceResultMarker,
    type DiceRollOutcome,
    type DiceRollRequired,
} from "@/types/dice";
import {
    advanceSessionCombatTurn,
    applyCharacterHpToSessionCombat,
    armorClassFromStats,
    createEmptySessionCombatState,
    currentCombatToPromptState,
    endSessionCombat,
    registerSessionInitiative,
    resolveTurnPlayerIdFromParticipant,
    safeArray,
    startSessionCombat,
} from "@/server/combat/session-combat-service";
import type {
    CharacterStats,
    CombatParticipant,
    CombatState,
    InventoryItem,
    JsonObject,
    SessionCombatParticipant,
    SessionCombatStateRecord,
    SessionPlayerRow,
} from "@/server/combat/session-combat";
import type { SessionCombatTransitionEvent } from "@/server/combat/session-combat-transitions";
import {
    normalizeCombatEventResolution,
    type CombatEventResolution,
    type CombatParticipantReference,
} from "@/server/combat/session-combat-events";

export type CharacterRecord = {
    id: string;
    user_id: string;
    name: string;
    campaign_id: string | null;
    hp_current: number;
    hp_max: number;
    inventory: InventoryItem[] | null;
    stats: CharacterStats | null;
    worlds?: WorldRecord | null;
    combat_state?: CombatState | null;
};

export type WorldRecord = {
    id: string;
    name: string;
    description: string;
};

export type RuleMatchRecord = {
    entity_type: string;
    name: string;
    content: string;
};

export type NarrativeEventRow = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    created_at: string;
    session_id?: string | null;
    character_id?: string | null;
    event_index?: number | null;
    payload?: {
        sender_name?: string;
        [key: string]: unknown;
    } | null;
    characters?: {
        name?: string;
    } | null;
};

export type CombatUpdate = {
    in_combat: boolean;
    initiative_requested: boolean;
    enemies?: CombatParticipant[];
} | null;

export type StateChanges = {
    hp_delta?: number;
    inventory_added?: string[];
    inventory_removed?: string[];
    skills_used?: string[];
} | null;

export type StreamRequestBody = {
    characterId?: string;
    content?: string;
    sessionId?: string | null;
    clientEventId?: string | null;
};

export type MaybeDiceRollRequired = DiceRollRequired | null;

export type NarrativeEventInsert = {
    world_id: string | null;
    character_id: string | null;
    role: "user" | "assistant" | "system";
    content: string;
    session_id?: string | null;
    client_event_id?: string | null;
    dice_roll_required?: MaybeDiceRollRequired;
    event_type?: string;
    payload?: JsonObject;
};

export type CharacterUpdatePatch = {
    hp_current?: number;
    inventory?: InventoryItem[];
    combat_state?: CombatState;
};

export type PersistCombatEventsResult = {
    combatState: SessionCombatStateRecord;
    touchedCharacterHp: Array<{
        characterId: string;
        hp: number;
    }>;
    combatEnded: boolean;
};

export type PersistCombatEventsParams = {
    worldId?: string | null;
    characterId?: string | null;
    sessionId: string;
    resolution: CombatEventResolution;
    currentState: SessionCombatStateRecord;
    actingParticipant?: CombatParticipantReference | null;
};

export interface EngineStreamRepository {
    getCharacterWithWorld(characterId: string): Promise<CharacterRecord | null>;
    getRecentSessionEvents(sessionId: string): Promise<NarrativeEventRow[]>;
    getRecentCharacterEvents(characterId: string): Promise<NarrativeEventRow[]>;
    getSessionPlayers(sessionId: string): Promise<SessionPlayerRow[]>;
    getSessionCombatState(sessionId: string): Promise<SessionCombatStateRecord | null>;
    getActiveRuleBookUris(): Promise<string[]>;
    searchRelevantRules(content: string): Promise<RuleMatchRecord[]>;
    insertNarrativeEvents(rows: NarrativeEventInsert[]): Promise<void>;
    updateCharacter(characterId: string, patch: CharacterUpdatePatch): Promise<void>;
    updateSessionCombatParticipants(
        sessionId: string,
        participants: SessionCombatParticipant[],
    ): Promise<void>;
    upsertSessionCombatState(state: SessionCombatStateRecord): Promise<void>;
    persistCombatTransition(params: {
        sessionId: string;
        combatState: SessionCombatStateRecord;
        turnPlayerId: string | null;
        turnAdvancedEvent?: SessionCombatTransitionEvent;
    }): Promise<void>;
    persistCombatEvents(
        params: PersistCombatEventsParams,
    ): Promise<PersistCombatEventsResult>;
}

export interface StreamModelChunk {
    text(): string;
}

export interface EngineStreamModelGateway {
    generateContentStream(params: {
        prompt: string;
        ruleBookUris: string[];
    }): Promise<AsyncIterable<StreamModelChunk>>;
}

function toJsonObject(value: unknown): JsonObject | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as JsonObject;
}

function buildDiceResolutionPrompt(result: DiceRollOutcome): string {
    const skillLabel = result.skill || result.stat.toUpperCase();
    const successLabel = result.success ? "éxito" : "fallo";
    const criticalLabel =
        result.critical === "critical_success"
            ? " Fue un éxito crítico."
            : result.critical === "critical_failure"
                ? " Fue una pifia."
                : "";

    return `El jugador ya realizó la tirada solicitada para ${skillLabel}. Resultado final: ${result.total} contra CD ${result.dc} (${successLabel}).${criticalLabel} Resuelve ahora la consecuencia narrativa y mecánica de este resultado sin pedir otra tirada para la misma acción.`;
}

function parseModelResponse(fullResponse: string): {
    narrative: string;
    stateChanges: StateChanges;
    diceRollRequired: MaybeDiceRollRequired;
    combatUpdate: CombatUpdate;
    combatEventResolution: CombatEventResolution;
} {
    const cleaned = fullResponse
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

    let narrative = "";
    let stateChanges: StateChanges = null;
    let diceRollRequired: MaybeDiceRollRequired = null;
    let combatUpdate: CombatUpdate = null;
    let combatEventResolution: CombatEventResolution = null;

    try {
        const jsonBlock = cleaned.match(/\{[\s\S]*\}/);
        if (jsonBlock) {
            const evaluation = JSON.parse(jsonBlock[0]) as {
                narrative_response?: string;
                state_changes?: StateChanges;
                dice_roll_required?: MaybeDiceRollRequired;
                combat?: CombatUpdate;
                combat_events?: unknown;
            };

            narrative = evaluation.narrative_response ?? "";
            stateChanges = evaluation.state_changes ?? null;
            diceRollRequired = evaluation.dice_roll_required ?? null;
            combatUpdate = evaluation.combat ?? null;
            combatEventResolution = normalizeCombatEventResolution(
                evaluation.combat_events,
            );
        }
    } catch {
        // noop
    }

    if (!narrative) {
        const match = cleaned.match(
            /"narrative_response"\s*:\s*"((?:[^"\\]|\\.)*)"/,
        );
        if (match) {
            narrative = match[1]
                .replace(/\\n/g, "\n")
                .replace(/\\t/g, "  ")
                .replace(/\\"/g, '"')
                .replace(/\\'/g, "'");
        }
    }

    if (!narrative) {
        narrative = cleaned.replace(/"narrative_response"\s*:\s*/g, "").trim();
    }

    return {
        narrative,
        stateChanges,
        diceRollRequired,
        combatUpdate,
        combatEventResolution,
    };
}

function buildCombatPromptContext(
    sessionCombatState: SessionCombatStateRecord | null,
): string {
    if (
        !sessionCombatState ||
        (sessionCombatState.status !== "initiative" &&
            sessionCombatState.status !== "active")
    ) {
        return "";
    }

    return `
=== DOMINIO TÁCTICO COMPARTIDO ===
Estado: ${sessionCombatState.status}
Ronda: ${sessionCombatState.round}
Turno índice: ${sessionCombatState.turn_index}
Participantes con IDs estables:
${sessionCombatState.participants
            .map(
                (participant) =>
                    `- id=${participant.id} | nombre=${participant.name} | character_id=${participant.character_id ?? "null"} | HP=${participant.hp}/${participant.max_hp} | AC=${participant.ac} | jugador=${participant.is_player ? "sí" : "no"} | derrotado=${participant.is_defeated ? "sí" : "no"} | condiciones=${safeArray(participant.conditions).map((condition) => condition.name).join(", ") || "ninguna"}`,
            )
            .join("\n")}
===
`;
}

function buildPrompt(params: {
    character: CharacterRecord;
    contentForModel: string;
    recentEvents: NarrativeEventRow[];
    sessionPlayers: SessionPlayerRow[];
    sessionCombatState: SessionCombatStateRecord | null;
    relevantRules: RuleMatchRecord[];
}): string {
    const {
        character,
        contentForModel,
        recentEvents,
        sessionPlayers,
        sessionCombatState,
        relevantRules,
    } = params;

    const world = character.worlds;
    const campaign = character.campaign_id
        ? getCampaignById(character.campaign_id)
        : null;

    const currentCombatState = currentCombatToPromptState(
        sessionCombatState,
        character.combat_state,
    );

    const historyText = recentEvents
        .slice()
        .reverse()
        .map((evt) => {
            const sender =
                evt.role === "assistant"
                    ? "GAME MASTER"
                    : String(
                        evt.payload?.sender_name || evt.characters?.name || character.name,
                    ).toUpperCase();

            return `[${evt.role.toUpperCase()} - ${sender}]: ${evt.content}`;
        })
        .join("\n");

    const sessionPlayersContext =
        sessionPlayers.length > 0
            ? `\n=== SESIÓN MULTIJUGADOR ===\n${sessionPlayers
                .map((player) => {
                    const playerCharacter = player.characters;
                    if (!playerCharacter) {
                        return `- ${player.profiles?.username ?? "Jugador"} (sin personaje)`;
                    }
                    return `- ${player.profiles?.username ?? "Jugador"} como ${playerCharacter.name} (HP: ${playerCharacter.hp_current}/${playerCharacter.hp_max})`;
                })
                .join("\n")}\n===\n`
            : "";

    const campaignContext = campaign
        ? `
=== CAMPAÑA ACTIVA: "${campaign.title}" ===
Premisa: ${campaign.description}
OBJETIVO PRINCIPAL DEL JUGADOR: ${campaign.main_quest}
SECRETO DEL DM (nunca lo reveles directamente, hazlo emerger lentamente): ${campaign.the_twist}
NPCs Claves: ${campaign.key_npcs.join(" | ")}
===
`
        : "";

    const dndRulesContext =
        relevantRules.length > 0
            ? `\n=== REGLAS OFICIALES RELEVANTES (5e) ===\nAplica estas reglas si son pertinentes a la acción del jugador:\n\n${relevantRules
                .map(
                    (rule) =>
                        `[${rule.entity_type.toUpperCase()}]: ${rule.name}\n${rule.content}`,
                )
                .join("\n\n")}\n`
            : "";

    const combatContext = currentCombatState.in_combat
        ? `
=== COMBATE EN CURSO ===
Turno actual de: ${currentCombatState.participants[currentCombatState.turn]?.name ?? "Desconocido"}
Participantes (orden actual):
${currentCombatState.participants
            .map(
                (participant) =>
                    `- ${participant.name} (HP: ${participant.hp}/${participant.max_hp}, AC: ${participant.ac}, Init: ${participant.initiative ?? 0})`,
            )
            .join("\n")}
===
`
        : "";

    const combatDomainContext = buildCombatPromptContext(sessionCombatState);

    return `
Eres el Game Master de una aventura de mesa basada en D&D 5E.
Mundo: "${world?.name || "Mundo Desconocido"}" - ${world?.description || "Tierras misteriosas sin documentar."}
${campaignContext}

Personaje:
- Nombre: ${character.name}
- Raza: ${character.stats?.race ?? "Desconocida"} | Clase: ${character.stats?.class ?? "Aventurero"}
- HP: ${character.hp_current}/${character.hp_max}
- STR ${character.stats?.str ?? 10} DEX ${character.stats?.dex ?? 10} CON ${character.stats?.con ?? 10} INT ${character.stats?.int ?? 10} SAB ${character.stats?.wis ?? 10} CAR ${character.stats?.cha ?? 10}
- Equipamiento: ${safeArray(character.inventory).map((item) => item.name).join(", ") || "Nada"}

${sessionPlayersContext}
${combatContext}
${combatDomainContext}

HISTORIAL RECIENTE:
${historyText}

${dndRulesContext}

ACCIÓN DEL JUGADOR: "${contentForModel}"

Responde ÚNICAMENTE con un JSON válido (sin markdown), con esta forma exacta:
{
  "narrative_response": "Narración épica e inmersiva...",
  "dice_roll_required": {
    "needed": false,
    "die": "d20",
    "stat": "dex",
    "skill": "Sigilo",
    "dc": 15,
    "flavor": "Tirada de Sigilo (DES) — CD 15"
  },
  "state_changes": { "hp_delta": 0, "inventory_added": [], "inventory_removed": [], "skills_used": [] },
  "combat": {
    "in_combat": false,
    "initiative_requested": false,
    "enemies": [
      { "name": "Goblin 1", "hp": 7, "max_hp": 7, "ac": 12, "initiative": 0, "is_player": false }
    ]
  },
  "combat_events": {
    "attack_declared": null,
    "damage_applied": null,
    "healing_applied": null,
    "condition_applied": null,
    "combat_ended": null
  }
}

IMPORTANTE:
1. Si la acción requiere tirada, pon "needed": true en dice_roll_required.
2. Si decides iniciar combate, pon "initiative_requested": true e "in_combat": true y rellena "enemies".
3. Si no quieres cambiar inventario o HP, devuelve arrays vacíos y hp_delta 0.
4. El campo "flavor" debe ser corto.
5. Si el combate compartido ya está activo o en iniciativa, rellena "combat_events" cuando ocurra una acción táctica real.
6. Usa los participant_id y character_id del bloque DOMINIO TÁCTICO COMPARTIDO cuando existan; no inventes IDs.
7. Usa condition_applied sólo cuando una condición real quede aplicada al objetivo.
8. Usa combat_ended sólo cuando el encounter termine de verdad.
`;
}

async function readSseText(response: Response): Promise<string> {
    return response.text();
}

export async function processEngineStream(params: {
    repository: EngineStreamRepository;
    modelGateway: EngineStreamModelGateway;
    userId: string | null | undefined;
    body: StreamRequestBody;
}): Promise<Response> {
    const { repository, modelGateway, userId, body } = params;

    if (!userId) {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const { characterId, content, sessionId, clientEventId } = body;

    if (!characterId || !content) {
        return Response.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const character = await repository.getCharacterWithWorld(characterId);

    if (!character || character.user_id !== userId) {
        return Response.json({ error: "Personaje no encontrado" }, { status: 404 });
    }

    const normalizedSessionId = sessionId ?? null;
    const normalizedClientEventId = clientEventId ?? crypto.randomUUID();
    const parsedDiceResult = parseDiceResultMarker(content);
    const contentForModel = parsedDiceResult
        ? buildDiceResolutionPrompt(parsedDiceResult)
        : content;

    const [ruleBookUris, recentEvents, sessionPlayers, sessionCombatState, relevantRules] =
        await Promise.all([
            repository.getActiveRuleBookUris(),
            normalizedSessionId
                ? repository.getRecentSessionEvents(normalizedSessionId)
                : repository.getRecentCharacterEvents(character.id),
            normalizedSessionId
                ? repository.getSessionPlayers(normalizedSessionId)
                : Promise.resolve([]),
            normalizedSessionId
                ? repository.getSessionCombatState(normalizedSessionId)
                : Promise.resolve(null),
            repository.searchRelevantRules(contentForModel),
        ]);

    const currentCombatState = currentCombatToPromptState(
        sessionCombatState,
        character.combat_state,
    );

    if (parsedDiceResult) {
        await repository.insertNarrativeEvents([
            {
                world_id: character.worlds?.id ?? null,
                character_id: character.id,
                role: "system",
                content: buildDiceResultFeedbackMessage(parsedDiceResult),
                session_id: normalizedSessionId,
                client_event_id: normalizedClientEventId,
                event_type: "dice_result",
                payload: {
                    sender_name: character.name,
                    channel: "adventure",
                    dice_result: parsedDiceResult,
                },
            },
        ]);
    } else {
        await repository.insertNarrativeEvents([
            {
                world_id: character.worlds?.id ?? null,
                character_id: character.id,
                role: "user",
                content,
                session_id: normalizedSessionId,
                client_event_id: normalizedClientEventId,
                event_type: "player_message",
                payload: {
                    sender_name: character.name,
                    channel: "adventure",
                },
            },
        ]);
    }

    const initMatch = content.match(/\[SISTEMA_INICIATIVA:\s*(\d+)\]/);
    if (initMatch && currentCombatState.in_combat) {
        const rolledInit = Number.parseInt(initMatch[1], 10);

        if (normalizedSessionId && sessionCombatState?.status === "initiative") {
            const { combatState, turnPlayerId } = registerSessionInitiative({
                currentState: sessionCombatState,
                userId,
                rolledInitiative: rolledInit,
            });

            await repository.persistCombatTransition({
                sessionId: normalizedSessionId,
                combatState,
                turnPlayerId,
            });

            return Response.json({ ok: true, system_only: true });
        }

        const newCombatState: CombatState = {
            ...currentCombatState,
            participants: currentCombatState.participants.map((participant) => ({
                ...participant,
            })),
        };

        const playerIndex = newCombatState.participants.findIndex(
            (participant) => participant.is_player,
        );

        if (playerIndex > -1) {
            newCombatState.participants[playerIndex].initiative = rolledInit;
        }

        newCombatState.participants.forEach((participant) => {
            if (
                !participant.is_player &&
                (!participant.initiative || participant.initiative === 0)
            ) {
                participant.initiative =
                    Math.floor(Math.random() * 20) +
                    1 +
                    Math.floor((participant.ac - 10) / 2);
            }
        });

        newCombatState.participants.sort(
            (a, b) => (b.initiative ?? 0) - (a.initiative ?? 0),
        );
        newCombatState.turn = 0;

        await repository.updateCharacter(character.id, { combat_state: newCombatState });

        return Response.json({ ok: true, system_only: true });
    }

    const nextTurnMatch = content.match(/\[SISTEMA_TURNO_SIGUIENTE\]/);
    if (nextTurnMatch && currentCombatState.in_combat) {
        if (normalizedSessionId && sessionCombatState?.status === "active") {
            const { combatState, activeParticipant } =
                advanceSessionCombatTurn(sessionCombatState);

            await repository.persistCombatTransition({
                sessionId: normalizedSessionId,
                combatState,
                turnPlayerId: resolveTurnPlayerIdFromParticipant(activeParticipant),
                turnAdvancedEvent: {
                    worldId: character.worlds?.id ?? null,
                    characterId: character.id,
                    content: "[SISTEMA_TURNO_SIGUIENTE]",
                    payload: {
                        sender_name: "Sistema",
                        combat_turn: combatState.turn_index,
                        round: combatState.round,
                    },
                },
            });

            return Response.json({ ok: true, system_only: true });
        }

        const participantCount = Math.max(
            1,
            currentCombatState.participants.length,
        );

        const newCombatState: CombatState = {
            ...currentCombatState,
            turn: (Number(currentCombatState.turn ?? 0) + 1) % participantCount,
        };

        await repository.updateCharacter(character.id, { combat_state: newCombatState });

        return Response.json({ ok: true, system_only: true });
    }

    const prompt = buildPrompt({
        character,
        contentForModel,
        recentEvents,
        sessionPlayers,
        sessionCombatState,
        relevantRules,
    });

    const encoder = new TextEncoder();
    let fullResponse = "";
    const assistantClientEventId = crypto.randomUUID();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const result = await modelGateway.generateContentStream({
                    prompt,
                    ruleBookUris,
                });

                for await (const chunk of result) {
                    const text = chunk.text();
                    if (text) {
                        fullResponse += text;
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`),
                        );
                    }
                }

                const {
                    narrative,
                    stateChanges,
                    diceRollRequired,
                    combatUpdate,
                    combatEventResolution,
                } = parseModelResponse(fullResponse);

                let newHp = character.hp_current ?? character.hp_max;
                const inventory = safeArray(character.inventory).map((item) => ({
                    ...item,
                }));

                if (stateChanges) {
                    const hpDelta = Number(stateChanges.hp_delta ?? 0);
                    newHp = Math.min(character.hp_max, Math.max(0, newHp + hpDelta));

                    safeArray(stateChanges.inventory_added).forEach((item) => {
                        inventory.push({ name: item, type: "item" });
                    });

                    safeArray(stateChanges.inventory_removed).forEach((target) => {
                        const idx = inventory.findIndex((item) =>
                            String(item.name || "")
                                .toLowerCase()
                                .includes(String(target).toLowerCase()),
                        );
                        if (idx > -1) inventory.splice(idx, 1);
                    });
                }

                await repository.insertNarrativeEvents([
                    {
                        world_id: character.worlds?.id ?? null,
                        character_id: character.id,
                        role: "assistant",
                        content: narrative,
                        session_id: normalizedSessionId,
                        client_event_id: assistantClientEventId,
                        dice_roll_required: diceRollRequired,
                        event_type: parsedDiceResult
                            ? "gm_reaction"
                            : combatUpdate?.initiative_requested
                                ? "combat_started"
                                : "gm_message",
                        payload: {
                            sender_name: "Game Master",
                            channel: "adventure",
                            state_changes: toJsonObject(stateChanges),
                            combat: toJsonObject(combatUpdate),
                            combat_events: toJsonObject(combatEventResolution),
                            ...(parsedDiceResult
                                ? {
                                    source: "dice_result" as const,
                                    dice_result: parsedDiceResult,
                                }
                                : {}),
                        },
                    },
                ]);

                if (diceRollRequired?.needed) {
                    await repository.insertNarrativeEvents([
                        {
                            world_id: character.worlds?.id ?? null,
                            character_id: character.id,
                            role: "system",
                            content: `[SISTEMA_DADO_PEDIDO] ${diceRollRequired.flavor}`,
                            session_id: normalizedSessionId,
                            event_type: "dice_requested",
                            payload: {
                                sender_name: "Sistema",
                                channel: "adventure",
                                dice_request: diceRollRequired,
                            },
                            dice_roll_required: diceRollRequired,
                        },
                    ]);
                }

                if (normalizedSessionId) {
                    const currentSessionState =
                        sessionCombatState ??
                        createEmptySessionCombatState(normalizedSessionId);

                    let nextSessionState = currentSessionState;
                    let shouldPersistParticipantsSnapshot = false;

                    if (combatUpdate && combatUpdate.in_combat) {
                        const startedCombat = startSessionCombat({
                            sessionId: normalizedSessionId,
                            currentState: currentSessionState,
                            sessionPlayers,
                            enemies: combatUpdate.enemies,
                            actingCharacterId: character.id,
                            actingCharacterHp: newHp,
                            actingCharacterMaxHp: character.hp_max,
                        });

                        nextSessionState = startedCombat.combatState;

                        await repository.persistCombatTransition({
                            sessionId: normalizedSessionId,
                            combatState: startedCombat.combatState,
                            turnPlayerId: startedCombat.turnPlayerId,
                        });
                    } else if (combatUpdate && !combatUpdate.in_combat) {
                        nextSessionState =
                            createEmptySessionCombatState(normalizedSessionId);
                        await repository.upsertSessionCombatState(nextSessionState);
                    } else if (
                        currentSessionState.status === "initiative" ||
                        currentSessionState.status === "active"
                    ) {
                        nextSessionState = applyCharacterHpToSessionCombat({
                            currentState: currentSessionState,
                            characterId: character.id,
                            hp: newHp,
                            maxHp: character.hp_max,
                        });
                        shouldPersistParticipantsSnapshot = true;
                    }

                    if (
                        combatEventResolution &&
                        (nextSessionState.status === "initiative" ||
                            nextSessionState.status === "active")
                    ) {
                        const tacticalResult = await repository.persistCombatEvents({
                            worldId: character.worlds?.id ?? null,
                            characterId: character.id,
                            sessionId: normalizedSessionId,
                            resolution: combatEventResolution,
                            currentState: nextSessionState,
                            actingParticipant: {
                                character_id: character.id,
                                name: character.name,
                            },
                        });

                        nextSessionState = tacticalResult.combatState;
                        shouldPersistParticipantsSnapshot = true;

                        for (const entry of tacticalResult.touchedCharacterHp) {
                            if (entry.characterId === character.id) {
                                newHp = entry.hp;
                            }

                            await repository.updateCharacter(entry.characterId, {
                                hp_current: entry.hp,
                            });
                        }

                        if (tacticalResult.combatEnded) {
                            const endedState = endSessionCombat(nextSessionState);
                            nextSessionState = endedState;
                            shouldPersistParticipantsSnapshot = false;

                            await repository.persistCombatTransition({
                                sessionId: normalizedSessionId,
                                combatState: endedState,
                                turnPlayerId: null,
                            });
                        }
                    }

                    if (
                        shouldPersistParticipantsSnapshot &&
                        (nextSessionState.status === "initiative" ||
                            nextSessionState.status === "active")
                    ) {
                        await repository.updateSessionCombatParticipants(
                            normalizedSessionId,
                            nextSessionState.participants,
                        );
                    }

                    await repository.updateCharacter(character.id, {
                        hp_current: newHp,
                        inventory,
                    });
                } else {
                    let newCombatState: CombatState = currentCombatState;

                    if (combatUpdate && combatUpdate.in_combat) {
                        newCombatState = {
                            ...newCombatState,
                            in_combat: true,
                            participants: safeArray(newCombatState.participants).map(
                                (participant) => ({ ...participant }),
                            ),
                        };

                        const existingNames = new Set(
                            newCombatState.participants.map(
                                (participant) => participant.name,
                            ),
                        );

                        if (newCombatState.participants.length === 0) {
                            newCombatState.participants.push({
                                name: character.name,
                                hp: newHp,
                                max_hp: character.hp_max,
                                ac: armorClassFromStats(character.stats),
                                is_player: true,
                                initiative: 0,
                            });
                        }

                        safeArray(combatUpdate.enemies).forEach((enemy) => {
                            if (!existingNames.has(enemy.name)) {
                                newCombatState.participants.push({
                                    ...enemy,
                                    is_player: false,
                                });
                            }
                        });
                    } else if (combatUpdate && !combatUpdate.in_combat) {
                        newCombatState = { in_combat: false, turn: 0, participants: [] };
                    } else if (newCombatState.in_combat) {
                        const playerIdx = newCombatState.participants.findIndex(
                            (participant) => participant.is_player,
                        );
                        if (playerIdx > -1) {
                            newCombatState.participants[playerIdx].hp = newHp;
                        }
                    }

                    await repository.updateCharacter(character.id, {
                        hp_current: newHp,
                        inventory,
                        combat_state: newCombatState,
                    });
                }

                controller.enqueue(
                    encoder.encode(
                        `data: ${JSON.stringify({
                            done: true,
                            narrative,
                            dice_roll_required: diceRollRequired,
                            assistant_client_event_id: assistantClientEventId,
                        })}\n\n`,
                    ),
                );

                controller.close();
            } catch (error: unknown) {
                const message =
                    error instanceof Error ? error.message : "Unknown stream error";

                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`),
                );
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}

export async function readStreamResponse(response: Response): Promise<string> {
    return readSseText(response);
}