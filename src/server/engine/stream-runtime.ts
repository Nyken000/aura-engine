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
    SemanticEntityKind,
} from "@/server/world/world-state-types";
import {
    buildGmOutputFormatInstructions,
    normalizeDiceRollRequestForEvent,
    parseGmStructuredOutput,
    type CombatUpdate,
} from "@/server/engine/gm-output-contract";
import {
    summarizeStructuredIntent,
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
    channel: "adventure" | "group";
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

export interface StreamModelChunk {
    text(): string;
}

export interface EngineStreamModelGateway {
    generateContentStream(params: {
        prompt: string;
    }): Promise<AsyncIterable<StreamModelChunk>>;
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



function safeArray<T>(value: T[] | null | undefined): T[] {
    return Array.isArray(value) ? value : [];
}

function buildIntentAwareContent(params: {
    content?: string | null;
    intent?: StructuredIntent | null;
}): string | null {
    const content = params.content?.trim();

    if (content) {
        return content;
    }

    if (!params.intent) {
        return null;
    }

    const prompt = params.intent.prompt?.trim();
    if (prompt) {
        return prompt;
    }

    return summarizeStructuredIntent(params.intent);
}

function buildStructuredIntentPrompt(intent: StructuredIntent | null): string {
    if (!intent) return '';

    const targetLines =
        intent.target.kind === 'quest'
            ? [
                  `Objetivo: misión`,
                  `Slug: ${intent.target.questSlug}`,
                  `Título: ${intent.target.questTitle}`,
                  intent.target.objectiveSummary
                      ? `Resumen del objetivo: ${intent.target.objectiveSummary}`
                      : null,
                  intent.target.rewardSummary
                      ? `Recompensa conocida: ${intent.target.rewardSummary}`
                      : null,
                  intent.target.offeredByNpcName
                      ? `NPC relacionado: ${intent.target.offeredByNpcName}`
                      : null,
              ]
            : intent.target.kind === 'relationship'
              ? [
                    `Objetivo: relación social`,
                    `NPC: ${intent.target.npcName}`,
                    `Clave NPC: ${intent.target.npcKey}`,
                ]
              : [
                    `Objetivo: entidad del mundo`,
                    `Tipo entidad: ${intent.target.entityKind}`,
                    `Clave entidad: ${intent.target.entityKey}`,
                    `Etiqueta: ${intent.target.entityLabel}`,
                ];

    return `
ACCION ESTRUCTURADA DEL JUGADOR
Tipo: ${intent.type}
${targetLines.filter(Boolean).join("\n")}
Instrucción: trata esta intención como una acción explícita y confiable del jugador. Debes responder de forma consistente con esta acción, actualizar la semántica correspondiente y evitar reinterpretarla como una sugerencia ambigua.
`.trim();
}

function deriveSemanticFromIntent(intent: StructuredIntent | null): NarrativeSemanticPayload | null {
    if (!intent) return null;

    if (intent.target.kind === 'quest') {
        const baseQuest = {
            slug: intent.target.questSlug,
            title: intent.target.questTitle,
            description: intent.prompt ?? summarizeStructuredIntent(intent),
            status:
                intent.type === 'quest.accept'
                    ? 'accepted'
                    : intent.type === 'quest.decline'
                      ? 'declined'
                      : 'offered',
            objectiveSummary: intent.target.objectiveSummary ?? null,
            rewardSummary: intent.target.rewardSummary ?? null,
            offeredByNpcKey: intent.target.offeredByNpcKey ?? null,
            metadata: { source: 'structured_intent', intent_type: intent.type },
        } as const;

        if (intent.type === 'quest.negotiate') {
            return {
                entities: [],
                quests: {
                    upserts: [],
                    updates: [
                        {
                            slug: intent.target.questSlug,
                            updateType: 'note',
                            title: `Negociación abierta: ${intent.target.questTitle}`,
                            description: intent.prompt ?? summarizeStructuredIntent(intent),
                            payload: { source: 'structured_intent', intent_type: intent.type },
                        },
                    ],
                },
            };
        }

        return {
            entities: [],
            quests: {
                upserts: [baseQuest],
                updates: [
                    {
                        slug: intent.target.questSlug,
                        updateType: intent.type === 'quest.accept' ? 'accepted' : 'declined',
                        title: intent.target.questTitle,
                        description: intent.prompt ?? summarizeStructuredIntent(intent),
                        payload: { source: 'structured_intent', intent_type: intent.type },
                    },
                ],
            },
        };
    }

    if (intent.target.kind === 'relationship') {
        return {
            entities: [{ kind: 'npc', key: intent.target.npcKey, label: intent.target.npcName }],
            relationships: [
                {
                    npcKey: intent.target.npcKey,
                    npcName: intent.target.npcName,
                    favorDebtDelta: intent.type === 'relationship.collect_favor' ? -1 : 0,
                    trustDelta: 0,
                    reason: intent.prompt ?? summarizeStructuredIntent(intent),
                    metadata: { source: 'structured_intent', intent_type: intent.type },
                },
            ],
        };
    }

    return {
        entities: [
            {
                kind: intent.target.entityKind === 'npc' ? 'npc' : intent.target.entityKind as SemanticEntityKind,
                key: intent.target.entityKey,
                label: intent.target.entityLabel,
            },
        ],
    };
}

function buildPrompt(params: {
    character: CharacterRecord;
    contentForModel: string;
    recentEvents: NarrativeEventRow[];
    sessionPlayers: SessionPlayerRow[];
    sessionCombatState: SessionCombatStateRecord | null;
    relevantRules: RuleMatchRecord[];
    snapshot?: { quests: SessionQuestRow[]; relationships: NpcRelationshipRow[] } | null;
    systemPrompt?: string;
}): string {
    const {
        character,
        contentForModel,
        recentEvents,
        sessionPlayers,
        sessionCombatState,
        relevantRules,
        snapshot,
        systemPrompt,
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

    const snapshotBlock = snapshot
        ? [
              "ESTADO DEL MUNDO (Snapshot)",
              "Misiones:",
              snapshot.quests.length > 0
                  ? snapshot.quests
                        .map((q: SessionQuestRow) => `- [${q.status}] ${q.title} (${q.slug})`)
                        .join("\n")
                  : "  Sin misiones activas.",
              "Relaciones:",
              snapshot.relationships.length > 0
                  ? snapshot.relationships
                        .map((r: NpcRelationshipRow) => `- ${r.npc_name}: Afinidad=${r.affinity}, Confianza=${r.trust}`)
                        .join("\n")
                  : "  Sin relaciones significativas.",
          ].join("\n")
        : "";

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
${systemPrompt || buildGmOutputFormatInstructions()}

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

${snapshotBlock}

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
    intent?: StructuredIntent | null;
}): Promise<"ok" | "duplicate"> {
    const {
        repository,
        character,
        content,
        normalizedSessionId,
        normalizedClientEventId,
        parsedDiceResult,
        channel,
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
                    ...(params.intent ? { intent: params.intent } : {}),
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

    const { characterId, content, sessionId, clientEventId, channel, intent } = body;

    const userMessage = buildIntentAwareContent({ content, intent });

    if (!characterId || !userMessage) {
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

    // 4. Derivar la semántica inicial de la intención
    const derivedSemantic = deriveSemanticFromIntent(intent ?? null);

    if (normalizedChannel === "group" && !normalizedSessionId) {
        return Response.json({ error: "El canal grupal requiere una sesión activa" }, { status: 400 });
    }

    let joinedSessionMembership: SessionAccessRecord | null = null;

    if (normalizedSessionId) {
        // 1. Resolver el contenido base (priorizar intent si no hay input manual)
        // NOTE: 'intent' is not defined in the provided context. Assuming it should be part of 'body' or a new parameter.
        // For now, I'll assume it's meant to be accessed from 'body' if it were there, or is a placeholder.
        // As per instruction, I'm inserting the code as given, which might introduce a reference error for 'intent'.
        // If 'intent' is meant to be part of 'body', the destructuring of 'body' would need to be updated.
        // For faithful insertion, I'll insert it as is.
        // const userMessage = buildIntentAwareContent({ content, intent });
        // if (!userMessage) {
        //     throw new Error("Se requiere contenido o una intención estructurada");
        // }

        // 2. Construir el prompt del sistema incluyendo la intención si existe
        // const intentPrompt = buildStructuredIntentPrompt(intent);

        // 3. Obtener el snapshot inicial
        // const snapshot = await repository.getSessionSnapshot(sessionId);

        // 4. Derivar la semántica inicial de la intención
        // const derivedSemantic = deriveSemanticFromIntent(intent);

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

    const parsedDiceResult = parseDiceResultMarker(userMessage);
    const contentForModel = parsedDiceResult
        ? buildDiceResolutionPrompt(parsedDiceResult)
        : userMessage;

    logger?.('data_fetching_start');
    const start = Date.now();
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
    logger?.('data_fetching_end', {
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
        content: userMessage,
        normalizedSessionId,
        normalizedClientEventId,
        parsedDiceResult,
        channel: normalizedChannel,
        intent: intent ?? null,
    });

    if (persistedInboundEvent === "duplicate") {
        return Response.json({ ok: true, duplicate: true, system_only: true });
    }

    const initMatch = userMessage.match(/\[SISTEMA_INICIATIVA:\s*(\d+)\]/);
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

    const nextTurnMatch = userMessage.match(/\[SISTEMA_TURNO_SIGUIENTE\]/);
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

    const snapshot = normalizedSessionId 
        ? await repository.getSessionSnapshot(normalizedSessionId)
        : null;

    const intentPrompt = buildStructuredIntentPrompt(intent ?? null);
    const gmInstructions = buildGmOutputFormatInstructions();

    const fullSystemPrompt = [
        gmInstructions,
        intentPrompt,
    ].filter(Boolean).join("\n\n");

    const encoder = new TextEncoder();
    let fullResponse = "";
    const assistantClientEventId = randomUUID();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const result = await modelGateway.generateContentStream({
                    prompt: buildPrompt({
                        character,
                        contentForModel,
                        recentEvents,
                        sessionPlayers,
                        sessionCombatState,
                        relevantRules,
                        snapshot,
                        systemPrompt: fullSystemPrompt,
                    }),
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
                    semantic: gmSemantic,
                    validationErrors,
                } = parseGmStructuredOutput(fullResponse);

                const semantic = mergeSemanticPayload(gmSemantic, derivedSemantic);

                if (validationErrors.length > 0) {
                    console.warn("GM output contract validation issues:", validationErrors);
                }

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
                        event_type: "gm_message",
                        payload: semantic ? ({ semantic } as JsonObject) : null,
                        dice_roll_required: normalizeDiceRollRequestForEvent(diceRollRequired),
                    },
                ]);

                if (normalizedSessionId && semantic) {
                    await repository.persistNarrativeSemantic({
                        sessionId: normalizedSessionId,
                        worldId: character.worlds?.id ?? null,
                        characterId: character.id,
                        sourceEventId: assistantEventId,
                        semantic,
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

function mergeUniqueByKey<T>(items: T[], key: (item: T) => string): T[] {
    const map = new Map<string, T>();

    for (const item of items) {
        map.set(key(item), item);
    }

    return [...map.values()];
}

function mergeSemanticPayload(
    base: NarrativeSemanticPayload | null,
    derived: NarrativeSemanticPayload | null,
): NarrativeSemanticPayload | null {
    if (!base && !derived) return null;
    if (!base) return derived;
    if (!derived) return base;

    return {
        entities: mergeUniqueByKey(
            [...safeArray(base.entities), ...safeArray(derived.entities)],
            (item) => `${item.kind}:${item.key}`,
        ),
        quests: {
            upserts: mergeUniqueByKey(
                [...safeArray(base.quests?.upserts), ...safeArray(derived.quests?.upserts)],
                (item) => item.slug,
            ),
            updates: mergeUniqueByKey(
                [...safeArray(base.quests?.updates), ...safeArray(derived.quests?.updates)],
                (item) => `${item.slug}:${item.updateType}:${item.title}`,
            ),
        },
        relationships: mergeUniqueByKey(
            [...safeArray(base.relationships), ...safeArray(derived.relationships)],
            (item) => `${item.npcKey}:${item.reason}`,
        ),
        companions: mergeUniqueByKey(
            [...safeArray(base.companions), ...safeArray(derived.companions)],
            (item) => `${item.npcKey}:${item.action}`,
        ),
    };
}