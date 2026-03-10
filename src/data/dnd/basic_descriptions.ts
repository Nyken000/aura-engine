export const RACE_DESCRIPTIONS: Record<string, { flavor: string, mechanics: string }> = {
  'Humano': {
    flavor: 'Adaptables y ambiciosos, los humanos son los innovadores y pioneros del mundo. No tienen una especialidad inherente, pero su versatilidad les permite destacar en cualquier disciplina que se propongan.',
    mechanics: '+1 a todas las puntuaciones de característica. Velocidad: 30 pies. Idiomas: Común y uno adicional.',
  },
  'Elfo': {
    flavor: 'Pueblo mágico de gracia y longevidad, los elfos viven en lugares de belleza etérea. Están profundamente conectados con la naturaleza, la magia y las artes.',
    mechanics: '+2 a Destreza. Visión en la oscuridad. Competencia en Percepción. Ventaja contra ser encantado y no pueden ser dormidos por magia. Velocidad: 30 pies.',
  },
  'Enano': {
    flavor: 'Hábiles mineros y artesanos de la piedra y el metal. Los enanos son robustos, estoicos y ferozmente leales a sus clanes ancestrales. Suelen vivir bajo las montañas.',
    mechanics: '+2 a Constitución. Visión en la oscuridad. Resistencia al veneno. Competencia con herramientas de artesano y armas enanas. Velocidad: 25 pies (sin penalización por armadura pesada).',
  },
  'Mediano': {
    flavor: 'Gente pequeña, alegre y hogareña. Valoran la paz, la buena comida y la camaradería por encima de la gloria. Su suerte legendaria les permite escapar de los peores peligros.',
    mechanics: '+2 a Destreza. Suerte (pueden repetir un 1 en el dado). Valentía (ventaja contra asustado). Agilidad que les permite moverse por espacios de criaturas más grandes. Velocidad: 25 pies.',
  },
  'Dracónido': {
    flavor: 'Nacidos de la sangre de los dragones, son guerreros orgullosos y honorables. Su aspecto intimidante es respaldado por su arma de aliento elemental.',
    mechanics: '+2 a Fuerza, +1 a Carisma. Ascendencia dracónica (resistencia a un tipo de daño). Arma de aliento (cono o línea de daño elemental). Velocidad: 30 pies.',
  },
  'Gnomo': {
    flavor: 'Ingeniosos, curiosos y llenos de energía, los gnomos disfrutan de la vida hasta el último segundo. Son famosos por sus inventos, ilusiones y buen humor.',
    mechanics: '+2 a Inteligencia. Visión en la oscuridad. Astucia gnómica (ventaja en tiradas de salvación de Int, Sab y Car contra magia). Velocidad: 25 pies.',
  },
  'Semielfo': {
    flavor: 'Compartiendo lo mejor de dos mundos, poseen la curiosidad humana y la elegancia élfica. A menudo son errantes y embajadores diplomáticos entre ambas razas.',
    mechanics: '+2 a Carisma, +1 a otras dos características. Visión en la oscuridad. Ventaja contra ser encantado, no pueden ser dormidos con magia. Dos competencias en habilidades extra. Velocidad: 30 pies.',
  },
  'Semiorco': {
    flavor: 'De constitución imponente y fuerza salvaje, los semiorcos sienten la emoción más fuerte que otras razas. Son guerreros formidables que no caen fácilmente en combate.',
    mechanics: '+2 a Fuerza, +1 a Constitución. Visión en la oscuridad. Competencia en Intimidación. Aguante incansable (caer a 1 PG en vez de 0). Ataques críticos brutales. Velocidad: 30 pies.',
  },
  'Tiefling': {
    flavor: 'Llevan la marca de un antiguo pacto infernal en su linaje. A menudo recibidos con desconfianza, son individuos solitarios pero de voluntad inquebrantable.',
    mechanics: '+2 a Carisma, +1 a Inteligencia. Visión en la oscuridad. Resistencia al fuego. Legado infernal (acceso a los conjuros Taumaturgia, Reprensión infernal y Oscuridad). Velocidad: 30 pies.',
  }
};

