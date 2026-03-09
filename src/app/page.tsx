"use client";

import { motion } from "framer-motion";
import { BookOpen, Sparkles, Brain, Shield, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="min-h-screen bg-background" />;

  return (
    <main className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center">
      {/* Background magical elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-magic-600/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blood-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

      {/* Navigation Layer */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10 relative">
        <div className="font-serif text-2xl font-bold tracking-widest text-parchment-100 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-magic-500" />
          AURA
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/login" className="text-sm font-medium text-parchment-300 hover:text-white transition-colors">
            Iniciar Sesión
          </Link>
          <Link href="/dashboard" className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md text-sm font-medium transition-all">
            Panel de Control
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 w-full max-w-5xl mx-auto flex flex-col items-center justify-center text-center px-6 relative z-10 mt-24 mb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-magic-500/30 bg-magic-500/10 text-magic-500 text-sm font-medium mb-8 backdrop-blur-md"
        >
          <Brain className="w-4 h-4" />
          <span>Impulsado por Gemini AI</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-5xl md:text-7xl font-serif font-bold tracking-tight text-white mb-6 leading-tight"
        >
          El Motor Narrativo <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-parchment-200 to-magic-500">Reactivo</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="text-lg md:text-xl text-foreground max-w-2xl mb-12"
        >
          Forja mundos de rol dinámicos y persistentes donde cada decisión resuena. Tus personajes viven,  la IA como Game Master se adapta, y la historia nunca duerme.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link
            href="/dashboard"
            className="group relative px-8 py-4 bg-magic-600 hover:bg-magic-500 text-white rounded-full font-medium transition-all shadow-[0_0_40px_-10px_rgba(0,180,216,0.5)] flex items-center justify-center gap-2"
          >
            Comenzar Viaje
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#features"
            className="px-8 py-4 rounded-full border border-white/10 hover:border-white/30 text-white font-medium transition-colors flex items-center justify-center"
          >
            Leer la Historia
          </a>
        </motion.div>
      </section>

      {/* Features Showcase */}
      <section id="features" className="w-full max-w-7xl mx-auto px-6 py-24 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            icon: <BookOpen className="w-8 h-8 text-parchment-300" />,
            title: "Mundos Persistentes",
            desc: "Crea campañas inmensas que recuerdan tus acciones. Los NPCs guardan rencor, las facciones cambian su lógica y la historia se reescribe."
          },
          {
            icon: <Brain className="w-8 h-8 text-magic-500" />,
            title: "GM de IA Inteligente",
            desc: "La IA de Gemini dirige la narrativa, respetando la historia de tu mundo, las reglas del género y los límites del personaje sin encasillarlo."
          },
          {
            icon: <Shield className="w-8 h-8 text-blood-500" />,
            title: "Mecánicas RPG",
            desc: "Gestiona inventarios, estadísticas y la progresión de tu personaje de forma nativa en tu chat. Las tiradas de dados suceden dinámicamente."
          }
        ].map((feature, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: idx * 0.2 }}
            className="p-8 rounded-2xl bg-parchment-900/50 border border-white/5 backdrop-blur-sm hover:border-white/10 transition-colors"
          >
            <div className="mb-6 p-4 inline-flex rounded-xl bg-white/5">
              {feature.icon}
            </div>
            <h3 className="text-2xl font-serif font-bold text-white mb-3">{feature.title}</h3>
            <p className="text-foreground leading-relaxed">{feature.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* Footer minimal */}
      <footer className="w-full border-t border-white/5 py-8 mt-24 z-10 relative">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm text-foreground/60">
          <p>© {new Date().getFullYear()} Aura Engine. Licencia MIT.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
            <a href="#" className="hover:text-white transition-colors">Términos</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
