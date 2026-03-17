import { generateAiJson, type AiChatMessage } from '@/lib/ai/provider'
import { NextResponse } from 'next/server'

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

function buildEngineMessages(params: EngineRequestBody): AiChatMessage[] {
  const systemPrompt = `
You are the Dungeon Master (DM) for "Aura", a dark medieval fantasy RPG.
You control the world, NPCs, and narrative consequences based on the player's actions.

CHARACTER STATE:
Name: ${params.character.name}
Stats: ${JSON.stringify(params.character.stats)}
Inventory: ${JSON.stringify(params.character.inventory)}
Suspicion: ${params.character.suspicion}/100
Credibility: ${params.character.credibility}/100

WORLD STATE:
${JSON.stringify(params.globalState)}

DICE ARBITRATION:
If the player attempted a difficult/risky action, a dice result may be provided:
${params.diceResult ? `DICE RESULT: ${params.diceResult.total} (Base: ${params.diceResult.roll} + Modifier: ${params.diceResult.modifier})` : 'No dice rolled for this action.'}
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

  const historyMessages = params.previousMessages.map<AiChatMessage>((message) => ({
    role: message.role,
    content: message.content,
  }))

  return [
    { role: 'system', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: `Player Action: ${params.action}` },
  ]
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as EngineRequestBody
    const responseText = await generateAiJson({
      messages: buildEngineMessages(payload),
      temperature: 0,
      format: 'json',
    })

    const jsonResponse = JSON.parse(responseText) as Record<string, unknown>
    return NextResponse.json(jsonResponse)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown AI engine error'
    console.error('AI Engine Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}