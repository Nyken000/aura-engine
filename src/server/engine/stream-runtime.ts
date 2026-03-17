import { randomUUID } from "node:crypto";
import type {
    CombatParticipant,
    CombatState,
    JsonValue,
    JsonObject,
    SessionCombatParticipant,
    SessionCombatStateRecord,
    SessionPlayerRow,
} from "@/server/combat/session-combat";
import type {
    CombatEventResolution,
    CombatParticipantReference,
} from "@/server/combat/session-combat-events";
import {
    advanceSessionCombatTurn,
    computeCombatRoundTurnLabel,
    currentCombatToPromptState,
    resolveTurnPlayerIdFromParticipant,
    updateSessionCombatStateFromModel,
} from "@/server/combat/session-combat-service";
import type { SessionCombatTransitionEvent } from "@/server/combat/session-combat-transitions";

type CharacterInventoryItem = {
    name?: string;
    type?: string;
    [key: string]: JsonValue | undefined;
};

export type CharacterRecord = {
    id: string;
    user_id: string;
    name: string;
    campaign_id?: string | null;
    hp_current: number;
    hp_max: number;
    inventory: CharacterInventoryItem[] | null;
    stats: Record<string, JsonValue>;
    worlds?: {
        id: string;
        name: string;
        description: string;
    } | null;
    combat_state?: JsonValue | null;
};

export type NarrativeEventRow = {
    id?: string;
    session_id?: string | null;
    world_id?: string | null;
    character_id?: string | null;
    role: string;
    content: string;
    created_at?: string;
    event_index?: number | null;
    client_event_id?: string | null;
    event_type?: string | null;
    payload?: JsonObject | null;
};

export type NarrativeEventInsert = {
    world_id?: string | null;
    character_id?: string | null;
    role: string;
    content: string;
    session_id?: string | null;
    client_event_id?: string | null;
    event_type?: string | null;
    payload?: JsonObject | null;
    dice_roll_required?: JsonValue | null;
};

export type RuleMatchRecord = {
    id: string;
    title: string;
    content: string;
    similarity?: number | null;
    page_from?: number | null;
    page_to?: number | null;
};

type StreamRequestBody = {
    characterId?: string;
    content?: string;
    sessionId?: string | null;
    clientEventId?: string | null;
};

type StateChanges = {
    hp_delta?: number;
    inventory_added?: string[];
    inventory_removed?: string[];
};

type DiceRollRequest = {
    needed?: boolean;
    stat?: string | null;
    skill?: string | null;
    dc?: number | null;
    reason?: string | null;
};

type MaybeDiceRollRequired = DiceRollRequest | null;

type CombatParticipantDraft = {
    name: string;
    hp: number;
    max_hp: number;
    ac: number;
    initiative?: number;
};

type CombatUpdate = {
    start?: boolean;
    end?: boolean;
    participants?: CombatParticipantDraft[];
    turn_index?: number;
    round?: number;
};

type DiceRollOutcome = {
    stat: string;
    skill?: string | null;
    total: number;
    dc: number;
    success: boolean;
    critical: "critical_success" | "critical_failure" | null;
};


export type CharacterUpdatePatch = {
    hp_current?: number;
    inventory?: CharacterInventoryItem[];
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
    stateChanges: StateChanges | null;
    diceRollRequired: MaybeDiceRollRequired;
    combatUpdate: CombatUpdate | null;
    combatEventResolution: CombatEventResolution;
} {
    const cleaned = fullResponse
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

    let narrative = "";
    let stateChanges: StateChanges | null = null;
    let diceRollRequired: MaybeDiceRollRequired = null;
    let combatUpdate: CombatUpdate | null = null;
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
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, "\\");
        } else {
            narrative = cleaned;
        }
    }

    return {
        narrative,
        stateChanges,
        diceRollRequired,
        combatUpdate,
        combatEventResolution,
    };
}

