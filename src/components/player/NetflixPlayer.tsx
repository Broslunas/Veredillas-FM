import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { syncPlaybackData, recordListen } from '@/services/player/playbackSync';
import { getProxiedAudioUrl } from '@/utils/audioProxy';

export interface SectionInfo {
  title: string;
  time: string | number; // "MM:SS" or "HH:MM:SS" or number
}

export interface TranscriptionCue {
  time: string | number;
  text: string;
  speaker?: string;
}

export interface EpisodeInfo {
  slug: string;
  title: string;
  author?: string;
  season?: number;
  episode?: number;
  duration?: string;
  image?: string;
  videoUrl?: string;
  audioUrl?: string;
  sections?: SectionInfo[];
  transcription?: TranscriptionCue[];
}

export interface NetflixPlayerProps {
  slug: string;
  title: string;
  author?: string;
  season?: number;
  episode?: number;
  image?: string;
  videoUrl?: string;
  audioUrl?: string;
  sections?: SectionInfo[];
  transcription?: TranscriptionCue[];
  initialProgress?: number; // in seconds
  episodesList?: EpisodeInfo[];
}

const PREFS_KEY = 'vfm-player-prefs';

export interface CaptionStyle {
  size: 'sm' | 'md' | 'lg' | 'xl';
  font: 'sans' | 'serif' | 'mono';
  color: string;
}

const CAPTION_STYLE_DEFAULTS: CaptionStyle = { size: 'md', font: 'sans', color: '#ffffff' };
const CAPTION_SIZES: CaptionStyle['size'][] = ['sm', 'md', 'lg', 'xl'];
const CAPTION_FONTS: CaptionStyle['font'][] = ['sans', 'serif', 'mono'];
const CAPTION_COLORS = ['#ffffff', '#facc15', '#38bdf8', '#f472b6', '#a3e635', '#fb923c'];

const CAPTION_SIZE_CLASSES: Record<CaptionStyle['size'], string> = {
  sm: 'text-xs md:text-sm',
  md: 'text-sm md:text-base',
  lg: 'text-base md:text-lg',
  xl: 'text-lg md:text-xl',
};

const CAPTION_FONT_CLASSES: Record<CaptionStyle['font'], string> = {
  sans: 'font-body',
  serif: 'font-serif',
  mono: 'font-mono',
};

interface PlayerPrefs {
  volume: number;
  playbackRate: number;
  showCaptions: boolean;
  captionStyle: CaptionStyle;
}

function loadPrefs(): PlayerPrefs {
  const defaults: PlayerPrefs = { volume: 1, playbackRate: 1, showCaptions: false, captionStyle: CAPTION_STYLE_DEFAULTS };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    const rawCaptionStyle = parsed.captionStyle || {};
    return {
      volume: typeof parsed.volume === 'number' ? parsed.volume : defaults.volume,
      playbackRate: typeof parsed.playbackRate === 'number' ? parsed.playbackRate : defaults.playbackRate,
      showCaptions: Boolean(parsed.showCaptions),
      captionStyle: {
        size: CAPTION_SIZES.includes(rawCaptionStyle.size) ? rawCaptionStyle.size : defaults.captionStyle.size,
        font: CAPTION_FONTS.includes(rawCaptionStyle.font) ? rawCaptionStyle.font : defaults.captionStyle.font,
        color: typeof rawCaptionStyle.color === 'string' ? rawCaptionStyle.color : defaults.captionStyle.color,
      },
    };
  } catch {
    return defaults;
  }
}

function savePrefs(prefs: Partial<PlayerPrefs>) {
  if (typeof window === 'undefined') return;
  try {
    const current = loadPrefs();
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {
    /* noop */
  }
}

// Helper to convert timestamp string ("MM:SS" or "HH:MM:SS") to seconds
function parseTimeToSeconds(timeStr: string | number): number {
  if (typeof timeStr === 'number') return timeStr;
  if (!timeStr) return 0;
  const parts = timeStr.toString().split(':').map(Number);
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0);
  if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  return parseFloat(timeStr) || 0;
}

/* ---------------------------------------------------------------------- */
/* ICONS - minimal stroke-based set, consistent with the site's iconography */
/* ---------------------------------------------------------------------- */

