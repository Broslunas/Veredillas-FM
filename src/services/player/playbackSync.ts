// src/services/player/playbackSync.ts

export const syncPlaybackData = async ({ 
    slug, 
    increment = 0, 
    progress = 0, 
    duration = 0, 
    completed = false,
    isVisible = true,
    isMuted = false
}: { 
    slug?: string | null, 
    increment?: number, 
    progress?: number, 
    duration?: number, 
    completed?: boolean,
    isVisible?: boolean,
    isMuted?: boolean
}) => {
    try {
        const body: any = { 
            increment,
            isVisible,
            isMuted
        };
        if (slug) {
            body.episodeSlug = slug;
            body.progress = progress;
            body.duration = isFinite(duration) ? duration : 0;
            body.completed = completed;
        }

        const response = await fetch('/api/history/update', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (response.ok && slug) {
            const data = await response.json();
            
            document.dispatchEvent(new CustomEvent('check-achievements'));

            if (data.newlyUnlockedCards && data.newlyUnlockedCards.length > 0) {
                data.newlyUnlockedCards.forEach((guestName: string) => {
                    // @ts-ignore
                    if (window.showToast) {
                        // @ts-ignore
                        window.showToast(`¡Cromo desbloqueado: ${guestName}! ✨`, 'success');
                    }
                });
            }
        }
    } catch(e) {
        console.error("Playback sync error", e);
    }
};

export const recordListen = async (slug: string) => {
    if (!slug) return;
    const storageKey = `recorded-listen-${slug}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(storageKey)) return;

    try {
        await fetch('/api/episodes/record-listen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ episodeSlug: slug })
        });
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(storageKey, 'true');
    } catch(e) {
        console.error("Error recording listen", e);
    }
};