function safeArray<T>(value: T[] | null | undefined): T[] {
    return Array.isArray(value) ? value : [];
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

    const stats = character.stats || {};
    const worldName = character.worlds?.name ?? "Mundo desconocido";
    const worldDescription =
        character.worlds?.description ?? "Sin descripción disponible";

    const history = [...recentEvents]
        .reverse()
        .map((event) => `${event.role.toUpperCase()}: ${event.content}`)
        .join("\n");

    const playersBlock =
        sessionPlayers.length > 0
            ? sessionPlayers
                .map((player) => {
                    const char = player.characters;
                    const username =
                        player.profiles?.username || player.user_id || "jugador";
                    return [
                        `- ${char?.name ?? "Sin nombre"} (@${username})`,
                        `  HP: ${char?.hp_current ?? "?"}/${char?.hp_max ?? "?"}`,
                        `  Inventario: ${JSON.stringify(char?.inventory ?? [])}`,
                        `  Stats: ${JSON.stringify(char?.stats ?? {})}`,
                    ].join("\n");
                })
                .join("\n")
            : "Sin otros jugadores en esta escena.";

    const rulesBlock =
        relevantRules.length > 0
            ? relevantRules
                .map((rule, index) => {
                    const pages =
                        rule.page_from || rule.page_to
                            ? ` (páginas ${rule.page_from ?? "?"}-${rule.page_to ?? "?"})`
                            : "";
                    const similarity =
                        typeof rule.similarity === "number"
                            ? ` | similitud ${rule.similarity.toFixed(3)}`
                            : "";

                    return `Regla ${index + 1}: ${rule.title}${pages}${similarity}\n${rule.content}`;
                })
                .join("\n\n")
            : "No hay fragmentos de manual relevantes recuperados.";

    const combatStateLabel = sessionCombatState
        ? JSON.stringify(
            {
                status: sessionCombatState.status,
                round: sessionCombatState.round,
                turn_index: sessionCombatState.turn_index,
                turn_label: computeCombatRoundTurnLabel(sessionCombatState),
                participants: sessionCombatState.participants,
            },
            null,
            2,
        )
        : JSON.stringify(currentCombatToPromptState(null, character.combat_state as unknown as CombatState), null, 2);

    return `
Eres Aura, una game master de RPG multijugador con narrativa premium, consistente y estructurada.
Responde SIEMPRE en español.
Debes devolver un único JSON válido con esta forma exacta:

{
  "narrative_response": "texto narrativo para el jugador",
  "state_changes": {
    "hp_delta": 0,
    "inventory_added": [],
    "inventory_removed": []
  },
  "dice_roll_required": {
    "needed": false,
    "stat": null,
    "skill": null,
    "dc": null,
    "reason": null
  },
  "combat": {
    "start": false,
    "end": false,
    "participants": [],
    "turn_index": 0,
    "round": 1
  },
  "combat_events": {
    "damage_applied": null,
    "healing_applied": null,
    "condition_applied": null,
    "condition_removed": null,
    "combat_ended": null
  }
}

Reglas importantes:
- No escribas texto fuera del JSON.
- Si no corresponde un bloque, mantenlo como null o con valores vacíos válidos.
- Si el jugador ya tiró dados y el resultado está indicado en el prompt, no pidas otra tirada para esa misma acción.
- Si hay combate multijugador activo, respeta el estado compartido.
- Solo avanza turno mediante consecuencia narrativa apropiada; el evento explícito lo persiste el backend.
- Si una regla del manual es relevante, priorízala.
- No inventes páginas ni cites reglas inexistentes.
- Mantén consistencia con el historial reciente.

MUNDO
Nombre: ${worldName}
Descripción: ${worldDescription}

PERSONAJE ACTIVO
Nombre: ${character.name}
HP: ${character.hp_current}/${character.hp_max}
Inventario: ${JSON.stringify(character.inventory ?? [])}
Stats: ${JSON.stringify(stats, null, 2)}

JUGADORES EN SESIÓN
${playersBlock}

ESTADO DE COMBATE
${combatStateLabel}

REGLAS RECUPERADAS DESDE MANUALES
${rulesBlock}

HISTORIAL RECIENTE
${history || "Sin historial reciente."}

MENSAJE DEL JUGADOR
${contentForModel}
`.trim();
}

function parseDiceResultMarker(content: string): DiceRollOutcome | null {
    const match = content.match(/\[DICE_RESULT:\s*([^\]]+)\]/i);
    if (!match) return null;

    try {
        const payload = JSON.parse(match[1]) as Partial<DiceRollOutcome>;

        if (
            typeof payload.stat !== "string" ||
            typeof payload.total !== "number" ||
            typeof payload.dc !== "number" ||
            typeof payload.success !== "boolean"
        ) {
            return null;
        }

        return {
            stat: payload.stat,
            skill:
                typeof payload.skill === "string" && payload.skill.trim().length > 0
                    ? payload.skill
                    : null,
            total: payload.total,
            dc: payload.dc,
            success: payload.success,
            critical:
                payload.critical === "critical_success" ||
                    payload.critical === "critical_failure"
                    ? payload.critical
                    : null,
        };
    } catch {
        return null;
    }
}

