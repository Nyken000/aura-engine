import { createWorld } from './actions'
import { Globe, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewWorldPage() {
  return (
    <div className="min-h-screen bg-background text-foreground custom-scrollbar">
      {/* Top Navigation */}
      <nav className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-foreground/60 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Volver a la Taverna</span>
          </Link>
          <div className="font-serif text-xl font-bold tracking-widest text-parchment-100 flex items-center gap-2">
            La Taverna
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-white flex items-center gap-3 mb-2">
            <Globe className="w-8 h-8 text-magic-500" />
            Forjar un Nuevo Mundo
          </h1>
          <p className="text-foreground/70">
            Define las reglas, el género y la historia de tu campaña. La IA de Gemini utilizará esta información para guiar la narrativa de todos los jugadores que se unan.
          </p>
        </div>

        {/* @ts-expect-error Server Action signature mismatch for Next.js forms without useFormState */}
        <form action={createWorld} className="space-y-6 bg-parchment-900/40 border border-white/5 p-8 rounded-2xl">
          
          <div className="space-y-4">
            <h2 className="text-xl font-serif font-bold text-white border-b border-white/10 pb-2">Información Básica</h2>
            
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-parchment-200">
                Nombre del Mundo <span className="text-blood-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                placeholder="Ej. Las Tierras de Eldoria"
                required
                className="w-full rounded-lg px-4 py-3 bg-background border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-magic-500/50 focus:border-magic-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-parchment-200">
                Descripción / Sinopsis <span className="text-blood-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Un breve resumen de la situación actual y la historia antigua. ¿Qué amenaza a este mundo?"
                required
                className="w-full rounded-lg px-4 py-3 bg-background border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-magic-500/50 focus:border-magic-500 transition-all resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="genre" className="text-sm font-medium text-parchment-200">
                Género
              </label>
              <input
                id="genre"
                name="genre"
                placeholder="Ej. Fantasía Oscura, Sci-Fi, Cyberpunk..."
                className="w-full rounded-lg px-4 py-3 bg-background border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-magic-500/50 focus:border-magic-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-4 pt-6">
             <h2 className="text-xl font-serif font-bold text-white border-b border-white/10 pb-2 flex items-center justify-between">
               Configuración de la IA (Game Master) 
               <span className="text-xs px-2 py-1 rounded bg-magic-500/20 text-magic-400 font-sans font-normal border border-magic-500/30">Opcional pero recomendado</span>
             </h2>
             
             <div className="space-y-2">
              <label htmlFor="ai_rules" className="text-sm font-medium text-parchment-200">
                Reglas y Directrices para la IA
              </label>
              <textarea
                id="ai_rules"
                name="ai_rules"
                rows={5}
                placeholder="Ej. La magia arcana está estrictamente prohibida. Los NPCs desconfían de los elfos. Las batallas deben ser letales y descritas con crudeza."
                className="w-full rounded-lg px-4 py-3 bg-background border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-magic-500/50 focus:border-magic-500 transition-all resize-none font-mono text-sm"
              />
              <p className="text-xs text-foreground/50">Estas instrucciones se inyectarán en secreto al modelo de Gemini para condicionar sus respuestas y adaptarlas a tu mundo.</p>
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <h2 className="text-xl font-serif font-bold text-white border-b border-white/10 pb-2">Privacidad</h2>
            
            <label className="flex items-start gap-4 cursor-pointer group">
              <div className="mt-1">
                <input 
                  type="checkbox" 
                  name="is_public" 
                  id="is_public"
                  className="w-5 h-5 rounded border-white/20 bg-background accent-magic-500 cursor-pointer" 
                />
              </div>
              <div>
                <span className="text-sm font-medium text-white group-hover:text-magic-400 transition-colors">Hacer público este mundo</span>
                <p className="text-xs text-foreground/60 mt-1">Si está activado, otros jugadores podrán encontrar tu mundo y crear personajes en él.</p>
              </div>
            </label>
          </div>

          <div className="pt-8 flex justify-end">
            <button
              type="submit"
              className="bg-magic-600 hover:bg-magic-500 text-white rounded-lg px-8 py-3 font-medium transition-all shadow-[0_0_20px_-5px_rgba(0,180,216,0.5)] flex items-center gap-2"
            >
              <Globe className="w-5 h-5" />
              Crear Mundo
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
