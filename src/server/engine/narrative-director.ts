import type { StructuredIntent } from "@/lib/game/structured-intents";

export type DirectorCharacterLite = {
  name: string;
  hp_current: number;
  hp_max: number;
  inventory?: unknown[] | null;
  stats?: Record<string, unknown> | null;
  world?: {
    name?: string | null;
    description?: string | null;
  } | null;
};

export type DirectorEventLite = {
  role: string;
  content: string;
};

export type DirectorPlayerLite = {
  name: string;
  username?: string | null;
  hp_current?: number | null;
  hp_max?: number | null;
};

export type DirectorRuleLite = {
  title: string;
  content: string;
  page_from?: number | null;
  page_to?: number | null;
};

export type DirectorSnapshotLite = {
  quests: Array<{
    slug: string;
    title: string;
    status: string;
  }>;
  relationships: Array<{
    npc_name: string;
    affinity: number;
    trust: number;
  }>;
};

export type DirectorIntentKind =
  | "question"
  | "hesitation"
  | "inspection"
  | "movement"
  | "interaction"
  | "combat"
  | "decision"
  | "unknown";

export type NarrativeProseAssessment = {
  ok: boolean;
  issues: string[];
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getLastAssistantMessage(events: DirectorEventLite[]): string {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index]?.role === "assistant") {
      return events[index]?.content ?? "";
    }
  }

  return "";
}

