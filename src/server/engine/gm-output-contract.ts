import type { JsonObject } from "@/server/combat/session-combat";
import type {
    CombatEventResolution,
    CombatParticipantReference,
} from "@/server/combat/session-combat-events";
import type { NarrativeSemanticPayload } from "@/server/world/world-state-types";

export type StateChanges = {
    hp_delta: number;
    inventory_added: string[];
    inventory_removed: string[];
};

export type DiceRollRequest = {
    needed: boolean;
    stat: string | null;
    skill: string | null;
    dc: number | null;
    reason: string | null;
};

export type CombatParticipantDraft = {
    name: string;
    hp: number;
    max_hp: number;
    ac: number;
    initiative?: number;
};

export type CombatUpdate = {
    start: boolean;
    end: boolean;
    participants: CombatParticipantDraft[];
    turn_index: number;
    round: number;
};

export type GmStructuredOutput = {
    narrative_response: string;
    state_changes: StateChanges;
    dice_roll_required: DiceRollRequest;
    combat: CombatUpdate | null;
    combat_events: CombatEventResolution;
    semantic: NarrativeSemanticPayload | null;
};

export type ParsedGmStructuredOutput = {
    narrative: string;
    stateChanges: StateChanges | null;
    diceRollRequired: DiceRollRequest | null;
    combatUpdate: CombatUpdate | null;
    combatEventResolution: CombatEventResolution;
    semantic: NarrativeSemanticPayload | null;
    validationErrors: string[];
    rawJson: string | null;
};

const FALLBACK_NARRATIVE =
    "La situación cambia, pero la salida estructurada del motor no pudo validarse del todo. Continúa con cautela.";

const GM_OUTPUT_SCHEMA_EXAMPLE = `{
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
  },
  "semantic": {
    "entities": [],
    "quests": {
      "upserts": [],
      "updates": []
    },
    "relationships": [],
    "companions": []
  }
}`;

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function asOptionalTrimmedString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function asStringArray(value: unknown, fieldName: string, errors: string[]): string[] {
    if (value == null) {
        return [];
    }

    if (!Array.isArray(value)) {
        errors.push(`${fieldName} debe ser un array de strings.`);
        return [];
    }

    const invalid = value.some((item) => typeof item !== "string");
    if (invalid) {
        errors.push(`${fieldName} contiene valores inválidos.`);
        return value.filter((item): item is string => typeof item === "string");
    }

    return value;
}

function normalizeCombatParticipantReference(
    value: unknown,
    fieldName: string,
    errors: string[],
): CombatParticipantReference | null {
    if (value == null) {
        return null;
    }

    if (!isRecord(value)) {
        errors.push(`${fieldName} debe ser un objeto.`);
        return null;
    }

    const participant_id = asOptionalTrimmedString(value.participant_id ?? value.id);
    const character_id = asOptionalTrimmedString(value.character_id);
    const user_id = asOptionalTrimmedString(value.user_id);
    const name = asOptionalTrimmedString(value.name);

    if (!participant_id && !character_id && !user_id && !name) {
        errors.push(`${fieldName} debe incluir al menos un identificador.`);
        return null;
    }

    return {
        participant_id,
        character_id,
        user_id,
        name,
    };
}

function normalizeStateChanges(value: unknown, errors: string[]): StateChanges | null {
    if (value == null) {
        return null;
    }

    if (!isRecord(value)) {
        errors.push("state_changes debe ser un objeto.");
        return null;
    }

    const hpDelta = value.hp_delta;
    if (hpDelta != null && !isFiniteNumber(hpDelta)) {
        errors.push("state_changes.hp_delta debe ser numérico.");
        return null;
    }

    const normalizedHpDelta = hpDelta == null ? 0 : isFiniteNumber(hpDelta) ? hpDelta : 0;

    return {
        hp_delta: normalizedHpDelta,
        inventory_added: asStringArray(
            value.inventory_added,
            "state_changes.inventory_added",
            errors,
        ),
        inventory_removed: asStringArray(
            value.inventory_removed,
            "state_changes.inventory_removed",
            errors,
        ),
    };
}

