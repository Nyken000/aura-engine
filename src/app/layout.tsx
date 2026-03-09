import type { Metadata } from "next";
import { Cinzel, Inter, IM_Fell_English, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: '--font-inter',
  display: 'swap'
});

const cinzel = Cinzel({ 
  subsets: ["latin"], 
  weight: ["400", "600", "700", "900"], 
  variable: '--font-cinzel',
  display: 'swap'
});

const imFellEnglish = IM_Fell_English({ 
  subsets: ["latin"], 
  weight: "400",
  style: ["normal", "italic"],
  variable: '--font-im-fell',
  display: 'swap'
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"], 
  weight: ["400", "500"],
  variable: '--font-jetbrains',
  display: 'swap'
});

export const metadata: Metadata = {
  title: "Aura — The Reactive Narrative Engine",
  description: "Sumérgete en una historia épica de rol generativa, guiada por inteligencia artificial. Donde cada decisión altera el destino.",
  keywords: ["RPG", "D&D", "AI", "tabletop", "narrative", "fantasy"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${cinzel.variable} ${imFellEnglish.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