function toParticipantReference(value: unknown): CombatParticipantReference | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    const candidate = value as Record<string, unknown>;
    const participantId =
        typeof candidate.participant_id === "string"
            ? candidate.participant_id
            : typeof candidate.id === "string"
                ? candidate.id
                : null;
    const characterId =
        typeof candidate.character_id === "string" ? candidate.character_id : null;
    const userId = typeof candidate.user_id === "string" ? candidate.user_id : null;
    const name = typeof candidate.name === "string" ? candidate.name : null;

    if (!participantId && !characterId && !userId && !name) {
        return null;
    }

    return {
        participant_id: participantId,
        character_id: characterId,
        user_id: userId,
        name,
    };
}

function normalizeCombatEventResolution(value: unknown): CombatEventResolution {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    const record = value as Record<string, unknown>;

    const damage_applied =
        record.damage_applied &&
            typeof record.damage_applied === "object" &&
            !Array.isArray(record.damage_applied)
            ? (() => {
                const raw = record.damage_applied as Record<string, unknown>;
                const target = toParticipantReference(raw.target);

                if (!target || typeof raw.amount !== "number") {
                    return null;
                }

                return {
                    actor: toParticipantReference(raw.actor),
                    target,
                    amount: raw.amount,
                    damage_type:
                        typeof raw.damage_type === "string"
                            ? raw.damage_type
                            : null,
                    summary:
                        typeof raw.summary === "string" ? raw.summary : null,
                };
            })()
            : null;

    const healing_applied =
        record.healing_applied &&
            typeof record.healing_applied === "object" &&
            !Array.isArray(record.healing_applied)
            ? (() => {
                const raw = record.healing_applied as Record<string, unknown>;
                const target = toParticipantReference(raw.target);

                if (!target || typeof raw.amount !== "number") {
                    return null;
                }

                return {
                    actor: toParticipantReference(raw.actor),
                    target,
                    amount: raw.amount,
                    summary:
                        typeof raw.summary === "string" ? raw.summary : null,
                };
            })()
            : null;

    const condition_applied =
        record.condition_applied &&
            typeof record.condition_applied === "object" &&
            !Array.isArray(record.condition_applied)
            ? (() => {
                const raw = record.condition_applied as Record<string, unknown>;
                const target = toParticipantReference(raw.target);

                if (
                    !target ||
                    typeof raw.condition_name !== "string" ||
                    raw.condition_name.trim().length === 0
                ) {
                    return null;
                }

                return {
                    actor: toParticipantReference(raw.actor),
                    target,
                    condition_name: raw.condition_name,
                    duration_rounds:
                        typeof raw.duration_rounds === "number"
                            ? raw.duration_rounds
                            : null,
                    source:
                        typeof raw.source === "string" ? raw.source : null,
                    summary:
                        typeof raw.summary === "string" ? raw.summary : null,
                };
            })()
            : null;

    const condition_removed =
        record.condition_removed &&
            typeof record.condition_removed === "object" &&
            !Array.isArray(record.condition_removed)
            ? (() => {
                const raw = record.condition_removed as Record<string, unknown>;
                const target = toParticipantReference(raw.target);

                if (
                    !target ||
                    typeof raw.condition_name !== "string" ||
                    raw.condition_name.trim().length === 0
                ) {
                    return null;
                }

                return {
                    actor: toParticipantReference(raw.actor),
                    target,
                    condition_name: raw.condition_name,
                    summary:
                        typeof raw.summary === "string" ? raw.summary : null,
                };
            })()
            : null;

    const combat_ended =
        record.combat_ended &&
            typeof record.combat_ended === "object" &&
            !Array.isArray(record.combat_ended)
            ? (() => {
                const raw = record.combat_ended as Record<string, unknown>;
                const winner_side = (
                    raw.winner_side === "players" ||
                    raw.winner_side === "enemies" ||
                    raw.winner_side === "none" ||
                    raw.winner_side === "unknown"
                ) ? (raw.winner_side as "players" | "enemies" | "none" | "unknown") : null;

                return {
                    winner_side,
                    reason:
                        typeof raw.reason === "string" ? raw.reason : null,
                    summary:
                        typeof raw.summary === "string" ? raw.summary : null,
                };
            })()
            : null;

    if (
        !damage_applied &&
        !healing_applied &&
        !condition_applied &&
        !condition_removed &&
        !combat_ended
    ) {
        return null;
    }

    return {
        damage_applied,
        healing_applied,
        condition_applied,
        condition_removed,
        combat_ended,
    };
}

