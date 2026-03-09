import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const { action, character, globalState, previousMessages, diceResult } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is missing." }, { status: 500 });
    }

    // Gemini 1.5 Flash Model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const systemPrompt = `
You are the Dungeon Master (DM) for "Aura", a dark medieval fantasy RPG. 
You control the world, NPCs, and narrative consequences based on the player's actions.

CHARACTER STATE:
Name: ${character.name}
Stats: ${JSON.stringify(character.stats)}
Inventory: ${JSON.stringify(character.inventory)}
Suspicion: ${character.suspicion}/100
Credibility: ${character.credibility}/100

WORLD STATE:
${JSON.stringify(globalState)}

DICE ARBITRATION:
If the player attempted a difficult/risky action, a dice result may be provided:
${diceResult ? `DICE RESULT: ${diceResult.total} (Base: ${diceResult.roll} + Modifier: ${diceResult.modifier})` : "No dice rolled for this action."}
If a dice result is provided, YOU MUST treat it as absolute. A low roll means failure/consequences. A high roll means success.

YOUR TASK:
Respond to the player's action. Progress the narrative, describe the environment, and dictate the reactions of NPCs. Keep the tone dark, gritty, and atmospheric.

OUTPUT REQUIREMENTS:
You must return a raw JSON object with NO markdown wrapping, following this schema exactly:
{
  "narrative": "The story text to show the player. Use HTML for line breaks if needed.",
  "stateChanges": {
    "stats": [{"stat": "Health", "change": -5}], // Optional changes to stats
    "inventoryAdd": ["Iron Key"], // Optional items added
    "inventoryRemove": ["Gold Coin"], // Optional items removed
    "suspicionChange": 5, // Positive to increase suspicion, negative to decrease
    "credibilityChange": -2 // Positive to increase, negative to decrease
  },
  "globalStateChanges": {
    // Optional key-value pairs to update global state (e.g., "tavern_burned": true)
  },
  "newMemoriesToStore": [
    // Optional array of string summaries of IMPORTANT events/lies/secrets established in this turn to save in RAG memory
  ]
}
`;

    // Construct the conversation history for Gemini
    const history = previousMessages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // Add the current action to history
    history.push({
      role: "user",
      parts: [{ text: `Player Action: ${action}` }],
    });

    const result = await model.generateContent({
      contents: [
         { role: "user", parts: [{ text: systemPrompt }] },
         ...history
      ]
    });

    const responseText = result.response.text();
    const jsonResponse = JSON.parse(responseText);

    return NextResponse.json(jsonResponse);

  } catch (error: any) {
    console.error("AI Engine Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