function normalizeDiceRollRequired(
    value: unknown,
    errors: string[],
): DiceRollRequest | null {
    if (value == null) {
        return null;
    }

    if (!isRecord(value)) {
        errors.push("dice_roll_required debe ser un objeto.");
        return null;
    }

    const needed = value.needed === true;
    const stat = asOptionalTrimmedString(value.stat);
    const skill = asOptionalTrimmedString(value.skill);
    const dc = value.dc == null ? null : isFiniteNumber(value.dc) ? value.dc : null;
    const reason = asOptionalTrimmedString(value.reason);

    if (needed) {
        if (!stat) {
            errors.push("dice_roll_required.stat es obligatorio cuando needed=true.");
        }

        if (dc == null) {
            errors.push("dice_roll_required.dc es obligatorio cuando needed=true.");
        }

        if (!stat || dc == null) {
            return null;
        }
    }

    if (value.dc != null && dc == null) {
        errors.push("dice_roll_required.dc debe ser numérico.");
    }

    return {
        needed,
        stat,
        skill,
        dc,
        reason,
    };
}

function normalizeCombatParticipantDraft(
    value: unknown,
    index: number,
    errors: string[],
): CombatParticipantDraft | null {
    if (!isRecord(value)) {
        errors.push(`combat.participants[${index}] debe ser un objeto.`);
        return null;
    }

    const name = asOptionalTrimmedString(value.name);
    const hp = value.hp;
    const maxHp = value.max_hp;
    const ac = value.ac;
    const initiative = value.initiative;

    if (!name) {
        errors.push(`combat.participants[${index}].name es obligatorio.`);
        return null;
    }

    if (!isFiniteNumber(hp) || !isFiniteNumber(maxHp) || !isFiniteNumber(ac)) {
        errors.push(`combat.participants[${index}] tiene campos numéricos inválidos.`);
        return null;
    }

    return {
        name,
        hp,
        max_hp: maxHp,
        ac,
        ...(isFiniteNumber(initiative) ? { initiative } : {}),
    };
}

function normalizeCombatUpdate(value: unknown, errors: string[]): CombatUpdate | null {
    if (value == null) {
        return null;
    }

    if (!isRecord(value)) {
        errors.push("combat debe ser un objeto o null.");
        return null;
    }

    const participants = Array.isArray(value.participants)
        ? value.participants
            .map((participant, index) =>
                normalizeCombatParticipantDraft(participant, index, errors),
            )
            .filter((participant): participant is CombatParticipantDraft => participant !== null)
        : [];

    if (value.participants != null && !Array.isArray(value.participants)) {
        errors.push("combat.participants debe ser un array.");
    }

    const start = value.start === true;
    const end = value.end === true;
    const turnIndex = value.turn_index;
    const round = value.round;

    if (turnIndex != null && !isFiniteNumber(turnIndex)) {
        errors.push("combat.turn_index debe ser numérico.");
    }

    if (round != null && !isFiniteNumber(round)) {
        errors.push("combat.round debe ser numérico.");
    }

    return {
        start,
        end,
        participants,
        turn_index: isFiniteNumber(turnIndex) ? turnIndex : 0,
        round: isFiniteNumber(round) ? round : 1,
    };
}

