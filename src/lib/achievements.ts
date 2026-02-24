// ============================================================
// VEREDILLAS FM — Achievement System (50+ Badges)
// ============================================================

export interface AchievementProgress {
  current: number;
  max: number;
  unit: string;        // e.g. 'min', 'h', 'episodios', 'días', 'comentarios'
  formatValue?: (n: number) => string; // optional display formatter
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;         // Emoji icon
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category: 'escucha' | 'social' | 'exploracion' | 'coleccion' | 'especial' | 'fidelidad' | 'madrugador';
  check: (stats: AchievementStats) => boolean;
  /** If defined, the UI will render a progress bar for this achievement. */
  progress?: (stats: AchievementStats) => AchievementProgress;
  secret?: boolean;
  points: number;
}

export interface AchievementStats {
  listeningTime: number;           // seconds
  favoritesCount: number;
  playbackHistoryCount: number;    // total episodes ever played
  completedEpisodesCount: number;  // episodes listened to ≥ 80%
  consecutiveEpisodes: number;     // max episodes listened back-to-back (same session)
  commentsCount: number;           // total comments posted
  likedClipsCount: number;
  newsletterSubscribed: boolean;
  // Derived
  daysSinceJoin: number;
  favoritedSeasonsCount: number;   // distinct seasons favorited
  totalSeasonsCount: number;
  loginStreakDays: number;         // consecutive login days
  hasProfilePicture: boolean;
  hasBio: boolean;
  joinedYear: number;
  peakListeningHour: number;       // 0-23, for night-owl badge
  episodesListenedThisWeek: number;
  chatMessagesCount: number;
}

// Rarity colours for UI display
export const RARITY_COLORS: Record<Achievement['rarity'], string> = {
  common:    '#9ca3af',
  uncommon:  '#4ade80',
  rare:      '#60a5fa',
  epic:      '#a855f7',
  legendary: '#f59e0b',
};

export const RARITY_LABELS: Record<Achievement['rarity'], string> = {
  common:    'Común',
  uncommon:  'Poco común',
  rare:      'Raro',
  epic:      'Épico',
  legendary: 'Legendario',
};

export const CATEGORY_LABELS: Record<Achievement['category'], string> = {
  escucha:    '🎧 Escucha',
  social:     '💬 Social',
  exploracion:'🗺️ Exploración',
  coleccion:  '❤️ Colección',
  especial:   '✨ Especial',
  fidelidad:  '🔥 Fidelidad',
  madrugador: '🌙 Madrugador',
};

