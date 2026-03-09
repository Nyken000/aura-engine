import { login, signup } from './actions'
import { Sparkles, Brain, Shield } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message: string }
}) {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Background magical elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-magic-600/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blood-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

      <div className="flex-1 flex flex-col w-full justify-center gap-6 sm:max-w-md z-10">
        <Link 
          href="/"
          className="font-serif text-3xl font-bold tracking-widest text-parchment-100 flex items-center justify-center gap-2 mb-8"
        >
          <Sparkles className="w-8 h-8 text-magic-500" />
          AURA
        </Link>
        <form className="animate-in flex-1 flex flex-col w-full justify-center gap-6 text-foreground p-8 rounded-2xl bg-parchment-900/50 border border-white/5 backdrop-blur-md shadow-2xl">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-serif font-bold text-white mb-2">Entrar al Reino</h1>
            <p className="text-sm text-foreground/70">Inicia sesión o crea una cuenta nueva forjar tu destino.</p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-parchment-200" htmlFor="email">
                Correo Electrónico
              </label>
              <input
                className="w-full rounded-lg px-4 py-3 bg-background border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-magic-500/50 focus:border-magic-500 transition-all"
                name="email"
                placeholder="tu@correo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-parchment-200" htmlFor="username">
                Nombre de Usuario (Solo registro)
              </label>
              <input
                className="w-full rounded-lg px-4 py-3 bg-background border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-magic-500/50 focus:border-magic-500 transition-all"
                name="username"
                placeholder="Elige tu alias"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-parchment-200" htmlFor="password">
                Contraseña
              </label>
              <input
                className="w-full rounded-lg px-4 py-3 bg-background border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-magic-500/50 focus:border-magic-500 transition-all"
                type="password"
                name="password"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <button
              formAction={login}
              className="bg-magic-600 hover:bg-magic-500 text-white rounded-lg px-4 py-3 font-medium transition-all shadow-[0_0_20px_-5px_rgba(0,180,216,0.3)] flex justify-center w-full"
            >
              Iniciar Sesión
            </button>
            <button
              formAction={signup}
              className="px-4 py-3 border border-white/10 text-white rounded-lg hover:border-white/30 transition-all text-sm font-medium w-full"
            >
              Registrarse (Crear Cuenta)
            </button>
          </div>
          
          {searchParams?.message && (
            <p className="mt-4 p-4 bg-white/5 border border-white/10 text-white/90 text-sm text-center rounded-lg">
              {searchParams.message}
            </p>
          )}
        </form>
      </div>
    </main>
  )
}
