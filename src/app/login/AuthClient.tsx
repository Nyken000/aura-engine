'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { login, signup } from './actions'

export default function AuthClient({ message }: { message?: string }) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [isLoading, setIsLoading] = useState(false)

  // Wrapper for server actions to show loading state if desired
  // However, formAction handles loading via useFormStatus, but for simplicity
  // we can just let the browser handle the form submission wait.

  return (
    <div className="flex-1 flex flex-col w-full justify-center gap-6 sm:max-w-md z-10 animate-in fade-in zoom-in duration-500">
      <Link 
        href="/"
        className="font-display text-3xl font-bold tracking-widest text-parchment-100 flex items-center justify-center gap-2 mb-4 drop-shadow-[0_0_15px_rgba(202,138,4,0.5)] transition-transform hover:scale-105"
      >
        <Sparkles className="w-8 h-8 text-amber-500" />
        AURA
      </Link>
      
      <div className="flex flex-col w-full text-foreground p-1 rounded-2xl bg-stone-900/80 border border-amber-900/30 backdrop-blur-md shadow-2xl relative overflow-hidden">
        
        {/* Magic glow behind tabs */}
        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />

        {/* Tab Toggle */}
        <div className="flex p-2 relative z-10 w-full mb-2">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-widest rounded-xl transition-all duration-300 ${
              activeTab === 'login'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(202,138,4,0.1)]'
                : 'text-foreground/40 hover:text-foreground/70 border border-transparent'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-widest rounded-xl transition-all duration-300 ${
              activeTab === 'register'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(202,138,4,0.1)]'
                : 'text-foreground/40 hover:text-foreground/70 border border-transparent'
            }`}
          >
            Registrarse
          </button>
        </div>

        <div className="p-6 pt-2 relative z-10">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-display font-bold text-parchment-100 mb-2">
              {activeTab === 'login' ? 'Volver al Reino' : 'Inicia tu Leyenda'}
            </h1>
            <p className="text-xs text-foreground/50">
              {activeTab === 'login' 
                ? 'Tus aventuras aguardan donde las dejaste.' 
                : 'Forja tu destino en el mundo de Aura.'}
            </p>
          </div>

          <form className="flex flex-col gap-5">
            {/* Registro: Nombre */}
            {activeTab === 'register' && (
              <div className="space-y-1.5 animate-in slide-in-from-left-2 fade-in duration-300">
                <label className="text-xs font-semibold uppercase tracking-wider text-amber-500/80" htmlFor="username">
                  Nombre
                </label>
                <input
                  className="w-full rounded-xl px-4 py-3 bg-stone-950/50 border border-amber-900/30 text-parchment-200 placeholder:text-foreground/20 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all font-sans text-sm"
                  name="username"
                  placeholder="Tu nombre o alias"
                  required
                />
              </div>
            )}

            {/* Email (ambos) */}
            <div className="space-y-1.5 animate-in fade-in duration-300">
              <label className="text-xs font-semibold uppercase tracking-wider text-amber-500/80" htmlFor="email">
                Correo Electrónico
              </label>
              <input
                className="w-full rounded-xl px-4 py-3 bg-stone-950/50 border border-amber-900/30 text-parchment-200 placeholder:text-foreground/20 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all font-sans text-sm"
                name="email"
                type="email"
                placeholder="tu@correo.com"
                required
              />
            </div>

            {/* Password (ambos) */}
            <div className="space-y-1.5 animate-in fade-in duration-300">
              <label className="text-xs font-semibold uppercase tracking-wider text-amber-500/80" htmlFor="password">
                Contraseña
              </label>
              <input
                className="w-full rounded-xl px-4 py-3 bg-stone-950/50 border border-amber-900/30 text-parchment-200 placeholder:text-foreground/20 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all font-sans text-sm"
                type="password"
                name="password"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="mt-4">
              {activeTab === 'login' ? (
                <button
                  formAction={login}
                  onClick={() => setIsLoading(true)}
                  className="w-full bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-amber-100 rounded-xl px-4 py-3.5 font-bold transition-all shadow-[0_0_15px_-3px_rgba(217,119,6,0.5)] flex justify-center items-center shadow-amber-900/50 uppercase tracking-widest text-sm"
                >
                  {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
                </button>
              ) : (
                <button
                  formAction={signup}
                  onClick={() => setIsLoading(true)}
                  className="w-full bg-stone-800 hover:bg-stone-700 text-parchment-200 rounded-xl px-4 py-3.5 border border-amber-900/40 hover:border-amber-500/40 font-bold transition-all flex justify-center uppercase tracking-widest text-sm"
                >
                  {isLoading ? 'Registrando...' : 'Registrar Cuenta'}
                </button>
              )}
            </div>

            {message && (
              <div className="mt-2 p-3 bg-red-950/50 border border-red-900/50 text-red-200 text-xs font-medium text-center rounded-lg animate-in fade-in slide-in-from-bottom-2">
                {message}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
