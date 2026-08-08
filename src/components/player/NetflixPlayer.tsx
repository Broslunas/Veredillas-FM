import React, { useState, useRef, useEffect, useCallback } from 'react';
import { syncPlaybackData, recordListen } from '@/services/player/playbackSync';

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
  initialProgress?: number; // in seconds
  episodesList?: EpisodeInfo[];
}

export const NetflixPlayer: React.FC<NetflixPlayerProps> = ({
  slug: initialSlug,
  title: initialTitle,
  author: initialAuthor = 'Veredillas FM',
  season: initialSeason,
  episode: initialEpisode,
  image: initialImage = '/logo.webp',
  videoUrl: initialVideoUrl,
  audioUrl: initialAudioUrl,
  initialProgress = 0,
  episodesList = [],
}) => {
  // Current playing state
  const [currentEpisode, setCurrentEpisode] = useState<EpisodeInfo>({
    slug: initialSlug,
    title: initialTitle,
    author: initialAuthor,
    season: initialSeason,
    episode: initialEpisode,
    image: initialImage,
    videoUrl: initialVideoUrl,
    audioUrl: initialAudioUrl,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [mediaMode, setMediaMode] = useState<'video' | 'audio'>('video');
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  const srcUrl = currentEpisode.videoUrl || currentEpisode.audioUrl || '';
  const isVideo = Boolean(currentEpisode.videoUrl) && mediaMode === 'video';

  // Format time (seconds -> MM:SS or HH:MM:SS)
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Reset controls hide timer
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSpeedMenu(false);
      }
    }, 3500);
  };

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(console.error);
    }
  }, [isPlaying]);

  // Skip time (-10s / +10s)
  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  };

  // Volume & Mute
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  // Playback Rate
  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  // Picture in Picture
  const togglePiP = async () => {
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
  };

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

  // Select another episode
  const handleSelectEpisode = (ep: EpisodeInfo) => {
    setCurrentEpisode(ep);
    setShowEpisodeDrawer(false);
    setCurrentTime(0);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
    }
  };

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if active element is input or textarea
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
          setVolume((v) => {
            const nv = Math.min(1, v + 0.1);
            if (videoRef.current) videoRef.current.volume = nv;
            return nv;
          });
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume((v) => {
            const nv = Math.max(0, v - 0.1);
            if (videoRef.current) videoRef.current.volume = nv;
            return nv;
          });
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, duration]);

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
      className={`relative w-full overflow-hidden bg-black text-white select-none transition-all duration-300 font-sans shadow-2xl ${
        isFullscreen ? 'fixed inset-0 z-[99999] h-screen w-screen rounded-none' : 'aspect-video rounded-2xl border border-white/10'
      }`}
    >
      {/* MEDIA PLAYER (VIDEO / AUDIO) */}
      {srcUrl ? (
        <video
          ref={videoRef}
          src={srcUrl}
          poster={currentEpisode.image}
          playsInline
          className={`h-full w-full object-contain transition-opacity duration-500 ${
            isVideo ? 'opacity-100' : 'opacity-20 blur-sm'
          }`}
          onClick={togglePlay}
          onPlay={() => {
            setIsPlaying(true);
            setIsBuffering(false);
          }}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
              if (videoRef.current.buffered.length > 0) {
                setBufferedEnd(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
              }
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
              if (initialProgress > 0) {
                videoRef.current.currentTime = initialProgress;
              }
            }
          }}
          onEnded={() => setIsPlaying(false)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-zinc-400">
          <p>No hay contenido multimedia disponible para este episodio.</p>
        </div>
      )}

      {/* AUDIO COVER VISUALIZER (WHEN IN AUDIO MODE OR NO VIDEO) */}
      {(!isVideo || mediaMode === 'audio') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-10">
          <div className="relative group">
            <img
              src={currentEpisode.image || '/logo.webp'}
              alt={currentEpisode.title}
              className={`w-44 h-44 md:w-56 md:h-56 rounded-2xl shadow-2xl object-cover border border-white/10 transition-transform duration-700 ${
                isPlaying ? 'scale-105 shadow-red-900/30' : 'scale-95 opacity-80'
              }`}
            />
            {isPlaying && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-end gap-1 h-6 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                <span className="w-1 bg-red-600 animate-bounce h-4 rounded-full" style={{ animationDelay: '0ms' }} />
                <span className="w-1 bg-red-600 animate-bounce h-5 rounded-full" style={{ animationDelay: '150ms' }} />
                <span className="w-1 bg-red-600 animate-bounce h-3 rounded-full" style={{ animationDelay: '300ms' }} />
                <span className="w-1 bg-red-600 animate-bounce h-6 rounded-full" style={{ animationDelay: '450ms' }} />
              </div>
            )}
          </div>
          <h3 className="mt-6 text-xl md:text-2xl font-bold text-white text-center max-w-lg line-clamp-1">
            {currentEpisode.title}
          </h3>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            {currentEpisode.season && `Temporada ${currentEpisode.season} · `}
            {currentEpisode.episode && `Episodio ${currentEpisode.episode}`}
          </p>
        </div>
      )}

      {/* BUFFERING SPINNER */}
      {isBuffering && isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none backdrop-blur-[2px]">
          <div className="w-14 h-14 border-4 border-red-600 border-t-transparent rounded-full animate-spin shadow-lg" />
        </div>
      )}

      {/* NETFLIX OVERLAY CONTROLS */}
      <div
        className={`absolute inset-0 flex flex-col justify-between p-4 md:p-6 transition-opacity duration-300 z-30 bg-gradient-to-t from-black/90 via-black/30 to-black/80 ${
          showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* TOP BAR */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 md:gap-4">
            <span className="bg-red-600 font-extrabold text-white text-xs md:text-sm px-2.5 py-1 rounded tracking-wider shadow-md">
              VFM
            </span>
            <div>
              <h2 className="text-sm md:text-lg font-bold text-white line-clamp-1">{currentEpisode.title}</h2>
              <p className="text-xs text-zinc-400">
                {currentEpisode.season && `T${currentEpisode.season}:E${currentEpisode.episode} · `}
                {currentEpisode.author}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio / Video Switcher (If video available) */}
            {currentEpisode.videoUrl && (
              <div className="flex items-center bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-lg p-1 text-xs">
                <button
                  onClick={() => setMediaMode('video')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    mediaMode === 'video' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Vídeo
                </button>
                <button
                  onClick={() => setMediaMode('audio')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    mediaMode === 'audio' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Solo Audio
                </button>
              </div>
            )}

            <span className="hidden sm:inline-block border border-zinc-700 bg-zinc-900/80 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded">
              HD 1080p
            </span>
          </div>
        </div>

        {/* CENTER BIG BUTTONS */}
        <div className="flex items-center justify-center gap-8 md:gap-14 my-auto">
          {/* Skip -10s */}
          <button
            onClick={() => skipTime(-10)}
            aria-label="Retroceder 10 segundos"
            className="group p-3 rounded-full bg-black/40 hover:bg-white/20 border border-white/10 backdrop-blur-md transition-all transform hover:scale-110 active:scale-95"
          >
            <svg className="w-6 h-6 md:w-8 md:h-8 fill-white" viewBox="0 0 24 24">
              <path d="M12.5 3C17.19 3 21 6.81 21 11.5C21 16.19 17.19 20 12.5 20C8.71 20 5.5 17.5 4.47 14H6.62C7.54 16.36 9.83 18 12.5 18C16.09 18 19 15.09 19 11.5C19 7.91 16.09 5 12.5 5C10.38 5 8.48 6.02 7.28 7.6L10 10.33H3V3.33L5.8 6.13C7.39 4.21 9.8 3 12.5 3Z" />
              <text x="10" y="15.5" fontSize="7" fontWeight="bold" textAnchor="middle" fill="white">
                10
              </text>
            </svg>
          </button>

          {/* Big Play / Pause */}
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            className="p-5 md:p-6 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-900/40 transition-all transform hover:scale-110 active:scale-95"
          >
            {isPlaying ? (
              <svg className="w-8 h-8 md:w-10 md:h-10 fill-current" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 md:w-10 md:h-10 fill-current ml-1" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Skip +10s */}
          <button
            onClick={() => skipTime(10)}
            aria-label="Adelantar 10 segundos"
            className="group p-3 rounded-full bg-black/40 hover:bg-white/20 border border-white/10 backdrop-blur-md transition-all transform hover:scale-110 active:scale-95"
          >
            <svg className="w-6 h-6 md:w-8 md:h-8 fill-white" viewBox="0 0 24 24">
              <path d="M11.5 3C6.81 3 3 6.81 3 11.5C3 16.19 6.81 20 11.5 20C15.29 20 18.5 17.5 19.53 14H17.38C16.46 16.36 14.17 18 11.5 18C7.91 18 5 15.09 5 11.5C5 7.91 7.91 5 11.5 5C13.62 5 15.52 6.02 16.72 7.6L14 10.33H21V3.33L18.2 6.13C16.61 4.21 14.2 3 11.5 3Z" />
              <text x="14" y="15.5" fontSize="7" fontWeight="bold" textAnchor="middle" fill="white">
                10
              </text>
            </svg>
          </button>
        </div>

        {/* BOTTOM CONTROLS & TIMELINE */}
        <div className="w-full flex flex-col gap-2">
          {/* PROGRESS BAR */}
          <div className="relative group cursor-pointer py-2" onClick={handleSeek} onMouseMove={handleProgressBarMouseMove} onMouseLeave={handleProgressBarMouseLeave}>
            <div ref={progressBarRef} className="relative w-full h-1.5 group-hover:h-2.5 bg-zinc-800 rounded-full overflow-hidden transition-all">
              {/* Buffered Progress */}
              <div
                className="absolute top-0 bottom-0 bg-zinc-600/60 rounded-full transition-all"
                style={{ width: `${duration ? (bufferedEnd / duration) * 100 : 0}%` }}
              />
              {/* Played Progress */}
              <div
                className="absolute top-0 bottom-0 bg-red-600 rounded-full transition-all"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>

            {/* Seek Dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform pointer-events-none"
              style={{ left: `calc(${duration ? (currentTime / duration) * 100 : 0}% - 8px)` }}
            />

            {/* Hover Tooltip */}
            {hoverTime !== null && (
              <div
                className="absolute -top-9 -translate-x-1/2 px-2 py-1 bg-zinc-900/90 text-white text-xs font-mono rounded shadow border border-white/10 pointer-events-none"
                style={{ left: `${hoverPosition}px` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          {/* BOTTOM BUTTONS ROW */}
          <div className="flex items-center justify-between w-full pt-1">
            {/* Left Controls */}
            <div className="flex items-center gap-3 md:gap-5">
              <button onClick={togglePlay} className="text-white hover:text-red-500 transition-colors">
                {isPlaying ? (
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2 group/vol">
                <button onClick={toggleMute} className="text-zinc-300 hover:text-white transition-colors">
                  {isMuted || volume === 0 ? (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 md:w-20 h-1 bg-zinc-700 accent-red-600 rounded-lg cursor-pointer"
                />
              </div>

              {/* Time Display */}
              <span className="text-xs font-mono text-zinc-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3 md:gap-4">
              {/* Playback Speed Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="text-xs font-bold text-zinc-300 hover:text-white px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition"
                >
                  {playbackRate}x
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-10 right-0 bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl p-1 flex flex-col gap-1 z-50">
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changeSpeed(rate)}
                        className={`text-xs px-3 py-1.5 text-left rounded-md transition ${
                          playbackRate === rate ? 'bg-red-600 text-white font-bold' : 'text-zinc-300 hover:bg-white/10'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Episodes Drawer Button */}
              {episodesList.length > 0 && (
                <button
                  onClick={() => setShowEpisodeDrawer(true)}
                  className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white px-2.5 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
                  </svg>
                  <span className="hidden sm:inline">Episodios</span>
                </button>
              )}

              {/* Picture-in-Picture */}
              <button onClick={togglePiP} className="text-zinc-300 hover:text-white transition-colors" title="Picture in Picture">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z" />
                </svg>
              </button>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="text-zinc-300 hover:text-white transition-colors">
                {isFullscreen ? (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* EPISODE SELECTOR SLIDE-OUT DRAWER */}
      {showEpisodeDrawer && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col p-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 rounded-full" />
              Episodios disponibles
            </h3>
            <button
              onClick={() => setShowEpisodeDrawer(false)}
              className="p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {episodesList.map((ep) => {
              const isCurrent = ep.slug === currentEpisode.slug;
              return (
                <div
                  key={ep.slug}
                  onClick={() => handleSelectEpisode(ep)}
                  className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border ${
                    isCurrent
                      ? 'bg-red-950/40 border-red-600/50 shadow-md'
                      : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800/80 hover:border-white/10'
                  }`}
                >
                  <img
                    src={ep.image || '/logo.webp'}
                    alt={ep.title}
                    className="w-20 h-14 object-cover rounded-lg shadow-sm border border-white/10 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-semibold truncate ${isCurrent ? 'text-red-500' : 'text-white'}`}>
                      {ep.title}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {ep.season && `T${ep.season}:E${ep.episode} · `}
                      {ep.duration || 'Veredillas FM'}
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                      Reproduciendo
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetflixPlayer;
