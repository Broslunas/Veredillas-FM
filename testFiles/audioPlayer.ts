document.addEventListener("DOMContentLoaded", () => {
  const audioPlayer = document.getElementById("audioPlayer") as HTMLAudioElement;
  const playPauseBtn = document.getElementById("playPauseBtn") as HTMLButtonElement;
  const backwardBtn = document.getElementById("backwardBtn") as HTMLButtonElement;
  const forwardBtn = document.getElementById("forwardBtn") as HTMLButtonElement;
  const iconPlay = document.getElementById("iconPlay") as unknown as SVGElement;
  const iconPause = document.getElementById("iconPause") as unknown as SVGElement;
  const iconLoading = document.getElementById("iconLoading") as unknown as SVGElement;
  const seekBar = document.getElementById("seekBar") as HTMLInputElement;
  const currentTimeEl = document.getElementById("currentTime") as HTMLElement;
  const totalDurationEl = document.getElementById("totalDuration") as HTMLElement;
  const volumeBtn = document.getElementById("volumeBtn") as HTMLButtonElement;
  const iconVolumeHigh = document.getElementById("iconVolumeHigh") as unknown as SVGElement;
  const iconMute = document.getElementById("iconMute") as unknown as SVGElement;
  const volumeBar = document.getElementById("volumeBar") as HTMLInputElement;
  const volumeWarningModal = document.getElementById("volumeWarningModal") as HTMLElement;
  const cancelVolumeBtn = document.getElementById("cancelVolumeBtn") as HTMLButtonElement;
  const confirmVolumeBtn = document.getElementById("confirmVolumeBtn") as HTMLButtonElement;
  const speedBtn = document.getElementById("speedBtn") as HTMLButtonElement;
  const canvas = document.getElementById("audioVisualizer") as HTMLCanvasElement;
  const canvasCtx = canvas ? canvas.getContext("2d") : null;

  // Web Audio API Context
  let audioCtx: AudioContext | null = null;
  let gainNode: GainNode | null = null;
  let source: MediaElementAudioSourceNode | null = null;
  let analyser: AnalyserNode | null = null;
  let animationId: number;
  let isHighVolumeApproved = false;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioContext();
      source = audioCtx.createMediaElementSource(audioPlayer);
      
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;

      gainNode = audioCtx.createGain();
      
      source.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioCtx.destination);
    }
  }

  function drawVisualizer() {
    if (!analyser || !canvasCtx || !canvas) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Gradient for the bars
    const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#60a5fa'); // Blue-400
    gradient.addColorStop(1, '#1e3a8a'); // Blue-900

    const draw = () => {
      if (audioPlayer.paused) {
        cancelAnimationFrame(animationId);
        return;
      }
      animationId = requestAnimationFrame(draw);

      analyser!.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      canvasCtx.fillStyle = gradient;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 1.2; // Scale height (taller bars)
        
        // Draw rounded rect (simplified)
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  }

  function setVolume(value: number) {
    if (value > 1 && !audioCtx) {
      initAudioContext();
    }

    if (audioCtx) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      if (gainNode) gainNode.gain.value = value;
      // When using Web Audio API, the element's volume property is ignored for output,
      // but we keep it at 1 to avoid confusion if it somehow falls back.
      audioPlayer.volume = 1;
    } else {
      audioPlayer.volume = value;
    }

    audioPlayer.muted = value === 0;
    
    // Visual Boost Feedback
    if (value > 1) {
      volumeBar.classList.add("is-boosted");
    } else {
      volumeBar.classList.remove("is-boosted");
    }

    updateVolumeIcon();
    
    // Persistence
    localStorage.setItem("audio-player-volume", value.toString());
    localStorage.setItem("audio-player-muted", audioPlayer.muted.toString());
  }

  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    // Aseguramos que la duración sea finita antes de intentar formatearla
    if (!isFinite(seconds)) return "0:00"; 
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  }

  function updatePlayPauseIcon() {
    // Si está cargando, no mostramos ni play ni pause, el spinner se encarga
    if (iconLoading && !iconLoading.classList.contains("hidden")) return;

    if (audioPlayer.paused) {
      iconPlay.classList.remove("hidden");
      iconPause.classList.add("hidden");
    } else {
      iconPlay.classList.add("hidden");
      iconPause.classList.remove("hidden");
    }
  }

  function updateVolumeIcon() {
    if (audioPlayer.muted || audioPlayer.volume === 0) {
      iconVolumeHigh.classList.add("hidden");
      iconMute.classList.remove("hidden");
    } else {
      iconVolumeHigh.classList.remove("hidden");
      iconMute.classList.add("hidden");
    }
  }
  
  // --- Buffering State ---
  function showLoading() {
    iconPlay.classList.add("hidden");
    iconPause.classList.add("hidden");
    iconLoading.classList.remove("hidden");
  }

  function hideLoading() {
    iconLoading.classList.add("hidden");
    updatePlayPauseIcon();
  }

  audioPlayer.addEventListener("waiting", showLoading);
  audioPlayer.addEventListener("playing", hideLoading);
  audioPlayer.addEventListener("canplay", hideLoading);

  audioPlayer.addEventListener("loadedmetadata", () => {
    totalDurationEl.textContent = formatTime(audioPlayer.duration);
    seekBar.max = audioPlayer.duration.toString();
  });

  let lastSavedTime = -1;
  audioPlayer.addEventListener("timeupdate", () => {
    currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
    if (!isDragging) {
      seekBar.value = audioPlayer.currentTime.toString();
    }
    
    // Persistence: Save position every second
    const currentSecond = Math.floor(audioPlayer.currentTime);
    if (currentSecond !== lastSavedTime) {
      localStorage.setItem(`audio-player-progress-${audioPlayer.src}`, audioPlayer.currentTime.toString());
      lastSavedTime = currentSecond;
    }
  });

  playPauseBtn.addEventListener("click", () => {
    if (audioPlayer.paused) {
      const playPromise = audioPlayer.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("Error al intentar reproducir el audio:", error);
        });
      }
    } else {
      audioPlayer.pause();
    }
  });

  backwardBtn.addEventListener("click", () => {
    audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 15);
  });

  forwardBtn.addEventListener("click", () => {
    audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 15);
  });

  // Manejo de arrastre para la barra de tiempo
  let isDragging = false;
  seekBar.addEventListener("mousedown", () => (isDragging = true));
  seekBar.addEventListener("touchstart", () => (isDragging = true), { passive: true });

  const onSeekEnd = () => {
    isDragging = false;
    audioPlayer.currentTime = parseFloat(seekBar.value); 
  };

  seekBar.addEventListener("mouseup", onSeekEnd);
  seekBar.addEventListener("touchend", onSeekEnd);
  seekBar.addEventListener("touchcancel", onSeekEnd);

  seekBar.addEventListener("input", () => {
    currentTimeEl.textContent = formatTime(parseFloat(seekBar.value));
  });

  volumeBtn.addEventListener("click", () => {
    audioPlayer.muted = !audioPlayer.muted;
    updateVolumeIcon();
    localStorage.setItem("audio-player-muted", audioPlayer.muted.toString());
  });

  volumeBar.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    const value = parseFloat(target.value);

    if (value > 1 && !isHighVolumeApproved) {
      volumeBar.value = "1";
      setVolume(1);
      volumeWarningModal.classList.remove("hidden");
      target.blur(); // Remove focus to stop dragging
      return;
    }

    setVolume(value);
  });

  cancelVolumeBtn.addEventListener("click", () => {
    volumeWarningModal.classList.add("hidden");
  });

  confirmVolumeBtn.addEventListener("click", () => {
    isHighVolumeApproved = true;
    volumeWarningModal.classList.add("hidden");
    // Allow the user to continue dragging or set it manually if they wish
  });

  // --- Speed Control ---
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  let currentSpeedIndex = 2; // Default 1x

  function updateSpeedUI() {
    const speed = speeds[currentSpeedIndex];
    speedBtn.textContent = `${speed}x`;
    audioPlayer.playbackRate = speed;
  }

  speedBtn.addEventListener("click", () => {
    currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
    updateSpeedUI();
    localStorage.setItem("audio-player-speed", speeds[currentSpeedIndex].toString());
  });

  audioPlayer.addEventListener("play", () => {
    updatePlayPauseIcon();
    if (!audioCtx) initAudioContext();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    drawVisualizer();
  });
  audioPlayer.addEventListener("pause", () => {
    updatePlayPauseIcon();
    localStorage.setItem(`audio-player-progress-${audioPlayer.src}`, audioPlayer.currentTime.toString());
  });
  audioPlayer.addEventListener("volumechange", updateVolumeIcon);
  audioPlayer.addEventListener("ended", () => {
    updatePlayPauseIcon();
    seekBar.value = "0";
    currentTimeEl.textContent = "0:00";
    localStorage.removeItem(`audio-player-progress-${audioPlayer.src}`);
  });

  updatePlayPauseIcon();
  updateVolumeIcon();

  // --- Fallback para CORS (R2) ---
  audioPlayer.addEventListener("error", (e) => {
    const error = audioPlayer.error;
    if (error && (error.code === MediaError.MEDIA_ERR_NETWORK || error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED)) {
      if (audioPlayer.hasAttribute("crossorigin")) {
        console.warn("Error de carga con CORS detectado. Desactivando 'Boost' y reintentando reproducción estándar.");
        
        // Eliminamos la restricción que causa el fallo
        audioPlayer.removeAttribute("crossorigin");
        audioPlayer.load();
        
        // Deshabilitamos la UI de boost
        volumeBar.max = "1";
        if (parseFloat(volumeBar.value) > 1) {
          volumeBar.value = "1";
          audioPlayer.volume = 1;
        }
      }
    }
  });

  // --- Persistence Initialization ---
  const savedVolume = localStorage.getItem("audio-player-volume");
  const savedMuted = localStorage.getItem("audio-player-muted");

  if (savedVolume !== null) {
      const vol = parseFloat(savedVolume);
      volumeBar.value = vol.toString();
      // If saved volume > 1, we need to approve it implicitly or reset?
      // Let's reset approval requirement if it was saved, or just require approval again?
      // If we restore > 1, the user likely already approved it before.
      if (vol > 1) isHighVolumeApproved = true;
      setVolume(vol);
  }

  if (savedMuted === "true") {
      audioPlayer.muted = true;
      updateVolumeIcon();
  }

  const savedSpeed = localStorage.getItem("audio-player-speed");
  if (savedSpeed) {
      const speed = parseFloat(savedSpeed);
      const index = speeds.indexOf(speed);
      if (index !== -1) {
          currentSpeedIndex = index;
          updateSpeedUI();
      }
  }

  // --- Position Persistence Restoration ---
  const savedProgress = localStorage.getItem(`audio-player-progress-${audioPlayer.src}`);
  if (savedProgress) {
    const time = parseFloat(savedProgress);
    if (isFinite(time)) {
      audioPlayer.currentTime = time;
      // Update UI immediately
      currentTimeEl.textContent = formatTime(time);
      seekBar.value = time.toString();
    }
  }

  // --- Keyboard Shortcuts ---
  document.addEventListener("keydown", (e) => {
      // Ignore if focus is on an input (like volume slider or seek bar if they were focused)
      // But we want arrow keys to work even if slider is focused? 
      // Standard behavior: if slider is focused, arrows control it natively.
      // If we handle it globally, we might double-trigger or conflict.
      // Let's only handle if activeElement is NOT an input/textarea.
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return;
      
      switch(e.code) {
          case "Space":
              e.preventDefault();
              playPauseBtn.click();
              break;
          case "ArrowLeft":
              e.preventDefault();
              backwardBtn.click();
              break;
          case "ArrowRight":
              e.preventDefault();
              forwardBtn.click();
              break;
          case "ArrowUp":
              e.preventDefault();
              const newVolUp = Math.min(parseFloat(volumeBar.max), parseFloat(volumeBar.value) + 0.1);
              // Check for boost approval
              if (newVolUp > 1 && !isHighVolumeApproved) {
                  volumeWarningModal.classList.remove("hidden");
                  return;
              }
              volumeBar.value = newVolUp.toString();
              setVolume(newVolUp);
              break;
          case "ArrowDown":
              e.preventDefault();
              const newVolDown = Math.max(0, parseFloat(volumeBar.value) - 0.1);
              volumeBar.value = newVolDown.toString();
              setVolume(newVolDown);
              break;
      }
  });

  // --- Theater Mode ---
  const theaterBtn = document.getElementById("theaterBtn") as HTMLButtonElement;
  const iconMaximize = document.getElementById("iconMaximize") as unknown as SVGElement;
  const iconMinimize = document.getElementById("iconMinimize") as unknown as SVGElement;
  const playerContainer = document.querySelector(".custom-audio-player") as HTMLElement;

  async function toggleTheaterMode() {
    const isTheater = playerContainer.classList.contains("theater-mode");

    if (!isTheater) {
      // Enter Theater Mode
      // 1. Apply CSS state immediately (Fallback for iframes/unsupported browsers)
      playerContainer.classList.add("theater-mode");
      iconMaximize.classList.add("hidden");
      iconMinimize.classList.remove("hidden");
      document.body.style.overflow = "hidden";

      // 2. Try API Fullscreen
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) { /* Safari */
          await (document.documentElement as any).webkitRequestFullscreen();
        } else if ((document.documentElement as any).msRequestFullscreen) { /* IE11 */
          await (document.documentElement as any).msRequestFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen API failed (possibly iframe restriction), falling back to CSS mode:", err);
      }
    } else {
      // Exit Theater Mode
      // 1. Try API Exit if we are in fullscreen
      try {
        if (document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement) {
            if (document.exitFullscreen) {
              await document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) { /* Safari */
              await (document as any).webkitExitFullscreen();
            } else if ((document as any).msExitFullscreen) { /* IE11 */
              await (document as any).msExitFullscreen();
            }
        }
      } catch (err) {
        console.warn("Exit Fullscreen failed:", err);
      }

      // 2. Revert CSS state
      playerContainer.classList.remove("theater-mode");
      iconMaximize.classList.remove("hidden");
      iconMinimize.classList.add("hidden");
      document.body.style.overflow = "";
    }

    // Resize visualizer
    resizeVisualizer();
  }

  // Listen for fullscreen change events (e.g., user presses Esc)
  document.addEventListener("fullscreenchange", () => {
    // If we just exited fullscreen (element is null), make sure CSS is reverted
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement && !(document as any).msFullscreenElement) {
      playerContainer.classList.remove("theater-mode");
      iconMaximize.classList.remove("hidden");
      iconMinimize.classList.add("hidden");
      document.body.style.overflow = "";
      resizeVisualizer();
    }
  });

  function resizeVisualizer() {
    if (!canvas) return;
    
    // Give the layout a moment to update
    requestAnimationFrame(() => {
        const rect = canvas.parentElement?.getBoundingClientRect();
        if (rect) {
            canvas.width = rect.width;
            canvas.height = rect.height;
        }
    });
  }

  if (theaterBtn) {
    theaterBtn.addEventListener("click", toggleTheaterMode);
  }
  
  // Resize on window resize
  window.addEventListener("resize", () => {
      if (playerContainer.classList.contains("theater-mode")) {
          resizeVisualizer();
      }
  });
});
