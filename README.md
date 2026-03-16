# Aura: The Reactive Narrative Engine

Aura es un motor narrativo de alto rendimiento, orquestado por Inteligencia Artificial y diseñado para la creación de experiencias de rol dinámicas, persistentes y altamente inmersivas. Construido sobre la base de Next.js y potenciado por modelos fundacionales (Google Gemini), Aura implementa una arquitectura reactiva donde las decisiones del jugador transforman el estado del mundo en tiempo real a través de una capa lógica narrativa desacoplada.

## 🏛️ Filosofía y Arquitectura del Sistema

Aura no es solo una interfaz de chat; es un sistema de gestión de estado distribuido que utiliza LLMs como motores de resolución narrativa. La arquitectura se divide en tres capas críticas:

### 1. Capa de Inteligencia y Orquestación (AI Layer)
- **Motor de Inferencia**: Integración nativa con `Google Gemini Pro` para el procesamiento de lenguaje natural y generación de lógica narrativa.
- **Contextual In-Context Learning**: Gestión avanzada de prompts que inyecta el estado actual de la campaña, histórico de eventos y reglas mecánicas (D&D 5e) en cada interacción.
- **Validación de Salida**: Sistema de parseo de respuestas para extraer metadatos de juego (tiradas de dados, cambios de estado, eventos narrativos) de la respuesta textual.

### 2. Capa de Estado y Reactividad (Persistence Layer)
- **Sincronización en Tiempo Real**: Uso intensivo de `Supabase (PostgreSQL + Realtime)` para garantizar que todos los participantes vean los cambios en el mundo de forma atómica.
- **Hydration & Persistence**: Implementación de `Zustand` con persistencia para la gestión del estado local coordinada con eventos de base de datos.
- **Event Sourcing (Narrative Events)**: Cada hito en la historia se registra como un evento persistente, permitiendo la reconstrucción del hilo narrativo y el aprendizaje del modelo sobre el contexto pasado.

### 3. Capa de Interfaz y Experiencia (UI/UX Layer)
- **Arquitectura de Componentes**: Basada en principios de Atomic Design, utilizando `Tailwind CSS` para un sistema de diseño consistente.
- **Motion Orchestration**: Animaciones fluidas mediante `Framer Motion` para feedback visual en sistemas críticos como el *Combat Tracker* y el *Dice Roller*.

## 🌟 Funcionalidades Avanzadas de Ingeniería

- **Reactive Narrative Engine**: Progresión de historia no lineal con resolución de conflictos mediante lógica de dados integrada.
- **Real-Time Group Sync**: Sincronización de eventos narrativos y chat para campañas multijugador sin desincronización de estado.
- **Deep Narrative Persistence**: Almacenamiento granular de eventos que permite retomar sesiones con coherencia absoluta del contexto AI.
- **Integrated Combat & Initiative**: Sistema de combate de alto nivel con seguimiento de turnos coordinado con la narrativa.

## 📂 Arquitectura de Directorios y Responsabilidades

La estructura de Aura sigue un patrón modular diseñado para la escalabilidad y el desacoplamiento de preocupaciones:

- `src/app/`: **Capa de Aplicación y Routing**. Contiene las páginas, layouts y los *Server Actions* que gestionan la lógica de negocio del lado del servidor.
    - `api/engine/`: Endpoints críticos para el streaming de narrativa y procesamiento de prompts de IA.
- `src/components/`: **Capa de Presentación Modular**. Componentes atómicos y compuestos (Combat, Dice, Session UI) aislados de la lógica de datos.
- `src/lib/`: **Capa de Infraestructura**. Clientes compartidos, configuración de Supabase y adaptadores para el motor de Gemini.
- `src/store/`: **Capa de Estado Global**. Definición de almacenes `Zustand` para la gestión reactiva de la narrativa, usuarios y combate.
- `src/utils/`: **Capa de Soporte Tecnico**. Funciones puras, formateadores de datos y validadores de esquemas narrativos.
- `src/data/`: **Capa de Recursos Estáticos**. Archivos JSON y constantes maestras (reglas PHB, spells, etc.) para inyección en el contexto de IA.
- `supabase/`: **Capa de Persistencia**. Definiciones de esquemas SQL, migraciones y funciones de base de datos.

## 🚀 Pipeline de Desarrollo y Roadmap

### Roadmap Estratégico

| Fase | Hito | Estado |
| :--- | :--- | :--- |
| **Alpha** | Motor de chat reactivo e integración básica con Gemini | ✅ Completado |
| **Beta** | Sistema de combate, sincronización de grupo y persistencia | 🔄 En progreso |
| **v1.0** | Integración de datasets 5e completos y orquestación multi-agente | 📅 Planificado |

### Configuración del Entorno
```bash
git clone https://github.com/Nyken000/aura-engine.git
cd aura-engine
npm install
```

Configurar `.env.local` con:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
GENERAL_API_KEY=tu_gemini_api_key
```

### Ejecución
```bash
npm run dev
```

---

*Aura Engine - Redefiniendo los límites de la narrativa reactiva mediante ingeniería de vanguardia.*
