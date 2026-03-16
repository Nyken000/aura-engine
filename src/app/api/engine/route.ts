import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

type EnginePreviousMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

type EngineCharacter = {
  name: string
  stats: Record<string, unknown>
  inventory: unknown[]
  suspicion: number
  credibility: number
}

type DiceResult = {
  total: number
  roll: number
  modifier: number
}

type EngineRequestBody = {
  action: string
  character: EngineCharacter
  globalState: Record<string, unknown>
  previousMessages: EnginePreviousMessage[]
  diceResult?: DiceResult | null
}

export async function POST(req: Request) {
  try {
    const {
      action,
      character,
      globalState,
      previousMessages,
      diceResult,
    }: EngineRequestBody = await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is missing.' }, { status: 500 })
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })

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
${diceResult ? `DICE RESULT: ${diceResult.total} (Base: ${diceResult.roll} + Modifier: ${diceResult.modifier})` : 'No dice rolled for this action.'}
If a dice result is provided, YOU MUST treat it as absolute. A low roll means failure/consequences. A high roll means success.

YOUR TASK:
Respond to the player's action. Progress the narrative, describe the environment, and dictate the reactions of NPCs. Keep the tone dark, gritty, and atmospheric.

OUTPUT REQUIREMENTS:
You must return a raw JSON object with NO markdown wrapping, following this schema exactly:
{
  "narrative": "The story text to show the player. Use HTML for line breaks if needed.",
  "stateChanges": {
    "stats": [{"stat": "Health", "change": -5}],
    "inventoryAdd": ["Iron Key"],
    "inventoryRemove": ["Gold Coin"],
    "suspicionChange": 5,
    "credibilityChange": -2
  },
  "globalStateChanges": {},
  "newMemoriesToStore": []
}
`

    const history = previousMessages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }))

    history.push({
      role: 'user',
      parts: [{ text: `Player Action: ${action}` }],
    })

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }, ...history],
    })

    const responseText = result.response.text()
    const jsonResponse = JSON.parse(responseText) as Record<string, unknown>

    return NextResponse.json(jsonResponse)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown AI engine error'
    console.error('AI Engine Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}