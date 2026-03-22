import type { JsonObject } from "@/server/combat/session-combat";

export type SemanticEntityKind =
  | "npc"
  | "location"
  | "objective"
  | "item"
  | "faction";

export type SemanticEntityAnnotation = {
  kind: SemanticEntityKind;
  key: string;
  label: string;
  aliases?: string[];
};

export type QuestStatus =
  | "offered"
  | "accepted"
  | "declined"
  | "active"
  | "completed"
  | "failed";

export type QuestUpdateType =
  | "offered"
  | "accepted"
  | "declined"
  | "activated"
  | "progressed"
  | "completed"
  | "failed"
  | "note";

export type QuestMutation = {
  slug: string;
  title: string;
  description: string;
  status: QuestStatus;
  objectiveSummary?: string | null;
  rewardSummary?: string | null;
  failureConsequence?: string | null;
  offeredByNpcKey?: string | null;
  assignedCharacterId?: string | null;
  metadata?: JsonObject | null;
};

export type QuestUpdateMutation = {
  slug: string;
  updateType: QuestUpdateType;
  title: string;
  description: string;
  payload?: JsonObject | null;
};

export type RelationshipDelta = {
  npcKey: string;
  npcName: string;
  affinityDelta?: number;
  trustDelta?: number;
  favorDebtDelta?: number;
  hostilityDelta?: number;
  reason: string;
  metadata?: JsonObject | null;
};

export type PartyCompanionAction = {
  npcKey: string;
  npcName: string;
  action: "joined" | "left" | "available";
  reason?: string | null;
  metadata?: JsonObject | null;
};

export type NarrativeSemanticPayload = {
  entities: SemanticEntityAnnotation[];
  quests?: {
    upserts?: QuestMutation[];
    updates?: QuestUpdateMutation[];
  };
  relationships?: RelationshipDelta[];
  companions?: PartyCompanionAction[];
};