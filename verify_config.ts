import { 
    getOllamaNarrativeTemperature, 
    getOllamaStructuredTemperature,
    getOllamaNarrativeModel,
    getOllamaStructuredModel
} from './src/lib/ai/ollama';

async function test() {
    console.log('--- Config Verification ---');
    console.log('Narrative Model:', getOllamaNarrativeModel());
    console.log('Structured Model:', getOllamaStructuredModel());
    console.log('Narrative Temp:', getOllamaNarrativeTemperature());
    console.log('Structured Temp:', getOllamaStructuredTemperature());
    
    // Check if they match .env.local values
    // OLLAMA_NARRATIVE_MODEL=qwen2.5:14b
    // OLLAMA_STRUCTURED_MODEL=qwen2.5:7b
    // OLLAMA_NARRATIVE_TEMPERATURE=0.78
    // OLLAMA_STRUCTURED_TEMPERATURE=0.05
}

test().catch(console.error);
