import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth/roles'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import LibraryClient from './LibraryClient'

export default async function LibraryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!(await isAdmin())) redirect('/dashboard')

  const { data: books } = await supabase
    .from('rule_books')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(202,138,4,0.07),transparent)]" />
      </div>

      <nav className="relative z-50 border-b border-amber-900/20 bg-stone-950/80 backdrop-blur-md sticky top-0">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 text-foreground/40 hover:text-parchment-200 hover:bg-parchment-900/30 rounded-lg transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-px h-5 bg-amber-900/40" />
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-500/60" />
            <span className="font-display text-sm font-bold text-parchment-200 tracking-wider">
              Biblioteca del Oracle
            </span>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8 p-4 rounded-xl border border-amber-900/25 bg-amber-900/10 flex gap-3">
          <BookOpen className="w-5 h-5 text-amber-400/60 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-300/80 font-medium mb-1">¿Cómo funciona?</p>
            <p className="text-foreground/50 leading-relaxed">
              Sube PDFs del <strong className="text-parchment-300">Player&apos;s Handbook</strong>,
              <strong className="text-parchment-300"> Dungeon Master&apos;s Guide</strong> u otros manuales.
              El <strong className="text-parchment-300">Oracle</strong> y el
              <strong className="text-parchment-300"> Game Master</strong> consultarán fragmentos relevantes
              indexados desde la base de datos para aplicar reglas oficiales durante la creación y la sesión.
            </p>
          </div>
        </div>

        <LibraryClient initialBooks={books ?? []} />
      </main>
    </div>
  )
}
