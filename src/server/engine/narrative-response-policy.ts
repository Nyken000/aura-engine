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
  intentKind: PlayerIntentKind;
  recentEvents: NarrativeEventLite[];
  snapshot?: NarrativeSnapshotLite | null;
}): string {
  const { intentKind, recentEvents, snapshot } = params;
  const lastAssistantMessage = getLastAssistantMessage(recentEvents);
  const activeQuestSummary = unique(
    (snapshot?.quests ?? [])
      .filter(
        (quest) =>
          quest.status === "offered" ||
          quest.status === "accepted" ||
          quest.status === "in_progress",
      )
      .map((quest) => `${quest.title} [${quest.status}]`),
  );
  const relationshipsSummary = unique(
    (snapshot?.relationships ?? [])
      .slice(0, 3)
      .map(
        (relationship) =>
          `${relationship.npc_name} (afinidad ${relationship.affinity}, confianza ${relationship.trust})`,
      ),
  );

  const modeInstruction = (() => {
    switch (intentKind) {
      case "question":
        return "El jugador está haciendo una pregunta o buscando claridad. Debes responderla con al menos un dato nuevo del mundo antes de ofrecer la siguiente decisión.";
      case "hesitation":
        return "El jugador está dudando. No repitas el último gancho. Aterriza la escena y ofrece de 2 a 4 opciones diegéticas claras sin sonar a menú robótico.";
      case "inspection":
        return "El jugador inspecciona o intenta comprender algo. Describe detalles sensoriales concretos y revela al menos una pista, riesgo o propiedad específica del objetivo.";
      case "movement":
        return "El jugador se desplaza. Muestra cómo cambia el entorno y qué consecuencia inmediata produce ese movimiento.";
      case "interaction":
        return "El jugador interactúa socialmente. Refleja reacción, tono y posible cambio relacional del interlocutor o del entorno.";
      case "combat":
        return "El jugador está en una acción de combate. Resuelve consecuencias inmediatas, respeta la economía del turno y evita ambigüedad.";
      case "decision":
        return "El jugador tomó una decisión. Confírmala dentro de la ficción y haz avanzar la escena con consecuencias concretas.";
      default:
        return "Haz avanzar la escena con información nueva, consecuencias visibles y una continuidad clara con el estado actual.";
    }
  })();

  return [
    "POLÍTICA DE DIRECCIÓN NARRATIVA",
    "- No repitas ni parafrasees el último mensaje del GM salvo que añadas información realmente nueva.",
    "- Cada respuesta debe avanzar al menos una dimensión: información, consecuencia, tensión, elección clara o resolución parcial.",
    '- No cierres dos veces seguidas con la misma fórmula genérica del tipo "¿qué harás?".',
    "- Si el jugador está confundido, guía dentro de la ficción en vez de devolver el mismo estímulo.",
    "- Mantén la respuesta específica, situada y con detalles observables.",
    modeInstruction,
    lastAssistantMessage
      ? `Último beat del GM que NO debes repetir: ${lastAssistantMessage}`
      : null,
    activeQuestSummary.length > 0
      ? `Misiones activas relevantes: ${activeQuestSummary.join(" | ")}`
      : null,
    relationshipsSummary.length > 0
      ? `Relaciones relevantes: ${relationshipsSummary.join(" | ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildRuleRetrievalQuery(params: {
  playerContent: string;
  intentKind: PlayerIntentKind;
  recentEvents: NarrativeEventLite[];
  snapshot?: NarrativeSnapshotLite | null;
  worldName?: string | null;
}): string {
  const { playerContent, intentKind, recentEvents, snapshot, worldName } = params;
  const lastAssistantMessage = getLastAssistantMessage(recentEvents);
  const questTerms = (snapshot?.quests ?? []).slice(0, 3).map((quest) => quest.title);
  const npcTerms = (snapshot?.relationships ?? [])
    .slice(0, 3)
    .map((relationship) => relationship.npc_name);

  return [
    playerContent,
    `intención ${intentKind}`,
    worldName ? `mundo ${worldName}` : null,
    lastAssistantMessage ? `contexto previo ${lastAssistantMessage}` : null,
    questTerms.length > 0 ? `misiones ${questTerms.join(" ")}` : null,
    npcTerms.length > 0 ? `npcs ${npcTerms.join(" ")}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export function assessNarrativeQuality(params: {
  narrative: string;
  playerContent: string;
  intentKind: PlayerIntentKind;
  recentEvents: NarrativeEventLite[];
  relevantRules: RuleMatchLite[];
}): NarrativeQualityAssessment {
  const { narrative, playerContent, intentKind, recentEvents, relevantRules } = params;
  const issues: string[] = [];
  const trimmedNarrative = narrative.trim();
  const lastAssistantMessage = getLastAssistantMessage(recentEvents);
  const normalizedNarrative = normalizeText(trimmedNarrative);
  const normalizedPlayerContent = normalizeText(playerContent);

  if (trimmedNarrative.length < 80) {
    issues.push("La respuesta narrativa es demasiado corta para una dirección de escena premium.");
  }

  if (lastAssistantMessage) {
    const overlap = tokenOverlapRatio(trimmedNarrative, lastAssistantMessage);
    if (overlap >= 0.72) {
      issues.push("La respuesta se parece demasiado al último mensaje del GM.");
    }

    const repeatedOpening = firstWindow(trimmedNarrative);
    if (repeatedOpening && repeatedOpening === firstWindow(lastAssistantMessage)) {
      issues.push("La respuesta repite el mismo arranque del beat anterior.");
    }
  }

  if (/que haras$|que harás$/.test(normalizedNarrative)) {
    issues.push('La respuesta cierra con la fórmula genérica "¿qué harás?".');
  }

  if (intentKind === "hesitation" && !containsActionableOptions(trimmedNarrative)) {
    issues.push("El jugador dudó y la respuesta no ofrece opciones claras dentro de la ficción.");
  }

  if (intentKind === "inspection" && !containsSensoryLanguage(trimmedNarrative)) {
    issues.push("La respuesta de inspección carece de detalles sensoriales o descubribles.");
  }

  if (
    intentKind === "question" &&
    !containsConcreteAnswer(trimmedNarrative) &&
    trimmedNarrative.endsWith("?")
  ) {
    issues.push("El jugador hizo una pregunta y la respuesta no aporta una aclaración concreta.");
  }

  if (normalizedPlayerContent && normalizedNarrative === normalizedPlayerContent) {
    issues.push("La respuesta repite el mensaje del jugador sin desarrollarlo.");
  }

  if (relevantRules.length > 0) {
    const normalizedRuleKeywords = unique(
      relevantRules
        .flatMap((rule) => words(rule.title).slice(0, 4))
        .filter((token) => token.length >= 4),
    );

    if (
      normalizedRuleKeywords.length > 0 &&
      !normalizedRuleKeywords.some((token) => normalizedNarrative.includes(token))
    ) {
      issues.push(
        "Había reglas recuperadas relevantes, pero la narración no refleja ninguna señal útil de ese contexto.",
      );
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
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