const IconPlay = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l11-6.86a1 1 0 0 0 0-1.7l-11-6.86A1 1 0 0 0 8 5.14Z" /></svg>
);
const IconPause = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
);
const IconRewind10 = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8Z" fill="currentColor" stroke="none" />
    <text x="12.5" y="15.5" fontSize="6.5" fontWeight="800" textAnchor="middle" fill="currentColor" fontFamily="var(--font-body, sans-serif)">10</text>
  </svg>
);
const IconForward10 = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8Z" fill="currentColor" stroke="none" />
    <text x="11.5" y="15.5" fontSize="6.5" fontWeight="800" textAnchor="middle" fill="currentColor" fontFamily="var(--font-body, sans-serif)">10</text>
  </svg>
);
const IconVolumeMute = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4V5Z" /><line x1="16" y1="9" x2="22" y2="15" /><line x1="22" y1="9" x2="16" y2="15" />
  </svg>
);
const IconVolumeLow = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M16.5 9.5a4 4 0 0 1 0 5.5" />
  </svg>
);
const IconVolumeHigh = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.5 8.5a5.5 5.5 0 0 1 0 7" /><path d="M18.5 6a9 9 0 0 1 0 12" />
  </svg>
);
const IconCaptions = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2.5" />
    <text x="12" y="15.5" fontSize="7.5" fontWeight="800" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="var(--font-body, sans-serif)">CC</text>
  </svg>
);
const IconChapters = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
  </svg>
);
const IconQueue = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="15" y2="6" /><line x1="4" y1="12" x2="15" y2="12" /><line x1="4" y1="18" x2="11" y2="18" />
    <path d="M18 9v10l6-5-6-5Z" transform="translate(-1 -3)" fill="currentColor" stroke="none" />
  </svg>
);
const IconPiP = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><rect x="12" y="11" width="8" height="6" rx="1" fill="currentColor" stroke="none" />
  </svg>
);
const IconExpand = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);
const IconCompress = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3v3a2 2 0 0 1-2 2H4M15 3v3a2 2 0 0 0 2 2h3M21 15h-3a2 2 0 0 0-2 2v3M3 15h3a2 2 0 0 1 2 2v3" />
  </svg>
);
const IconKeyboard = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <line x1="6" y1="10" x2="6" y2="10" /><line x1="10" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="14" y2="10" /><line x1="18" y1="10" x2="18" y2="10" />
    <line x1="7" y1="14" x2="17" y2="14" />
  </svg>
);
const IconClose = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconCheck = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);
const IconAlert = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
  </svg>
);
const IconReplay = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
  </svg>
);
const IconChevronRight = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
);
const IconSettings = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82A1.65 1.65 0 0 0 3 13.09H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

/* ---------------------------------------------------------------------- */

const ctrlBtn =
  'flex items-center justify-center text-zinc-300 hover:text-white transition-all p-2 rounded-lg hover:bg-white/10 active:scale-90';
const ctrlBtnActive = 'bg-primary/25 text-primary hover:text-primary hover:bg-primary/30';