function normalizeCombatEventResolution(
    value: unknown,
    errors: string[],
): CombatEventResolution {
    if (value == null) {
        return null;
    }

    if (!isRecord(value)) {
        errors.push("combat_events debe ser un objeto o null.");
        return null;
    }

    const damage_applied = (() => {
        const raw = value.damage_applied;
        if (raw == null) return null;
        if (!isRecord(raw)) {
            errors.push("combat_events.damage_applied debe ser un objeto.");
            return null;
        }

        const target = normalizeCombatParticipantReference(
            raw.target,
            "combat_events.damage_applied.target",
            errors,
        );

        if (!target || !isFiniteNumber(raw.amount)) {
            errors.push("combat_events.damage_applied requiere target y amount válidos.");
            return null;
        }

        return {
            actor: normalizeCombatParticipantReference(
                raw.actor,
                "combat_events.damage_applied.actor",
                errors,
            ),
            target,
            amount: raw.amount,
            damage_type: asOptionalTrimmedString(raw.damage_type),
            summary: asOptionalTrimmedString(raw.summary),
        };
    })();

    const healing_applied = (() => {
        const raw = value.healing_applied;
        if (raw == null) return null;
        if (!isRecord(raw)) {
            errors.push("combat_events.healing_applied debe ser un objeto.");
            return null;
        }

        const target = normalizeCombatParticipantReference(
            raw.target,
            "combat_events.healing_applied.target",
            errors,
        );

        if (!target || !isFiniteNumber(raw.amount)) {
            errors.push("combat_events.healing_applied requiere target y amount válidos.");
            return null;
        }

        return {
            actor: normalizeCombatParticipantReference(
                raw.actor,
                "combat_events.healing_applied.actor",
                errors,
            ),
            target,
            amount: raw.amount,
            summary: asOptionalTrimmedString(raw.summary),
        };
    })();

    const condition_applied = (() => {
        const raw = value.condition_applied;
        if (raw == null) return null;
        if (!isRecord(raw)) {
            errors.push("combat_events.condition_applied debe ser un objeto.");
            return null;
        }

        const target = normalizeCombatParticipantReference(
            raw.target,
            "combat_events.condition_applied.target",
            errors,
        );
        const conditionName = asOptionalTrimmedString(raw.condition_name);

        if (!target || !conditionName) {
            errors.push(
                "combat_events.condition_applied requiere target y condition_name válidos.",
            );
            return null;
        }

        return {
            actor: normalizeCombatParticipantReference(
                raw.actor,
                "combat_events.condition_applied.actor",
                errors,
            ),
            target,
            condition_name: conditionName,
            duration_rounds: isFiniteNumber(raw.duration_rounds) ? raw.duration_rounds : null,
            source: asOptionalTrimmedString(raw.source),
            summary: asOptionalTrimmedString(raw.summary),
        };
    })();

    const condition_removed = (() => {
        const raw = value.condition_removed;
        if (raw == null) return null;
        if (!isRecord(raw)) {
            errors.push("combat_events.condition_removed debe ser un objeto.");
            return null;
        }

        const target = normalizeCombatParticipantReference(
            raw.target,
            "combat_events.condition_removed.target",
            errors,
        );
        const conditionName = asOptionalTrimmedString(raw.condition_name);

        if (!target || !conditionName) {
            errors.push(
                "combat_events.condition_removed requiere target y condition_name válidos.",
            );
            return null;
        }

        return {
            actor: normalizeCombatParticipantReference(
                raw.actor,
                "combat_events.condition_removed.actor",
                errors,
            ),
            target,
            condition_name: conditionName,
            summary: asOptionalTrimmedString(raw.summary),
        };
    })();

    const combat_ended = (() => {
        const raw = value.combat_ended;
        if (raw == null) return null;
        if (!isRecord(raw)) {
            errors.push("combat_events.combat_ended debe ser un objeto.");
            return null;
        }

        const winnerSide: "players" | "enemies" | "none" | "unknown" | null =
            raw.winner_side === "players" ||
                raw.winner_side === "enemies" ||
                raw.winner_side === "none" ||
                raw.winner_side === "unknown"
                ? raw.winner_side
                : null;

        if (raw.winner_side != null && !winnerSide) {
            errors.push("combat_events.combat_ended.winner_side es inválido.");
        }

        return {
            winner_side: winnerSide,
            reason: asOptionalTrimmedString(raw.reason),
            summary: asOptionalTrimmedString(raw.summary),
        };
    })();

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

function stripMarkdownFences(input: string): string {
    return input.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
}

function extractFirstJsonObject(input: string): string | null {
    const text = stripMarkdownFences(input);
    const start = text.indexOf("{");
    if (start === -1) {
        return null;
    }

    let depth = 0;
    let inString = false;
    let escaping = false;

    for (let index = start; index < text.length; index += 1) {
        const char = text[index];

        if (inString) {
            if (escaping) {
                escaping = false;
                continue;
            }

            if (char === "\\") {
                escaping = true;
                continue;
            }

            if (char === '"') {
                inString = false;
            }

            continue;
        }

        if (char === '"') {
            inString = true;
            continue;
        }

        if (char === "{") {
            depth += 1;
            continue;
        }

        if (char === "}") {
            depth -= 1;
            if (depth === 0) {
                return text.slice(start, index + 1);
            }
        }
    }

    return null;
}

function sanitizeNarrativeFallback(input: string): string {
    const text = stripMarkdownFences(input).trim();
    if (!text) {
        return FALLBACK_NARRATIVE;
    }

    return text.slice(0, 4000);
}

export function buildGmOutputFormatInstructions(): string {
    return [
        "Debes devolver un único JSON válido con esta forma exacta:",
        GM_OUTPUT_SCHEMA_EXAMPLE,
        "Reglas importantes:",
        "- No escribas texto fuera del JSON.",
        "- narrative_response es obligatorio y debe ser texto plano narrativo.",
        "- narrative_response debe aportar información nueva o consecuencias concretas; nunca debe limitarse a reformular el último beat.",
        "- Si el jugador duda, está confundido o pregunta algo, aclara la escena dentro de la ficción y ofrece opciones útiles; no repitas el mismo gancho.",
        "- Si el jugador inspecciona o pregunta qué es algo, describe detalles observables, sensoriales o funcionales antes de proponer la siguiente decisión.",
        "- No cierres por defecto con la misma pregunta genérica. Varía el cierre y solo formula una nueva decisión si la escena ya avanzó.",
        "- state_changes, dice_roll_required y combat_events solo pueden contener datos estructurados válidos.",
        "- Si no corresponde un bloque, mantenlo como null o con valores vacíos válidos.",
        "- Si el jugador ya tiró dados y el resultado está indicado en el prompt, no pidas otra tirada para esa misma acción.",
        "- Si hay combate multijugador activo, respeta el estado compartido.",
        "- Solo avanza turno mediante consecuencia narrativa apropiada; el evento explícito lo persiste el backend.",
        "- Si una regla del manual es relevante, priorízala y refléjala de forma natural en la escena.",
        "- No inventes páginas ni cites reglas inexistentes.",
        "- Mantén consistencia con el historial reciente.",
    ].join("\n");
}

export function normalizeDiceRollRequestForEvent(
    value: DiceRollRequest | null,
): JsonObject | null {
    if (!value || !value.needed) {
        return null;
    }

    return {
        needed: true,
        stat: value.stat ?? null,
        skill: value.skill ?? null,
        dc: value.dc ?? null,
        reason: value.reason ?? null,
    };
}

export function parseGmStructuredOutput(fullResponse: string): ParsedGmStructuredOutput {
    const validationErrors: string[] = [];
    const rawJson = extractFirstJsonObject(fullResponse);

    if (!rawJson) {
        validationErrors.push("No se encontró un objeto JSON válido en la respuesta del GM.");

        return {
            narrative: sanitizeNarrativeFallback(fullResponse),
            stateChanges: null,
            diceRollRequired: null,
            combatUpdate: null,
            combatEventResolution: null,
            semantic: null,
            validationErrors,
            rawJson: null,
        };
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(rawJson);
    } catch {
        validationErrors.push("El objeto JSON del GM no pudo parsearse.");

        return {
            narrative: sanitizeNarrativeFallback(fullResponse),
            stateChanges: null,
            diceRollRequired: null,
            combatUpdate: null,
            combatEventResolution: null,
            semantic: null,
            validationErrors,
            rawJson,
        };
    }

    if (!isRecord(parsed)) {
        validationErrors.push("La raíz del contrato del GM debe ser un objeto.");

        return {
            narrative: sanitizeNarrativeFallback(fullResponse),
            stateChanges: null,
            diceRollRequired: null,
            combatUpdate: null,
            combatEventResolution: null,
            semantic: null,
            validationErrors,
            rawJson,
        };
    }

    const narrative = asOptionalTrimmedString(parsed.narrative_response);

    if (!narrative) {
        validationErrors.push("narrative_response es obligatorio.");
    }

    const stateChanges = normalizeStateChanges(parsed.state_changes, validationErrors);
    const diceRollRequired = normalizeDiceRollRequired(
        parsed.dice_roll_required,
        validationErrors,
    );
    const combatUpdate = normalizeCombatUpdate(parsed.combat, validationErrors);
    const combatEventResolution = normalizeCombatEventResolution(
        parsed.combat_events,
        validationErrors,
    );
    const semantic = (parsed.semantic as NarrativeSemanticPayload) || null;

    return {
        narrative: narrative ?? sanitizeNarrativeFallback(fullResponse),
        stateChanges,
        diceRollRequired,
        combatUpdate,
        combatEventResolution,
        semantic,
        validationErrors,
        rawJson,
    };
}