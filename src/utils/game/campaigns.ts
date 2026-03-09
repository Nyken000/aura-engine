export type Campaign = {
  id: string;
  title: string;
  theme: string;
  description: string;
  main_quest: string;
  starting_situation: string;
  the_twist: string;
  key_npcs: string[];
};

export const predefinedCampaigns: Campaign[] = [
  {
    id: "oakhaven-fall",
    title: "La Caída de Oakhaven",
    theme: "Fantasía Oscura / Supervivencia",
    description: "Oakhaven alguna vez fue la capital de la erudición. Hoy, está siendo devorada por la 'Niebla Cenicienta', una anomalía mágica que deforma los cuerpos y mentes de quienes la respiran.",
    main_quest: "Escapar de Oakhaven antes de que las grandes puertas de hierro se sellen para siempre y la Niebla lo consuma todo.",
    starting_situation: "Has despertado tosiendo en una celda de la prisión de la guardia local. Las celdas están abiertas, no hay guardias a la vista y puedes escuchar gritos horripilantes provenientes del patio oeste. El humo gris comienza a filtrarse por las ventanas enrejadas.",
    the_twist: "La niebla no es un fenómeno natural o una maldición externa; fue creada artificialmente por los clérigos más altos de la ciudad, quienes creyeron que esta era la única forma de purgar el 'pecado' de los ciudadanos e iniciar un génesis acelerado.",
    key_npcs: [
      "Elyas, el Cartógrafo Ciego (Secretamente esconde el mapa de las cloacas de escape en su bastón).",
      "Capitán Thorne (Un guardia medio transformado por la niebla, que oscila entre intentar matar al jugador y llorar sangre pidiendo ayuda)."
    ]
  },
  {
    id: "leviathan-veil",
    title: "El Velo del Leviatán",
    theme: "Aventura Pirata / Horror Marino",
    description: "El Mar Inquieto está dominado por la Armada Imperial de la Corona del Dragón, pero los grandes tesoros se esconden más allá del Velo del Leviatán, una tormenta perpetua que destruye casi cualquier barco.",
    main_quest: "Tomar el control del navío y encontrar los tres fragmentos del Astrolabio Estelar para cruzar el Velo antes que la Armada.",
    starting_situation: "Despiertas con sabor a sal y sangre. Estás encadenado al suelo mojado en la bodega profunda de 'El Penitente', un barco prisión de la Armada Imperial. De repente, la madera cruje como si la partieran en dos y agua salada comienza a inundar tu celda. Se escuchan rugidos monstruosos y disparos de cañón en cubierta.",
    the_twist: "El Astrolabio Estelar no traza rutas de navegación; atrae a un kraken celestial ancestral (El Leviatán) para que abra portales temporales en el mar. Toda la tripulación de 'El Penitente' iba a ser sacrificada para despertarlo.",
    key_npcs: [
      "Silas 'Dedo-plata' (Un contrabandista amarrado junto a ti, que conoce una forma rápida de abrir las cerraduras pero tiene el hombro dislocado).",
      "La Capitana Elara Vance (Una implacable oficial imperial que prefiere hundir el barco antes que permitir que un prisionero tome el control)."
    ]
  },
  {
    id: "eternal-flame",
    title: "El Asedio a la Llama Eterna",
    theme: "Alta Fantasía / Intriga Épica",
    description: "Helia es la última de las ciudades flotantes, mantenida en el aire por la mítica Llama Eterna. Abajo, el mundo de la superficie ha sido conquistado por el Culto del Dragón Cromático, quienes miran el cielo con hambre.",
    main_quest: "Descubrir quién saboteó el motor arcano de la Llama Eterna y detener la caída inminente de la ciudad de Helia.",
    starting_situation: "Estás en el nivel inferior de la ciudad flotante (Las Calderas). Justo frente a ti, un ingeniero arcaico cae de la pasarela tras ser apuñalado en la garganta. La gran maquinaria de la Llama empieza a emitir chispas rojas, perdiendo altitud abruptamente. Escuchas pasos alejándose rápidamente en la oscuridad de los engranajes.",
    the_twist: "El verdadero saboteador es el mismísimo Gran Sacerdote de la ciudad, quien hizo un trato con un antiguo dragón rojo: dejará caer la ciudad a cambio de vida eterna para él y su familia.",
    key_npcs: [
      "Vael, el Ingeniero Arcano Aprendiz (Nervioso e inexperto, pero comprende la Llama mejor que nadie vivo).",
      "Señor Arquitecto Lucien (Imponente, viste ropas doradas y siempre llega 'justo' cuando los problemas han terminado)."
    ]
  },
  {
    id: "crimson-carnival",
    title: "El Carnaval Carmesí",
    theme: "Misterio / Gótico / Surrealismo Oscuro",
    description: "Aparece solo una vez cada cien años, siempre en una noche de luna nueva. El Carnaval Carmesí promete hacer realidad cualquier deseo, pero las entradas se pagan con partes del alma o con recuerdos muy queridos. Todo lo que ves parece hermoso, pero huele ligeramente a flores podridas.",
    main_quest: "Ganar cinco 'Monedas de Alma' en las atracciones para comprar una audiencia con el Maestro de Ceremonias y recuperar lo que perdiste (o escapar antes del amanecer).",
    starting_situation: "Te encuentras parado justo frente a las puertas de hierro forjado del Carnaval. No recuerdas cómo llegaste y sientes que olvidaste algo inmensamente importante en tu pasado (tu motivación original). Un bufón en zancos con una sonrisa cosida te entrega un boleto rojo y te dice: 'Empieza la última noche. Date prisa, la magia se pudre al alba'.",
    the_twist: "El jugador no entró para recuperar algo, entró para salvar a un ser querido y falló. El carnaval los reseteó la noche anterior y les quitó la memoria. Ya perdieron antes. El verdadero reto es romper el ciclo destruyendo la atracción central en lugar de jugar los juegos.",
    key_npcs: [
      "Madame Zara (La adivina de la tienda púrpura. Juega limpio y da pistas reales, pero habla exclusivamente en acertijos perturbadores).",
      "El Maestro de Ceremonias (Siempre lleva una máscara de porcelana agrietada; cortés, letal, detesta el silencio y ama las obras teatrales tristes)."
    ]
  },
  {
    id: "sand-king-tomb",
    title: "La Tumba del Rey de Arena",
    theme: "Exploración Indiana Jones / Magia Antigua",
    description: "El Mar de Cristal de Azir es un desierto expansivo donde la arena está fusionada e inestable resultando en vidrio cortante bajo un sol sofocante. En algún lugar profundo de Azir descansa la Pirámide Invertida, sepulcro de un faraón que doblaba el espacio-tiempo.",
    main_quest: "Atravesar el desierto, saquear el cetro del Rey de Arena antes que el Culto del Escarabajo de Ónice, y salir con vida.",
    starting_situation: "Tu cantimplora tiene apenas dos gotas de agua que burbujean por el calor extremo del Mar de Cristal. En el horizonte de las dunas ves el obelisco de entrada a la tumba. Sin embargo, a solo cien metros de ti, un grupo de saqueadores del Culto del Escarabajo te acaba de divisar y desenfundan sus cimitarras envenenadas.",
    the_twist: "La pirámide está invertida temporalmente. Mientras más desciendes, más viajas al pasado, revelando que el Rey de Arena no está 'muerto', sino esperando en éstasis su coronación en el fondo de la tumba. Los artefactos son en realidad baterías para despertarlo.",
    key_npcs: [
      "Kaelen el Rastreador (Un guía local del desierto que conoce los peligros de Azir, pero le tiene un terror puro a entrar en la tumba).",
      "La Alta Sacerdotisa Nefret (Líder despiadada del Culto del Escarabajo, convencida de que los artefactos le pertenecen por derecho de sangre)."
    ]
  }
];

export function getRandomCampaign(): Campaign {
  const randomIndex = Math.floor(Math.random() * predefinedCampaigns.length);
  return predefinedCampaigns[randomIndex];
}

export function getCampaignById(id: string): Campaign | undefined {
  return predefinedCampaigns.find(c => c.id === id);
}