export const CLASS_DESCRIPTIONS: Record<string, { flavor: string, mechanics: string, role: string }> = {
  'Bárbaro': {
    flavor: 'Un guerrero fiero de trasfondos primitivos que puede entrar en una furia de combate incontrolable. Desprecian la armadura pesada a favor de tácticas brutales y resistencia pura.',
    mechanics: 'Dado de Golpe: d12. Rabia (bonificador al daño cuerpo a cuerpo, resistencia al daño contundente, perforante y cortante). Defensa sin Armadura.',
    role: 'Tanque, Daño Cuerpo a Cuerpo'
  },
  'Bardo': {
    flavor: 'Un artista y místico cuya música y pasión albergan la magia de la creación misma. Son el alma del grupo, inspirando a sus aliados o desmoralizando a los enemigos.',
    mechanics: 'Dado de Golpe: d8. Inspiración Bárdica (dados para potenciar aliados). Conjuros basados en Carisma. Gran variedad de habilidades ("Aprendiz de todo").',
    role: 'Apoyo, Controlador, Cara del Grupo'
  },
  'Clérigo': {
    flavor: 'Un campeón sagrado que blande magia divina al servicio de un poder supremo. Son el nexo entre el mundo mortal y lo divino.',
    mechanics: 'Dado de Golpe: d8. Conjuros divinos (sabiduría) incluyendo sanación poderosa. Canalizar Divinidad (poderes especiales según su dominio). Dominio Divino.',
    role: 'Sanador, Apoyo, Lanzador Divino'
  },
  'Druida': {
    flavor: 'Un sacerdote de la Antigua Fe que maneja los poderes de la naturaleza —luz lunar, crecimiento vegetal, fuego y relámpago— y adopta formas animales.',
    mechanics: 'Dado de Golpe: d8. Magia druídica (sabiduría). Forma Salvaje (transformación en bestias).',
    role: 'Controlador, Apoyo, Utilidad'
  },
  'Guerrero': {
    flavor: 'Un maestro del combate marcial, hábil con una amplia variedad de armas y armaduras. Son el espinazo de cualquier grupo aventurero en combate cuerpo a cuerpo o a distancia.',
    mechanics: 'Dado de Golpe: d10. Estilo de Combate. Nuevas Energías (curación propia). Acción Súbita (una acción adicional por turno). Múltiples ataques.',
    role: 'Daño Sostenido, Tanque Marcial'
  },
  'Monje': {
    flavor: 'Un experto en artes marciales que canaliza la energía mística del cuerpo, el "ki". Sus ataques desarmados pueden ser tan mortíferos como cualquier arma.',
    mechanics: 'Dado de Golpe: d8. Artes Marciales (potencia golpes desarmados). Defensa sin Armadura. Puntos de Ki (para Ráfaga de golpes, Defensa paciente, etc.). Movimiento rápido.',
    role: 'Hostigador cuerpo a cuerpo, Daño móvil'
  },
  'Paladín': {
    flavor: 'Un guerrero sagrado vinculado por un juramento divino. Son faros de justicia que combinan el poder marcial con la magia protectora y curativa.',
    mechanics: 'Dado de Golpe: d10. Imposición de Manos (curación). Castigo Divino (añadir daño radiante a los ataques gastando espacios de conjuro). Auras protectoras.',
    role: 'Tanque, Daño Explosivo Cuerpo a Cuerpo'
  },
  'Explorador': {
    flavor: 'Un cazador de los yermos que usa técnicas marciales y magia natural para combatir presas y amenazas en las fronteras de la civilización.',
    mechanics: 'Dado de Golpe: d10. Enemigo Predilecto. Explorador Nato (ventajas en terrenos). Conjuros de naturaleza (sabiduría). Estilo de combate.',
    role: 'Daño a Distancia o Cuerpo a Cuerpo, Utilidad'
  },
  'Pícaro': {
    flavor: 'Un sinvergüenza que utiliza el sigilo y la astucia para superar obstáculos y enemigos. Si el combate se vuelve inevitable, atacan donde más duele.',
    mechanics: 'Dado de Golpe: d8. Ataque Furtivo (gran daño adicional si se tiene ventaja o si hay aliados cerca). Pericia (duplica competencia en ciertas habilidades). Acción Astuta.',
    role: 'Daño Explosivo, Especialista en Habilidades'
  },
  'Hechicero': {
    flavor: 'Un lanzador de conjuros que posee magia latente y poderosa debido a su linaje o a un don anómalo, no por el estudio ni la devoción.',
    mechanics: 'Dado de Golpe: d6. Magia inherente (carisma). Puntos de Hechicería y Metamagia (para alterar la forma en que funcionan sus conjuros).',
    role: 'Daño de Área, Lanzador Arcano'
  },
  'Brujo': {
    flavor: 'Alguien que forja un pacto con un ser sobrenatural antiguo a cambio de secretos arcanos. Operan en los límites de la moralidad.',
    mechanics: 'Dado de Golpe: d8. Magia de Pacto (pocos espacios de conjuro que se recuperan con descansos cortos). Descarga Sobrenatural. Invocaciones Sobrenaturales (habilidades pasivas personalizables).',
    role: 'Daño Sostenido Arcano, Utilidad'
  },
  'Mago': {
    flavor: 'Un usuario de magia académico capaz de manipular las estructuras de la realidad. Aprenden sus fórmulas de antiguos grimorios y de un largo y oscuro estudio.',
    mechanics: 'Dado de Golpe: d6. Libro de conjuros (aprende magia inteligentemente). La mayor variedad de hechizos arcanos disponibles. Recuperación Arcana.',
    role: 'Utilidad, Control de Área, Lanzador Arcano'
  }
};
