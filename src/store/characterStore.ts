import { create } from 'zustand';

// Dynamic stats type based on the story
export type CharacterStats = Record<string, number>;

export interface CharacterState {
  id: string | null;
  name: string;
  stats: CharacterStats;
  inventory: string[];
  suspicion: number;
  credibility: number;
  
  // Actions
  setCharacter: (data: Partial<CharacterState>) => void;
  updateStat: (statName: string, value: number) => void;
  addToInventory: (item: string) => void;
  removeFromInventory: (item: string) => void;
  adjustSuspicion: (amount: number) => void;
  adjustCredibility: (amount: number) => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  id: null,
  name: "Unknown Wanderer",
  stats: {}, // Dynamically generated
  inventory: [],
  suspicion: 0,
  credibility: 50,

  setCharacter: (data) => set((state) => ({ ...state, ...data })),
  
  updateStat: (statName, value) => set((state) => ({
    stats: { ...state.stats, [statName]: value }
  })),
  
  addToInventory: (item) => set((state) => ({
    inventory: [...state.inventory, item]
  })),
  
  removeFromInventory: (item) => set((state) => ({
    inventory: state.inventory.filter((i) => i !== item)
  })),
  
  adjustSuspicion: (amount) => set((state) => ({
    suspicion: Math.max(0, Math.min(100, state.suspicion + amount))
  })),
  
  adjustCredibility: (amount) => set((state) => ({
    credibility: Math.max(0, Math.min(100, state.credibility + amount))
  })),
}));