// ──────────────────────────────────────────────────────────────
// ACHIEVEMENT DEFINITIONS (50+)
// ──────────────────────────────────────────────────────────────
export const ACHIEVEMENTS: Achievement[] = [

  // ─── ESCUCHA ────────────────────────────────────────────────
  {
    id: 'primer_minuto',
    name: 'Primer Minuto',
    description: 'Escucha tu primer episodio por al menos 1 minuto.',
    icon: '▶️',
    rarity: 'common',
    category: 'escucha',
    points: 10,
    check: s => s.listeningTime >= 60,
    progress: s => ({ current: Math.min(s.listeningTime, 60), max: 60, unit: 's' }),
  },
  {
    id: 'primer_fan',
    name: 'Primer Fan',
    description: 'Completa tu primer episodio entero.',
    icon: '🌱',
    rarity: 'common',
    category: 'escucha',
    points: 15,
    check: s => s.completedEpisodesCount >= 1,
    progress: s => ({ current: Math.min(s.completedEpisodesCount, 1), max: 1, unit: 'episodio' }),
  },
  {
    id: 'media_hora',
    name: 'Media Hora de Podcast',
    description: 'Acumula 30 minutos de escucha total.',
    icon: '⏱️',
    rarity: 'common',
    category: 'escucha',
    points: 20,
    check: s => s.listeningTime >= 1800,
    progress: s => ({ current: Math.min(Math.floor(s.listeningTime / 60), 30), max: 30, unit: 'min' }),
  },
  {
    id: 'oyente_casual',
    name: 'Oyente Casual',
    description: 'Acumula 1 hora de escucha total.',
    icon: '🎧',
    rarity: 'common',
    category: 'escucha',
    points: 30,
    check: s => s.listeningTime >= 3600,
    progress: s => ({ current: Math.min(Math.floor(s.listeningTime / 60), 60), max: 60, unit: 'min' }),
  },
  {
    id: 'tres_horas',
    name: 'Adicto a la Escucha',
    description: 'Acumula 3 horas de escucha total.',
    icon: '🔊',
    rarity: 'uncommon',
    category: 'escucha',
    points: 60,
    check: s => s.listeningTime >= 10800,
    progress: s => ({ current: Math.min(parseFloat((s.listeningTime / 3600).toFixed(1)), 3), max: 3, unit: 'h' }),
  },
  {
    id: 'cinco_episodios',
    name: 'Cinco de Cinco',
    description: 'Completa 5 episodios al 100%.',
    icon: '5️⃣',
    rarity: 'uncommon',
    category: 'escucha',
    points: 55,
    check: s => s.completedEpisodesCount >= 5,
    progress: s => ({ current: Math.min(s.completedEpisodesCount, 5), max: 5, unit: 'episodios' }),
  },
  {
    id: 'diez_horas',
    name: 'Década de Horas',
    description: 'Acumula 10 horas de escucha total.',
    icon: '🔟',
    rarity: 'rare',
    category: 'escucha',
    points: 100,
    check: s => s.listeningTime >= 36000,
    progress: s => ({ current: Math.min(parseFloat((s.listeningTime / 3600).toFixed(1)), 10), max: 10, unit: 'h' }),
  },
  {
    id: 'veinte_episodios',
    name: 'Enganchado',
    description: 'Completa 20 episodios al 100%.',
    icon: '🔗',
    rarity: 'rare',
    category: 'escucha',
    points: 120,
    check: s => s.completedEpisodesCount >= 20,
    progress: s => ({ current: Math.min(s.completedEpisodesCount, 20), max: 20, unit: 'episodios' }),
  },
  {
    id: 'veinticinco_horas',
    name: 'Un Día Entero',
    description: 'Acumula 25 horas de escucha total.',
    icon: '🌅',
    rarity: 'epic',
    category: 'escucha',
    points: 200,
    check: s => s.listeningTime >= 90000,
    progress: s => ({ current: Math.min(parseFloat((s.listeningTime / 3600).toFixed(1)), 25), max: 25, unit: 'h' }),
  },
  {
    id: 'cincuenta_episodios',
    name: 'Cincuentón',
    description: 'Completa 50 episodios al 100%.',
    icon: '🏆',
    rarity: 'epic',
    category: 'escucha',
    points: 250,
    check: s => s.completedEpisodesCount >= 50,
    progress: s => ({ current: Math.min(s.completedEpisodesCount, 50), max: 50, unit: 'episodios' }),
  },
  {
    id: 'cien_horas',
    name: 'Centurión del Podcast',
    description: 'Acumula 100 horas de escucha total.',
    icon: '💯',
    rarity: 'legendary',
    category: 'escucha',
    points: 500,
    check: s => s.listeningTime >= 360000,
    progress: s => ({ current: Math.min(parseFloat((s.listeningTime / 3600).toFixed(1)), 100), max: 100, unit: 'h' }),
  },

  // ─── FIDELIDAD ──────────────────────────────────────────────
  {
    id: 'primera_semana',
    name: 'Primera Semana',
    description: 'Lleva 7 días siendo miembro de Veredillas FM.',
    icon: '📅',
    rarity: 'common',
    category: 'fidelidad',
    points: 20,
    check: s => s.daysSinceJoin >= 7,
    progress: s => ({ current: Math.min(s.daysSinceJoin, 7), max: 7, unit: 'días' }),
  },
  {
    id: 'primer_mes',
    name: 'Miembro del Mes',
    description: 'Lleva 30 días siendo miembro de Veredillas FM.',
    icon: '🗓️',
    rarity: 'uncommon',
    category: 'fidelidad',
    points: 50,
    check: s => s.daysSinceJoin >= 30,
    progress: s => ({ current: Math.min(s.daysSinceJoin, 30), max: 30, unit: 'días' }),
  },
  {
    id: 'tres_meses',
    name: 'Fan Trimestral',
    description: 'Lleva 90 días siendo miembro de Veredillas FM.',
    icon: '🌿',
    rarity: 'rare',
    category: 'fidelidad',
    points: 100,
    check: s => s.daysSinceJoin >= 90,
    progress: s => ({ current: Math.min(s.daysSinceJoin, 90), max: 90, unit: 'días' }),
  },
  {
    id: 'seis_meses',
    name: 'Semestre de Podcast',
    description: 'Lleva 180 días siendo miembro de Veredillas FM.',
    icon: '🌳',
    rarity: 'epic',
    category: 'fidelidad',
    points: 200,
    check: s => s.daysSinceJoin >= 180,
    progress: s => ({ current: Math.min(s.daysSinceJoin, 180), max: 180, unit: 'días' }),
  },
  {
    id: 'un_ano',
    name: 'Fan Anual',
    description: 'Lleva 365 días siendo miembro de Veredillas FM.',
    icon: '🎂',
    rarity: 'legendary',
    category: 'fidelidad',
    points: 400,
    check: s => s.daysSinceJoin >= 365,
    progress: s => ({ current: Math.min(s.daysSinceJoin, 365), max: 365, unit: 'días' }),
  },
  {
    id: 'racha_semanal',
    name: 'Constancia',
    description: 'Inicia sesión 7 días seguidos.',
    icon: '🔥',
    rarity: 'uncommon',
    category: 'fidelidad',
    points: 60,
    check: s => s.loginStreakDays >= 7,
    progress: s => ({ current: Math.min(s.loginStreakDays, 7), max: 7, unit: 'días seguidos' }),
  },
  {
    id: 'racha_mensual',
    name: 'Imparable',
    description: 'Inicia sesión 30 días seguidos.',
    icon: '💎',
    rarity: 'epic',
    category: 'fidelidad',
    points: 250,
    check: s => s.loginStreakDays >= 30,
    progress: s => ({ current: Math.min(s.loginStreakDays, 30), max: 30, unit: 'días seguidos' }),
  },
  {
    id: 'og_member',
    name: 'Miembro OG',
    description: 'Te uniste a Veredillas FM en 2026.',
    icon: '👑',
    rarity: 'legendary',
    category: 'fidelidad',
    points: 300,
    check: s => s.joinedYear <= 2026,
    secret: true,
  },

  // ─── SOCIAL ─────────────────────────────────────────────────
  {
    id: 'primer_comentario',
    name: 'La Voz del Oyente',
    description: 'Publica tu primer comentario en un episodio.',
    icon: '💬',
    rarity: 'common',
    category: 'social',
    points: 15,
    check: s => s.commentsCount >= 1,
    progress: s => ({ current: Math.min(s.commentsCount, 1), max: 1, unit: 'comentario' }),
  },
  {
    id: 'comentarista_activo',
    name: 'Comentarista Activo',
    description: 'Publica 10 comentarios en episodios.',
    icon: '🗣️',
    rarity: 'uncommon',
    category: 'social',
    points: 70,
    check: s => s.commentsCount >= 10,
    progress: s => ({ current: Math.min(s.commentsCount, 10), max: 10, unit: 'comentarios' }),
  },
  {
    id: 'comentarista_pro',
    name: 'Comentarista Pro',
    description: 'Publica 25 comentarios en episodios.',
    icon: '📝',
    rarity: 'rare',
    category: 'social',
    points: 120,
    check: s => s.commentsCount >= 25,
    progress: s => ({ current: Math.min(s.commentsCount, 25), max: 25, unit: 'comentarios' }),
  },
  {
    id: 'comentarista_leyenda',
    name: 'Cronista del Podcast',
    description: 'Publica 50 comentarios en episodios.',
    icon: '📰',
    rarity: 'epic',
    category: 'social',
    points: 300,
    check: s => s.commentsCount >= 50,
    progress: s => ({ current: Math.min(s.commentsCount, 50), max: 50, unit: 'comentarios' }),
  },
  {
    id: 'primer_chat',
    name: 'Hola Mundo',
    description: 'Envía tu primer mensaje en el chat en vivo.',
    icon: '👋',
    rarity: 'common',
    category: 'social',
    points: 10,
    check: s => s.chatMessagesCount >= 1,
  },
  {
    id: 'cien_mensajes_chat',
    name: 'Chateador Empedernido',
    description: 'Envía 100 mensajes en el chat en vivo.',
    icon: '🌊',
    rarity: 'rare',
    category: 'social',
    points: 110,
    check: s => s.chatMessagesCount >= 100,
    progress: s => ({ current: Math.min(s.chatMessagesCount, 100), max: 100, unit: 'mensajes' }),
  },
  {
    id: 'newsletter',
    name: '¡Suscrito!',
    description: 'Te suscribiste a la newsletter de Veredillas FM.',
    icon: '📧',
    rarity: 'common',
    category: 'social',
    points: 20,
    check: s => s.newsletterSubscribed,
  },

  // ─── COLECCIÓN ──────────────────────────────────────────────
  {
    id: 'primer_favorito',
    name: 'Guardado para Después',
    description: 'Añade tu primer episodio a favoritos.',
    icon: '⭐',
    rarity: 'common',
    category: 'coleccion',
    points: 10,
    check: s => s.favoritesCount >= 1,
  },
  {
    id: 'diez_favoritos',
    name: 'Coleccionista',
    description: 'Ten 10 episodios en favoritos al mismo tiempo.',
    icon: '🗃️',
    rarity: 'uncommon',
    category: 'coleccion',
    points: 50,
    check: s => s.favoritesCount >= 10,
    progress: s => ({ current: Math.min(s.favoritesCount, 10), max: 10, unit: 'favoritos' }),
  },
  {
    id: 'veinte_favoritos',
    name: 'Gran Colección',
    description: 'Ten 20 episodios en favoritos.',
    icon: '🏛️',
    rarity: 'rare',
    category: 'coleccion',
    points: 90,
    check: s => s.favoritesCount >= 20,
    progress: s => ({ current: Math.min(s.favoritesCount, 20), max: 20, unit: 'favoritos' }),
  },
  {
    id: 'primer_clip',
    name: 'Clip Lover',
    description: 'Da Me Gusta a tu primer clip.',
    icon: '🎞️',
    rarity: 'common',
    category: 'coleccion',
    points: 10,
    check: s => s.likedClipsCount >= 1,
  },
  {
    id: 'diez_clips',
    name: 'Cinéfilo del Podcast',
    description: 'Da Me Gusta a 10 clips.',
    icon: '🎬',
    rarity: 'uncommon',
    category: 'coleccion',
    points: 45,
    check: s => s.likedClipsCount >= 10,
    progress: s => ({ current: Math.min(s.likedClipsCount, 10), max: 10, unit: 'clips' }),
  },
  {
    id: 'fan_temporada',
    name: 'Fan de Temporada Completa',
    description: 'Añade a favoritos episodios de todas las temporadas disponibles.',
    icon: '🎭',
    rarity: 'epic',
    category: 'coleccion',
    points: 220,
    check: s => s.favoritedSeasonsCount >= s.totalSeasonsCount && s.totalSeasonsCount > 0,
  },

  // ─── EXPLORACIÓN ────────────────────────────────────────────
  {
    id: 'perfil_completo',
    name: 'Cara y Cruz',
    description: 'Completa tu perfil con foto y biografía.',
    icon: '🪪',
    rarity: 'common',
    category: 'exploracion',
    points: 25,
    check: s => s.hasProfilePicture && s.hasBio,
  },
  {
    id: 'tres_secciones',
    name: 'Explorador Curioso',
    description: 'Visita al menos 3 secciones diferentes del sitio.',
    icon: '🗺️',
    rarity: 'common',
    category: 'exploracion',
    points: 15,
    check: s => s.playbackHistoryCount >= 3,
  },
  {
    id: 'primer_episodio_semana',
    name: 'Lunes de Podcast',
    description: 'Escucha al menos un episodio esta semana.',
    icon: '📆',
    rarity: 'common',
    category: 'exploracion',
    points: 10,
    check: s => s.episodesListenedThisWeek >= 1,
  },
  {
    id: 'cinco_esta_semana',
    name: 'Semana Intensa',
    description: 'Escucha 5 episodios en una sola semana.',
    icon: '📈',
    rarity: 'uncommon',
    category: 'exploracion',
    points: 60,
    check: s => s.episodesListenedThisWeek >= 5,
  },

  // ─── MADRUGADOR / NOCTÁMBULO ────────────────────────────────
  {
    id: 'noctambulo',
    name: 'Noctámbulo',
    description: 'Escucha un episodio entre las 00:00 y las 04:00.',
    icon: '🌙',
    rarity: 'uncommon',
    category: 'madrugador',
    points: 40,
    check: s => s.peakListeningHour >= 0 && s.peakListeningHour <= 4,
    secret: true,
  },
  {
    id: 'madrugador',
    name: 'Madrugador',
    description: 'Escucha un episodio entre las 05:00 y las 07:00.',
    icon: '🌅',
    rarity: 'uncommon',
    category: 'madrugador',
    points: 35,
    check: s => s.peakListeningHour >= 5 && s.peakListeningHour <= 7,
    secret: true,
  },

  // ─── ESPECIAL ───────────────────────────────────────────────
  {
    id: 'konami',
    name: 'Jugador Retro',
    description: 'Descubriste el código secreto Konami.',
    icon: '🕹️',
    rarity: 'rare',
    category: 'especial',
    points: 75,
    check: _s => false, // Unlocked manually via frontend event
    secret: true,
  },
  {
    id: 'racha_diaria',
    name: 'Criatura de Hábitos',
    description: 'Escucha un episodio al menos 3 días seguidos.',
    icon: '⏰',
    rarity: 'uncommon',
    category: 'especial',
    points: 55,
    check: s => s.loginStreakDays >= 3,
  },
  {
    id: 'estrella',
    name: 'Estrella del Podcast',
    description: 'Consigue 500 puntos de logros en total.',
    icon: '⭐',
    rarity: 'epic',
    category: 'especial',
    points: 0, // No extra points for meta-achievement
    check: _s => false, // Calculated from total points, done server-side
    secret: false,
  },
  {
    id: 'vip',
    name: 'VIP Veredillas',
    description: 'Alcanza el nivel máximo y completa 30 episodios.',
    icon: '💜',
    rarity: 'legendary',
    category: 'especial',
    points: 500,
    check: s => s.listeningTime >= 18000 && s.completedEpisodesCount >= 30,
    secret: true,
  },
  {
    id: 'perfeccionista',
    name: 'Perfeccionista',
    description: 'Escucha el mismo episodio 3 veces.',
    icon: '🔁',
    rarity: 'rare',
    category: 'especial',
    points: 80,
    check: _s => false, // Tracked elsewhere
    secret: false,
  },
  {
    id: 'todo_favorito',
    name: 'Me Gusta Todo',
    description: 'Ten más de 30 episodios en favoritos.',
    icon: '💝',
    rarity: 'epic',
    category: 'coleccion',
    points: 180,
    check: s => s.favoritesCount >= 30,
    progress: s => ({ current: Math.min(s.favoritesCount, 30), max: 30, unit: 'favoritos' }),
  },
  {
    id: 'sesenta_horas',
    name: 'Maestro del Podcast',
    description: 'Acumula 60 horas de escucha total.',
    icon: '🎓',
    rarity: 'epic',
    category: 'escucha',
    points: 350,
    check: s => s.listeningTime >= 216000,
    progress: s => ({ current: Math.min(parseFloat((s.listeningTime / 3600).toFixed(1)), 60), max: 60, unit: 'h' }),
  },
  {
    id: 'fan_numero_uno',
    name: 'Fan Número 1',
    description: 'Consigue todos los logros de la categoría Escucha.',
    icon: '🥇',
    rarity: 'legendary',
    category: 'especial',
    points: 700,
    check: _s => false, // Derived from other achievements
    secret: true,
  },
  {
    id: 'cuarenta_episodios',
    name: 'La Cuarentena',
    description: 'Completa 40 episodios al 100%.',
    icon: '4️⃣',
    rarity: 'epic',
    category: 'escucha',
    points: 220,
    check: s => s.completedEpisodesCount >= 40,
    progress: s => ({ current: Math.min(s.completedEpisodesCount, 40), max: 40, unit: 'episodios' }),
  },
  {
    id: 'doce_meses',
    name: 'Año de Veredillas',
    description: 'Lleva 365 días registrado. ¡Feliz aniversario!',
    icon: '🎊',
    rarity: 'legendary',
    category: 'fidelidad',
    points: 500,
    check: s => s.daysSinceJoin >= 365,
    secret: true,
  },
];

// ──────────────────────────────────────────────────────────────
// HELPER UTILITIES
// ──────────────────────────────────────────────────────────────

/** Returns all achievements that the stats qualify for. */
export function computeUnlockedAchievements(stats: AchievementStats): string[] {
  return ACHIEVEMENTS.filter(a => a.check(stats)).map(a => a.id);
}

/** Get a single achievement definition by id. */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

/** Sort achievements by rarity weight for display. */
export const RARITY_ORDER: Record<Achievement['rarity'], number> = {
  legendary: 0,
  epic:      1,
  rare:      2,
  uncommon:  3,
  common:    4,
};

export function sortByRarity(list: Achievement[]): Achievement[] {
  return [...list].sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);
}
