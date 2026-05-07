import * as htmlToImage from 'html-to-image';

// ── Render charts ──────────────────────────────────────────
function renderCharts() {
    const cd = (window as any).__wrappedData__ || {};
    const CHART_H = 60;

    const hourBarsEl = document.getElementById('hour-bars');
    if (hourBarsEl && cd.hourCounts?.length) {
        const maxH = Math.max(...cd.hourCounts.map((h: any) => h.count), 1);
        hourBarsEl.innerHTML = cd.hourCounts.map((h: any) => {
            const px = Math.max(4, Math.round((h.count / maxH) * CHART_H));
            const isActive = h.count === maxH;
            const bg = isActive ? '#a78bfa' : 'rgba(255,255,255,0.25)';
            return `<div style="height:${px}px;background:${bg};flex:1;border-radius:3px 3px 0 0;cursor:pointer;transition:background .3s;min-height:4px;" title="${h.hour}:00 - ${h.count} sesiones"></div>`;
        }).join('');
    }

    const monthBarsEl = document.getElementById('month-bars');
    if (monthBarsEl && cd.monthCounts?.length) {
        const maxM = Math.max(...cd.monthCounts, 1);
        const labels = ['Sep','Oct','Nov','Dic','Ene','Feb','Mar','Abr','May','Jun'];
        monthBarsEl.innerHTML = cd.monthCounts.map((c: number, i: number) => {
            const px = Math.max(4, Math.round((c / maxM) * CHART_H));
            const isActive = c === maxM;
            const bg = isActive ? '#22d3ee' : 'rgba(255,255,255,0.25)';
            return `<div style="height:${px}px;background:${bg};flex:1;border-radius:3px 3px 0 0;cursor:pointer;transition:background .3s;min-height:4px;" title="${labels[i] || ''}: ${c} sesiones"></div>`;
        }).join('');
    }
}

// ── Entry screen ─────────────────────────────────────────
let entryDismissed = false;

function initEntry() {
    const entry = document.getElementById('wrapped-entry');
    const startBtn = document.getElementById('wrapped-start-btn');
    const wrappedExp = document.getElementById('wrapped-experience');
    const stationModal = document.getElementById('station-modal');

    if (!entry || !startBtn) {
        // No entry screen, start immediately
        entryDismissed = true;
        return;
    }

    startBtn.addEventListener('click', () => {
        entry.classList.add('hidden');
        if (wrappedExp) wrappedExp.style.display = 'flex';
        // Show station modal after a small delay
        setTimeout(() => {
            if (stationModal) stationModal.classList.add('visible');
        }, 600);
        setTimeout(() => entry.remove(), 700);
        entryDismissed = true;
        // Now trigger slides to start
        document.dispatchEvent(new CustomEvent('wrapped-start'));
    });
}