function normalizeDiceRollRequired(value: MaybeDiceRollRequired): JsonObject | null {
    if (!value || !value.needed) return null;

    return {
        needed: true,
        stat: value.stat ?? null,
        skill: value.skill ?? null,
        dc: typeof value.dc === "number" ? value.dc : null,
        reason: value.reason ?? null,
    };
}

function hasMatchingClientEvent(
    events: NarrativeEventRow[],
    clientEventId: string | null,
): boolean {
    if (!clientEventId) return false;
    return events.some((event) => event.client_event_id === clientEventId);
}

function isDuplicateError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return (
        message.includes("duplicate key") ||
        message.includes("unique constraint") ||
        message.includes("uq_narrative_events_session_client_event_id")
    );
}

async function persistInboundNarrativeEvent(params: {
    repository: EngineStreamRepository;
    character: CharacterRecord;
    content: string;
    normalizedSessionId: string | null;
    normalizedClientEventId: string;
    parsedDiceResult: DiceRollOutcome | null;
}): Promise<"ok" | "duplicate"> {
    const {
        repository,
        character,
        content,
        normalizedSessionId,
        normalizedClientEventId,
        parsedDiceResult,
    } = params;

    try {
        await repository.insertNarrativeEvents([
            {
                world_id: character.worlds?.id ?? null,
                character_id: character.id,
                role: "user",
                content,
                session_id: normalizedSessionId,
                client_event_id: normalizedClientEventId,
                event_type: "player_message",
                payload: parsedDiceResult
                    ? ({
                        dice_result: parsedDiceResult,
                    } as JsonObject)
                    : null,
                dice_roll_required: null,
            },
        ]);
        return "ok";
    } catch (error) {
        if (isDuplicateError(error)) {
            return "duplicate";
        }
        throw error;
    }
}

function buildUpdatedCharacterCombatState(params: {
    character: CharacterRecord;
    combatUpdate: CombatUpdate;
    currentCombatState: CombatState;
}): CombatState {
    const { combatUpdate, currentCombatState } = params;

    if (combatUpdate.start) {
        return {
            in_combat: true,
            turn: typeof combatUpdate.turn_index === "number" ? combatUpdate.turn_index : 0,
            round: typeof combatUpdate.round === "number" ? combatUpdate.round : 1,
            participants: safeArray(combatUpdate.participants).map((participant) => ({
                name: participant.name,
                hp: participant.hp,
                max_hp: participant.max_hp,
                ac: participant.ac,
                initiative: participant.initiative ?? 0,
                is_player: false,
                is_defeated: participant.hp <= 0,
            })),
        };
    }

    if (combatUpdate.end) {
        return {
            in_combat: false,
            turn: 0,
            round: 1,
            participants: [],
        };
    }

    return {
        ...currentCombatState,
        turn:
            typeof combatUpdate.turn_index === "number"
                ? combatUpdate.turn_index
                : currentCombatState.turn,
        round:
            typeof combatUpdate.round === "number"
                ? combatUpdate.round
                : currentCombatState.round,
        participants:
            safeArray(combatUpdate.participants).length > 0
                ? safeArray(combatUpdate.participants).map((participant) => ({
                    name: participant.name,
                    hp: participant.hp,
                    max_hp: participant.max_hp,
                    ac: participant.ac,
                    initiative: participant.initiative ?? 0,
                    is_player: false,
                    is_defeated: participant.hp <= 0,
                }))
                : currentCombatState.participants,
    };
}

function toStreamDoneChunk(payload?: JsonObject | null): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(`data: ${JSON.stringify({ done: true, ...(payload ?? {}) })}\n\n`);
}

