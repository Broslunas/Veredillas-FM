// src/services/player/audioEngine.ts

// Shared AudioContext to prevent "Max AudioContexts" error
export let globalAudioCtx: AudioContext | null = null;

export const resumeAudioContext = () => {
    if (!globalAudioCtx) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        globalAudioCtx = new AudioContext();
    }
    if (globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
    }
    return globalAudioCtx;
};
    
// ---- AUTO-LOUDNESS NORMALIZATION CONFIG ----
const AUTO_LOUDNESS_TARGET_RMS = 0.20; 
const AUTO_LOUDNESS_MIN_GAIN = 0.5;    
const AUTO_LOUDNESS_MAX_GAIN = 10.0;   
const AUTO_LOUDNESS_SMOOTHING = 0.04;  
const AUTO_LOUDNESS_ANALYSIS_INTERVAL = 150; 

export class AudioEngine {
    private audioElement: HTMLAudioElement;
    private canvas: HTMLCanvasElement;
    private indicatorElement: HTMLElement | null;
    
    private analyser!: AnalyserNode;
    private source!: MediaElementAudioSourceNode;
    private compressor!: DynamicsCompressorNode;
    private gainNode!: GainNode;
    private limiterNode!: DynamicsCompressorNode;
    
    private autoLoudnessTimer: ReturnType<typeof setInterval> | null = null;
    private currentAutoGain = 1.0;
    private animationFrameId: number | null = null;

    constructor(
        audioElement: HTMLAudioElement, 
        canvas: HTMLCanvasElement, 
        indicatorElement: HTMLElement | null
    ) {
        this.audioElement = audioElement;
        this.canvas = canvas;
        this.indicatorElement = indicatorElement;
    }

    public init() {
        if(!globalAudioCtx) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            globalAudioCtx = new AudioContext();
        }

        if (globalAudioCtx.state === 'suspended') {
            globalAudioCtx.resume();
        }

