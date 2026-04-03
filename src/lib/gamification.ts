
// Logic for Gamification Levels
// Based on total seconds listened

export interface Level {
    name: string;
    minSeconds: number;
    maxSeconds: number;
    icon: string;
    color: string;
    description: string;
}

export const LEVELS: Level[] = [
    {
        name: 'Novato Curioso',
        minSeconds: 0,
        maxSeconds: 1800, // 0 - 30m
        icon: '🌱',
        color: '#10b981', // Emerald
        description: 'Acabas de empezar tu viaje en Veredillas FM.'
    },
    {
        name: 'Oyente Casual',
        minSeconds: 1800,
        maxSeconds: 7200, // 30m - 2h
        icon: '🎧',
        color: '#3b82f6', // Blue
        description: 'Te gusta escuchar un buen episodio de vez en cuando.'
    },
    {
        name: 'Fan Dedicado',
        minSeconds: 7200,
        maxSeconds: 21600, // 2h - 6h
        icon: '🔥',
        color: '#f59e0b', // Amber
        description: '¡Veredillas FM es parte de tu rutina!'
    },
    {
        name: 'Super Fan',
        minSeconds: 21600,
        maxSeconds: 54000, // 6h - 15h
        icon: '🚀',
        color: '#ec4899', // Pink
        description: 'Conoces cada episodio y cada detalle.'
    },
    {
        name: 'Adicto a VFM',
        minSeconds: 54000,
        maxSeconds: 90000, // 15h - 25h
        icon: '👑',
        color: '#8b5cf6', // Violet
        description: 'Eres historia viva de este podcast.'
    },
    {
        name: 'Leyenda de VFM',
        minSeconds: 90000,
        maxSeconds: Infinity, // 25h+
        icon: '💎',
        color: '#fbbf24', // Gold
        description: '¡Has alcanzado el nivel máximo! Eres una verdadera leyenda.'
    }
];

export function getLevel(seconds: number): Level {
    return LEVELS.find(l => seconds >= l.minSeconds && seconds < l.maxSeconds) || LEVELS[0];
}

export function getNextLevel(seconds: number): Level | null {
    const current = getLevel(seconds);
    const index = LEVELS.indexOf(current);
    if (index >= 0 && index < LEVELS.length - 1) {
        return LEVELS[index + 1];
    }
    return null;
}

export function getProgressToNextLevel(seconds: number): number {
    const current = getLevel(seconds);
    const next = getNextLevel(seconds);

    if (!next) return 100; // Max level reached

    const range = next.minSeconds - current.minSeconds;
    const progress = seconds - current.minSeconds;

    return Math.min(100, Math.max(0, (progress / range) * 100));
}
