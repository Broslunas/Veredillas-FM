import React, { useEffect, useRef, useState } from 'react';
import '../../styles/RemoteStudio.css';

const RemoteStudio = ({ mode = 'guest', roomId: initialRoomId = '' }) => {
  const [roomId, setRoomId] = useState(initialRoomId || '');
  const [peerId, setPeerId] = useState('');
  const [status, setStatus] = useState('disconnected'); // disconnected, connecting, waiting, connected
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [error, setError] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null); // 'local' or 'remote'

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const callRef = useRef(null);
  const localStreamRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize Peer and Local Stream
  useEffect(() => {
    let peerInstance;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }, 
            audio: {
                echoCancellation: true,
                noiseSuppression: true
            } 
        });
        
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          // IMPORTANT: Mute local video element to avoid feedback loop, but stream audio is active
          localVideoRef.current.muted = true;
          localVideoRef.current.volume = 0;
        }

        const peerModule = await import('peerjs');
        const Peer = peerModule.default || peerModule;

        const newPeerId = mode === 'host' ? generateRoomId() : undefined;
        peerInstance = new Peer(newPeerId, {
          debug: 1 // Less verbose
        });
        
        peerRef.current = peerInstance;

        peerInstance.on('open', (id) => {
          setPeerId(id);
          if (mode === 'host') {
            setRoomId(id);
            setStatus('waiting');
          } else if (mode === 'guest' && initialRoomId) {
            connectToHost(initialRoomId, stream);
          }
        });

        // Answer incoming calls
        peerInstance.on('call', (call) => {
          call.answer(stream);
          callRef.current = call;
          handleCall(call);
        });

        peerInstance.on('error', (err) => {
          console.error('Peer error:', err);
          setError(`Connection error: ${err.type}`);
        });

      } catch (err) {
        console.error('Initialization error:', err);
        setError(`Failed to access camera/mic: ${err.message}`);
      }
    };

    init();

    return () => {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      peerInstance?.destroy();
    };
  }, [mode, initialRoomId]);

  const generateRoomId = () => {
    return 'veredillas-' + Math.random().toString(36).substr(2, 6);
  };

  const connectToHost = (hostId, stream) => {
    setStatus('connecting');
    if (!peerRef.current) return;
    const call = peerRef.current.call(hostId, stream);
    callRef.current = call;
    handleCall(call);
  };

  const handleCall = (call) => {
    call.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      setStatus('connected');
    });
    call.on('close', () => {
      setStatus('disconnected');
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    });
  };

  // Actions
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
          audioTracks[0].enabled = !audioTracks[0].enabled;
          setIsMuted(!audioTracks[0].enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
        const videoTracks = localStreamRef.current.getVideoTracks();
        if (videoTracks.length > 0) {
            videoTracks[0].enabled = !videoTracks[0].enabled;
            setIsVideoEnabled(videoTracks[0].enabled);
        }
    }
  };

  const copyInviteLink = () => {
    const origin = window.location.origin;
    const link = `${origin}/studio/remote/${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
        alert('Link copiado al portapapeles: ' + link);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
  };

  const enterFullScreen = (videoType) => {
      setActiveVideo(videoType);
      setIsFullScreen(true);
      if (containerRef.current) {
          if (containerRef.current.requestFullscreen) {
              containerRef.current.requestFullscreen();
          }
      }
  };

  const exitFullScreen = () => {
      setActiveVideo(null);
      setIsFullScreen(false);
      if (document.exitFullscreen) {
          document.exitFullscreen();
      }
  };

  const toggleFullScreen = (videoType) => {
      if (isFullScreen && activeVideo === videoType) {
          exitFullScreen();
      } else {
          enterFullScreen(videoType);
      }
  };

  return (
    <div className="rs-container" ref={containerRef}>
        {/* Header - Hidden in Fullscreen if desired, or auto-hides */}
        <div className="rs-header">
            <h2 className="rs-title">
                Studio Remoto Veredillas
            </h2>
            <div className={`rs-status-badge ${status}`}>
                {status.toUpperCase()}
            </div>
        </div>

        {/* Video Grid */}
        <div className={`rs-video-grid ${isFullScreen ? 'fullscreen-mode' : 'grid-mode'}`}>
            
            {/* Local Video Wrapper */}
            <div 
                className={`rs-video-wrapper ${
                    isFullScreen 
                        ? (activeVideo === 'local' ? 'maximized' : 'minimized') 
                        : ''
                }`}
                onDoubleClick={() => toggleFullScreen('local')}
            >
                <video ref={localVideoRef} autoPlay muted playsInline className="rs-video mirrored" />
                
                <div className="rs-label">
                    <span className="rs-label-dot"></span>
                    Tú ({mode === 'host' ? 'Host' : 'Invitado'})
                </div>

                <div className="rs-controls-overlay">
                    <button onClick={toggleMute} className={`rs-icon-btn ${isMuted ? 'active' : ''}`} title="Silenciar">
                        {isMuted ? (
                            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                        )}
                    </button>
                    <button onClick={toggleVideo} className={`rs-icon-btn ${!isVideoEnabled ? 'active' : ''}`} title="Cámara">
                        {!isVideoEnabled ? (
                            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        )}
                    </button>
                    <button onClick={() => toggleFullScreen('local')} className="rs-icon-btn" title="Pantalla Completa">
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                    </button>
                 </div>
            </div>

            {/* Remote Video Wrapper */}
            <div 
                className={`rs-video-wrapper ${
                     isFullScreen 
                        ? (activeVideo === 'remote' ? 'maximized' : 'minimized') 
                        : ''
                }`}
                onDoubleClick={() => status === 'connected' && toggleFullScreen('remote')}
            >
                {status === 'connected' || status === 'connecting' ? (
                     <>
                        <video ref={remoteVideoRef} autoPlay playsInline className="rs-video" />
                        
                        <div className="rs-label">
                            <span className="rs-label-dot guest"></span>
                            Invitado
                        </div>

                        {status === 'connected' && (
                            <div className="rs-controls-overlay">
                                <button onClick={() => toggleFullScreen('remote')} className="rs-icon-btn" title="Pantalla Completa">
                                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                                </button>
                            </div>
                        )}
                     </>
                ) : (
                    <div className="rs-waiting-screen">
                        <div className="rs-spinner"></div>
                        <h3 className="rs-waiting-title">Esperando al invitado...</h3>
                        <p className="rs-waiting-text">Envía este enlace para conectar.</p>
                        {mode === 'host' && (
                             <button onClick={copyInviteLink} className="rs-copy-btn">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                                Copiar Enlace
                             </button>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Footer Controls - Minimal */}
        <div className="rs-footer">
             <div className="rs-controls-bar">
                 <button onClick={toggleMute} className={`rs-control-btn ${isMuted ? 'active-red' : ''}`} title="Mute/Unmute">
                     {isMuted ? (
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                     ) : (
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                     )}
                 </button>
                 <button onClick={toggleVideo} className={`rs-control-btn ${!isVideoEnabled ? 'active-red' : ''}`} title="On/Off Camera">
                     {!isVideoEnabled ? (
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                     ) : (
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                     )}
                 </button>
                 <button className="rs-control-btn" onClick={() => copyInviteLink()} title="Compartir">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                 </button>
             </div>
        </div>

        {error && (
            <div className="rs-error-toast">
                <svg width="20" height="20" stroke="currentColor" viewBox="0 0 24 24" fill="none"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div>
                     <p>Error: {error}</p>
                </div>
                <button onClick={() => setError('')} className="rs-error-close">✕</button>
            </div>
        )}
    </div>
  );
};

export default RemoteStudio;
