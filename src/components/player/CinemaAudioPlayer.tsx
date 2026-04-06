import React, { useState, useEffect, useRef } from 'react';
import './SharedPlayerStyles.css';

// Declare Plyr and Cast globally for TypeScript
declare var Plyr: any;
declare var cast: any;
declare var chrome: any;

interface Transcription {
    time: number;
    text: string;
    speaker?: string;
}

interface Section {
    title: string;
    time: string; // "MM:SS"
}

interface CinemaAudioPlayerProps {
    audioUrl: string;
    title: string;
    cover?: string;
    author?: string;
    transcription?: Transcription[] | null;
    slug?: string;
    videoUrl?: string;
    sections?: Section[];
    nextEpisodes?: {
        slug: string;
        title: string;
        image?: string;
        author: string;
        duration?: string;
        episode?: number;
        season?: number;
    }[];
}

import { syncPlaybackData, recordListen } from '../../services/player/playbackSync';

const CinemaAudioPlayer: React.FC<CinemaAudioPlayerProps> = ({ 
    audioUrl, 
    title, 
    cover, 
    author = 'Veredillas FM', 
    transcription = [],
    slug,
    videoUrl,
    sections = [],
    nextEpisodes = []
}) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    
    // UI State
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showCC, setShowCC] = useState(false);
    const [currentCaption, setCurrentCaption] = useState('');
    const [wavesData, setWavesData] = useState<number[]>(new Array(40).fill(10));
    const [useCORS, setUseCORS] = useState(true);
    const [mode, setMode] = useState<'audio' | 'video'>(videoUrl ? 'video' : 'audio');
    const [isCasting, setIsCasting] = useState(false);
    const [castAvailable, setCastAvailable] = useState(false);
    const [showEndOverlay, setShowEndOverlay] = useState(false);

    // Refs for restore logic
    const savedProgressRef = useRef<number>(0);
    const hasRestoredRef = useRef<boolean>(false);
    const hasFetchedRef = useRef<boolean>(false);

    // Fetch saved progress once on mount
    useEffect(() => {
        if (!slug || hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        // 1. Check localStorage first (instant, works for non-logged-in users too)
        const localKey = `vfm-progress-${slug}`;
        try {
            const localProgress = parseFloat(localStorage.getItem(localKey) || '0');
            if (localProgress > 0) {
                savedProgressRef.current = localProgress;
            }
        } catch (e) {}

        // 2. Fetch from server (overrides local if available and greater)
        fetch(`/api/user/episode-state?slug=${slug}`)
            .then(res => res.json())
            .then(data => {
                if (data.savedProgress && data.savedProgress > 0) {
                    // Use the greater of local and server progress
                    if (data.savedProgress >= savedProgressRef.current) {
                        savedProgressRef.current = data.savedProgress;
                    }
                }
                // Try to apply now if audio is already loaded
                applyRestore();
            })
            .catch(e => {
                console.warn('[Audio] Failed to fetch episode state:', e);
                // Still try to restore from localStorage
                applyRestore();
            });
    }, [slug]);

    // Function to apply saved progress to audio element
    const applyRestore = () => {
        const audio = audioRef.current;
        if (!audio || hasRestoredRef.current || savedProgressRef.current <= 0) return;
        
        // Only apply if audio has enough data (readyState >= 1 means metadata is loaded)
        if (audio.readyState >= 1 && audio.duration > 0) {
            // Don't restore if we're near the end (within last 5% = completed)
            if (savedProgressRef.current >= audio.duration * 0.95) {
                hasRestoredRef.current = true;
                return;
            }
            
            audio.currentTime = savedProgressRef.current;
            setCurrentTime(savedProgressRef.current);
            hasRestoredRef.current = true;
            
            // @ts-ignore
            if (window.showToast) {
                const mins = Math.floor(savedProgressRef.current / 60);
                const secs = Math.floor(savedProgressRef.current % 60);
                // @ts-ignore
                window.showToast(`Progreso restaurado en ${mins}:${secs.toString().padStart(2, '0')} 🎧`, "info");
            }
        }
    };

    // Handle initial load and core metadata
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateMetadata = () => {
            setDuration(audio.duration || 0);
            // Apply restore when metadata loads (this is the reliable moment)
            applyRestore();
        };

        // Also try on canplay (backup for when metadata arrives before fetch completes)
        const handleCanPlay = () => {
            applyRestore();
        };

        const handleError = (e: any) => {
            console.warn('[Audio] Error detected, trying fallback...', e);
            if (useCORS) {
                setUseCORS(false);
            }
        };

        audio.addEventListener('loadedmetadata', updateMetadata);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('play', () => {
            setIsPlaying(true);
            if (slug) recordListen(slug);
        });
        audio.addEventListener('pause', () => setIsPlaying(false));
        audio.addEventListener('error', handleError);
        audio.addEventListener('ended', () => {
            setIsPlaying(false);
            if (nextEpisodes && nextEpisodes.length > 0) {
                setShowEndOverlay(true);
            }
        });

        // If audio already has metadata (e.g., cached), apply immediately
        if (audio.readyState >= 1) {
            updateMetadata();
        }

        return () => {
            audio.removeEventListener('loadedmetadata', updateMetadata);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('play', () => setIsPlaying(true));
            audio.removeEventListener('pause', () => setIsPlaying(false));
            audio.removeEventListener('error', handleError);
        };
    }, [audioUrl, useCORS, slug]);

    // React-side listener for sync from Video -> Audio
    useEffect(() => {
        const handleSync = (e: any) => {
            const { time, slug: incomingSlug } = e.detail;
            if (slug === incomingSlug && audioRef.current) {
                audioRef.current.currentTime = time;
                setCurrentTime(time);
            }
        };

        const handleModeSwitch = (e: any) => {
            if (e.detail?.mode) {
                setMode(e.detail.mode);
            }
        };

        const handleSeek = (e: any) => {
            // Only respond to transcript/section seeking if player is in 'audio' mode
            if (mode !== 'audio') return;

            const { time } = e.detail;
            if (audioRef.current) {
                audioRef.current.currentTime = time;
                setCurrentTime(time);
                // Auto-play when seeking from transcript/sections to improve UX
                if (!isPlaying) {
                    togglePlay();
                }
            }
        };

        document.addEventListener('veredillas:sync-playback', handleSync);
        document.addEventListener('veredillas:switch-mode', handleModeSwitch);
        document.addEventListener('veredillas:audio-seek', handleSeek);
        return () => {
            document.removeEventListener('veredillas:sync-playback', handleSync);
            document.removeEventListener('veredillas:switch-mode', handleModeSwitch);
            document.removeEventListener('veredillas:audio-seek', handleSeek);
        };
    }, [slug, isPlaying, mode]);

    // TRACKING / STATISTICS LOOP
    const lastReportedTime = useRef<number>(0);
    const lastSyncTime = useRef<number>(Date.now());

    useEffect(() => {
        if (!isPlaying || !slug) return;

        const localKey = `vfm-progress-${slug}`;

        const interval = setInterval(() => {
            const now = Date.now();
            const deltaMs = now - lastSyncTime.current;
            const deltaSeconds = deltaMs / 1000;
            
            const currentAudioTime = audioRef.current?.currentTime || 0;
            const progressDelta = Math.abs(currentAudioTime - lastReportedTime.current);
            
            if (progressDelta > 1) {
                syncPlaybackData({
                    slug,
                    increment: deltaSeconds,
                    progress: currentAudioTime,
                    duration: audioRef.current?.duration || 0
                });
                
                // Also save to localStorage for instant restore
                try { localStorage.setItem(localKey, String(currentAudioTime)); } catch(e) {}
                
                lastReportedTime.current = currentAudioTime;
                lastSyncTime.current = now;
            }
        }, 15000);

        return () => {
            clearInterval(interval);
            const currentAudioTime = audioRef.current?.currentTime || 0;
            const now = Date.now();
            const deltaSeconds = (now - lastSyncTime.current) / 1000;
            
            // Save to localStorage immediately on pause/unmount
            try { localStorage.setItem(localKey, String(currentAudioTime)); } catch(e) {}

            if (deltaSeconds > 1) {
                syncPlaybackData({
                    slug,
                    increment: deltaSeconds,
                    progress: currentAudioTime,
                    duration: audioRef.current?.duration || 0
                });
            }
        };
    }, [isPlaying, slug]);

    // SMOOTH PROGRESS UPDATE LOOP
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !isPlaying) return;

        let frameId: number;
        const sync = () => {
            const time = audio.currentTime;
            setCurrentTime(time);
            
            // Dispatch event for other widgets (transcription, sections)
            document.dispatchEvent(new CustomEvent('veredillas:audio-timeupdate', {
                detail: { currentTime: time }
            }));
            
            // Transcription sync inside high-freq loop for accuracy at high speeds
            if (showCC && transcription?.length) {
                const active = transcription.find((t, i) => {
                    const next = transcription[i + 1];
                    return audio.currentTime >= t.time && (!next || audio.currentTime < next.time);
                });
                setCurrentCaption(active ? active.text : '');
            }

            frameId = requestAnimationFrame(sync);
        };

        frameId = requestAnimationFrame(sync);
        return () => cancelAnimationFrame(frameId);
    }, [isPlaying, showCC, transcription]);

    // INITIALIZE WEB AUDIO ANALYSER & COMPRESSOR (Auto-boost)
    const initAnalyser = () => {
        if (!audioRef.current || audioContextRef.current || !useCORS) return;

        try {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass();
            
            // --- AUDIO CHAIN: Source -> Compressor -> Gain -> Analyser -> Destination ---
            const source = ctx.createMediaElementSource(audioRef.current);
            
            // 1. Dynamics Compressor (THE BOOST)
            // This acts as an "auto-gain" to make quiet parts louder and loud parts safe
            const compressor = ctx.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-24, ctx.currentTime);
            compressor.knee.setValueAtTime(30, ctx.currentTime);
            compressor.ratio.setValueAtTime(12, ctx.currentTime);
            compressor.attack.setValueAtTime(0.003, ctx.currentTime);
            compressor.release.setValueAtTime(0.25, ctx.currentTime);
            
            // 2. Extra Gain for the general boost (compensation)
            const boostGain = ctx.createGain();
            boostGain.gain.setValueAtTime(1.5, ctx.currentTime); // 50% extra volume boost

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 128;

            // Connect the chain
            source.connect(compressor);
            compressor.connect(boostGain);
            boostGain.connect(analyser);
            analyser.connect(ctx.destination);

            audioContextRef.current = ctx;
            analyserRef.current = analyser;
        } catch (e) {
            console.warn('[Visualizer] Failed to connect analyser/compressor:', e);
        }
    };

    // VISUALIZER LOOP
    useEffect(() => {
        if (!isPlaying || !analyserRef.current || !useCORS) {
            if (!isPlaying) {
                 // Calm down if not playing
                 setWavesData(new Array(40).fill(10));
            }
            return;
        }

        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const renderFrame = () => {
            analyser.getByteFrequencyData(dataArray);
            const newData = [];
            const step = Math.floor(bufferLength / 40);
            for (let i = 0; i < 40; i++) {
                const val = dataArray[i * step] || 0;
                newData.push(Math.max(10, (val / 255) * 100));
            }
            setWavesData(newData);
            animationFrameRef.current = requestAnimationFrame(renderFrame);
        };

        renderFrame();
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isPlaying, useCORS]);

    // CONTROL ACTIONS
    const togglePlay = async () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            // Re-init visualizer stuff ONLY if CORS is enabled
            if (useCORS) {
                initAnalyser();
                if (audioContextRef.current?.state === 'suspended') {
                    await audioContextRef.current.resume();
                }
            }
            
            audio.play().catch(e => {
                console.error("Error playing audio (attempting fallback):", e);
                if (useCORS) {
                    setUseCORS(false);
                    // The component will re-render without crossOrigin attribute
                    // We need to trigger play again after state update
                    setTimeout(() => audio.play(), 100);
                }
            });
        }
    };

    const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = val;
            setCurrentTime(val);
        }
    };

    const skip = (seconds: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime += seconds;
        }
    };

    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return "0:00";
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const parseTime = (t: string) => {
        const parts = t.split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return 0;
    };

    const PROXY_URL = 'https://broslunas-veredillasfm-proxy.hf.space/stream?url=';
    
    // Check if the URL should be proxied (if it's not from our own CDN or a relative path)
    const isExternal = audioUrl && audioUrl.startsWith('http') && !audioUrl.includes('veredillasfm.es');
    const finalAudioUrl = isExternal ? `${PROXY_URL}${encodeURIComponent(audioUrl)}` : audioUrl;

    // CAPTIONS DRAGGING LOGIC
    const [captionPos, setCaptionPos] = useState({ x: 0, y: 0 }); 
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const captionRef = useRef<HTMLDivElement>(null);

    // Initialize position on first show
    useEffect(() => {
        if (showCC && captionPos.x === 0 && captionPos.y === 0) {
            setCaptionPos({ 
                x: window.innerWidth / 2 - 150, 
                y: window.innerHeight - 150 
            });
        }
    }, [showCC]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
            const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
            
            setCaptionPos({
                x: clientX - dragOffset.current.x,
                y: clientY - dragOffset.current.y
            });
        };

        const handleUp = () => setIsDragging(false);

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('touchend', handleUp);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDragging]);

    const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        
        const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
        const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;

        // --- PREVENT DRAG ON RESIZE CORNER ---
        // Native resize handles are usually in the bottom-right corner (approx 20x20px)
        const resizeHandleSize = 30; 
        if (clientX > rect.right - resizeHandleSize && clientY > rect.bottom - resizeHandleSize) {
            return; 
        }

        dragOffset.current = {
            x: clientX - captionPos.x,
            y: clientY - captionPos.y
        };
        setIsDragging(true);
    };

    const [speed, setSpeed] = useState(1);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const playerContainerRef = useRef<HTMLDivElement>(null);

    // Sync speed and volume
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = speed;
        }
    }, [speed]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    // CONTROL ACTIONS
    const toggleSpeed = () => {
        const nextSpeed = speed === 1 ? 1.25 : speed === 1.25 ? 1.5 : speed === 1.5 ? 2 : speed === 2 ? 0.75 : 1;
        setSpeed(nextSpeed);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            playerContainerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    // --- Google Cast Logic ---
    useEffect(() => {
        const initCast = () => {
             // Check if SDK is loaded and if context is available (from Layout.astro or local)
            const cast = (window as any).cast;
            if (cast && cast.framework) {
                const context = cast.framework.CastContext.getInstance();
                setCastAvailable(true);
                
                const sessionListener = (event: any) => {
                    if (event.sessionState === 'SESSION_STARTED') {
                        setIsCasting(true);
                        audioRef.current?.pause();
                        loadMediaToCast();
                    } else if (event.sessionState === 'SESSION_ENDED') {
                        setIsCasting(false);
                    }
                };

                context.addEventListener(
                    cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                    sessionListener
                );
                return true;
            }
            return false;
        };

        // Try immediately
        if (initCast()) return;

        // Otherwise poll
        const checkCastSDK = setInterval(() => {
            if (initCast()) {
                clearInterval(checkCastSDK);
            }
        }, 1500);

        return () => clearInterval(checkCastSDK);
    }, []);

    const loadMediaToCast = () => {
        const cast = (window as any).cast;
        const chrome = (window as any).chrome;
        if (!cast || !cast.framework || !chrome || !chrome.cast) return;

        const context = cast.framework.CastContext.getInstance();
        const castSession = context.getCurrentSession();
        if (!castSession) return;

        const mediaInfo = new chrome.cast.media.MediaInfo(finalAudioUrl, 'audio/mpeg');
        mediaInfo.metadata = new chrome.cast.media.MusicTrackMediaMetadata();
        mediaInfo.metadata.title = title;
        mediaInfo.metadata.artist = author;
        if (cover) {
            mediaInfo.metadata.images = [{ url: cover.startsWith('http') ? cover : window.location.origin + cover }];
        }

        const request = new chrome.cast.media.LoadRequest(mediaInfo);
        request.currentTime = audioRef.current?.currentTime || 0;

        castSession.loadMedia(request).then(
            () => {
                console.log('[Cast] Media cargada con éxito');
            },
            (errorCode: any) => console.error('[Cast] Error al cargar media:', errorCode)
        );
    };

    const triggerCast = () => {
        const cast = (window as any).cast;
        if (cast && cast.framework) {
            cast.framework.CastContext.getInstance().requestSession();
        }
    };

    return (
        <div 
            ref={playerContainerRef}
            className="cinema-audio-player-react premium-view shadow-2xl rounded-2xl border border-zinc-800/50 bg-[#0f0f0f] group relative"
        >
            {/* END SCREEN OVERLAY */}
            {showEndOverlay && nextEpisodes && nextEpisodes.length > 0 && (
                <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-vfm-fade-in">
                    <button 
                        onClick={() => setShowEndOverlay(false)}
                        className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                        aria-label="Cerrar recomendaciones"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    
                    <div className="mb-8">
                        <h3 className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-2">Episodio finalizado</h3>
                        <h2 className="text-2xl font-black text-white">¿Qué quieres escuchar ahora?</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl">
                        {nextEpisodes.map((ep) => (
                            <a 
                                key={ep.slug}
                                href={`/ep/${ep.slug}`}
                                className="group/card flex flex-col bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-primary transition-all duration-300 hover:scale-[1.02]"
                            >
                                <div className="aspect-video relative overflow-hidden bg-zinc-900">
                                    {ep.image ? (
                                        <img src={ep.image} alt="" className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center opacity-30">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/><line x1="8" x2="16" y1="22" y2="22"/></svg>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="bg-primary text-white p-2 rounded-full shadow-xl">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"></path></svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 text-left">
                                    <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                        T{ep.season} • E{ep.episode}
                                    </div>
                                    <h4 className="text-sm font-bold text-white line-clamp-2 leading-tight group-hover/card:text-primary transition-colors">{ep.title}</h4>
                                </div>
                            </a>
                        ))}
                    </div>

                    <div className="mt-8 flex gap-4">
                        <button 
                            onClick={() => {
                                if (audioRef.current) {
                                    audioRef.current.currentTime = 0;
                                    audioRef.current.play();
                                    setShowEndOverlay(false);
                                }
                            }}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                            Volver a escuchar
                        </button>
                    </div>
                </div>
            )}
            
            {/* 1. BACKGROUND LAYER */}
            <div className="player-background">
                {cover && <img src={cover} alt="" aria-hidden="true" />}
            </div>

            {/* 2. CONTENT LAYER */}
            <div className="player-content">
                {/* TOP BAR / LOGO / ETC (Optional) */}
                <div />

                {/* CENTRAL ACTION AREA */}
                <div className="central-area flex flex-col items-center">
                    {/* WAVES VISUALIZER */}
                    <div className="waves-container">
                        {wavesData.map((height, i) => (
                            <div 
                                key={i} 
                                className={`wave-bar ${isPlaying ? 'active' : ''}`}
                                style={{ 
                                    height: `${height}%`,
                                    opacity: isPlaying ? 1 : 0.4
                                }}
                            />
                        ))}
                    </div>

                    {/* MAIN CONTROLS */}
                    <div className="player-center-controls">
                        <button className="secondary-btn" onClick={() => skip(-15)} aria-label="Retroceder 15 segundos">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l2 2"></path></svg>
                        </button>
                        
                        <button className="main-play-btn" onClick={togglePlay} aria-label={isPlaying ? "Pausar" : "Reproducir"}>
                            {isPlaying ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"></rect><rect x="14" y="4" width="4" height="16" rx="1.5"></rect></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"></path></svg>
                            )}
                        </button>

                        <button className="secondary-btn" onClick={() => skip(15)} aria-label="Avanzar 15 segundos">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M12 7v5l2 2"></path></svg>
                        </button>
                    </div>
                </div>

                {/* BOTTOM METADATA & PROGRESS & EXTRA CONTROLS */}
                <div className="bottom-controls space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                        <div className="track-info-premium min-w-0">
                            <div className="track-cover-mini">
                                {cover && <img src={cover} alt="" />}
                            </div>
                            <div className="track-meta-premium">
                                <h4>{title}</h4>
                                <p>{author}</p>
                            </div>
                        </div>

                        {/* UTILITY CONTROLS (VOLUME, SPEED, FS, TRANSCRIPTION) */}
                        <div className="utility-bar flex flex-wrap items-center gap-2 sm:gap-3 md:gap-6 bg-white/5 backdrop-blur-md px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-white/5">
                            {/* Volume */}
                            <div className="volume-control flex items-center gap-2 group/volume">
                                <button 
                                    onClick={() => setIsMuted(!isMuted)} 
                                    className="text-white/60 hover:text-white transition-colors"
                                >
                                    {isMuted || volume === 0 ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                                    )}
                                </button>
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.05" 
                                    value={volume} 
                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className="w-0 group-hover/volume:w-20 transition-all duration-300 opacity-0 group-hover/volume:opacity-100 accent-primary h-1"
                                />
                            </div>

                            {/* Speed Toggle */}
                            <button 
                                onClick={toggleSpeed}
                                className="text-[10px] sm:text-xs font-bold text-white/70 hover:text-white transition-colors min-w-[32px]"
                            >
                                {speed}x
                            </button>

                            {/* Fullscreen */}
                            <button 
                                onClick={toggleFullscreen}
                                className="text-white/60 hover:text-white transition-colors"
                                aria-label="Pantalla completa"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
                            </button>

                            {/* Google Cast Button */}
                            {castAvailable && (
                                <button 
                                    onClick={triggerCast}
                                    className={`transition-colors ${isCasting ? 'text-primary' : 'text-white/60 hover:text-white'}`}
                                    aria-label="Google Cast"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><line x1="2" y1="20" x2="2.01" y2="20" strokeWidth="3"/></svg>
                                </button>
                            )}

                            {/* Captions Toggle */}
                            {transcription && transcription.length > 0 && (
                                <button 
                                    onClick={() => setShowCC(!showCC)}
                                    className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border transition-all ${showCC ? 'border-primary bg-primary text-white' : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white'}`}
                                >
                                    CC
                                </button>
                            )}

                            {/* Mode Switcher (Audio/Video toggle integrated) */}
                            {!!videoUrl && (
                                <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 ml-2 shadow-inner">
                                    <button 
                                        className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white/20 text-white shadow-sm border border-white/10 whitespace-nowrap"
                                        disabled
                                    >
                                        🎧 Audio
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const event = new CustomEvent('veredillas:switch-mode', { detail: { mode: 'video' } });
                                            document.dispatchEvent(event);
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/20 whitespace-nowrap"
                                    >
                                        📺 Vídeo
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="progress-wrapper relative">
                        <div className="custom-seek w-full">
                            <div className="seek-bar-container w-full relative h-[6px] bg-white/10 rounded-full overflow-visible">
                                <div className="seek-bar-fill h-full bg-primary rounded-full absolute top-0 left-0 z-[2]" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
                                
                                {/* CHAPTER MARKERS (SECTIONS) */}
                                {sections.map((section, idx) => {
                                    const timeInSeconds = parseTime(section.time);
                                    const percentage = (timeInSeconds / (duration || 1)) * 100;
                                    if (percentage > 100 || isNaN(percentage)) return null;
                                    
                                    return (
                                        <div 
                                            key={idx}
                                            className="section-marker absolute h-full w-[2px] bg-white/40 hover:bg-white transition-all z-[5] group/marker"
                                            style={{ left: `${percentage}%` }}
                                        >
                                            <div className="opacity-0 group-hover/marker:opacity-100 absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-black/95 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-lg border border-white/10 whitespace-nowrap pointer-events-none transition-all duration-200 translate-y-2 group-hover/marker:translate-y-0 shadow-xl">
                                                <span className="font-black text-primary mr-2">{section.time}</span>
                                                <span className="font-bold">{section.title}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <input 
                                type="range"
                                min="0" 
                                max={duration || 0} 
                                step="0.1"
                                value={currentTime}
                                onChange={seek}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            />
                            <div className="time-stamps mt-2">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. FLOATING DRAGGABLE CAPTIONS */}
            {showCC && currentCaption && (
                <div 
                    ref={captionRef}
                    onMouseDown={(e) => {
                        // Avoid dragging when resizing
                        if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
                        startDrag(e);
                    }}
                    onTouchStart={(e) => {
                        if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
                        startDrag(e);
                    }}
                    className="fixed z-[9999] cursor-grab active:cursor-grabbing transition-shadow hover:shadow-primary/20 group/caption"
                    style={{ 
                        left: `${captionPos.x}px`, 
                        top: `${captionPos.y}px`,
                        userSelect: 'none',
                        touchAction: 'none'
                    }}
                >
                    <div 
                        className="bg-black/85 backdrop-blur-2xl text-white px-8 py-5 rounded-2xl shadow-2xl border border-white/10 text-center relative overflow-hidden flex items-center justify-center animate-in fade-in zoom-in duration-300"
                        style={{
                            resize: 'both',
                            overflow: 'auto',
                            minWidth: '200px',
                            minHeight: '60px',
                            width: 'min(450px, 85vw)',
                            maxWidth: '90vw',
                            maxHeight: '60vh'
                        }}
                    >
                        {/* Drag Handle indicator top */}
                        <div className="absolute top-1.5 left-0 right-0 flex justify-center opacity-0 group-hover/caption:opacity-100 transition-opacity">
                            <div className="w-10 h-1 bg-white/20 rounded-full" />
                        </div>
                        
                        {/* Resize indicator (Visual only, browser handles logic) */}
                        <div className="resize-handle absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-white/20 rounded-br-sm opacity-0 group-hover/caption:opacity-100 transition-opacity pointer-events-none" />

                        <span className="relative z-10 block text-xl sm:text-2xl font-black leading-tight tracking-tight drop-shadow-lg w-full">
                            {currentCaption}
                        </span>
                    </div>
                </div>
            )}

            {/* 4. HIDDEN ENGINE */}
            <div className="hidden-plyr hidden invisible opacity-0 pointer-events-none">
                <audio 
                    key={`${finalAudioUrl}-audio`}
                    ref={audioRef} 
                    src={finalAudioUrl} 
                    crossOrigin="anonymous"
                >
                    <track kind="captions" />
                </audio>
            </div>
        </div>
    );
};





export default CinemaAudioPlayer;
