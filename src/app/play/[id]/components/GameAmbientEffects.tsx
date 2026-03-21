'use client'

import type { CSSProperties } from 'react'

export function GameAmbientEffects() {
    return (
        <>
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(202,138,4,0.08),transparent_40%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(138,3,3,0.12),transparent_45%)]" />
            </div>

            <div className="ember-container">
                {Array.from({ length: 18 }).map((_, index) => (
                    <span
                        key={index}
                        className="ember"
                        style={
                            {
                                left: `${4 + index * 5.4}%`,
                                '--duration': `${3.8 + (index % 5) * 0.55}s`,
                                '--delay': `${index * 0.35}s`,
                                '--drift': `${-18 + (index % 6) * 8}px`,
                            } as CSSProperties
                        }
                    />
                ))}
            </div>

            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-70">
                {Array.from({ length: 12 }).map((_, index) => (
                    <div
                        key={index}
                        className="absolute animate-float-rune text-amber-200/10"
                        style={
                            {
                                left: `${8 + index * 7}%`,
                                top: `${10 + (index % 6) * 13}%`,
                                fontSize: `${12 + (index % 4) * 3}px`,
                                '--duration': `${4 + (index % 4)}s`,
                                '--delay': `${index * 0.6}s`,
                                '--drift': `${-10 + (index % 5) * 5}px`,
                            } as CSSProperties
                        }
                    >
                        ✦
                    </div>
                ))}
            </div>
        </>
    )
}