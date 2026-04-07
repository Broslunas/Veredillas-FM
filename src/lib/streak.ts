/**
 * Centralized Streak Logic for Veredillas FM
 * Handles day-based streaks correctly using Spanish timezone.
 */

export interface StreakUpdateResult {
  currentStreak: number;
  maxStreak: number;
  lastActiveAt: Date;
  updated: boolean;
  wasIncremented: boolean;
}

/**
 * Returns a date string in YYYY-MM-DD format for a given date in Spain's timezone.
 */
export function getDayStr(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

/**
 * Updates a user's streak based on their current lastActiveAt and now.
 */
export function calculateStreakUpdate(
  lastActiveAt: Date | null | undefined,
  currentStreak: number | undefined,
  maxStreak: number | undefined
): StreakUpdateResult {
  const now = new Date();
  const todayStr = getDayStr(now);
  const lastActiveStr = lastActiveAt ? getDayStr(new Date(lastActiveAt)) : null;

  let newCurrentStreak = currentStreak || 0;
  let newMaxStreak = maxStreak || 0;
  let updated = false;
  let wasIncremented = false;

  if (!lastActiveStr) {
    // First time tracking activity or missing field
    newCurrentStreak = 1;
    newMaxStreak = Math.max(newMaxStreak, 1);
    updated = true;
    wasIncremented = true;
  } else if (todayStr !== lastActiveStr) {
    // It's a new day!
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = getDayStr(yesterday);

    if (lastActiveStr === yesterdayStr) {
      // Consecutive days!
      newCurrentStreak = (newCurrentStreak || 0) + 1;
      wasIncremented = true;
    } else {
      // More than 1 day gap
      newCurrentStreak = 1;
      wasIncremented = true; // Technically a "start" of a new streak, but treated as first day
    }

    if (newCurrentStreak > newMaxStreak) {
      newMaxStreak = newCurrentStreak;
    }
    updated = true;
  } else {
    // Same day activity
    if (!newCurrentStreak || newCurrentStreak === 0) {
      newCurrentStreak = 1;
      newMaxStreak = Math.max(newMaxStreak, 1);
      updated = true;
      wasIncremented = true;
    }

    // Update timestamp if it's been more than 5 minutes (to keep activity fresh)
    const lastActiveAtTime = lastActiveAt ? new Date(lastActiveAt).getTime() : 0;
    if (now.getTime() - lastActiveAtTime > 5 * 60 * 1000) {
      updated = true;
    }
  }

  return {
    currentStreak: newCurrentStreak,
    maxStreak: newMaxStreak,
    lastActiveAt: now,
    updated,
    wasIncremented: wasIncremented && todayStr !== lastActiveStr
  };
}
