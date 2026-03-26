import type { StructuredIntent } from "@/lib/game/structured-intents";

export type NarrativeEventLite = {
  role: string;
  content: string;
};

export type RuleMatchLite = {
  title: string;
  content: string;
};

export type SessionQuestLite = {
  slug: string;
  title: string;
  status: string;
};

export type NpcRelationshipLite = {
  npc_key: string;
  npc_name: string;
  affinity: number;
  trust: number;
};

export type NarrativeSnapshotLite = {
  quests: SessionQuestLite[];
  relationships: NpcRelationshipLite[];
};

export type PlayerIntentKind =
  | "question"
  | "hesitation"
  | "inspection"
  | "movement"
  | "interaction"
  | "combat"
  | "decision"
  | "unknown";

export type NarrativeQualityAssessment = {
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

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function getLastAssistantMessage(events: NarrativeEventLite[]): string {
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

function firstWindow(value: string, size = 8): string {
  return words(value).slice(0, size).join(" ");
}

function containsSensoryLanguage(value: string): boolean {
  return /(ves|notas|percibes|escuchas|hueles|sientes|tocas|descubres|identificas|adviertes|observas)/i.test(
    value,
  );
}

function containsActionableOptions(value: string): boolean {
  return /(puedes|podrias|podrías|tienes varias opciones|opciones claras|si prefieres|elige|decide|tambien puedes|también puedes)/i.test(
    value,
  );
}

function containsConcreteAnswer(value: string): boolean {
  return /(es |parece|resulta|descubres|identificas|reconoces|comprendes|notas que|ves que)/i.test(
    value,
  );
}

function containsDiscoveryLanguage(value: string): boolean {
  return /(descubres|notas que|ves que|identificas|reconoces|adviertes|percibes una grieta|una marca|un simbolo|un símbolo|una funcion|un mecanismo|un reflejo distinto|una vibracion|una vibración)/i.test(
    value,
  )
}

function containsDistinctOptions(value: string): boolean {
  return /(puedes|podrias|podrías|tambien puedes|también puedes|si prefieres|otra opcion|otra opción|o bien)/i.test(
    value,
  )
}

export function inferPlayerIntentKind(params: {
  content: string;
  structuredIntent?: StructuredIntent | null;
}): PlayerIntentKind {
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
  if (/(miro|observo|examino|inspecciono|investigo|analizo|busco|reviso|escucho|huelo|palpo|me fijo|que es)/.test(normalized)) {
    return "inspection";
  }
  if (/(camino|avanzo|voy|entro|salgo|subo|bajo|me acerco|me alejo|sigo|retrocedo|corro)/.test(normalized)) {
    return "movement";
  }
  if (/(pregunto|digo|hablo|respondo|saludo|negocio|persuado|convenzo|amenazo|pido ayuda)/.test(normalized)) {
    return "interaction";
  }
  if (/(ataco|golpeo|disparo|lanzo|hechizo|esquivo|bloqueo|apuñalo|embisto)/.test(normalized)) {
    return "combat";
  }

  return "decision";
}

export function buildNarrativeDirectorInstructions(params: {
  intentKind: PlayerIntentKind
  recentEvents: NarrativeEventLite[]
  snapshot?: NarrativeSnapshotLite | null
}): string {
  const { intentKind, recentEvents, snapshot } = params
  const lastAssistantMessage = getLastAssistantMessage(recentEvents)

  const activeQuestSummary = unique(
    (snapshot?.quests ?? [])
      .filter(
        (quest) =>
          quest.status === 'offered' ||
          quest.status === 'accepted' ||
          quest.status === 'in_progress',
      )
      .map((quest) => `${quest.title} [${quest.status}]`),
  )

  const relationshipsSummary = unique(
    (snapshot?.relationships ?? [])
      .slice(0, 3)
      .map(
        (relationship) =>
          `${relationship.npc_name} (afinidad ${relationship.affinity}, confianza ${relationship.trust})`,
      ),
  )

  const modeInstruction = (() => {
    switch (intentKind) {
      case 'question':
        return [
          'El jugador está haciendo una pregunta.',
          'Tu prioridad es responderla con claridad dentro de la ficción.',
          'Debes revelar al menos un dato nuevo y útil.',
          'No des una respuesta evasiva ni reformules simplemente el misterio.'
        ].join(' ')
      case 'hesitation':
        return [
          'El jugador no sabe qué hacer.',
          'No repitas la escena.',
          'Ofrece entre 2 y 4 opciones diegéticas concretas y accionables.',
          'Cada opción debe implicar un enfoque distinto: observar, interactuar, moverse, arriesgar, recordar o protegerse.'
        ].join(' ')
      case 'inspection':
        return [
          'El jugador inspecciona la escena o un objeto.',
          'Debes revelar al menos 2 detalles nuevos observables.',
          'Esos detalles deben ayudar a entender función, peligro, origen, uso o estado.',
          'No describas de nuevo el mismo decorado si no aporta descubrimiento.'
        ].join(' ')
      case 'movement':
        return [
          'El jugador se desplaza.',
          'Muestra cómo cambia la escena y qué consecuencia inmediata produce ese movimiento.'
        ].join(' ')
      case 'interaction':
        return [
          'El jugador interactúa con alguien o algo.',
          'Debes mostrar reacción, cambio perceptible o respuesta del entorno.'
        ].join(' ')
      case 'combat':
        return [
          'El jugador está actuando en combate.',
          'Resuelve consecuencias inmediatas con claridad y sin ambigüedad.'
        ].join(' ')
      case 'decision':
        return [
          'El jugador tomó una decisión.',
          'Confírmala dentro de la ficción y haz avanzar la escena con una consecuencia concreta.'
        ].join(' ')
      default:
        return 'Haz avanzar la escena con información nueva, consecuencias visibles y continuidad clara.'
    }
  })()

  return [
    'POLÍTICA DE DIRECCIÓN NARRATIVA',
    '- No repitas ni parafrasees el último mensaje del GM salvo que añadas información realmente nueva.',
    '- Cada respuesta debe contener novedad concreta, no solo atmósfera.',
    '- No conviertas preguntas del jugador en eco del contexto.',
    '- No conviertas inspecciones en recapitulación del decorado.',
    '- No conviertas dudas en preguntas vacías del tipo "¿qué puede hacer?"',
    '- Evita reusar el mismo foco visual o amenaza si no ha cambiado.',
    '- Si mencionas un elemento ya introducido, añade una propiedad, riesgo, señal o consecuencia nueva.',
    modeInstruction,
    lastAssistantMessage
      ? `Último beat del GM que NO debes repetir: ${lastAssistantMessage}`
      : null,
    activeQuestSummary.length > 0
      ? `Misiones activas relevantes: ${activeQuestSummary.join(' | ')}`
      : null,
    relationshipsSummary.length > 0
      ? `Relaciones relevantes: ${relationshipsSummary.join(' | ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildRuleRetrievalQuery(params: {
  playerContent: string;
  intentKind: PlayerIntentKind;
  recentEvents: NarrativeEventLite[];
  snapshot?: NarrativeSnapshotLite | null;
  worldName?: string | null;
}): string {
  const { playerContent, intentKind, recentEvents, snapshot, worldName } = params
  const lastAssistantMessage = getLastAssistantMessage(recentEvents)
  const compactPreviousBeat = lastAssistantMessage
    ? words(lastAssistantMessage).slice(0, 24).join(' ')
    : null
  const questTerms = (snapshot?.quests ?? []).slice(0, 2).map((quest) => quest.title)
  const npcTerms = (snapshot?.relationships ?? [])
    .slice(0, 2)
    .map((relationship) => relationship.npc_name)

  return [
    words(playerContent).slice(0, 32).join(' '),
    `intención ${intentKind}`,
    worldName ? `mundo ${worldName}` : null,
    compactPreviousBeat ? `contexto previo ${compactPreviousBeat}` : null,
    questTerms.length > 0 ? `misiones ${questTerms.join(' ')}` : null,
    npcTerms.length > 0 ? `npcs ${npcTerms.join(' ')}` : null,
  ]
    .filter(Boolean)
    .join(' ')
}

export function assessNarrativeQuality(params: {
  narrative: string
  playerContent: string
  intentKind: PlayerIntentKind
  recentEvents: NarrativeEventLite[]
  relevantRules: RuleMatchLite[]
}): NarrativeQualityAssessment {
  const { narrative, playerContent, intentKind, recentEvents, relevantRules } = params
  const issues: string[] = []
  const trimmedNarrative = narrative.trim()
  const lastAssistantMessage = getLastAssistantMessage(recentEvents)
  const normalizedNarrative = normalizeText(trimmedNarrative)
  const normalizedPlayerContent = normalizeText(playerContent)

  if (trimmedNarrative.length < 100) {
    issues.push('La respuesta narrativa es demasiado corta para una dirección de escena premium.')
  }

  if (lastAssistantMessage) {
    const overlap = tokenOverlapRatio(trimmedNarrative, lastAssistantMessage)
    if (overlap >= 0.58) {
      issues.push('La respuesta se parece demasiado al último mensaje del GM.')
    }

    const repeatedOpening = firstWindow(trimmedNarrative)
    if (repeatedOpening && repeatedOpening === firstWindow(lastAssistantMessage)) {
      issues.push('La respuesta repite el mismo arranque del beat anterior.')
    }
  }

  if (/que puede hacer|que podria hacer|que podría hacer|que haras|que harás/.test(normalizedNarrative)) {
    issues.push('La respuesta cierra con una fórmula vaga o genérica en vez de dirigir la escena.')
  }

  if (intentKind === 'hesitation') {
    if (!containsActionableOptions(trimmedNarrative) && !containsDistinctOptions(trimmedNarrative)) {
      issues.push('El jugador dudó y la respuesta no ofrece opciones claras dentro de la ficción.')
    }
  }

  if (intentKind === 'inspection') {
    if (!containsSensoryLanguage(trimmedNarrative) && !containsDiscoveryLanguage(trimmedNarrative)) {
      issues.push('La respuesta de inspección carece de detalles observables o descubribles.')
    }

    if (lastAssistantMessage && tokenOverlapRatio(trimmedNarrative, lastAssistantMessage) >= 0.5) {
      issues.push('La inspección repite demasiado el beat anterior en vez de descubrir algo nuevo.')
    }
  }

  if (intentKind === 'question') {
    if (!containsConcreteAnswer(trimmedNarrative)) {
      issues.push('El jugador hizo una pregunta y la respuesta no aporta una aclaración concreta.')
    }
  }

  if (normalizedPlayerContent && normalizedNarrative === normalizedPlayerContent) {
    issues.push('La respuesta repite el mensaje del jugador sin desarrollarlo.')
  }

  if (relevantRules.length > 0) {
    const normalizedRuleKeywords = unique(
      relevantRules
        .flatMap((rule) => words(rule.title).slice(0, 4))
        .filter((token) => token.length >= 4),
    )

    if (
      normalizedRuleKeywords.length > 0 &&
      !normalizedRuleKeywords.some((token) => normalizedNarrative.includes(token))
    ) {
      issues.push(
        'Había reglas recuperadas relevantes, pero la narración no refleja ninguna señal útil de ese contexto.',
      )
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  }
}

export function buildNarrativeRepairPrompt(params: {
  originalPrompt: string;
  rawResponse: string;
  issues: string[];
}): string {
  const { originalPrompt, rawResponse, issues } = params;

  return [
    originalPrompt,
    "",
    "CORRECCIÓN OBLIGATORIA DE CALIDAD",
    "La respuesta previa no cumple el estándar narrativo. Reintenta desde cero y devuelve un único JSON válido.",
    "Problemas detectados:",
    ...issues.map((issue) => `- ${issue}`),
    "Respuesta anterior inválida:",
    rawResponse,
    "Debes mantener coherencia con el historial, pero NO repetir el mismo beat.",
  ].join("\n");
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
