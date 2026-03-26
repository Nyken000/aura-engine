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
import type {
    NarrativeSemanticPayload,
} from "@/server/world/world-state-types";
import {
    normalizeDiceRollRequestForEvent,
    parseGmStructuredOutput,
    type CombatUpdate,
    GM_STATE_SCHEMA_EXAMPLE,
} from "@/server/engine/gm-output-contract";
import {
    assessNarrativeProse,
    buildNarrativePrompt,
    buildNarrativeRepairPrompt,
    inferDirectorIntentKind,
    splitNarrativeForSse,
} from "@/server/engine/narrative-director";
import {
    isStructuredIntent,
    type StructuredIntent,
} from "@/lib/game/structured-intents";
import type { SessionAccessRecord } from "@/server/sessions/session-access";

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
    channel?: "adventure" | "group";
    intent?: StructuredIntent | null;
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

export type PersistNarrativeSemanticParams = {
    sessionId: string;
    worldId?: string | null;
    characterId: string;
    sourceEventId: string;
    semantic: NarrativeSemanticPayload;
};

export type SessionQuestRow = {
    id: string;
    session_id: string;
    slug: string;
    title: string;
    status: string;
    objective_summary?: string | null;
    reward_summary?: string | null;
};

export type NpcRelationshipRow = {
    id: string;
    npc_key: string;
    npc_name: string;
    affinity: number;
    trust: number;
};

export interface EngineStreamRepository {
    getCharacterWithWorld(characterId: string): Promise<CharacterRecord | null>;
    getJoinedSessionMembership(sessionId: string, userId: string): Promise<SessionAccessRecord | null>;
    getRecentSessionEvents(sessionId: string): Promise<NarrativeEventRow[]>;
    getRecentCharacterEvents(characterId: string): Promise<NarrativeEventRow[]>;
    getSessionPlayers(sessionId: string): Promise<SessionPlayerRow[]>;
    getSessionCombatState(sessionId: string): Promise<SessionCombatStateRecord | null>;
    searchRelevantRules(content: string): Promise<RuleMatchRecord[]>;
    insertNarrativeEvents(rows: NarrativeEventInsert[]): Promise<{ id: string }[]>;
    persistNarrativeSemantic(params: PersistNarrativeSemanticParams): Promise<void>;
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
    getSessionSnapshot(sessionId: string): Promise<{ quests: SessionQuestRow[]; relationships: NpcRelationshipRow[] }>;
}

