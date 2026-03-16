"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCharacterStore } from "@/store/characterStore";
import { rollD20, evaluateDifficulty } from "@/lib/dice";
import { Send, Shield, BookOpen, AlertTriangle, Dice6, User } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "dm";
  content: string;
  diceRoll?: number;
};

type DiceResult = {
  total: number
  roll: number
  modifier: number
}

type StateStatChange = {
  stat: string
  change: number
}

type EngineResponse = {
  error?: string
  narrative: string
  stateChanges?: {
    suspicionChange?: number
    credibilityChange?: number
    inventoryAdd?: string[]
    inventoryRemove?: string[]
    stats?: StateStatChange[]
  }
}

export default function NarrativeEngine() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "dm",
      content: "Welcome to Aura. The air is thick with ash, and the shadows seem to watch your every move. What is your name, traveler, and what do you seek in the ruined city of Oakhaven?",
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const character = useCharacterStore();
  
  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    let newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // Evaluate difficulty for dice check
    let diceResultValue: number | null = null
    let diceResultData: DiceResult | null = null
    if (evaluateDifficulty(userMessage.content)) {
      diceResultData = rollD20(0); // Add dynamic modifiers later based on stats
      diceResultValue = diceResultData.total;
      
      // Add dice roll message
      newMessages = [...newMessages, {
        id: Date.now().toString() + "-dice",
        role: "dm",
        content: `*The fates decide... Rolled: ${diceResultValue}*`,
      }];
      setMessages(newMessages);
    }

    try {
      const response = await fetch("/api/engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: userMessage.content,
          character: {
            name: character.name,
            stats: character.stats,
            inventory: character.inventory,
            suspicion: character.suspicion,
            credibility: character.credibility,
          },
          globalState: {}, 
          previousMessages: newMessages.slice(-10), // Send last 10 messages for context
          diceResult: diceResultData 
        })
      });

      const data = (await response.json()) as EngineResponse
      
      if (data.error) throw new Error(data.error);

      // Apply state changes from AI
      if (data.stateChanges) {
        if (data.stateChanges.suspicionChange) character.adjustSuspicion(data.stateChanges.suspicionChange);
        if (data.stateChanges.credibilityChange) character.adjustCredibility(data.stateChanges.credibilityChange);
        if (data.stateChanges.inventoryAdd) {
          data.stateChanges.inventoryAdd.forEach((item: string) => character.addToInventory(item));
        }
        if (data.stateChanges.inventoryRemove) {
          data.stateChanges.inventoryRemove.forEach((item: string) => character.removeFromInventory(item));
        }
        if (data.stateChanges.stats) {
          data.stateChanges.stats.forEach((s: StateStatChange) => {
             // Basic stat update handling or initialization check
             const currentVal = character.stats[s.stat] || 10;
             character.updateStat(s.stat, currentVal + s.change);
          });
        }
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "dm",
        content: data.narrative
      }]);

    } catch (error: unknown) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "dm",
        content: "*The connection to the ethereal plane severed. (Error connecting to AI)*"
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden selection:bg-blood-500 selection:text-white">
      {/* Left Panel: Character Sheet */}
      <motion.aside 
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-80 border-r border-parchment-900/50 bg-[#0a0a0c]/80 backdrop-blur-md p-6 flex flex-col gap-6 overflow-y-auto"
      >
        <div className="flex items-center gap-3 border-b border-parchment-900/50 pb-4">
          <div className="w-12 h-12 rounded-full bg-parchment-900 border border-blood-600 flex items-center justify-center">
             <User className="text-parchment-300" />
          </div>
          <div>
            <h2 className="font-serif text-xl text-parchment-200">{character.name}</h2>
            <p className="text-xs text-parchment-300/60 uppercase tracking-widest">Wanderer</p>
          </div>
        </div>

        {/* Status Bars */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1 text-parchment-300">
              <span className="flex items-center gap-1"><AlertTriangle size={14}/> Suspicion</span>
              <span>{character.suspicion}%</span>
            </div>
            <div className="w-full h-2 bg-parchment-900 rounded-full overflow-hidden">
              <motion.div 
                animate={{ width: `${character.suspicion}%` }}
                className={`h-full ${character.suspicion > 70 ? 'bg-blood-500' : 'bg-suspicion-medium'}`} 
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1 text-parchment-300">
              <span className="flex items-center gap-1"><Shield size={14}/> Credibility</span>
              <span>{character.credibility}%</span>
            </div>
            <div className="w-full h-2 bg-parchment-900 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ width: `${character.credibility}%` }}
                  className="h-full bg-magic-600" 
                />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div>
          <h3 className="text-sm font-serif text-parchment-300 border-b border-parchment-900/50 pb-1 mb-2">Attributes</h3>
          <ul className="space-y-2 text-sm">
            {Object.keys(character.stats).length === 0 ? (
              <li className="text-parchment-300/40 italic text-xs">Awaiting evaluation...</li>
            ) : (
              Object.entries(character.stats).map(([key, val]) => (
                <li key={key} className="flex justify-between">
                  <span className="capitalize">{key}</span>
                  <span className="font-mono text-magic-500">{val as number}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Inventory */}
        <div>
          <h3 className="text-sm font-serif text-parchment-300 border-b border-parchment-900/50 pb-1 mb-2">Inventory</h3>
          <ul className="space-y-1 text-sm">
            {character.inventory.length === 0 ? (
              <li className="text-parchment-300/40 italic text-xs">Pockets are empty...</li>
            ) : (
              character.inventory.map((item, i) => (
                <li key={i} className="flex items-center gap-2 before:content-[''] before:w-1 before:h-1 before:bg-magic-600 before:rounded-full">
                  {item}
                </li>
              ))
            )}
          </ul>
        </div>
      </motion.aside>

      {/* Right Panel: Chat / Narrative */}
      <main className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-parchment-900/20 via-background to-background">
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-4 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-parchment-900/40 border border-parchment-300/10 text-parchment-100' 
                    : 'bg-transparent text-parchment-200 font-serif leading-relaxed text-lg tracking-wide'
                } ${msg.content.includes('*The fates decide') && 'border border-magic-600/30 bg-magic-900/10'}`}>
                  
                  {msg.role === 'dm' && !msg.content.includes('*The fates decide') && (
                     <BookOpen className="inline mr-2 mb-1 opacity-40" size={16} />
                  )}
                  {msg.role === 'dm' && msg.content.includes('*The fates decide') && (
                     <Dice6 className="inline mr-2 opacity-80 text-magic-500 animate-pulse" size={16} />
                  )}

                  <span dangerouslySetInnerHTML={{ __html: msg.content.replace(/\\n/g, '<br/>') }} />
                </div>
              </motion.div>
            ))}
            {loading && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="max-w-[80%] p-4 text-parchment-300/50 italic flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-magic-600 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-magic-600 animate-bounce delay-100" />
                  <div className="w-2 h-2 rounded-full bg-magic-600 animate-bounce delay-200" />
                  <span className="ml-2 font-serif">The DM is considering...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-6 border-t border-parchment-900/30 bg-background/95 backdrop-blur">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-4 max-w-4xl mx-auto relative group"
          >
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What do you do?"
              disabled={loading}
              className="flex-1 bg-parchment-900/50 border border-parchment-900 text-parchment-100 py-4 px-6 rounded-full focus:outline-none focus:border-magic-600/50 focus:ring-1 focus:ring-magic-600/50 transition-all font-serif disabled:opacity-50"
            />
            <button 
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 p-3 bg-magic-600 hover:bg-magic-500 text-white rounded-full transition-all disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