        if (!this.analyser) {
            try {
                this.source = globalAudioCtx.createMediaElementSource(this.audioElement);
                this.compressor = globalAudioCtx.createDynamicsCompressor();
                this.gainNode = globalAudioCtx.createGain();
                this.limiterNode = globalAudioCtx.createDynamicsCompressor();
                this.analyser = globalAudioCtx.createAnalyser();

                this.analyser.fftSize = 2048;
                this.analyser.smoothingTimeConstant = 0.85;
                
                // Audio Graph: Source -> Compressor -> Gain -> Analyser -> Limiter -> Destination
                this.source.connect(this.compressor);
                this.compressor.connect(this.gainNode);
                this.gainNode.connect(this.analyser); 
                this.analyser.connect(this.limiterNode);
                this.limiterNode.connect(globalAudioCtx.destination);
                
                // ALWAYS-ON PODCAST COMPRESSION
                this.compressor.threshold.value = -30;
                this.compressor.knee.value = 20;
                this.compressor.ratio.value = 4;
                this.compressor.attack.value = 0.005;
                this.compressor.release.value = 0.15;
                
                // SAFETY LIMITER (prevents clipping after gain boost)
                this.limiterNode.threshold.value = -1;
                this.limiterNode.knee.value = 0;
                this.limiterNode.ratio.value = 20;
                this.limiterNode.attack.value = 0.001;
                this.limiterNode.release.value = 0.05;
                
                this.gainNode.gain.value = 1.0;
                this.currentAutoGain = 1.0;
                
                this.startAutoLoudness();
                this.startVisualizer();

            } catch(e) {
                console.log("Audio Context Error (CORS?):", e);
            }
        }
    }

    private startAutoLoudness() {
        if (this.autoLoudnessTimer) return;
        
        const rmsBuffer = new Float32Array(this.analyser.fftSize);
        
        this.autoLoudnessTimer = setInterval(() => {
            if (this.audioElement.paused || !this.analyser || !this.gainNode) return;
            
            this.analyser.getFloatTimeDomainData(rmsBuffer);
            
            let sumSquares = 0;
            for (let i = 0; i < rmsBuffer.length; i++) {
                sumSquares += rmsBuffer[i] * rmsBuffer[i];
            }
            const rms = Math.sqrt(sumSquares / rmsBuffer.length);
            
            if (rms < 0.002) return; 
            
            let desiredGain = AUTO_LOUDNESS_TARGET_RMS / rms;
            desiredGain = Math.max(AUTO_LOUDNESS_MIN_GAIN, Math.min(AUTO_LOUDNESS_MAX_GAIN, desiredGain));
            
            this.currentAutoGain = this.currentAutoGain + (desiredGain - this.currentAutoGain) * AUTO_LOUDNESS_SMOOTHING;
            
            this.gainNode.gain.setTargetAtTime(
                this.currentAutoGain,
                globalAudioCtx!.currentTime,
                0.1
            );
            
            this.updateAutoLoudnessIndicator(this.currentAutoGain);
            
        }, AUTO_LOUDNESS_ANALYSIS_INTERVAL);
    }

    public stopAutoLoudness() {
        if (this.autoLoudnessTimer) {
            clearInterval(this.autoLoudnessTimer);
            this.autoLoudnessTimer = null;
        }
    }

    private updateAutoLoudnessIndicator(gain: number) {
        if (!this.indicatorElement) return;
        
        const gainDb = Math.round(20 * Math.log10(gain));
        this.indicatorElement.title = `Normalización automática: ${gainDb > 0 ? '+' : ''}${gainDb} dB`;
        
        const correctionAmount = Math.abs(gain - 1.0);
        const intensity = Math.min(1, correctionAmount / 1.5);
        
        if (gain > 1.3) {
            this.indicatorElement.style.color = `hsl(160, ${60 + intensity * 40}%, ${50 + intensity * 20}%)`;
            this.indicatorElement.style.opacity = `${0.6 + intensity * 0.4}`;
        } else if (gain < 0.8) {
            this.indicatorElement.style.color = `hsl(35, ${60 + intensity * 40}%, ${50 + intensity * 20}%)`;
            this.indicatorElement.style.opacity = `${0.6 + intensity * 0.4}`;
        } else {
            this.indicatorElement.style.color = 'var(--color-text-muted, #888)';
            this.indicatorElement.style.opacity = '0.5';
        }
    }

    private startVisualizer() {
        if (!this.canvas || !this.analyser) return;
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const renderFrame = () => {
            if(this.audioElement.paused) {
                // Keep rendering idle frame safely? No, stop looping. Wait, the loop will restart next time play happens? 
                // Actually the original code just returns here:
                return; 
            }
            this.animationFrameId = requestAnimationFrame(renderFrame);
            
            ctx.clearRect(0,0, this.canvas.width, this.canvas.height);
            this.analyser.getByteFrequencyData(dataArray);

            const glowColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary-glow').trim() || 'rgba(139, 92, 246, 0.8)';
            ctx.fillStyle = glowColor.replace('0.2', '0.8').replace('0.5', '0.9');

            const barCount = 40; 
            const usefulBinCount = Math.floor(bufferLength * 0.6); 
            const step = usefulBinCount / barCount;
            const barWidth = this.canvas.width / barCount;
            const gap = 2;
            
            for(let i=0; i<barCount; i++) {
                const start = Math.floor(i * step);
                const end = Math.floor((i + 1) * step);
                let sum = 0;
                let count = 0;
                for(let j=start; j<end; j++) {
                    sum += dataArray[j];
                    count++;
                }
                const val = count > 0 ? sum / count : 0;
                const percent = Math.pow(val / 255, 1.2); 
                
                let h = percent * this.canvas.height;
                if (h < 2 && val > 0) h = 2; 
                
                const x = i * barWidth;
                const y = this.canvas.height - h;
                
                if(h > 0) {
                    ctx.beginPath();
                    if(ctx.roundRect) {
                        ctx.roundRect(x + gap/2, y, barWidth - gap, h, [4, 4, 0, 0]);
                    } else {
                        ctx.rect(x + gap/2, y, barWidth - gap, h);
                    }
                    ctx.fill();
                }
            }

            // Sync Immersive Visualizer
            const immCanvas = document.getElementById('audio-visualizer') as HTMLCanvasElement;
            const immersiveEl = document.getElementById('immersive-player');
            
            // Calculate average level for reactivity
            let levelSum = 0;
            for(let i=0; i<dataArray.length; i++) levelSum += dataArray[i];
            const avgLevel = (levelSum / dataArray.length) / 255;
            document.dispatchEvent(new CustomEvent('veredillas:audio-level', {
                detail: { level: avgLevel }
            }));

            if(immCanvas && immersiveEl && !immersiveEl.classList.contains('hidden')) {
                const immCtx = immCanvas.getContext('2d');
                if(immCtx) {
                    immCtx.clearRect(0,0, immCanvas.width, immCanvas.height);
                    immCtx.fillStyle = ctx.fillStyle;
                    const immBarWidth = immCanvas.width / barCount;
                    
                    for(let i=0; i<barCount; i++) {
                        const start = Math.floor(i * step);
                        const end = Math.floor((i + 1) * step);
                        let sum = 0, count=0;
                        for(let j=start; j<end; j++) { sum+=dataArray[j]; count++; }
                        const val = count>0 ? sum/count : 0;
                        const percent = Math.pow(val/255, 1.2);
                        const h = percent * immCanvas.height * 0.6;
                        
                        const x = i * immBarWidth;
                        const cy = immCanvas.height / 2;
                        
                        immCtx.beginPath();
                        if(immCtx.roundRect) immCtx.roundRect(x+gap, cy - h/2, immBarWidth-gap*2, h, [4]);
                        else immCtx.rect(x+gap, cy - h/2, immBarWidth-gap*2, h);
                        immCtx.fill();
                    }
                }
            }
        };
        renderFrame();
    }

    public resumeVisualizer() {
        if (!this.audioElement.paused) {
            this.startVisualizer();
        }
    }
}