export async function readStreamResponse(response: Response): Promise<string> {
    if (!response.body) return "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let output = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output += decoder.decode(value, { stream: true });
    }

    output += decoder.decode();
    return output;
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
    const normalizedClientEventId = clientEventId ?? randomUUID();
    const parsedDiceResult = parseDiceResultMarker(content);
    const contentForModel = parsedDiceResult
        ? buildDiceResolutionPrompt(parsedDiceResult)
        : content;

    const [recentEvents, sessionPlayers, sessionCombatState, relevantRules] =
        await Promise.all([
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
        character.combat_state as CombatState | null,
    );

    if (normalizedSessionId && hasMatchingClientEvent(recentEvents, normalizedClientEventId)) {
        return Response.json({ ok: true, duplicate: true, system_only: true });
    }

    const persistedInboundEvent = await persistInboundNarrativeEvent({
        repository,
        character,
        content,
        normalizedSessionId,
        normalizedClientEventId,
        parsedDiceResult,
    });

    if (persistedInboundEvent === "duplicate") {
        return Response.json({ ok: true, duplicate: true, system_only: true });
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
            participants: currentCombatState.participants.map((participant: CombatParticipant) => ({
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
    const assistantClientEventId = randomUUID();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const result = await modelGateway.generateContentStream({
                    prompt,
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
                        event_type: "gm_message",
                        payload: null,
                        dice_roll_required: normalizeDiceRollRequired(diceRollRequired),
                    },
                ]);

                if (normalizedSessionId && sessionCombatState && combatEventResolution) {
                    const persistResult = await repository.persistCombatEvents({
                        worldId: character.worlds?.id ?? null,
                        characterId: character.id,
                        sessionId: normalizedSessionId,
                        resolution: combatEventResolution,
                        currentState: sessionCombatState,
                        actingParticipant: {
                            user_id: userId ?? null,
                            character_id: character.id,
                            name: character.name,
                        },
                    });

                    for (const touched of persistResult.touchedCharacterHp) {
                        await repository.updateCharacter(touched.characterId, {
                            hp_current: touched.hp,
                        });
                    }

                    if (
                        persistResult.combatState &&
                        persistResult.combatState.participants.length > 0
                    ) {
                        await repository.updateSessionCombatParticipants(
                            normalizedSessionId,
                            persistResult.combatState.participants,
                        );
                    }

                    if (persistResult.combatEnded) {
                        controller.enqueue(
                            toStreamDoneChunk({
                                combat_ended: true,
                            }),
                        );
                        controller.close();
                        return;
                    }
                }

                if (!normalizedSessionId) {
                    if (typeof newHp === "number" || inventory.length !== safeArray(character.inventory).length) {
                        await repository.updateCharacter(character.id, {
                            hp_current: newHp,
                            inventory,
                        });
                    }

                    if (combatUpdate) {
                        const nextState = buildUpdatedCharacterCombatState({
                            character,
                            combatUpdate,
                            currentCombatState,
                        });

                        await repository.updateCharacter(character.id, {
                            combat_state: nextState,
                        });
                    }
                } else if (sessionCombatState && combatUpdate) {
                    const nextState = updateSessionCombatStateFromModel({
                        currentState: sessionCombatState,
                        update: combatUpdate,
                        sessionPlayers,
                    });

                    await repository.upsertSessionCombatState(nextState);
                }

                controller.enqueue(toStreamDoneChunk());
                controller.close();
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Error desconocido";
                controller.enqueue(
                    encoder.encode(
                        `data: ${JSON.stringify({
                            error: errorMessage,
                        })}\n\n`,
                    ),
                );
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}

export function registerSessionInitiative(params: {
    currentState: SessionCombatStateRecord;
    userId: string;
    rolledInitiative: number;
}): {
    combatState: SessionCombatStateRecord;
    turnPlayerId: string | null;
} {
    const { currentState, userId, rolledInitiative } = params;

    const participants = currentState.participants.map((participant) => ({
        ...participant,
        conditions: Array.isArray(participant.conditions)
            ? participant.conditions.map((condition) => ({ ...condition }))
            : [],
    }));

    const index = participants.findIndex((participant) => participant.user_id === userId);

    if (index === -1) {
        return {
            combatState: currentState,
            turnPlayerId: null,
        };
    }

    participants[index].initiative = rolledInitiative;

    participants.forEach((participant) => {
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

    const allPlayersRolled = participants
        .filter((participant) => participant.is_player)
        .every((participant) => typeof participant.initiative === "number");

    if (!allPlayersRolled) {
        return {
            combatState: {
                ...currentState,
                participants,
            },
            turnPlayerId: null,
        };
    }

    const orderedParticipants = participants.sort(
        (left, right) => (right.initiative ?? 0) - (left.initiative ?? 0),
    );

    const combatState: SessionCombatStateRecord = {
        ...currentState,
        status: "active",
        round: currentState.round > 0 ? currentState.round : 1,
        turn_index: 0,
        participants: orderedParticipants,
    };

    const activeParticipant = orderedParticipants[0];

    return {
        combatState,
        turnPlayerId: resolveTurnPlayerIdFromParticipant(activeParticipant),
    };
}