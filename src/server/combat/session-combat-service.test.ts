import test from "node:test";
import assert from "node:assert/strict";

import {
    advanceSessionCombatTurn,
    currentCombatToPromptState,
    registerSessionInitiative,
    resolveTurnPlayerIdFromParticipant,
} from "./session-combat-service";
import type { SessionCombatStateRecord } from "./session-combat";

function buildInitiativeState(): SessionCombatStateRecord {
    return {
        session_id: "session-1",
        status: "initiative",
        round: 1,
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
                initiative: null,
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
                initiative: null,
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

test("initiative converges to the same active order regardless of player submission order", () => {
    const baseState = buildInitiativeState();

    const firstPathStep1 = registerSessionInitiative({
        currentState: baseState,
        userId: "user-1",
        rolledInitiative: 17,
    });

    assert.equal(firstPathStep1.awaitingMoreInitiatives, true);
    assert.equal(firstPathStep1.combatState.status, "initiative");

    const firstPathFinal = registerSessionInitiative({
        currentState: firstPathStep1.combatState,
        userId: "user-2",
        rolledInitiative: 11,
    });

    const secondPathStep1 = registerSessionInitiative({
        currentState: baseState,
        userId: "user-2",
        rolledInitiative: 11,
    });

    assert.equal(secondPathStep1.awaitingMoreInitiatives, true);
    assert.equal(secondPathStep1.combatState.status, "initiative");

    const secondPathFinal = registerSessionInitiative({
        currentState: secondPathStep1.combatState,
        userId: "user-1",
        rolledInitiative: 17,
    });

    assert.equal(firstPathFinal.awaitingMoreInitiatives, false);
    assert.equal(secondPathFinal.awaitingMoreInitiatives, false);

    assert.equal(firstPathFinal.combatState.status, "active");
    assert.equal(secondPathFinal.combatState.status, "active");

    const firstOrder = firstPathFinal.combatState.participants.map((p) => ({
        id: p.id,
        initiative: p.initiative ?? 0,
    }));
    const secondOrder = secondPathFinal.combatState.participants.map((p) => ({
        id: p.id,
        initiative: p.initiative ?? 0,
    }));

    assert.deepEqual(firstOrder, secondOrder);
    assert.equal(firstPathFinal.turnPlayerId, "user-1");
    assert.equal(secondPathFinal.turnPlayerId, "user-1");
});

test("advanceSessionCombatTurn skips defeated participants and advances round deterministically", () => {
    const activeState: SessionCombatStateRecord = {
        session_id: "session-1",
        status: "active",
        round: 1,
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
                id: "enemy:Goblin Captain:0",
                name: "Goblin Captain",
                hp: 0,
                max_hp: 22,
                ac: 13,
                initiative: 12,
                is_player: false,
                is_defeated: true,
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
        ],
    };

    const nextTurn = advanceSessionCombatTurn(activeState);

    assert.equal(nextTurn.combatState.status, "active");
    assert.equal(nextTurn.combatState.round, 1);
    assert.equal(nextTurn.combatState.turn_index, 1);
    assert.equal(nextTurn.activeParticipant?.id, "player:user-2");
    assert.equal(
        resolveTurnPlayerIdFromParticipant(nextTurn.activeParticipant),
        "user-2",
    );

    const wrappedTurn = advanceSessionCombatTurn(nextTurn.combatState);

    assert.equal(wrappedTurn.combatState.round, 2);
    assert.equal(wrappedTurn.combatState.turn_index, 0);
    assert.equal(wrappedTurn.activeParticipant?.id, "player:user-1");
});

test("currentCombatToPromptState preserves shared state across refresh with conditions intact", () => {
    const sharedState: SessionCombatStateRecord = {
        session_id: "session-1",
        status: "active",
        round: 3,
        turn_index: 1,
        participants: [
            {
                id: "player:user-1",
                user_id: "user-1",
                character_id: "char-1",
                name: "Kael",
                hp: 9,
                max_hp: 20,
                ac: 15,
                initiative: 17,
                is_player: true,
                is_defeated: false,
                conditions: [
                    {
                        id: "poisoned",
                        name: "Envenenado",
                        duration_rounds: 2,
                        applied_at_round: 2,
                        applied_by_participant_id: "enemy:Goblin Captain:0",
                        source: "Daga envenenada",
                        summary: "Sufre desventaja en tiradas de ataque.",
                    },
                ],
            },
            {
                id: "enemy:Goblin Captain:0",
                name: "Goblin Captain",
                hp: 7,
                max_hp: 22,
                ac: 13,
                initiative: 12,
                is_player: false,
                is_defeated: false,
                conditions: [],
            },
        ],
    };

    const promptState = currentCombatToPromptState(sharedState, null);

    assert.equal(promptState.in_combat, true);
    assert.equal(promptState.turn, 1);
    assert.equal(promptState.participants[0].name, "Kael");
    assert.equal(
        sharedState.participants[0].conditions?.[0]?.name,
        "Envenenado",
    );
});