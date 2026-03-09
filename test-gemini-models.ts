import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function run() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    console.error("No API key found")
    return
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
    const data = await res.json()
    console.log("Available models:")
    data.models?.forEach((m: any) => {
        if (m.supportedGenerationMethods?.includes('generateContent')) {
            console.log(`- ${m.name} (${m.displayName})`)
        }
    })
  } catch (e) {
    console.error("Error fetching models:", e)
  }
}

run()