export const NetflixPlayer: React.FC<NetflixPlayerProps> = ({
  slug: initialSlug,
  title: initialTitle,
  author: initialAuthor = 'Veredillas FM',
  season: initialSeason,
  episode: initialEpisode,
  image: initialImage = '/logo.webp',
  videoUrl: initialVideoUrl,
  audioUrl: initialAudioUrl,
  sections: initialSections = [],
  transcription: initialTranscription = [],
  initialProgress = 0,
  episodesList = [],
}) => {
  // Current episode state
  const [currentEpisode, setCurrentEpisode] = useState<EpisodeInfo>({
    slug: initialSlug,
    title: initialTitle,
    author: initialAuthor,
    season: initialSeason,
    episode: initialEpisode,
    image: initialImage,
    videoUrl: initialVideoUrl,
    audioUrl: initialAudioUrl,
    sections: initialSections,
    transcription: initialTranscription,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const initialPrefs = useRef(loadPrefs()).current;

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(initialPrefs.volume);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(initialPrefs.playbackRate);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [showSectionsDrawer, setShowSectionsDrawer] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCaptions, setShowCaptions] = useState(initialPrefs.showCaptions);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(initialPrefs.captionStyle);
  const [showCaptionSettings, setShowCaptionSettings] = useState(false);
  const [mediaMode, setMediaMode] = useState<'video' | 'audio'>('video');
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const pendingResumeRef = useRef<number>(initialProgress || 0);
  const resumeAppliedRef = useRef(false);
  const modeSwitchResumeRef = useRef<{ time: number; wasPlaying: boolean } | null>(null);

  const isVideo = Boolean(currentEpisode.videoUrl) && mediaMode === 'video';

  const srcUrl = useMemo(() => {
    if (isVideo && currentEpisode.videoUrl) return currentEpisode.videoUrl;
    if (currentEpisode.audioUrl) return getProxiedAudioUrl(currentEpisode.audioUrl);
    return currentEpisode.videoUrl || '';
  }, [isVideo, currentEpisode.videoUrl, currentEpisode.audioUrl]);

  // Process sections into timestamps
  const parsedSections = useMemo(() => {
    const raw = currentEpisode.sections || [];
    return raw
      .map((sec) => ({
        title: sec.title,
        seconds: parseTimeToSeconds(sec.time),
        formattedTime: typeof sec.time === 'string' ? sec.time : formatTime(parseTimeToSeconds(sec.time)),
      }))
      .sort((a, b) => a.seconds - b.seconds);
  }, [currentEpisode.sections]);

  // Process transcription into caption cues with computed end times
  const parsedCaptions = useMemo(() => {
    const raw = currentEpisode.transcription || [];
    const sorted = raw
      .map((c) => ({ start: parseTimeToSeconds(c.time), text: c.text, speaker: c.speaker }))
      .sort((a, b) => a.start - b.start);
    return sorted.map((c, i) => ({
      ...c,
      end: i < sorted.length - 1 ? Math.min(sorted[i + 1].start, c.start + 12) : Math.max(c.start + 12, duration || c.start + 12),
    }));
  }, [currentEpisode.transcription, duration]);

  // Current active section based on currentTime
  const currentActiveSection = useMemo(() => {
    if (!parsedSections.length) return null;
    let active = parsedSections[0];
    for (const sec of parsedSections) {
      if (currentTime >= sec.seconds) {
        active = sec;
      } else {
        break;
      }
    }
    return active;
  }, [parsedSections, currentTime]);

  // Hovered section based on hoverTime
  const hoveredSection = useMemo(() => {
    if (hoverTime === null || !parsedSections.length) return null;
    let active = parsedSections[0];
    for (const sec of parsedSections) {
      if (hoverTime >= sec.seconds) {
        active = sec;
      } else {
        break;
      }
    }
    return active;
  }, [parsedSections, hoverTime]);

  const activeCaption = useMemo(() => {
    if (!showCaptions || !parsedCaptions.length) return null;
    return parsedCaptions.find((c) => currentTime >= c.start && currentTime < c.end) || null;
  }, [showCaptions, parsedCaptions, currentTime]);

  const nextEpisode = useMemo(() => {
    if (!episodesList.length) return null;
    const idx = episodesList.findIndex((ep) => ep.slug === currentEpisode.slug);
    if (idx === -1 || idx === episodesList.length - 1) return null;
    return episodesList[idx + 1];
  }, [episodesList, currentEpisode.slug]);

  // Format time (seconds -> MM:SS or HH:MM:SS)
  function formatTime(secs: number) {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // Reset controls hide timer
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSpeedMenu(false);
        setShowSectionsDrawer(false);
      }
    }, 3500);
  };

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      try { (window as any).umami?.track('Pausar Reproductor', { title: currentEpisode.title }); } catch {}
    } else {
      videoRef.current.play().catch(console.error);
      try { (window as any).umami?.track('Reproducir Audio', { title: currentEpisode.title }); } catch {}
    }
  }, [isPlaying, currentEpisode.title]);

  // Skip time (-10s / +10s)
  const skipTime = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration || Infinity, videoRef.current.currentTime + seconds));
  }, [duration]);

  // Jump to specific time (e.g. section click)
  const jumpToTime = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);
    setShowSectionsDrawer(false);
    if (videoRef.current.paused) {
      videoRef.current.play().catch(console.error);
    }
  }, []);

  // Volume & Mute
  const handleVolumeChange = useCallback((newVal: number) => {
    const val = Math.max(0, Math.min(1, newVal));
    setVolume(val);
    savePrefs({ volume: val });
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  }, [isMuted]);

  // Playback Rate
  const changeSpeed = useCallback((rate: number) => {
    setPlaybackRate(rate);
    savePrefs({ playbackRate: rate });
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
  }, []);

  const toggleCaptions = useCallback(() => {
    setShowCaptions((prev) => {
      const next = !prev;
      savePrefs({ showCaptions: next });
      if (!next) setShowCaptionSettings(false);
      return next;
    });
  }, []);

  const updateCaptionStyle = useCallback((patch: Partial<CaptionStyle>) => {
    setCaptionStyle((prev) => {
      const next = { ...prev, ...patch };
      savePrefs({ captionStyle: next });
      return next;
    });
  }, []);

  // Switch between video/audio-only mode without losing playback position
  const switchMediaMode = useCallback((mode: 'video' | 'audio') => {
    setMediaMode((prev) => {
      if (prev === mode) return prev;
      const v = videoRef.current;
      modeSwitchResumeRef.current = { time: v?.currentTime || 0, wasPlaying: v ? !v.paused : false };
      return mode;
    });
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  }, []);

  // Picture in Picture
  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.error('PiP Error:', e);
    }
  }, []);

  // Scrubbing / Seeking on progress bar
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    setHoverPosition(clickX);
    setHoverTime(percentage * duration);
  };

  const handleProgressBarMouseLeave = () => {
    setHoverTime(null);
  };

  const resetPlaybackState = () => {
    setCurrentTime(0);
    setDuration(0);
    setBufferedEnd(0);
    setHasError(false);
    setIsEnded(false);
    setIsBuffering(true);
  };

  // Select another episode (swap source in-place, no page navigation)
  const handleSelectEpisode = useCallback((ep: EpisodeInfo) => {
    setCurrentEpisode(ep);
    setShowEpisodeDrawer(false);
    resetPlaybackState();
    setIsPlaying(true);
  }, []);

  const handleReplay = useCallback(() => {
    setIsEnded(false);
    jumpToTime(0);
  }, [jumpToTime]);

  const handlePlayNext = useCallback(() => {
    if (nextEpisode) handleSelectEpisode(nextEpisode);
  }, [nextEpisode, handleSelectEpisode]);

  const retryLoad = useCallback(() => {
    setHasError(false);
    setIsBuffering(true);
    videoRef.current?.load();
  }, []);

  // Try to apply resumed progress once metadata + saved position are known
  const applyPendingResume = useCallback(() => {
    const v = videoRef.current;
    const p = pendingResumeRef.current;
    if (!v || resumeAppliedRef.current || !p || p <= 5) return;
    if (!v.duration || isNaN(v.duration)) return;
    if (p >= v.duration - 15) return;
    v.currentTime = p;
    setCurrentTime(p);
    resumeAppliedRef.current = true;
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast(`Reanudado en ${formatTime(p)}`, 'info');
    }
  }, []);

  // Runs once the media's metadata (duration, etc.) is known
  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration || isNaN(v.duration)) return;
    setDuration(v.duration);
    v.volume = volume;
    v.playbackRate = playbackRate;
    if (modeSwitchResumeRef.current) {
      const { time, wasPlaying } = modeSwitchResumeRef.current;
      modeSwitchResumeRef.current = null;
      v.currentTime = time;
      setCurrentTime(time);
      if (wasPlaying) v.play().catch(console.error);
    } else {
      applyPendingResume();
    }
  }, [volume, playbackRate, applyPendingResume]);

  // Catch up if the browser already fired `loadedmetadata` before React finished
  // hydrating and attaching its listener (common for small/cached SSR'd <video src>)
  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 1) {
      handleLoadedMetadata();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcUrl]);

  // Fetch saved progress for the current episode
  useEffect(() => {
    resumeAppliedRef.current = false;
    pendingResumeRef.current = currentEpisode.slug === initialSlug && initialProgress > 5 ? initialProgress : 0;
    const slug = currentEpisode.slug;
    if (!slug) return;
    let cancelled = false;
    fetch(`/api/user/episode-state?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.savedProgress && data.savedProgress > 5) {
          pendingResumeRef.current = data.savedProgress;
          applyPendingResume();
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEpisode.slug]);

  // Sync listen progress periodically
  useEffect(() => {
    if (currentTime > 0 && Math.abs(currentTime - lastSyncTimeRef.current) >= 10) {
      lastSyncTimeRef.current = currentTime;
      syncPlaybackData({
        slug: currentEpisode.slug,
        progress: Math.floor(currentTime),
        duration: Math.floor(duration),
        completed: duration > 0 && currentTime >= duration - 15,
        isVisible: true,
        isMuted,
      });
    }
  }, [currentTime, duration, currentEpisode.slug, isMuted]);

  // Initial listen record
  useEffect(() => {
    if (isPlaying && currentEpisode.slug) {
      recordListen(currentEpisode.slug);
    }
  }, [isPlaying, currentEpisode.slug]);

  // Broadcast time updates for external sidebar widgets (sections/transcription)
  useEffect(() => {
    if (currentTime <= 0) return;
    document.dispatchEvent(new CustomEvent('veredillas:audio-timeupdate', { detail: { currentTime } }));
  }, [currentTime]);

  // Listen for external seek requests (sidebar sections / transcription widgets)
  useEffect(() => {
    const handleExternalSeek = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const t = detail?.time;
      if (typeof t === 'number' && !isNaN(t)) jumpToTime(t);
    };
    document.addEventListener('veredillas:audio-seek', handleExternalSeek);
    return () => document.removeEventListener('veredillas:audio-seek', handleExternalSeek);
  }, [jumpToTime]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          skipTime(-5);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          skipTime(5);
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange(volume + 0.1);
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(volume - 0.1);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'c':
          e.preventDefault();
          if (parsedCaptions.length > 0) toggleCaptions();
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts((v) => !v);
          break;
        case 'escape':
          setShowShortcuts(false);
          setShowSectionsDrawer(false);
          setShowEpisodeDrawer(false);
          setShowSpeedMenu(false);
          setShowCaptionSettings(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skipTime, handleVolumeChange, toggleMute, toggleFullscreen, toggleCaptions, volume, parsedCaptions.length]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
      className={`relative w-full overflow-hidden bg-black text-white select-none transition-all duration-300 font-body shadow-2xl ${
        isFullscreen ? 'fixed inset-0 z-[99999] h-screen w-screen rounded-none' : 'aspect-video rounded-2xl border border-zinc-800/80'
      }`}
    >
      {/* MEDIA PLAYER (VIDEO / AUDIO) */}
      {srcUrl ? (
        <video
          ref={videoRef}
          src={srcUrl}
          poster={currentEpisode.image}
          playsInline
          preload="metadata"
          className="h-full w-full object-contain bg-black"
          onClick={togglePlay}
          onPlay={() => {
            setIsPlaying(true);
            setIsBuffering(false);
            setIsEnded(false);
          }}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onError={() => {
            setHasError(true);
            setIsBuffering(false);
          }}
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
              if (videoRef.current.buffered.length > 0) {
                setBufferedEnd(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
              }
            }
          }}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => {
            setIsPlaying(false);
            setIsEnded(true);
            syncPlaybackData({
              slug: currentEpisode.slug,
              progress: Math.floor(duration),
              duration: Math.floor(duration),
              completed: true,
              isVisible: true,
              isMuted,
            });
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-black text-zinc-500 text-sm">
          <p>No hay contenido multimedia disponible para este episodio.</p>
        </div>
      )}

      {/* AUDIO COVER VISUALIZER (WHEN IN AUDIO MODE OR NO VIDEO) */}
      {(!isVideo || mediaMode === 'audio') && srcUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black pointer-events-none z-10">
          <div className="relative">
            <img
              src={currentEpisode.image || '/logo.webp'}
              alt={currentEpisode.title}
              className={`w-40 h-40 md:w-52 md:h-52 rounded-2xl object-cover border border-white/10 transition-all duration-500 ${
                isPlaying ? 'ring-2 ring-primary/50 scale-[1.02]' : ''
              }`}
            />
            {isPlaying && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-end gap-1 h-5 px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-full border border-white/10">
                <span className="w-[3px] bg-primary animate-bounce h-3 rounded-full" style={{ animationDelay: '0ms' }} />
                <span className="w-[3px] bg-primary animate-bounce h-4 rounded-full" style={{ animationDelay: '150ms' }} />
                <span className="w-[3px] bg-primary animate-bounce h-2.5 rounded-full" style={{ animationDelay: '300ms' }} />
                <span className="w-[3px] bg-primary animate-bounce h-5 rounded-full" style={{ animationDelay: '450ms' }} />
              </div>
            )}
          </div>
          <h3 className="mt-6 text-lg md:text-xl font-display font-bold text-white text-center max-w-lg line-clamp-1">
            {currentEpisode.title}
          </h3>
          <p className="text-xs md:text-sm text-zinc-400 font-medium mt-1">
            {currentEpisode.season && `Temporada ${currentEpisode.season} · `}
            {currentEpisode.episode && `Episodio ${currentEpisode.episode}`}
          </p>
        </div>
      )}

      {/* BUFFERING SPINNER */}
      {isBuffering && isPlaying && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-20 pointer-events-none">
          <div className="w-10 h-10 border-[3px] border-white/15 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* ERROR STATE */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 z-40 px-6 text-center">
          <IconAlert className="w-8 h-8 text-zinc-500" />
          <p className="text-sm text-zinc-300 font-medium">No se pudo cargar el contenido.</p>
          <button
            onClick={retryLoad}
            className="mt-1 px-4 py-2 rounded-full bg-primary hover:brightness-110 text-white text-xs font-semibold transition"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* SUBTITLES / CAPTIONS OVERLAY (independent from control-bar fade) */}
      {showCaptions && activeCaption && (
        <div
          aria-live="polite"
          className={`absolute left-1/2 -translate-x-1/2 z-30 max-w-[88%] md:max-w-[70%] px-3.5 py-1.5 rounded-md bg-black/75 backdrop-blur-sm text-center transition-all duration-200 pointer-events-none ${CAPTION_SIZE_CLASSES[captionStyle.size]} ${CAPTION_FONT_CLASSES[captionStyle.font]} ${
            showControls || !isPlaying ? 'bottom-24 md:bottom-28' : 'bottom-10'
          }`}
        >
          {activeCaption.speaker && <span className="text-primary font-bold mr-1.5">{activeCaption.speaker}:</span>}
          <span className="font-medium leading-snug" style={{ color: captionStyle.color }}>{activeCaption.text}</span>
        </div>
      )}

      {/* END SCREEN */}
      {isEnded && (
        <div className="absolute inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center gap-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-2">Episodio finalizado</p>
            <h3 className="text-xl md:text-2xl font-display font-bold text-white">{currentEpisode.title}</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-4 w-full max-w-2xl">
            <button
              onClick={handleReplay}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition"
            >
              <IconReplay className="w-4 h-4" /> Volver a reproducir
            </button>

            {nextEpisode && (
              <button
                onClick={handlePlayNext}
                className="flex-1 flex items-center gap-3 p-2 pr-4 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-left transition group"
              >
                <img
                  src={nextEpisode.image || '/logo.webp'}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-white/10"
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">Siguiente episodio</p>
                  <p className="text-sm font-semibold text-white truncate">{nextEpisode.title}</p>
                </div>
                <IconChevronRight className="w-5 h-5 text-primary flex-shrink-0 ml-auto group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* PLAYER OVERLAY CONTROLS */}
      <div
        className={`absolute inset-0 flex flex-col justify-between p-4 md:p-6 transition-opacity duration-300 z-30 bg-gradient-to-t from-black/85 via-black/0 to-black/60 ${
          (showControls || !isPlaying) && !isEnded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* TOP BAR */}
        <div className="flex items-start justify-between w-full gap-4">
          <div className="min-w-0">
            <h2 className="text-sm md:text-lg font-display font-bold text-white line-clamp-1">{currentEpisode.title}</h2>
            <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
              {currentEpisode.season && `T${currentEpisode.season}:E${currentEpisode.episode} · `}
              {currentActiveSection ? currentActiveSection.title : currentEpisode.author}
            </p>
          </div>

          {/* Audio / Video Switcher */}
          {currentEpisode.videoUrl && currentEpisode.audioUrl && (
            <div className="flex items-center bg-black/50 backdrop-blur-md border border-white/10 rounded-full p-1 text-xs flex-shrink-0">
              <button
                onClick={() => switchMediaMode('video')}
                className={`px-3 py-1 rounded-full font-semibold transition-all ${
                  mediaMode === 'video' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Vídeo
              </button>
              <button
                onClick={() => switchMediaMode('audio')}
                className={`px-3 py-1 rounded-full font-semibold transition-all ${
                  mediaMode === 'audio' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Solo audio
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM CONTROLS & TIMELINE WITH SECTIONS */}
        <div className="w-full flex flex-col gap-1.5">
          {/* PROGRESS BAR & SECTION MARKERS */}
          <div
            className="relative group cursor-pointer py-2.5"
            onClick={handleSeek}
            onMouseMove={handleProgressBarMouseMove}
            onMouseLeave={handleProgressBarMouseLeave}
          >
            <div
              ref={progressBarRef}
              className="relative w-full h-1.5 group-hover:h-2 bg-white/15 rounded-full overflow-hidden transition-all duration-150"
            >
              {/* Buffered Progress */}
              <div
                className="absolute top-0 bottom-0 bg-white/25 rounded-full transition-all"
                style={{ width: `${duration ? (bufferedEnd / duration) * 100 : 0}%` }}
              />
              {/* Played Progress */}
              <div
                className="absolute top-0 bottom-0 bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />

              {/* SECTION CHAPTER MARKERS ON TIMELINE */}
              {duration > 0 &&
                parsedSections.map((sec, idx) => {
                  const leftPct = (sec.seconds / duration) * 100;
                  if (leftPct <= 0 || leftPct >= 100) return null;
                  return (
                    <div
                      key={idx}
                      className="absolute top-0 bottom-0 w-[2px] bg-black/40 z-10 pointer-events-none"
                      style={{ left: `${leftPct}%` }}
                      title={`${sec.formattedTime} - ${sec.title}`}
                    />
                  );
                })}
            </div>

            {/* Seek Handle Dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full ring-4 ring-primary/30 shadow-md scale-0 group-hover:scale-100 transition-transform pointer-events-none"
              style={{ left: `calc(${duration ? (currentTime / duration) * 100 : 0}% - 7px)` }}
            />

            {/* Hover Tooltip (Time + Section Title) */}
            {hoverTime !== null && (
              <div
                className="absolute -top-11 -translate-x-1/2 px-2.5 py-1.5 bg-black/90 backdrop-blur-md text-white text-xs font-mono rounded-md shadow-xl border border-white/10 pointer-events-none whitespace-nowrap z-50 flex flex-col items-center gap-0.5"
                style={{ left: `${Math.max(40, Math.min(hoverPosition, (progressBarRef.current?.getBoundingClientRect().width || 200) - 40))}px` }}
              >
                <span className="font-bold text-primary">{formatTime(hoverTime)}</span>
                {hoveredSection && (
                  <span className="text-[10px] text-zinc-300 max-w-[180px] truncate font-sans">{hoveredSection.title}</span>
                )}
              </div>
            )}
          </div>

          {/* BOTTOM BUTTONS ROW */}
          <div className="flex items-center justify-between w-full">
            {/* Left Controls */}
            <div className="flex items-center gap-0.5 md:gap-1.5">
              <button
                onClick={() => skipTime(-10)}
                aria-label="Retroceder 10 segundos"
                className={ctrlBtn}
                title="Retroceder 10s (J)"
              >
                <IconRewind10 className="w-5 h-5" />
              </button>

              <button
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                className="flex-shrink-0 flex items-center justify-center w-9 h-9 md:w-10 md:h-10 mx-0.5 rounded-full bg-primary hover:brightness-110 text-white shadow-lg shadow-primary/30 transition-all transform hover:scale-105 active:scale-95"
              >
                {isPlaying ? <IconPause className="w-5 h-5" /> : <IconPlay className="w-5 h-5 ml-0.5" />}
              </button>

              <button
                onClick={() => skipTime(10)}
                aria-label="Adelantar 10 segundos"
                className={ctrlBtn}
                title="Adelantar 10s (L)"
              >
                <IconForward10 className="w-5 h-5" />
              </button>

              {/* VOLUME SLIDER POPPER (desktop) */}
              <div
                className="relative hidden sm:flex items-center group/vol"
                onMouseEnter={() => setIsVolumeHovered(true)}
                onMouseLeave={() => setIsVolumeHovered(false)}
              >
                <button onClick={toggleMute} className={ctrlBtn} aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}>
                  {isMuted || volume === 0 ? (
                    <IconVolumeMute className="w-5 h-5" />
                  ) : volume < 0.5 ? (
                    <IconVolumeLow className="w-5 h-5" />
                  ) : (
                    <IconVolumeHigh className="w-5 h-5" />
                  )}
                </button>

                <div
                  className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${
                    isVolumeHovered ? 'w-24 md:w-28 opacity-100 ml-1' : 'w-0 opacity-0 ml-0'
                  }`}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/20 accent-primary rounded-lg cursor-pointer"
                    aria-label="Volumen"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 min-w-[24px]">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
                </div>
              </div>

              {/* Mute button (mobile, no hover slider) */}
              <button onClick={toggleMute} className={`${ctrlBtn} sm:hidden`} aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}>
                {isMuted || volume === 0 ? <IconVolumeMute className="w-5 h-5" /> : <IconVolumeHigh className="w-5 h-5" />}
              </button>

              {/* Time Display */}
              <span className="text-[11px] md:text-xs font-mono tabular-nums text-zinc-300 ml-1 whitespace-nowrap">
                {formatTime(currentTime)} <span className="text-zinc-600">/</span> {formatTime(duration)}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-0.5 md:gap-1">
              {/* Captions Toggle */}
              {parsedCaptions.length > 0 && (
                <button
                  onClick={toggleCaptions}
                  className={`${ctrlBtn} ${showCaptions ? ctrlBtnActive : ''}`}
                  aria-label="Subtítulos"
                  title="Subtítulos (C)"
                >
                  <IconCaptions className="w-5 h-5" />
                </button>
              )}

              {/* Caption Style Settings */}
              {parsedCaptions.length > 0 && showCaptions && (
                <div className="relative">
                  <button
                    onClick={() => setShowCaptionSettings((v) => !v)}
                    className={`${ctrlBtn} ${showCaptionSettings ? ctrlBtnActive : ''}`}
                    aria-label="Ajustes de subtítulos"
                    title="Ajustes de subtítulos"
                  >
                    <IconSettings className="w-5 h-5" />
                  </button>
                  {showCaptionSettings && (
                    <div className="absolute bottom-11 right-0 bg-zinc-950/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-3.5 flex flex-col gap-3.5 z-50 w-60">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Tamaño</p>
                        <div className="flex gap-1.5">
                          {CAPTION_SIZES.map((s) => (
                            <button
                              key={s}
                              onClick={() => updateCaptionStyle({ size: s })}
                              aria-label={`Tamaño ${s}`}
                              className={`flex-1 py-1.5 rounded-lg font-bold transition ${CAPTION_SIZE_CLASSES[s]} ${
                                captionStyle.size === s ? 'bg-primary text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                              }`}
                            >
                              A
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Fuente</p>
                        <div className="flex gap-1.5">
                          {CAPTION_FONTS.map((f) => (
                            <button
                              key={f}
                              onClick={() => updateCaptionStyle({ font: f })}
                              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition ${CAPTION_FONT_CLASSES[f]} ${
                                captionStyle.font === f ? 'bg-primary text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                              }`}
                            >
                              {f === 'sans' ? 'Normal' : f === 'serif' ? 'Serif' : 'Mono'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Color</p>
                        <div className="flex gap-2">
                          {CAPTION_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => updateCaptionStyle({ color: c })}
                              aria-label={`Color ${c}`}
                              className={`w-6 h-6 rounded-full border-2 transition ${
                                captionStyle.color === c ? 'border-primary scale-110' : 'border-white/20 hover:scale-105'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>

                      {activeCaption && (
                        <div className="rounded-lg bg-black/60 border border-white/10 px-2.5 py-2 text-center">
                          <span
                            className={`${CAPTION_SIZE_CLASSES[captionStyle.size]} ${CAPTION_FONT_CLASSES[captionStyle.font]} font-medium leading-snug`}
                            style={{ color: captionStyle.color }}
                          >
                            {activeCaption.text}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Sections / Chapters Button */}
              {parsedSections.length > 0 && (
                <button
                  onClick={() => setShowSectionsDrawer((v) => !v)}
                  className={`${ctrlBtn} ${showSectionsDrawer ? ctrlBtnActive : ''}`}
                  aria-label="Capítulos"
                  title="Capítulos"
                >
                  <IconChapters className="w-5 h-5" />
                </button>
              )}

              {/* Playback Speed Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu((v) => !v)}
                  className={`${ctrlBtn} text-xs font-bold w-auto px-2.5 ${showSpeedMenu ? ctrlBtnActive : ''}`}
                  title="Velocidad de reproducción"
                >
                  {playbackRate}×
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-11 right-0 bg-zinc-950/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-1 flex flex-col gap-0.5 z-50 min-w-[100px]">
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changeSpeed(rate)}
                        className={`text-xs px-3 py-1.5 flex items-center justify-between gap-3 rounded-lg transition ${
                          playbackRate === rate ? 'text-primary font-bold' : 'text-zinc-300 hover:bg-white/5'
                        }`}
                      >
                        {rate}× {playbackRate === rate && <IconCheck className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Episodes Drawer Button */}
              {episodesList.length > 0 && (
                <button
                  onClick={() => setShowEpisodeDrawer(true)}
                  className={ctrlBtn}
                  aria-label="Lista de episodios"
                  title="Episodios"
                >
                  <IconQueue className="w-5 h-5" />
                </button>
              )}

              {/* Keyboard shortcuts */}
              <button
                onClick={() => setShowShortcuts(true)}
                className={`${ctrlBtn} hidden md:flex`}
                aria-label="Atajos de teclado"
                title="Atajos de teclado (?)"
              >
                <IconKeyboard className="w-5 h-5" />
              </button>

              {/* Picture-in-Picture */}
              <button onClick={togglePiP} className={ctrlBtn} aria-label="Picture in Picture" title="Picture in Picture">
                <IconPiP className="w-5 h-5" />
              </button>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className={ctrlBtn} aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}>
                {isFullscreen ? <IconCompress className="w-5 h-5" /> : <IconExpand className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTIONS / CHAPTERS OVERLAY POPUP */}
      {showSectionsDrawer && parsedSections.length > 0 && (
        <div className="absolute bottom-20 right-4 md:right-6 z-50 w-72 max-h-72 bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Capítulos</h4>
            <button onClick={() => setShowSectionsDrawer(false)} className="text-zinc-500 hover:text-white transition" aria-label="Cerrar">
              <IconClose className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {parsedSections.map((sec, idx) => {
              const isActive = currentActiveSection?.title === sec.title;
              return (
                <div
                  key={idx}
                  onClick={() => jumpToTime(sec.seconds)}
                  className={`flex items-center justify-between gap-2 p-2 rounded-lg cursor-pointer transition text-xs ${
                    isActive ? 'bg-primary/20 text-primary font-bold' : 'text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <span className="truncate">{sec.title}</span>
                  <span className="font-mono text-[10px] text-zinc-500 flex-shrink-0">{sec.formattedTime}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EPISODE SELECTOR SLIDE-OUT DRAWER */}
      {showEpisodeDrawer && (
        <div className="absolute inset-0 z-50 bg-zinc-950/97 backdrop-blur-xl flex flex-col p-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <h3 className="text-lg font-display font-bold text-white">Episodios</h3>
            <button
              onClick={() => setShowEpisodeDrawer(false)}
              className="p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition"
              aria-label="Cerrar"
            >
              <IconClose className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {episodesList.map((ep) => {
              const isCurrent = ep.slug === currentEpisode.slug;
              return (
                <div
                  key={ep.slug}
                  onClick={() => handleSelectEpisode(ep)}
                  className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border ${
                    isCurrent ? 'bg-primary/10 border-primary/40' : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
                  }`}
                >
                  <img src={ep.image || '/logo.webp'} alt={ep.title} className="w-20 h-14 object-cover rounded-lg border border-white/10 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-semibold truncate ${isCurrent ? 'text-primary' : 'text-white'}`}>{ep.title}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {ep.season && `T${ep.season}:E${ep.episode} · `}
                      {ep.duration || 'Veredillas FM'}
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full flex-shrink-0">Reproduciendo</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KEYBOARD SHORTCUTS MODAL */}
      {showShortcuts && (
        <div
          className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-display font-bold text-white">Atajos de teclado</h3>
              <button onClick={() => setShowShortcuts(false)} className="text-zinc-500 hover:text-white transition" aria-label="Cerrar">
                <IconClose className="w-4 h-4" />
              </button>
            </div>
            <ul className="space-y-2.5">
              {[
                ['Espacio / K', 'Reproducir / Pausar'],
                ['← / J', 'Retroceder 5s'],
                ['→ / L', 'Avanzar 5s'],
                ['↑ / ↓', 'Subir / bajar volumen'],
                ['M', 'Silenciar'],
                ['F', 'Pantalla completa'],
                ['C', 'Subtítulos'],
                ['?', 'Mostrar/ocultar esta ayuda'],
              ].map(([key, desc]) => (
                <li key={key} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">{desc}</span>
                  <kbd className="font-mono text-[10px] font-bold text-zinc-200 bg-white/10 border border-white/10 rounded px-2 py-1">{key}</kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetflixPlayer;
