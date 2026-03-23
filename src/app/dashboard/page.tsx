import { createClient } from '@/utils/supabase/server'
import { getUserRole } from '@/utils/auth/roles'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Swords, Globe, Scroll, LogOut, MapPin, BookOpen, Shield } from 'lucide-react'
import { logout } from '@/app/login/actions'
import CharacterCard from './components/CharacterCard'
import MultiplayerPanel from './components/MultiplayerPanel'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const { data: worlds } = await supabase
    .from('worlds').select('*').eq('creator_id', user.id).order('created_at', { ascending: false })

  const { data: characters } = await supabase
    .from('characters').select('*, worlds(name)').eq('user_id', user.id).order('created_at', { ascending: false })

  const username = profile?.username || user.email?.split('@')[0] || 'Aventurero'
  const role = await getUserRole()
  const admin = role === 'admin'

  // Fetch active multiplayer sessions (as host or player)
  const { data: mySessions } = await supabase
    .from('game_sessions')
    .select('*, worlds(name, genre), profiles!host_id(username)')
    .in('status', ['lobby', 'active'])
    .or(`host_id.eq.${user.id},id.in.(${(
      (await supabase.from('session_players').select('session_id').eq('user_id', user.id)).data?.map(p => p.session_id).join(',') || 'null'
    )})`)
    .order('created_at', { ascending: false })

  const safeWorlds = (worlds ?? []).filter(Boolean)
  const safeCharacters = (characters ?? []).filter(Boolean)
  const safeSessions = (mySessions ?? []).filter(Boolean)

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      
      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(202,138,4,0.07),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_110%,rgba(138,3,3,0.08),transparent)]" />
        {/* Stone texture overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"}} />
      </div>

      {/* Top Navigation */}
      <nav className="relative z-50 border-b border-amber-900/20 bg-stone-950/80 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-torch-sm">
              <Scroll className="w-4 h-4 text-amber-400" />
            </div>
            <span className="font-display text-lg font-bold tracking-widest text-parchment-100">
              La Taverna
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-foreground/60 font-display tracking-wider hidden sm:block">
              {username}
            </div>
            <form action={logout}>
              <button 
                type="submit"
                className="p-2 text-foreground/40 hover:text-parchment-200 hover:bg-parchment-900/30 rounded-lg transition-all duration-200 cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">

        {/* Welcome Header */}
        <div className="mb-12 page-enter">
          <p className="text-amber-500/70 text-sm font-display tracking-[0.2em] uppercase mb-2">Bienvenido de vuelta</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-parchment-100 mb-3">
            {username}
          </h1>
          <p className="text-foreground/50 max-w-lg">
            Elige un mundo donde tu historia continúa, o forja uno nuevo desde la nada.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT: Worlds Section */}
          <section className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-amber-400" />
                </div>
                <h2 className="font-display text-xl font-bold text-parchment-200">
                  Tus Mundos
                </h2>
                <span className="text-xs text-foreground/40 font-mono">{safeWorlds.length}</span>
              </div>
              <Link
                href="/dashboard/worlds/new"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 text-sm font-medium transition-all duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:block">Nuevo Mundo</span>
              </Link>
            </div>

            {safeWorlds.length === 0 ? (
              <Link 
                href="/dashboard/worlds/new"
                className="group flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-amber-900/30 hover:border-amber-500/40 bg-stone-950/40 hover:bg-amber-500/5 transition-all duration-300 cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                  <Globe className="w-8 h-8 text-amber-500/50 group-hover:text-amber-400 transition-colors" />
                </div>
                <p className="font-display text-parchment-300 mb-1 font-bold">El vacío os espera</p>
                <p className="text-sm text-foreground/40">Haz clic para crear tu primer mundo</p>
              </Link>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {safeWorlds.map((world) => (
                  <Link
                    key={world.id}
                    href={`/dashboard/worlds/${world.id}`}
                    className="group relative p-6 rounded-2xl border border-amber-900/20 hover:border-amber-500/40 bg-stone-950/60 hover:bg-stone-900/80 transition-all duration-300 overflow-hidden cursor-pointer shadow-card"
                  >
                    {/* Hover glow */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-[radial-gradient(ellipse_at_top_left,rgba(202,138,4,0.06),transparent_60%)]" />
                    
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 group-hover:border-amber-500/40 transition-all">
                          <MapPin className="w-5 h-5 text-amber-500/60 group-hover:text-amber-400 transition-colors" />
                        </div>
                        {world.genre && (
                          <span className="text-[10px] font-mono text-amber-600/60 bg-amber-900/20 px-2 py-1 rounded-full border border-amber-900/30 uppercase tracking-widest">
                            {world.genre}
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-lg font-bold text-parchment-200 group-hover:text-parchment-100 transition-colors mb-2">
                        {world.name}
                      </h3>
                      <p className="text-sm text-foreground/50 line-clamp-2 leading-relaxed">
                        {world.description}
                      </p>
                    </div>
                  </Link>
                ))}

                {/* Create New World card */}
                <Link
                  href="/dashboard/worlds/new"
                  className="group flex items-center justify-center p-6 rounded-2xl border border-dashed border-amber-900/20 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-200 cursor-pointer min-h-[140px]"
                >
                  <div className="text-center">
                    <Plus className="w-6 h-6 text-foreground/30 group-hover:text-amber-500/60 transition-colors mx-auto mb-2" />
                    <span className="text-sm text-foreground/30 group-hover:text-foreground/50 transition-colors">Nuevo mundo</span>
                  </div>
                </Link>
              </div>
            )}
          </section>

          {/* RIGHT: Characters Section */}
          <aside className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blood-500/10 border border-blood-500/20 flex items-center justify-center">
                  <Swords className="w-4 h-4 text-blood-400" />
                </div>
                <h2 className="font-display text-xl font-bold text-parchment-200">
                  Personajes
                </h2>
                <span className="text-xs text-foreground/40 font-mono">{safeCharacters.length}</span>
              </div>
              <Link
                href="/dashboard/characters/new"
                className="flex items-center gap-2 p-2 rounded-lg text-foreground/40 hover:text-parchment-200 hover:bg-parchment-900/30 transition-all duration-200 cursor-pointer"
                title="Nuevo personaje"
              >
                <Plus className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-3">
              {safeCharacters.length === 0 ? (
                <Link
                  href="/dashboard/characters/new"
                  className="group flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-blood-700/30 hover:border-blood-500/50 hover:bg-blood-500/5 transition-all duration-200 cursor-pointer"
                >
                  <Swords className="w-8 h-8 text-foreground/20 group-hover:text-blood-500/60 transition-colors mx-auto mb-3" />
                  <p className="text-sm text-foreground/40 group-hover:text-foreground/60 text-center transition-colors">
                    Sin aventureros<br/>
                    <span className="text-xs">Crea tu primer personaje</span>
                  </p>
                </Link>
              ) : (
                <>
                  {safeCharacters.map((char) => (
                    <CharacterCard key={char.id} char={char} />
                  ))}
                  <Link
                    href="/dashboard/characters/new"
                    className="group flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-dashed border-blood-700/20 hover:border-blood-500/40 hover:bg-blood-500/5 transition-all duration-200 text-sm text-foreground/30 hover:text-blood-400/80 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo personaje
                  </Link>
                </>
              )}
            </div>

            {/* Library Link — Admin Only */}
            {admin && (
              <Link
                href="/dashboard/library"
                className="mt-8 flex items-start gap-3 p-4 rounded-xl border border-amber-900/20 bg-stone-950/40 hover:bg-amber-900/10 hover:border-amber-700/30 transition-all duration-200 group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:border-amber-500/40 transition-colors">
                  <BookOpen className="w-4 h-4 text-amber-500/60 group-hover:text-amber-400 transition-colors" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display text-xs text-amber-600/70 uppercase tracking-widest group-hover:text-amber-500/80 transition-colors">Biblioteca del Oracle</span>
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-amber-900/30 border border-amber-700/30 text-amber-600/60">
                      <Shield className="w-2.5 h-2.5" /> Admin
                    </span>
                  </div>
                  <p className="text-xs text-foreground/30 group-hover:text-foreground/50 transition-colors">
                    Manuales D&D activos como referencia del GM
                  </p>
                </div>
              </Link>
            )}
          </aside>
        </div>

        {/* MULTIPLAYER SECTION */}
        <div className="mt-10">
          <MultiplayerPanel 
            worlds={safeWorlds} 
            activeSessions={safeSessions} 
            currentUserId={user.id}
          />
        </div>
      </main>
    </div>
  )
}
