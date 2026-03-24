import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Globe, Sparkles } from 'lucide-react'

type WorldRecord = {
  id: string
  creator_id: string
  name: string
  description: string | null
  genre?: string | null
  created_at?: string | null
}

export default async function WorldDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = await paramsPromise
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: world, error } = await supabase
    .from('worlds')
    .select('*')
    .eq('id', params.id)
    .single()

  const typedWorld = world as WorldRecord | null

  if (error || !typedWorld) redirect('/dashboard')
  if (typedWorld.creator_id !== user.id) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(202,138,4,0.07),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_110%,rgba(138,3,3,0.08),transparent)]" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-foreground/50 hover:text-parchment-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al dashboard
          </Link>
        </div>

        <section className="rounded-3xl border border-amber-900/20 bg-stone-950/60 overflow-hidden shadow-card">
          <div className="p-8 border-b border-amber-900/20 bg-[radial-gradient(ellipse_at_top_left,rgba(202,138,4,0.06),transparent_60%)]">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Globe className="w-7 h-7 text-amber-400" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="font-display text-3xl md:text-4xl font-bold text-parchment-100">
                    {typedWorld.name}
                  </h1>
                  {typedWorld.genre ? (
                    <span className="text-[10px] font-mono text-amber-600/70 bg-amber-900/20 px-2 py-1 rounded-full border border-amber-900/30 uppercase tracking-[0.2em]">
                      {typedWorld.genre}
                    </span>
                  ) : null}
                </div>

                <p className="text-foreground/60 max-w-3xl leading-relaxed">
                  {typedWorld.description || 'Este mundo aún no tiene una descripción registrada.'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-amber-900/20 bg-stone-950/50 p-5">
              <div className="flex items-center gap-2 mb-3 text-amber-500/80">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs uppercase tracking-[0.2em] font-display">
                  Estado del mundo
                </span>
              </div>
              <p className="text-sm text-foreground/55 leading-relaxed">
                Vista base operativa. Esta pantalla evita el 404 y deja lista la ruta para que
                luego conectemos campañas, sesiones activas, biblioteca y edición avanzada del mundo.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-900/20 bg-stone-950/50 p-5">
              <div className="text-xs uppercase tracking-[0.2em] font-display text-amber-500/80 mb-3">
                Próximo paso
              </div>
              <div className="space-y-2 text-sm text-foreground/55">
                <p>• sesiones asociadas al mundo</p>
                <p>• personajes de este mundo</p>
                <p>• campañas disponibles</p>
                <p>• acceso directo a edición y biblioteca</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