// ── Music player ─────────────────────────────────────────
function initMusic() {
    const audio = document.getElementById('bg-audio') as HTMLAudioElement;
    const musicBar = document.getElementById('music-bar');
    const musicToggleBtn = document.getElementById('music-toggle-btn');
    const musicPlayIcon = document.getElementById('music-play-icon');
    const musicPauseIcon = document.getElementById('music-pause-icon');
    const musicVolumeSlider = document.getElementById('music-volume') as HTMLInputElement;
    const musicCloseBtn = document.getElementById('music-close-btn');
    const musicOpenBtn = document.getElementById('music-open-btn');
    const stationModal = document.getElementById('station-modal');
    const musicTitle = document.getElementById('music-title');
    const musicSubtitle = document.getElementById('music-subtitle');
    const stationGrid = document.getElementById('station-grid');

    let hlsMusic: any = null;

    function stopMusic() {
        if (audio) { audio.pause(); audio.src = ''; }
        if (hlsMusic) { hlsMusic.destroy(); hlsMusic = null; }
        if (musicBar) musicBar.classList.add('hidden');
        if (musicPlayIcon) musicPlayIcon.style.display = 'block';
        if (musicPauseIcon) musicPauseIcon.style.display = 'none';
    }

    async function playStation(stream: string, name: string, type: string, desc: string) {
        if (!stream) { stopMusic(); return; }
        if (musicTitle) musicTitle.textContent = name;
        if (musicSubtitle) musicSubtitle.textContent = desc;
        if (musicBar) musicBar.classList.remove('hidden');
        stopMusic();

        if (type === 'hls') {
            try {
                const { default: Hls } = await import('hls.js');
                if (Hls.isSupported()) {
                    hlsMusic = new Hls({ debug: false });
                    hlsMusic.loadSource(stream);
                    hlsMusic.attachMedia(audio);
                    hlsMusic.on(Hls.Events.MANIFEST_PARSED, () => {
                        audio.volume = parseFloat(musicVolumeSlider?.value || '0.4');
                        audio.play().catch(() => {});
                    });
                } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
                    audio.src = stream;
                    audio.volume = parseFloat(musicVolumeSlider?.value || '0.4');
                    audio.play().catch(() => {});
                }
            } catch {
                audio.src = stream;
                audio.volume = parseFloat(musicVolumeSlider?.value || '0.4');
                audio.play().catch(() => {});
            }
        } else {
            audio.src = stream;
            audio.volume = parseFloat(musicVolumeSlider?.value || '0.4');
            audio.play().catch(() => {});
        }
        if (musicPlayIcon) musicPlayIcon.style.display = 'none';
        if (musicPauseIcon) musicPauseIcon.style.display = 'block';
    }

    musicToggleBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (audio?.paused) {
            audio.play().catch(() => {});
            if (musicPlayIcon) musicPlayIcon.style.display = 'none';
            if (musicPauseIcon) musicPauseIcon.style.display = 'block';
        } else {
            audio?.pause();
            if (musicPlayIcon) musicPlayIcon.style.display = 'block';
            if (musicPauseIcon) musicPauseIcon.style.display = 'none';
        }
    });

    musicVolumeSlider?.addEventListener('input', (e) => {
        e.stopPropagation();
        if (audio) audio.volume = parseFloat((e.target as HTMLInputElement).value);
    });

    musicCloseBtn?.addEventListener('click', (e) => { e.stopPropagation(); stopMusic(); });

    musicOpenBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (stationModal) stationModal.classList.toggle('visible');
    });

    stationGrid?.querySelectorAll('.station-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            const stream = card.getAttribute('data-stream') || '';
            const name = card.getAttribute('data-name') || '';
            const type = card.getAttribute('data-type') || 'direct';
            const desc = card.getAttribute('data-desc') || '';
            stationGrid.querySelectorAll('.station-card').forEach(c => c.classList.remove('active-station'));
            if (stream) card.classList.add('active-station');
            if (stationModal) stationModal.classList.remove('visible');
            playStation(stream, name, type, desc);
        });
    });

    stationModal?.addEventListener('click', (e) => {
        if (e.target === stationModal) stationModal.classList.remove('visible');
    });
}

