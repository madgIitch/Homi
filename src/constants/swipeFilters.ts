export const INTERESES_OPTIONS = [
  { id: 'deportes', label: 'Deportes' },
  { id: 'musica', label: 'Musica' },
  { id: 'cine', label: 'Cine' },
  { id: 'arte', label: 'Arte' },
  { id: 'videojuegos', label: 'Videojuegos' },
  { id: 'gastronomia', label: 'Gastronomia' },
  { id: 'viajes', label: 'Viajes' },
  { id: 'literatura', label: 'Literatura' },
  { id: 'tecnologia', label: 'Tecnologia' },
  { id: 'moda', label: 'Moda' },
  { id: 'fotografia', label: 'Fotografia' },
  { id: 'naturaleza', label: 'Naturaleza' },
  { id: 'fiesta', label: 'Fiesta' },
  { id: 'series', label: 'Series' },
  { id: 'cocina', label: 'Cocina' },
  { id: 'teatro', label: 'Teatro' },
  { id: 'politica', label: 'Politica' },
  { id: 'activismo', label: 'Activismo' },
  { id: 'emprendimiento', label: 'Emprendimiento' },
];

// Ciudades disponibles
export const CIUDADES_OPTIONS = [
  { id: 'sevilla', label: 'Sevilla' },
  { id: 'madrid', label: 'Madrid' },
  { id: 'barcelona', label: 'Barcelona' },
  { id: 'valencia', label: 'Valencia' },
  { id: 'malaga', label: 'Málaga' },
];

// Zonas agrupadas por ciudad
export const ZONAS_POR_CIUDAD: Record<string, { id: string; label: string }[]> = {
  sevilla: [
    { id: 'casco_antiguo', label: 'Casco Antiguo' },
    { id: 'triana', label: 'Triana' },
    { id: 'los_remedios', label: 'Los Remedios' },
    { id: 'nervion', label: 'Nervion' },
    { id: 'san_pablo', label: 'San Pablo - Santa Justa' },
    { id: 'este_alcosa', label: 'Este - Alcosa - Torreblanca' },
    { id: 'cerro_amate', label: 'Cerro - Amate' },
    { id: 'sur', label: 'Sur' },
    { id: 'bellavista', label: 'Bellavista - La Palmera' },
    { id: 'macarena', label: 'Macarena' },
    { id: 'norte', label: 'Norte' },
    { id: 'viapol', label: 'Viapol' },
    { id: 'plantinar', label: 'El Plantinar' },
    { id: 'juncal', label: 'El Juncal' },
    { id: 'gran_plaza', label: 'Gran Plaza' },
    { id: 'otros_sevilla', label: 'Otro/Alrededores' },
  ],
  madrid: [
    { id: 'centro_madrid', label: 'Centro' },
    { id: 'chamberi', label: 'Chamberí' },
    { id: 'salamanca', label: 'Salamanca' },
    { id: 'retiro', label: 'Retiro' },
    { id: 'moncloa', label: 'Moncloa - Aravaca' },
    { id: 'tetuan', label: 'Tetuán' },
    { id: 'chamartin', label: 'Chamartín' },
    { id: 'arganzuela', label: 'Arganzuela' },
    { id: 'latina', label: 'Latina' },
    { id: 'carabanchel', label: 'Carabanchel' },
    { id: 'usera', label: 'Usera' },
    { id: 'vallecas', label: 'Vallecas' },
    { id: 'moratalaz', label: 'Moratalaz' },
    { id: 'ciudad_lineal', label: 'Ciudad Lineal' },
    { id: 'hortaleza', label: 'Hortaleza' },
    { id: 'otros_madrid', label: 'Otro/Alrededores' },
  ],
  barcelona: [
    { id: 'ciutat_vella', label: 'Ciutat Vella' },
    { id: 'eixample', label: 'Eixample' },
    { id: 'gracia', label: 'Gràcia' },
    { id: 'sants_montjuic', label: 'Sants - Montjuïc' },
    { id: 'les_corts', label: 'Les Corts' },
    { id: 'sarria_sant_gervasi', label: 'Sarrià - Sant Gervasi' },
    { id: 'horta_guinardo', label: 'Horta - Guinardó' },
    { id: 'nou_barris', label: 'Nou Barris' },
    { id: 'sant_andreu', label: 'Sant Andreu' },
    { id: 'sant_marti', label: 'Sant Martí' },
    { id: 'otros_barcelona', label: 'Otro/Alrededores' },
  ],
  valencia: [
    { id: 'ciutat_vella_vlc', label: 'Ciutat Vella' },
    { id: 'ensanche_vlc', label: 'L\'Eixample' },
    { id: 'extramurs', label: 'Extramurs' },
    { id: 'campanar', label: 'Campanar' },
    { id: 'ruzafa', label: 'Ruzafa' },
    { id: 'benimaclet', label: 'Benimaclet' },
    { id: 'poblats_maritims', label: 'Poblats Marítims' },
    { id: 'camins_al_grau', label: 'Camins al Grau' },
    { id: 'algiros', label: 'Algirós' },
    { id: 'patraix', label: 'Patraix' },
    { id: 'otros_valencia', label: 'Otro/Alrededores' },
  ],
  malaga: [
    { id: 'centro_malaga', label: 'Centro Histórico' },
    { id: 'este_malaga', label: 'Este' },
    { id: 'ciudad_jardin', label: 'Ciudad Jardín' },
    { id: 'bailén_miraflores', label: 'Bailén - Miraflores' },
    { id: 'palma_palmilla', label: 'Palma - Palmilla' },
    { id: 'cruz_humilladero', label: 'Cruz de Humilladero' },
    { id: 'carretera_cadiz', label: 'Carretera de Cádiz' },
    { id: 'churriana', label: 'Churriana' },
    { id: 'campanillas', label: 'Campanillas' },
    { id: 'teatinos', label: 'Teatinos' },
    { id: 'puerto_torre', label: 'Puerto de la Torre' },
    { id: 'otros_malaga', label: 'Otro/Alrededores' },
  ],
};

