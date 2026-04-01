import React, { useState, useEffect, useRef } from 'react';
import EpisodeQuiz from './EpisodeQuiz';
import { gsap } from 'gsap';

interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: number;
}

interface QuizModalProps {
    quiz: QuizQuestion[];
    episodeTitle: string;
    episodeSlug: string;
}

const QuizModal: React.FC<QuizModalProps> = ({ quiz, episodeTitle, episodeSlug }) => {
    const [isOpen, setIsOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        document.addEventListener('open-quiz-modal', handleOpen);
        
        // Backup global function for non-react components
        (window as any).openQuizModal = () => setIsOpen(true);

        return () => {
            document.removeEventListener('open-quiz-modal', handleOpen);
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden'; // Ensure HTML also doesn't scroll
            gsap.fromTo(modalRef.current, 
                { opacity: 0 }, 
                { opacity: 1, duration: 0.3, ease: 'power2.out' }
            );
            gsap.fromTo(contentRef.current, 
                { scale: 0.95, y: 20, opacity: 0, filter: 'blur(10px)' }, 
                { scale: 1, y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.6, delay: 0.1, ease: 'back.out(1.4)' }
            );
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
        
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [isOpen]);

    const handleClose = () => {
        gsap.to(contentRef.current, { 
            scale: 0.97, y: 10, opacity: 0, filter: 'blur(5px)', duration: 0.3, ease: 'power2.in' 
        });
        gsap.to(modalRef.current, { 
            opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => setIsOpen(false) 
        });
    };

    if (!isOpen) return null;

    return (
        <div 
            ref={modalRef}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-6"
            style={{ isolation: 'isolate' }}
        >
            {/* Extreme backdrop blur with darker tint */}
            <div 
                className="absolute inset-0 bg-black/85 backdrop-blur-[40px] transition-all"
                onClick={handleClose}
            >
                {/* subtle grain for premium texture */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
            </div>

            <div 
                ref={contentRef}
                className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[40px] border border-white/20 shadow-[0_0_80px_rgba(0,0,0,0.5)] bg-[#050505]"
            >
                {/* Close Button - More visible and premium */}
                <button 
                    onClick={handleClose}
                    className="absolute top-6 right-6 z-[60] w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:rotate-90 transition-all duration-500 shadow-xl backdrop-blur-md"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

                <div className="max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <EpisodeQuiz 
                        quiz={quiz} 
                        episodeTitle={episodeTitle} 
                        episodeSlug={episodeSlug} 
                    />
                </div>
            </div>
        </div>
    );
};

export default QuizModal;