// ── Slides engine ────────────────────────────────────────
function initSlides() {
    const slides = document.querySelectorAll('.story-slide');
    const progressFills = document.querySelectorAll('.fill');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    let currentSlide = 0;
    const totalSlides = slides.length;
    const SLIDE_DURATION = 7000;
    let slideTimer: any = null;
    let isPaused = false;
    let remainingTime = SLIDE_DURATION;
    let holdTimer: any = null;

    function resetAnimations(slide: Element) {
        const animated = slide.querySelectorAll('.slide-pop, .slide-fade, .slide-fade-up, .slide-title');
        animated.forEach(el => {
            (el as HTMLElement).style.animation = 'none';
            (el as HTMLElement).offsetHeight;
            (el as HTMLElement).style.animation = '';
        });
    }

    function showSlide(index: number) {
        slides.forEach((slide, i) => {
            slide.classList.remove('active');
            if (i === index) {
                slide.classList.add('active');
                resetAnimations(slide);
            }
        });

        if (index === totalSlides - 1) {
            if (nextBtn) nextBtn.style.display = 'none';
            if (prevBtn) prevBtn.style.width = '15%';
        } else {
            if (nextBtn) nextBtn.style.display = 'block';
            if (prevBtn) prevBtn.style.width = '33.333%';
        }

        progressFills.forEach((fill, i) => {
            (fill as HTMLElement).style.transition = 'none';
            if (i < index) {
                (fill as HTMLElement).style.width = '100%';
            } else if (i === index) {
                (fill as HTMLElement).style.width = '0%';
                setTimeout(() => {
                    (fill as HTMLElement).style.transition = `width ${SLIDE_DURATION}ms linear`;
                    (fill as HTMLElement).style.width = '100%';
                }, 50);
            } else {
                (fill as HTMLElement).style.width = '0%';
            }
        });

        clearTimeout(slideTimer);
        remainingTime = SLIDE_DURATION;
        startTimer();
    }

    function startTimer() {
        if (isPaused) return;
        slideTimer = setTimeout(() => nextSlide(), remainingTime);
    }

    function nextSlide() {
        isPaused = false;
        if (currentSlide < totalSlides - 1) {
            currentSlide++;
            showSlide(currentSlide);
        } else {
            const lastFill = progressFills[currentSlide] as HTMLElement;
            if (lastFill) lastFill.style.width = '100%';
        }
    }

    function prevSlide() {
        isPaused = false;
        if (currentSlide > 0) currentSlide--;
        showSlide(currentSlide);
    }

    function doPause() {
        if (isPaused) return;
        isPaused = true;
        clearTimeout(slideTimer);
        const fill = progressFills[currentSlide] as HTMLElement;
        if (fill) {
            const comp = window.getComputedStyle(fill).width;
            fill.style.transition = 'none';
            fill.style.width = comp;
            const parent = fill.parentElement;
            if (parent) {
                const pct = parseFloat(comp) / parseFloat(window.getComputedStyle(parent).width) || 0;
                remainingTime = SLIDE_DURATION * (1 - pct);
            }
        }
    }

    function doResume() {
        clearTimeout(holdTimer);
        if (!isPaused) return;
        isPaused = false;
        const fill = progressFills[currentSlide] as HTMLElement;
        if (fill) {
            fill.style.transition = `width ${remainingTime}ms linear`;
            fill.style.width = '100%';
        }
        startTimer();
    }

    prevBtn?.addEventListener('click', (e) => { e.stopPropagation(); clearTimeout(holdTimer); isPaused = false; prevSlide(); });
    nextBtn?.addEventListener('click', (e) => { e.stopPropagation(); clearTimeout(holdTimer); isPaused = false; nextSlide(); });

    [prevBtn, nextBtn].forEach(el => {
        el?.addEventListener('mousedown', () => { holdTimer = setTimeout(doPause, 200); });
        el?.addEventListener('mouseup', () => doResume());
        el?.addEventListener('mouseleave', () => doResume());
        el?.addEventListener('touchstart', () => { holdTimer = setTimeout(doPause, 200); }, { passive: true });
        el?.addEventListener('touchend', () => doResume());
    });

    // Keyboard nav
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextSlide(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); prevSlide(); }
    });

    // Wait for entry to be dismissed before starting slides
    if (entryDismissed) {
        setTimeout(() => showSlide(0), 100);
    } else {
        document.addEventListener('wrapped-start', () => {
            setTimeout(() => showSlide(0), 300);
        }, { once: true });
    }

    // ── Download logic ─────────────────────────────────────
    const downloadBtns = document.querySelectorAll('.download-btn');
    const container = document.querySelector('.stories-container');

    downloadBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            isPaused = true;
            clearTimeout(slideTimer);

            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<span class="animate-pulse">Generando...</span>';
            (btn as HTMLButtonElement).disabled = true;

            const targetIndex = parseInt(btn.getAttribute('data-download') || '0');
            const targetSlide = slides[targetIndex] as HTMLElement;

            if (!targetSlide) {
                btn.innerHTML = originalHTML;
                (btn as HTMLButtonElement).disabled = false;
                isPaused = false; startTimer(); return;
            }

            const oldRadius = (container as HTMLElement)?.style.borderRadius || '';
            if (container) (container as HTMLElement).style.borderRadius = '0';

            targetSlide.classList.add('capture-override');
            targetSlide.style.cssText += '; opacity: 1 !important; visibility: visible !important; z-index: 999 !important;';

            const wm = document.createElement('div');
            wm.className = 'absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-60 z-[100] capture-watermark';
            wm.innerHTML = `<img src="/logo.webp" class="w-5 h-5 object-contain" crossorigin="anonymous" /><span style="color:white;font-family:sans-serif;font-size:11px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;">VEREDILLAS FM</span>`;
            targetSlide.appendChild(wm);

            const progress = document.querySelector('.story-progress') as HTMLElement;
            if (progress) progress.style.display = 'none';

            try {
                const dataUrl = await htmlToImage.toPng(targetSlide, {
                    quality: 0.95, pixelRatio: 2.5, backgroundColor: '#000000', skipFonts: true,
                    filter: (node: any) => !node?.classList?.contains('download-ui-elements')
                });
                const link = document.createElement('a');
                const wd = (window as any).__wrappedData__ || {};
                const safeLabel = String(wd.academicLabel || wd.year || new Date().getFullYear()).replace('/', '-');
                link.download = `VeredillasFM_Wrapped_${safeLabel}_Slide${targetIndex + 1}.png`;
                link.href = dataUrl;
                link.click();
                btn.innerHTML = '✅ ¡Descargado!';
                setTimeout(() => { btn.innerHTML = originalHTML; (btn as HTMLButtonElement).disabled = false; }, 2000);
            } catch (err) {
                console.error('Error generating image', err);
                btn.innerHTML = '❌ Error';
                setTimeout(() => { btn.innerHTML = originalHTML; (btn as HTMLButtonElement).disabled = false; }, 2000);
            } finally {
                targetSlide.querySelector('.capture-watermark')?.remove();
                if (progress) progress.style.display = '';
                targetSlide.classList.remove('capture-override');
                targetSlide.style.opacity = '';
                targetSlide.style.visibility = '';
                targetSlide.style.zIndex = '';
                if (container) (container as HTMLElement).style.borderRadius = oldRadius;
                isPaused = false; startTimer();
            }
        });
    });
}

// ── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    renderCharts();
    initEntry();
    initMusic();
    initSlides();
});