// Para compatibilidad hacia atrás, exportamos todas las zonas en un array plano
export const ZONAS_OPTIONS = Object.values(ZONAS_POR_CIUDAD).flat();

export const ESTILO_VIDA_GROUPS = [
  {
    id: 'schedule',
    label: 'Horario',
    options: [
      { id: 'schedule_manana', label: 'Madrugador' },
      { id: 'schedule_noche', label: 'Nocturno' },
      { id: 'schedule_flexible', label: 'Flexible' },
    ],
  },
  {
    id: 'cleaning',
    label: 'Orden y limpieza',
    options: [
      { id: 'cleaning_muy_limpio', label: 'Muy ordenado' },
      { id: 'cleaning_normal', label: 'Normal' },
      { id: 'cleaning_relajado', label: 'Relajado' },
    ],
  },
  {
    id: 'guests',
    label: 'Visitas',
    options: [
      { id: 'guests_pocas', label: 'Pocas' },
      { id: 'guests_con_aviso', label: 'Con aviso' },
      { id: 'guests_frecuentes', label: 'Frecuentes' },
    ],
  },
  {
    id: 'smoking',
    label: 'Fumar',
    options: [
      { id: 'smoking_no', label: 'No fumo' },
      { id: 'smoking_exterior', label: 'Solo exterior' },
      { id: 'smoking_room', label: 'Solo en mi habitacion' },
      { id: 'smoking_si', label: 'Fumo' },
    ],
  },
  {
    id: 'pets',
    label: 'Mascotas',
    options: [
      { id: 'pets_no', label: 'No tengo' },
      { id: 'pets_si', label: 'Tengo' },
      { id: 'pets_ok', label: 'Me gustan' },
    ],
  },
];

export const ESTILO_VIDA_OPTIONS = ESTILO_VIDA_GROUPS.flatMap(
  (group) => group.options
);

export const lifestyleLabelById = new Map(
  ESTILO_VIDA_OPTIONS.map((option) => [option.id, option.label])
);

export const lifestyleIdByLabel = new Map(
  ESTILO_VIDA_OPTIONS.map((option) => [option.label, option.id])
);

export const BUDGET_MIN = 0;
export const BUDGET_MAX = 1200;
export const BUDGET_STEP = 25;
export const DEFAULT_BUDGET_MIN = 0;
export const DEFAULT_BUDGET_MAX = 1200;

export const ROOMMATES_MIN = 1;
export const ROOMMATES_MAX = 10;
export const DEFAULT_ROOMMATES_MIN = ROOMMATES_MIN;
export const DEFAULT_ROOMMATES_MAX = ROOMMATES_MAX;
