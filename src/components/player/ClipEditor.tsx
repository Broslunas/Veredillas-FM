import React, { useState, useEffect, useRef } from 'react';
import './ClipEditorStyles.css';

interface ClipEditorProps {
    audioUrl: string;
    title: string;
    author: string;
    cover: string;
    duration: number; // Total duration of original
    onClose: () => void;
}

export default function ClipEditor({ audioUrl, title, author, cover, duration: totalDuration, onClose }: ClipEditorProps) {
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Config State
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    
    // Selection State (in seconds)
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(Math.min(30, totalDuration));
    const MAX_CLIP_DURATION = 30;

    const [isPlaying, setIsPlaying] = useState(false);
    const [previewProgress, setPreviewProgress] = useState(0); // 0-100
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');

    // Image State
    const [imageLoaded, setImageLoaded] = useState(false);
    const coverImgRef = useRef<HTMLImageElement | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const animationFrameRef = useRef<number>(0);
    const analyserRef = useRef<AnalyserNode | null>(null);

    // Initialize Audio Context & Load
    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioCtxRef.current = ctx;

                const isExternal = audioUrl.startsWith('http');
                const fetchUrl = isExternal 
                    ? `/api/proxy-audio?url=${encodeURIComponent(audioUrl)}` 
                    : audioUrl;

                const response = await fetch(fetchUrl);
                if (!response.ok) throw new Error('Fetch failed');
                
                const arrayBuffer = await response.arrayBuffer();
                const decoded = await ctx.decodeAudioData(arrayBuffer);
                setAudioBuffer(decoded);
                setIsLoading(false);
                startPreviewVisualizer();
            } catch (err) {
                console.error(err);
                setError("Error al cargar el audio. CORS block or format issue.");
                setIsLoading(false);
            }
        };
        load();

        return () => {
            if (audioCtxRef.current) audioCtxRef.current.close();
            cancelAnimationFrame(animationFrameRef.current);
        };
    }, [audioUrl]);

    const startPreviewVisualizer = () => {};

    // Cache Image
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = cover || '/logo.png';
        img.onload = () => { 
            coverImgRef.current = img; 
            setImageLoaded(true);
        };
        img.onerror = () => {
            if (cover && cover !== '/logo.png') img.src = '/logo.png';
        }
    }, [cover]);

    // Redraw on state changes relative to rendering
    useEffect(() => {
        if(!isLoading && audioBuffer) {
             drawFrame(null, title, author, cover, 0);
        }
    }, [isLoading, audioBuffer, title, author, cover, imageLoaded, aspectRatio]);


    // --- TIME CONTROLS ---
    const handleStartTimeChange = (val: number) => {
        let newStart = Math.max(0, Math.min(val, totalDuration - 5));
        setStartTime(newStart);
        const currentDur = endTime - newStart;
        if (currentDur > MAX_CLIP_DURATION) setEndTime(newStart + MAX_CLIP_DURATION);
        else if (currentDur < 5) setEndTime(Math.min(newStart + 5, totalDuration));
        else if (endTime <= newStart) setEndTime(newStart + 5);
    };

    const handleEndTimeChange = (val: number) => {
        let newEnd = Math.max(0, Math.min(val, totalDuration));
        setEndTime(newEnd);
        const currentDur = newEnd - startTime;
        if (currentDur > MAX_CLIP_DURATION) setStartTime(newEnd - MAX_CLIP_DURATION);
        else if (currentDur < 5 && newEnd > 5) setStartTime(newEnd - 5);
    };
    
    const shiftWindow = (seconds: number) => {
        const dur = endTime - startTime;
        let newStart = startTime + seconds;
        let newEnd = endTime + seconds;
        if (newStart < 0) { newStart = 0; newEnd = dur; }
        if (newEnd > totalDuration) { newEnd = totalDuration; newStart = totalDuration - dur; }
        setStartTime(newStart);
        setEndTime(newEnd);
    };

    // --- PLAYBACK ---
    const stopPreview = () => {
        if(sourceNodeRef.current) {
            try { sourceNodeRef.current.stop(); } catch(e){}
            sourceNodeRef.current = null;
        }
        setIsPlaying(false);
        setPreviewProgress(0);
        cancelAnimationFrame(animationFrameRef.current);
        drawFrame(null, title, author, cover, 0);
    };

    const playPreview = () => {
        if(!audioBuffer || !audioCtxRef.current) return;
        stopPreview();

        const ctx = audioCtxRef.current;
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        analyserRef.current = analyser;

        const duration = endTime - startTime;
        source.start(0, startTime, duration);
        sourceNodeRef.current = source;
        setIsPlaying(true);
        
        const startTs = ctx.currentTime;
        const tick = () => {
            const current = ctx.currentTime - startTs;
            const p = Math.min(current / duration, 1) * 100;
            setPreviewProgress(p);
            drawFrame(analyser, title, author, cover, p/100);

            if (current < duration) { 
                animationFrameRef.current = requestAnimationFrame(tick);
            } else {
                setIsPlaying(false);
                setPreviewProgress(100);
                drawFrame(null, title, author, cover, 1);
            }
        };
        animationFrameRef.current = requestAnimationFrame(tick);

        source.onended = () => {
            setIsPlaying(false);
            setPreviewProgress(0); 
        };
    };
    
    // --- DRAWING LOGIC ---
    const drawFrame = (analyser: AnalyserNode | null | undefined, title: string, author: string, coverUrl: string, progress: number) => {
        const canvas = canvasRef.current;
        if(!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if(!ctx) return;
        
        // Dynamic Dimensions
        const W = aspectRatio === '16:9' ? 1920 : 1080;
        const H = aspectRatio === '16:9' ? 1080 : 1920;

        if(canvas.width !== W || canvas.height !== H) { 
            canvas.width = W; 
            canvas.height = H; 
        }

        const isPortrait = aspectRatio === '9:16';
        const cx = W / 2;
        const cy = H / 2;

        // 1. Background (Blurred Cover)
        ctx.fillStyle = '#000';
        ctx.fillRect(0,0,W,H); // Reset

        if (coverImgRef.current && (coverImgRef.current.complete || imageLoaded)) {
            // Draw huge blurred background
            ctx.save();
            ctx.filter = 'blur(40px) brightness(0.4)';
            // Draw image to cover canvas while maintaining aspect ratio
            const img = coverImgRef.current;
            const scale = Math.max(W / img.width, H / img.height);
            const x = (W / 2) - (img.width / 2) * scale;
            const y = (H / 2) - (img.height / 2) * scale;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            ctx.restore();
        } else {
            // Gradient fallback
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, '#09090b');
            grad.addColorStop(1, '#000000');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
        }

        // 2. Main "Banner" Image (Clean)
        // We want to show the full banner if possible, or a nice cut.
        // "Quiero que sea la imagen de banner" implies seeing the image.
        
        if (coverImgRef.current && (coverImgRef.current.complete || imageLoaded)) {
            const img = coverImgRef.current;
            
            // Calculate dimensions to fit nicely within a safe area
            // 16:9 -> Max width 80%?
            // 9:16 -> Max width 90%?
            
            let targetW, targetH;
            
            if (isPortrait) {
                // In portrait, we usually fit width
                targetW = W * 0.85;
                const ratio = img.height / img.width;
                targetH = targetW * ratio;
                // Cap height if extremely tall
                if(targetH > H * 0.5) {
                    targetH = H * 0.5;
                    targetW = targetH / ratio;
                }
            } else {
                // In landscape, we fit height somewhat, or width
                // If it's a wide banner, fit width
                targetW = W * 0.7; // 70% width
                const ratio = img.height / img.width;
                targetH = targetW * ratio;
                // Cap height
                if(targetH > H * 0.5) {
                    targetH = H * 0.5;
                    targetW = targetH / ratio;
                }
            }

            const imgX = cx - targetW/2;
            const imgY = cy - targetH/2 - (isPortrait ? 100 : 50); // Shift up slightly for text space

            // Shadow
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 50;
            ctx.shadowOffsetY = 20;
            
            // Draw rounded image
            ctx.beginPath();
            ctx.roundRect(imgX, imgY, targetW, targetH, 24);
            ctx.fillStyle = '#000';
            ctx.fill(); // fill for shadow
            ctx.clip();
            ctx.drawImage(img, imgX, imgY, targetW, targetH);
            ctx.restore();
        }

        // 3. Text Info
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;

        const textBaseY = cy + (isPortrait ? 250 : 200);

        // Title
        const titleSize = isPortrait ? 60 : 70;
        ctx.font = `bold ${titleSize}px "Outfit", sans-serif`;
        
        let displayTitle = title;
        const maxTextW = W * 0.8;
        if (ctx.measureText(displayTitle).width > maxTextW) {
             // Basic ellpsis logic could be better (word wrap) but kept simple
             while(ctx.measureText(displayTitle + '...').width > maxTextW && displayTitle.length > 0) {
                 displayTitle = displayTitle.slice(0, -1);
             }
             displayTitle += '...';
        }
        ctx.fillText(displayTitle, cx, textBaseY);
        
        // Author
        const authorSize = isPortrait ? 36 : 40;
        ctx.font = `500 ${authorSize}px "Outfit", sans-serif`;
        ctx.fillStyle = '#d4d4d8';
        ctx.fillText(author, cx, textBaseY + titleSize + 10);

        // 4. Visualizer
        if (analyser) {
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);
            
            const bars = isPortrait ? 30 : 50; 
            const barWidth = isPortrait ? 16 : 14;
            const gap = 8;
            const totalVisWidth = bars * (barWidth + gap);
            const startX = (W - totalVisWidth) / 2;
            const baselineY = H - (isPortrait ? 200 : 100);
            
            ctx.fillStyle = 'white';
            ctx.shadowColor = '#8b5cf6';
            ctx.shadowBlur = 20;
            
            // Bass-heavy mapping
            const binSize = Math.floor(bufferLength * 0.7 / bars);

            for(let i=0; i<bars; i++) {
                let sum = 0;
                for(let j=0; j<binSize; j++) {
                    sum += dataArray[Math.floor(i*binSize) + j] || 0;
                }
                const val = sum / binSize;
                
                const p = Math.pow(val / 255, 1.5);
                const h = Math.max(6, p * (isPortrait ? 250 : 200));
                
                const x = startX + i * (barWidth + gap);
                
                ctx.beginPath();
                ctx.roundRect(x, baselineY - h, barWidth, h, 6);
                ctx.fill();
            }
        }

        // 5. Progress Line 
        if (progress > 0 && progress <= 1) {
             ctx.fillStyle = '#8b5cf6';
             ctx.fillRect(0, H - 16, W * progress, 16);
        }
        
        // 6. Watermark
        ctx.font = 'bold 28px "Outfit", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.textAlign = 'right';
        ctx.shadowBlur = 0;
        ctx.fillText('veredillasfm.es', W - 40, 50);
    };

    // GENERATE VIDEO
    const generateVideo = async () => {
        if(!audioBuffer || !audioCtxRef.current) return;
        stopPreview();
        setIsProcessing(true);
        setProcessingStatus('Iniciando render...');
        
        const canvas = canvasRef.current;
        if(!canvas) return;
        
        const ctx = audioCtxRef.current;
        const dest = ctx.createMediaStreamDestination();
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(dest);
        
        const monitorGain = ctx.createGain();
        monitorGain.gain.value = 0.01; 
        source.connect(monitorGain);
        monitorGain.connect(ctx.destination); 
        
        const canvasStream = canvas.captureStream(60);
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...dest.stream.getAudioTracks()
        ]);
        
        const options: any = {
             videoBitsPerSecond: 12000000, // 12 Mbps for high quality
             mimeType: 'video/webm;codecs=vp9'
        };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
             options.mimeType = 'video/webm';
        }

        const recorder = new MediaRecorder(combinedStream, options);
        
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        
        recorder.onstop = () => {
             const blob = new Blob(chunks, { type: 'video/webm' });
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.href = url;
             a.download = `clip-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${aspectRatio.replace(':','x')}.webm`;
             a.click();
             setIsProcessing(false);
             drawFrame(null, title, author, cover, 0);
        };
        
        const duration = endTime - startTime;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser); 
        
        recorder.start();
        source.start(0, startTime, duration);
        
        const startTimeTs = Date.now();
        const drawRec = () => {
             if(recorder.state === 'inactive') return;
             const elapsed = (Date.now() - startTimeTs) / 1000;
             const p = Math.min(elapsed / duration, 1);
             setProcessingStatus(`Generando Video... ${Math.round(p*100)}%`);
             drawFrame(analyser, title, author, cover, p);
             requestAnimationFrame(drawRec);
        }
        drawRec();
        
        source.onended = () => setTimeout(() => recorder.stop(), 200);
    };

    if (isLoading) return <div className="loading-overlay"><div className="spinner-lg"></div><p className="loading-text">Cargando...</p></div>;
    if (error) return <div className="clip-editor-modal p-8 text-center text-red-400">{error}<br/><button onClick={onClose} className="mt-4 px-4 py-2 bg-white/10 rounded">Cerrar</button></div>;

    const clipDuration = endTime - startTime;

    return (
        <div className="clip-editor-modal">
             <div className="clip-editor-header">
                 <div className="clip-title">
                    <h2><span>Video Studio</span> Clip Editor</h2>
                    <p className="clip-subtitle">AUDIO PRE-PROCESSADO (RADIO QUALITY)</p>
                 </div>
                 <button onClick={onClose} className="close-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                 </button>
             </div>
             
             <div className="clip-editor-body">
                 {/* LEFT: Preview Canvas */}
                 <div className="canvas-col">
                      <div 
                          className="canvas-wrapper" 
                          style={{ aspectRatio: aspectRatio === '16:9' ? '16/9' : '9/16', maxHeight: aspectRatio === '9:16' ? '600px' : 'auto' }}
                      >
                           <canvas ref={canvasRef} className="canvas-element" />
                           {!isPlaying && !isProcessing && (
                               <div onClick={playPreview} className="overlay-play">
                                   <div className="play-circle">
                                       <svg className="icon-md" fill="currentColor" viewBox="0 0 24 24" style={{marginLeft: '4px'}}><path d="M8 5v14l11-7z"/></svg>
                                   </div>
                               </div>
                           )}
                           {isProcessing && (
                               <div className="loading-overlay">
                                   <div className="spinner-lg"></div>
                                   <p className="loading-text">{processingStatus}</p>
                               </div>
                           )}
                      </div>
                 </div>
                 
                 {/* RIGHT: Controls */}
                 <div className="controls-col">

                      {/* Format Selection (New) */}
                      <div className="format-selector">
                           <p className="time-label" style={{marginBottom:'8px'}}>FORMATO DE VIDEO</p>
                           <div className="format-options">
                               <button 
                                   className={`format-btn ${aspectRatio === '16:9' ? 'active' : ''}`}
                                   onClick={() => setAspectRatio('16:9')}
                               >
                                   <svg className="icon-sm" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none"><rect x="2" y="5" width="20" height="14" rx="2"/></svg>
                                   16:9 (YouTube)
                               </button>
                               <button 
                                   className={`format-btn ${aspectRatio === '9:16' ? 'active' : ''}`}
                                   onClick={() => setAspectRatio('9:16')}
                               >
                                   <svg className="icon-sm" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none"><rect x="5" y="2" width="14" height="20" rx="2"/></svg>
                                   9:16 (TikTok/Reels)
                               </button>
                           </div>
                      </div>
                      
                      {/* Timeline Editor */}
                      <div className="timeline-box">
                          <div className="timeline-header">
                               <h3 className="timeline-label">EDITOR DE TIEMPO</h3>
                               <div className={`duration-badge ${clipDuration >= 30 ? 'warn' : ''}`}>
                                   {clipDuration.toFixed(1)}s / 30.0s
                               </div>
                          </div>

                          <div className="timeline-content">
                              <div className="time-inputs">
                                  <div className="time-block">
                                      <label className="time-label">Inicio</label>
                                      <div className="time-value">{new Date(startTime * 1000).toISOString().substr(14, 5)}</div>
                                  </div>
                                  <div className="time-divider"></div>
                                  <div className="time-block">
                                      <label className="time-label">Fin</label>
                                      <div className="time-value">{new Date(endTime * 1000).toISOString().substr(14, 5)}</div>
                                  </div>
                              </div>
                              
                              <div className="slider-container">
                                   <div className="slider-track">
                                       <div className="slider-fill" style={{ left: `${(startTime/totalDuration)*100}%`, width: `${((endTime-startTime)/totalDuration)*100}%` }}></div>
                                   </div>
                                   <input type="range" min={0} max={totalDuration} step={0.1} value={startTime} onChange={(e) => handleStartTimeChange(parseFloat(e.target.value))} className="slider-input" />
                                   <input type="range" min={0} max={totalDuration} step={0.1} value={endTime} onChange={(e) => handleEndTimeChange(parseFloat(e.target.value))} className="slider-input" />
                              </div>
                              
                              <div className="fine-controls">
                                  <div className="ctrl-group">
                                      <button onClick={() => handleStartTimeChange(startTime - 1)} className="btn-fine">-1s</button>
                                      <button onClick={() => handleStartTimeChange(startTime + 1)} className="btn-fine">+1s</button>
                                  </div>
                                  <div className="ctrl-group center">
                                      <button onClick={() => shiftWindow(-5)} className="btn-fine">{'<'}</button>
                                      <button onClick={() => shiftWindow(5)} className="btn-fine">{'>'}</button>
                                  </div>
                                  <div className="ctrl-group end">
                                      <button onClick={() => handleEndTimeChange(endTime - 1)} className="btn-fine">-1s</button>
                                      <button onClick={() => handleEndTimeChange(endTime + 1)} className="btn-fine">+1s</button>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="actions-area">
                          <button onClick={isPlaying ? stopPreview : playPreview} disabled={isProcessing} className={`btn-preview ${isPlaying ? 'stop' : 'play'}`}>
                              {isPlaying ? 'DETENER PREVISUALIZACIÓN' : 'PREVISUALIZAR CLIP'}
                          </button>
                          
                          <div className="export-grid">
                               <button onClick={generateVideo} disabled={isProcessing} className="btn-export btn-video" style={{ gridColumn: '1 / -1' }}>
                                   <svg className="icon-md" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                                   Descargar Video ({aspectRatio})
                               </button>
                          </div>
                      </div>
                 </div>
             </div>
        </div>
    );
}