export interface EngineStreamModelGateway {
    generateText(params: {
        prompt: string;
    }): Promise<string>;
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




function buildPrompt(params: {
    character: CharacterRecord;
    contentForModel: string;
    recentEvents: NarrativeEventRow[];
    sessionPlayers: SessionPlayerRow[];
    sessionCombatState: SessionCombatStateRecord | null;
    relevantRules: RuleMatchRecord[];
    snapshot?: { quests: SessionQuestRow[]; relationships: NpcRelationshipRow[] } | null;
    structuredIntent?: StructuredIntent | null;
}): string {
    const {
        character,
        contentForModel,
        recentEvents,
        sessionPlayers,
        sessionCombatState,
        relevantRules,
        snapshot,
        structuredIntent,
    } = params;

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
        : JSON.stringify(
            currentCombatToPromptState(
                null,
                character.combat_state as unknown as CombatState,
            ),
            null,
            2,
        );

    return buildNarrativePrompt({
        character: {
            name: character.name,
            hp_current: character.hp_current,
            hp_max: character.hp_max,
            inventory: character.inventory ?? [],
            stats: (character.stats as Record<string, unknown>) ?? {},
            world: {
                name: character.worlds?.name ?? null,
                description: character.worlds?.description ?? null,
            },
        },
        contentForModel,
        recentEvents: recentEvents.map((event) => ({
            role: event.role,
            content: event.content,
        })),
        sessionPlayers: sessionPlayers.map((player) => ({
            name: player.characters?.name ?? "Sin nombre",
            username: player.profiles?.username ?? null,
            hp_current: player.characters?.hp_current ?? null,
            hp_max: player.characters?.hp_max ?? null,
        })),
        relevantRules: relevantRules.map((rule) => ({
            title: rule.title,
            content: rule.content,
            page_from: rule.page_from ?? null,
            page_to: rule.page_to ?? null,
        })),
        snapshot: snapshot ?? null,
        structuredIntent: structuredIntent ?? null,
        combatStateLabel,
        stateSchemaExample: GM_STATE_SCHEMA_EXAMPLE,
    });
}

// Removed collectModelResponse and generateValidatedGmResponse as they are replaced by inline logic in processEngineStream



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
    channel: "adventure" | "group";
    normalizedIntent: StructuredIntent | null;
}): Promise<"ok" | "duplicate"> {
    const {
        repository,
        character,
        content,
        normalizedSessionId,
        normalizedClientEventId,
        parsedDiceResult,
        channel,
        normalizedIntent,
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
                event_type: channel === "group" ? "group_message" : "player_message",
                payload: ({
                    sender_name: character.name,
                    channel,
                    ...(parsedDiceResult ? { dice_result: parsedDiceResult } : {}),
                    ...(normalizedIntent ? { intent: normalizedIntent } : {}),
                } as JsonObject),
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


export type EngineStreamLogger = (message: string, payload?: Record<string, unknown>) => void;

export async function processEngineStream(params: {
    repository: EngineStreamRepository;
    modelGateway: EngineStreamModelGateway;
    userId: string | null | undefined;
    body: StreamRequestBody;
    logger?: EngineStreamLogger;
}): Promise<Response> {
    const { repository, modelGateway, userId, body, logger } = params;

    if (!userId) {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const normalizedIntent = isStructuredIntent(body.intent) ? body.intent : null;
    const { characterId, sessionId, clientEventId, channel } = body;
    const content = body.content || "";

    if (!characterId || !content) {
        return Response.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const character = await repository.getCharacterWithWorld(characterId);

    if (!character) {
        logger?.('character_not_found', { characterId });
        return Response.json({ error: "Personaje no encontrado" }, { status: 418 });
    }

    if (character.user_id !== userId) {
        logger?.('user_id_mismatch', { characterUserId: character.user_id, userId });
        return Response.json({ error: "No autorizado (personaje)" }, { status: 418 });
    }

    const normalizedSessionId = sessionId ?? null;
    const normalizedClientEventId = clientEventId ?? randomUUID();
    const normalizedChannel: "adventure" | "group" = channel === "group" ? "group" : "adventure";

    if (normalizedChannel === "group" && !normalizedSessionId) {
        return Response.json({ error: "El canal grupal requiere una sesión activa" }, { status: 400 });
    }

    let joinedSessionMembership: SessionAccessRecord | null = null;

    if (normalizedSessionId) {
        joinedSessionMembership = await repository.getJoinedSessionMembership(normalizedSessionId, userId);

        if (!joinedSessionMembership) {
            return Response.json({ error: "No autorizado para esta sesión" }, { status: 403 });
        }

        if (!joinedSessionMembership.character_id) {
            return Response.json(
                { error: "Debes seleccionar un personaje válido para esta sesión" },
                { status: 409 },
            );
        }

        if (joinedSessionMembership.character_id !== character.id) {
            return Response.json(
                { error: "El personaje activo no coincide con el personaje vinculado a la sesión" },
                { status: 409 },
            );
        }
    }

    const parsedDiceResult = parseDiceResultMarker(content);
    const contentForModel = parsedDiceResult
        ? buildDiceResolutionPrompt(parsedDiceResult)
        : content;

    logger?.("data_fetching_start");
    const start = Date.now();
    const [recentEvents, sessionPlayers, sessionCombatState, snapshot] =
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
            normalizedSessionId
                ? repository.getSessionSnapshot(normalizedSessionId)
                : Promise.resolve(null),
        ]);

    const relevantRules = await repository.searchRelevantRules(contentForModel);
    logger?.("data_fetching_end", {
        durationMs: Date.now() - start,
        eventsCount: recentEvents.length,
        playersCount: sessionPlayers.length,
        hasCombatState: !!sessionCombatState,
        rulesCount: relevantRules.length,
        sessionScoped: Boolean(joinedSessionMembership),
    });

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
        channel: normalizedChannel,
        normalizedIntent,
    });

    if (persistedInboundEvent === "duplicate") {
        return Response.json({ ok: true, duplicate: true, system_only: true });
    }

    if (normalizedChannel === "group") {
        return Response.json({ ok: true, system_only: true });
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

    const encoder = new TextEncoder();
    const assistantClientEventId = randomUUID();
    const intentKind = inferDirectorIntentKind({
        content,
        structuredIntent: normalizedIntent,
    });

    const stream = new ReadableStream({
        async start(controller) {
            try {
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ status: "thinking" })}\n\n`),
                );

                const narrativePrompt = buildPrompt({
                    character,
                    contentForModel,
                    recentEvents,
                    sessionPlayers,
                    sessionCombatState,
                    relevantRules,
                    snapshot,
                    structuredIntent: normalizedIntent,
                });

                let fullResponse = await modelGateway.generateText({
                    prompt: narrativePrompt,
                });

                let parsed = parseGmStructuredOutput(fullResponse);

                const proseAssessment = assessNarrativeProse({
                    narrative: parsed.narrative,
                    playerContent: content,
                    recentEvents,
                    intentKind,
                });

                if (!proseAssessment.ok && process.env.NODE_ENV !== "production") {
                    fullResponse = await modelGateway.generateText({
                        prompt: buildNarrativeRepairPrompt({
                            originalPrompt: narrativePrompt,
                            narrative: parsed.narrative,
                            issues: proseAssessment.issues,
                        }),
                    });

                    parsed = parseGmStructuredOutput(fullResponse);
                }

                const {
                    narrative,
                    stateChanges,
                    diceRollRequired,
                    combatUpdate,
                    combatEventResolution,
                    semantic: gmSemantic,
                    validationErrors,
                } = parsed;

                if (validationErrors.length > 0) {
                    console.warn("GM output contract validation issues:", validationErrors);
                }

                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ status: "narrating" })}\n\n`),
                );

                for (const part of splitNarrativeForSse(narrative)) {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ chunk: part })}\n\n`),
                    );
                }

                const resolvedSemantic = gmSemantic;

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

                const [{ id: assistantEventId }] = await repository.insertNarrativeEvents([
                    {
                        world_id: character.worlds?.id ?? null,
                        character_id: character.id,
                        role: "assistant",
                        content: narrative,
                        session_id: normalizedSessionId,
                        client_event_id: assistantClientEventId,
                        event_type: "narrative_update",
                        payload:
                            resolvedSemantic || normalizedIntent
                                ? ({
                                      ...(resolvedSemantic ? { semantic: resolvedSemantic } : {}),
                                      ...(normalizedIntent ? { intent: normalizedIntent } : {}),
                                  } as JsonObject)
                                : null,
                        dice_roll_required: normalizeDiceRollRequestForEvent(diceRollRequired),
                    },
                ]);

                if (normalizedSessionId && resolvedSemantic) {
                    await repository.persistNarrativeSemantic({
                        sessionId: normalizedSessionId,
                        worldId: character.worlds?.id ?? null,
                        characterId: character.id,
                        sourceEventId: assistantEventId,
                        semantic: resolvedSemantic,
                    });
                }

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

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}