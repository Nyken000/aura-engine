export type DiceResult = {
  roll: number;
  modifier: number;
  total: number;
  isCriticalSuccess: boolean;
  isCriticalFailure: boolean;
};

export function rollD20(modifier: number = 0): DiceResult {
  const roll = Math.floor(Math.random() * 20) + 1;
  const total = roll + modifier;
  
  return {
    roll,
    modifier,
    total,
    isCriticalSuccess: roll === 20,
    isCriticalFailure: roll === 1,
  };
}

export function evaluateDifficulty(actionDescription: string): boolean {
  // A simplistic heuristic: if the action suggests risk or difficulty, trigger a roll.
  const riskyKeywords = ["attack", "steal", "lie", "sneak", "jump", "convince", "deceive", "hide"];
  const lowerAction = actionDescription.toLowerCase();
  
  return riskyKeywords.some(keyword => lowerAction.includes(keyword));
}