function tokenOverlapRatio(left: string, right: string): number {
  const leftTokens = new Set(words(left));
  const rightTokens = new Set(words(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }

  return intersection / Math.max(leftTokens.size, rightTokens.size);
}

function clipWords(value: string, maxWords: number): string {
  return words(value).slice(0, maxWords).join(" ");
}

function hasSensoryLanguage(value: string): boolean {
  return /(olor|hedor|aroma|frio|frío|calor|humedad|crujido|rugido|latido|sabor|sal|metal|sangre|niebla|sombras|luz|penumbra|temblor|susurro|eco|vaho|dolor|presion|presión|textura|tacto|vibracion|vibración)/i.test(
    value,
  );
}

function hasEmotionalLanguage(value: string): boolean {
  return /(miedo|terror|angustia|duda|rabia|furia|alivio|ansiedad|inquietud|desesperacion|desesperación|presentimiento|horror|repulsion|repulsión|tension|tensión|obsesion|obsesión|vacío|vacío|urgencia|temor)/i.test(
    value,
  );
}

function hasConsequenceLanguage(value: string): boolean {
  return /(entonces|de pronto|al tocar|al mirar|al acercarte|cuando avanzas|como respuesta|en ese instante|a continuacion|a continuación|provoca|desencadena|revela|cambia|cede|retumba|se abre|responde|reacciona)/i.test(
    value,
  );
}

function hasConcreteAnswer(value: string): boolean {
  return /(es |parece|resulta|se trata de|identificas|reconoces|comprendes|notas que|ves que|descubres que)/i.test(
    value,
  );
}

function hasDistinctOptions(value: string): boolean {
  return /(puedes|podrias|podrías|si prefieres|otra opcion|otra opción|tambien puedes|también puedes|o bien)/i.test(
    value,
  );
}

function buildHistory(events: DirectorEventLite[]): string {
  return [...events]
    .slice(-6)
    .reverse()
    .map((event) => `${event.role.toUpperCase()}: ${event.content}`)
    .join("\n");
}

function buildPlayersBlock(players: DirectorPlayerLite[]): string {
  if (players.length === 0) {
    return "Sin otros jugadores activos en la escena.";
  }

  return players
    .map((player) => {
      return [
        `- ${player.name}${player.username ? ` (@${player.username})` : ""}`,
        `  HP: ${player.hp_current ?? "?"}/${player.hp_max ?? "?"}`,
      ].join("\n");
    })
    .join("\n");
}

function buildRulesBlock(rules: DirectorRuleLite[]): string {
  if (rules.length === 0) {
    return "No hay reglas relevantes recuperadas desde manuales.";
  }

  return rules
    .slice(0, 2)
    .map((rule, index) => {
      const pageInfo =
        rule.page_from || rule.page_to
          ? ` (páginas ${rule.page_from ?? "?"}-${rule.page_to ?? "?"})`
          : "";

      return `Regla ${index + 1}: ${rule.title}${pageInfo}\n${rule.content}`;
    })
    .join("\n\n");
}

function buildSnapshotBlock(snapshot?: DirectorSnapshotLite | null): string {
  if (!snapshot) return "Sin snapshot adicional.";

  const quests =
    snapshot.quests.length > 0
      ? snapshot.quests
          .slice(0, 4)
          .map((quest) => `- [${quest.status}] ${quest.title} (${quest.slug})`)
          .join("\n")
      : "  Sin misiones activas.";

  const relationships =
    snapshot.relationships.length > 0
      ? snapshot.relationships
          .slice(0, 4)
          .map(
            (relationship) =>
              `- ${relationship.npc_name}: Afinidad=${relationship.affinity}, Confianza=${relationship.trust}`,
          )
          .join("\n")
      : "  Sin relaciones significativas.";

  return ["Misiones:", quests, "Relaciones:", relationships].join("\n");
}

export function inferDirectorIntentKind(params: {
  content: string;
  structuredIntent?: StructuredIntent | null;
}): DirectorIntentKind {
  const { content, structuredIntent } = params;

  if (structuredIntent) {
    if (structuredIntent.type.startsWith("relationship.")) return "interaction";
    if (structuredIntent.type.startsWith("quest.")) return "decision";
    if (structuredIntent.type.startsWith("entity.investigate")) return "inspection";
  }

  const normalized = normalizeText(content);

  if (!normalized) return "unknown";
  if (/\?|^que es\b|^que ocurre\b|^quien\b|^donde\b|^por que\b|^como\b/.test(normalized)) {
    return "question";
  }
  if (/(no se|no sabo|no estoy seguro|que hago|que deberia hacer|ayuda|no entiendo|estoy confundido|dudo)/.test(normalized)) {
    return "hesitation";
  }
  if (/(miro|observo|examino|inspecciono|investigo|analizo|busco|reviso|escucho|huelo|palpo|me fijo)/.test(normalized)) {
    return "inspection";
  }
  if (/(camino|avanzo|voy|entro|salgo|subo|bajo|me acerco|me alejo|sigo|retrocedo|corro|escalo)/.test(normalized)) {
    return "movement";
  }
  if (/(pregunto|digo|hablo|respondo|saludo|negocio|persuado|convenzo|amenazo|pido ayuda|toco|agarro|uso)/.test(normalized)) {
    return "interaction";
  }
  if (/(ataco|golpeo|disparo|lanzo|hechizo|esquivo|bloqueo|apuñalo|embisto)/.test(normalized)) {
    return "combat";
  }

  return "decision";
}

function buildIntentDirective(intentKind: DirectorIntentKind): string {
  switch (intentKind) {
    case "question":
      return [
        "El jugador está haciendo una pregunta.",
        "Respóndela con claridad dentro de la ficción.",
        "No seas evasiva.",
        "Debes revelar al menos un dato útil y específico sobre el elemento preguntado.",
      ].join(" ");
    case "hesitation":
      return [
        "El jugador no sabe qué hacer.",
        "No repitas la escena.",
        "Integra entre 2 y 4 opciones diegéticas distintas dentro de la narración.",
        "Las opciones deben sentirse naturales, no como un menú robótico.",
      ].join(" ");
    case "inspection":
      return [
        "El jugador inspecciona la escena o un objeto.",
        "Revela al menos 2 detalles nuevos observables.",
        "Esos detalles deben ayudar a entender función, peligro, origen, estado o secreto.",
      ].join(" ");
    case "movement":
      return [
        "El jugador se desplaza o cruza un umbral.",
        "Muestra cómo cambia el entorno y qué consecuencia inmediata produce ese movimiento.",
      ].join(" ");
    case "interaction":
      return [
        "El jugador interactúa con alguien o algo.",
        "Debes mostrar reacción, resistencia, aceptación o cambio perceptible del entorno.",
      ].join(" ");
    case "combat":
      return [
        "El jugador actúa en situación de peligro o combate.",
        "Resuelve la consecuencia inmediata con tensión y claridad.",
      ].join(" ");
    case "decision":
      return [
        "El jugador tomó una decisión.",
        "Confírmala dentro de la ficción y empuja la escena un paso adelante.",
      ].join(" ");
    default:
      return "Haz avanzar la escena con información nueva, tensión y continuidad.";
  }
}

export function buildNarrativePrompt(params: {
  character: DirectorCharacterLite;
  contentForModel: string;
  recentEvents: DirectorEventLite[];
  sessionPlayers: DirectorPlayerLite[];
  relevantRules: DirectorRuleLite[];
  snapshot?: DirectorSnapshotLite | null;
  structuredIntent?: StructuredIntent | null;
  combatStateLabel: string;
  stateSchemaExample: string;
}): string {
  const {
    character,
    contentForModel,
    recentEvents,
    sessionPlayers,
    relevantRules,
    snapshot,
    structuredIntent,
    combatStateLabel,
    stateSchemaExample,
  } = params;

  const worldName = character.world?.name ?? "Mundo desconocido";
  const worldDescription = character.world?.description ?? "Sin descripción disponible.";
  const history = buildHistory(recentEvents);
  const rulesBlock = buildRulesBlock(relevantRules);
  const snapshotBlock = buildSnapshotBlock(snapshot);
  const playersBlock = buildPlayersBlock(sessionPlayers);
  const intentKind = inferDirectorIntentKind({
    content: contentForModel,
    structuredIntent,
  });
  const lastAssistantBeat = getLastAssistantMessage(recentEvents);

  return `
Eres Aura, una Dungeon Master literaria, intensa y reactiva.
Tu prioridad absoluta es escribir una escena memorable, inmersiva y coherente con el tono ya abierto de la aventura.
Debes sonar como una directora de juego profesional, no como una asistente explicativa.

REGLAS DE VOZ
- Escribe SIEMPRE en español.
- Escribe prosa narrativa viva, con ritmo, presencia y autoridad de GM.
- Mantén continuidad estilística con el historial reciente.
- La respuesta debe sentirse como continuación natural de la historia, no como resumen funcional.
- Usa de 2 a 4 párrafos fluidos.
- Incluye textura sensorial, tensión, corporalidad y una emoción dominante o presentimiento.
- Si el jugador actúa, muestra consecuencia inmediata, reacción o cambio perceptible.
- Si el jugador pregunta, responde con claridad dentro de la ficción.
- Si el jugador inspecciona, revela detalles nuevos.
- Si el jugador duda, integra opciones concretas dentro de la narración.
- No cierres con preguntas genéricas vacías.
- No repitas el último beat salvo que añadas información nueva y significativa.
- No suenes clínico, administrativo, ni como manual de reglas.

DIRECTIVA DE ESCENA
${buildIntentDirective(intentKind)}

FORMATO OBLIGATORIO DE SALIDA
Devuelve EXACTAMENTE estos dos bloques y en este orden:

<narrative_response>
[aquí va únicamente la prosa narrativa final para el jugador]
</narrative_response>

<state_json>
${stateSchemaExample}
</state_json>

REGLAS DEL state_json
- Debe ser JSON válido.
- state_changes, dice_roll_required, combat_events y semantic deben contener solo información estructurada.
- No dupliques la prosa dentro del JSON.
- Si no hay cambios, usa nulls o vacíos válidos.

CONTEXTO DE MUNDO
Nombre: ${worldName}
Descripción: ${worldDescription}

PERSONAJE ACTIVO
Nombre: ${character.name}
HP: ${character.hp_current}/${character.hp_max}
Inventario: ${JSON.stringify(character.inventory ?? [])}
Stats: ${JSON.stringify(character.stats ?? {}, null, 2)}

JUGADORES EN SESIÓN
${playersBlock}

ESTADO DE COMBATE
${combatStateLabel}

SNAPSHOT DE MUNDO
${snapshotBlock}

REGLAS RECUPERADAS DESDE MANUALES
${rulesBlock}

HISTORIAL RECIENTE
${history || "Sin historial reciente."}

${structuredIntent ? `INTENCIÓN ESTRUCTURADA\n${JSON.stringify(structuredIntent, null, 2)}` : ""}

ÚLTIMO BEAT DEL GM QUE NO DEBES REPETIR
${lastAssistantBeat ? clipWords(lastAssistantBeat, 80) : "Sin beat previo del GM."}

MENSAJE DEL JUGADOR
${contentForModel}
`.trim();
}

export function buildNarrativeRepairPrompt(params: {
  originalPrompt: string;
  narrative: string;
  issues: string[];
}): string {
  const { originalPrompt, narrative, issues } = params;

  return [
    originalPrompt,
    "",
    "CORRECCIÓN OBLIGATORIA DE CALIDAD LITERARIA",
    "Tu respuesta anterior fue demasiado plana, genérica o repetitiva.",
    "Reescribe desde cero manteniendo la escena y el estado, pero mejorando la voz del DM.",
    "Problemas detectados:",
    ...issues.map((issue) => `- ${issue}`),
    "",
    "Respuesta anterior deficiente:",
    narrative,
  ].join("\n");
}

export function assessNarrativeProse(params: {
  narrative: string;
  playerContent: string;
  recentEvents: DirectorEventLite[];
  intentKind: DirectorIntentKind;
}): NarrativeProseAssessment {
  const { narrative, playerContent, recentEvents, intentKind } = params;
  const issues: string[] = [];
  const trimmed = narrative.trim();
  const lastAssistantBeat = getLastAssistantMessage(recentEvents);

  if (trimmed.length < 240) {
    issues.push("La narración es demasiado corta para sostener presencia de Dungeon Master.");
  }

  if (!hasSensoryLanguage(trimmed)) {
    issues.push("La narración carece de textura sensorial.");
  }

  if (!hasEmotionalLanguage(trimmed)) {
    issues.push("La narración no transmite emoción, presentimiento o presión interna.");
  }

  if (!hasConsequenceLanguage(trimmed)) {
    issues.push("La narración no muestra consecuencia inmediata ni cambio perceptible.");
  }

  if (lastAssistantBeat && tokenOverlapRatio(trimmed, lastAssistantBeat) >= 0.56) {
    issues.push("La narración se parece demasiado al beat anterior del GM.");
  }

  if (/que puede hacer|que podria hacer|que podría hacer|que haras|que harás/.test(normalizeText(trimmed))) {
    issues.push("La narración cae en cierre genérico o poco autoritario.");
  }

  if (intentKind === "question" && !hasConcreteAnswer(trimmed)) {
    issues.push("El jugador hizo una pregunta y la narración no la responde con suficiente claridad.");
  }

  if (intentKind === "hesitation" && !hasDistinctOptions(trimmed)) {
    issues.push("El jugador dudó y la narración no integra opciones concretas.");
  }

  if (normalizeText(trimmed) === normalizeText(playerContent)) {
    issues.push("La narración repite el mensaje del jugador sin elaborarlo.");
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function splitNarrativeForSse(text: string, maxChunkLength = 180): string[] {
  const compact = text.trim();
  if (!compact) return [];

  const segments = compact
    .split(/(?<=[.!?])\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const segment of segments) {
    const next = current ? `${current} ${segment}` : segment;
    if (next.length <= maxChunkLength) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    if (segment.length <= maxChunkLength) {
      current = segment;
      continue;
    }

    for (let index = 0; index < segment.length; index += maxChunkLength) {
      chunks.push(segment.slice(index, index + maxChunkLength));
    }

    current = "";
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}
