import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";

import { endSessionCombat } from "./session-combat-service";
import {
    persistSessionCombatEvents,
    type CombatEventResolution,
} from "./session-combat-events";
import type { SessionCombatStateRecord } from "./session-combat";

type InsertRow = {
    event_type: string;
    content: string;
    payload: Record<string, unknown>;
};

function buildSupabaseDouble(insertedRows: InsertRow[]): SupabaseClient {
    return {
        from(table: string) {
            assert.equal(table, "narrative_events");
            return {
                insert: async (rows: InsertRow[]) => {
                    insertedRows.push(...rows);
                    return { error: null };
                },
            };
        },
    } as unknown as SupabaseClient;
}

function buildActiveState(): SessionCombatStateRecord {
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
                initiative: 11,
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

test("applies damage and condition in the same tactical resolution and materializes the shared snapshot", async () => {
    const insertedRows: InsertRow[] = [];
    const supabase = buildSupabaseDouble(insertedRows);

    const resolution: CombatEventResolution = {
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
            summary: "La hoja deja un veneno activo en la herida.",
        },
    };

    const result = await persistSessionCombatEvents({
        supabase,
        worldId: "world-1",
        characterId: "char-2",
        sessionId: "session-1",
        resolution,
        currentState: buildActiveState(),
        actingParticipant: {
            participant_id: "enemy:Goblin Captain:0",
            name: "Goblin Captain",
        },
    });

    const updatedKael = result.combatState.participants.find(
        (participant) => participant.id === "player:user-1",
    );

    assert.ok(updatedKael);
    assert.equal(updatedKael?.hp, 14);
    assert.equal(updatedKael?.is_defeated, false);
    assert.equal(updatedKael?.conditions?.length, 1);
    assert.equal(updatedKael?.conditions?.[0]?.name, "Envenenado");
    assert.equal(updatedKael?.conditions?.[0]?.duration_rounds, 2);
    assert.equal(updatedKael?.conditions?.[0]?.applied_at_round, 2);

    assert.deepEqual(result.touchedCharacterHp, [
        {
            characterId: "char-1",
            hp: 14,
        },
    ]);

    assert.equal(result.combatEnded, false);
    assert.deepEqual(
        insertedRows.map((row) => row.event_type),
        ["damage_applied", "condition_applied"],
    );
});

test("sequential tactical updates from different clients converge on the latest shared snapshot", async () => {
    const insertedRows: InsertRow[] = [];
    const supabase = buildSupabaseDouble(insertedRows);

    const firstResolution: CombatEventResolution = {
        damage_applied: {
            actor: {
                participant_id: "player:user-1",
                character_id: "char-1",
                name: "Kael",
            },
            target: {
                participant_id: "enemy:Goblin Captain:0",
                name: "Goblin Captain",
            },
            amount: 7,
            damage_type: "slashing",
            summary: "Kael abre una herida profunda en el capitán goblin.",
        },
    };

    const firstResult = await persistSessionCombatEvents({
        supabase,
        worldId: "world-1",
        characterId: "char-1",
        sessionId: "session-1",
        resolution: firstResolution,
        currentState: buildActiveState(),
        actingParticipant: {
            participant_id: "player:user-1",
            character_id: "char-1",
            name: "Kael",
        },
    });

    const secondResolution: CombatEventResolution = {
        healing_applied: {
            actor: {
                participant_id: "player:user-2",
                character_id: "char-2",
                name: "Lyra",
            },
            target: {
                participant_id: "player:user-1",
                character_id: "char-1",
                name: "Kael",
            },
            amount: 4,
            summary: "Lyra cierra parte de la herida con magia curativa.",
        },
    };

    const secondResult = await persistSessionCombatEvents({
        supabase,
        worldId: "world-1",
        characterId: "char-2",
        sessionId: "session-1",
        resolution: secondResolution,
        currentState: firstResult.combatState,
        actingParticipant: {
            participant_id: "player:user-2",
            character_id: "char-2",
            name: "Lyra",
        },
    });

    const kael = secondResult.combatState.participants.find(
        (participant) => participant.id === "player:user-1",
    );
    const goblin = secondResult.combatState.participants.find(
        (participant) => participant.id === "enemy:Goblin Captain:0",
    );

    assert.equal(kael?.hp, 20);
    assert.equal(goblin?.hp, 15);
    assert.equal(secondResult.combatEnded, false);

    assert.deepEqual(
        insertedRows.map((row) => row.event_type),
        ["damage_applied", "healing_applied"],
    );
});

test("combat_ended produces an explicit closure event and the state can transition to ended cleanly", async () => {
    const insertedRows: InsertRow[] = [];
    const supabase = buildSupabaseDouble(insertedRows);

    const result = await persistSessionCombatEvents({
        supabase,
        worldId: "world-1",
        characterId: "char-1",
        sessionId: "session-1",
        resolution: {
            combat_ended: {
                winner_side: "players",
                summary: "El último enemigo cae y la escaramuza termina.",
            },
        },
        currentState: buildActiveState(),
        actingParticipant: {
            participant_id: "player:user-1",
            character_id: "char-1",
            name: "Kael",
        },
    });

    assert.equal(result.combatEnded, true);
    assert.deepEqual(
        insertedRows.map((row) => row.event_type),
        ["combat_ended"],
    );

    const endedState = endSessionCombat(result.combatState);

    assert.equal(endedState.status, "ended");
    assert.equal(endedState.turn_index, 0);
    assert.equal(endedState.participants.length, 3);
});