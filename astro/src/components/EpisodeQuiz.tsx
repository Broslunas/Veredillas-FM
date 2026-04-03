import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { gsap } from 'gsap';

interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: number;
}

interface EpisodeQuizProps {
    quiz: QuizQuestion[];
    episodeTitle: string;
    episodeSlug: string;
}

interface LeaderboardEntry {
    name: string;
    picture?: string;
    score: number;
    timeSpent: number;
    totalQuestions: number;
}

const EpisodeQuiz: React.FC<EpisodeQuizProps> = ({ quiz, episodeTitle, episodeSlug }) => {
    const [step, setStep] = useState<'welcome' | 'playing' | 'result'>('welcome');
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [unlockedAchievements, setUnlockedAchievements] = useState<any[]>([]);
    
    const [startTime, setStartTime] = useState<number>(0);
    const [finalTime, setFinalTime] = useState<number>(0);
    const [elapsed, setElapsed] = useState<number>(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const questionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (episodeSlug) fetchLeaderboard();
    }, [episodeSlug]);

    const fetchLeaderboard = async () => {
        try {
            const res = await fetch(`/api/quiz/ranking?slug=${episodeSlug}`);
            if (res.ok) {
                const data = await res.json();
                if (data.leaderboard) setLeaderboard(data.leaderboard);
            }
        } catch (err) {
            console.error('Error fetching ranking:', err);
        }
    };

    useEffect(() => {
        if (step === 'playing') {
            const start = Date.now();
            setStartTime(start);
            setElapsed(0);
            timerRef.current = setInterval(() => {
                setElapsed(Math.floor((Date.now() - start) / 1000));
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [step]);

    const startQuiz = () => {
        setStep('playing');
        setCurrentQuestion(0);
        setScore(0);
        setIsAnswered(false);
        setSelectedOption(null);
        setElapsed(0);
    };

    const handleOptionSelect = (index: number) => {
        if (isAnswered) return;
        setSelectedOption(index);
        setIsAnswered(true);

        const isCorrect = index === quiz[currentQuestion].correctAnswer;
        if (isCorrect) {
            setScore(prev => prev + 1);
            gsap.to(containerRef.current, { x: 5, yoyo: true, repeat: 1, duration: 0.05 });
        } else {
            gsap.to(containerRef.current, { x: -8, yoyo: true, repeat: 3, duration: 0.05 });
        }

        setTimeout(() => {
            if (currentQuestion < quiz.length - 1) {
                gsap.to(questionRef.current, {
                    opacity: 0,
                    x: -30,
                    filter: "blur(8px)",
                    duration: 0.35,
                    ease: "power2.in",
                    onComplete: () => {
                        setCurrentQuestion(prev => prev + 1);
                        setIsAnswered(false);
                        setSelectedOption(null);
                        gsap.fromTo(questionRef.current, { opacity: 0, x: 30, filter: "blur(8px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.45, ease: "back.out(1.2)" });
                    }
                });
            } else {
                const finalScore = score + (isCorrect ? 1 : 0);
                const timeTaken = Math.floor((Date.now() - startTime) / 1000);
                setFinalTime(timeTaken);
                finishQuiz(finalScore, timeTaken);
            }
        }, 1200);
    };

    const finishQuiz = async (finalScore: number, timeTaken: number) => {
        setStep('result');
        if (finalScore === quiz.length) {
            triggerConfetti();
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/quiz/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    episodeSlug,
                    score: finalScore,
                    totalQuestions: quiz.length,
                    timeSpent: timeTaken
                })
            });
            const data = await res.json();
            if (data.unlockedNow) setUnlockedAchievements(data.unlockedNow);
            fetchLeaderboard();
        } catch (err) {
            console.error('Error submitting quiz:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const triggerConfetti = () => {
        const duration = 2 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999999 };
        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
        const interval: any = setInterval(function() {
            var timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            var particleCount = 40 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}s`;
    };

    return (
        <div ref={containerRef} className="relative min-h-[500px] bg-[#030303] overflow-hidden flex flex-col">
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-violet-600/10 blur-[120px] rounded-full"></div>
                <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-pink-500/10 blur-[120px] rounded-full"></div>
            </div>

            {step === 'welcome' && (
                <div className="relative z-10 p-6 md:p-12 lg:p-16 flex flex-col lg:grid lg:grid-cols-12 gap-8 items-center flex-1">
                    <div className="lg:col-span-7 text-center lg:text-left flex flex-col">
                        <div className="mb-4">
                            <span className="inline-block px-3 py-1 bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.3em] rounded-full backdrop-blur-md">
                                Challenge Mode
                            </span>
                        </div>
                        
                        <h2 className="text-4xl md:text-6xl font-black mb-5 tracking-tighter italic text-white leading-[0.95]">
                             DOMINIO <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 italic uppercase">Veredillas</span>
                        </h2>
                        
                        <p className="text-zinc-400 text-base md:text-lg mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
                            Pon a prueba tus conocimientos sobre <span className="text-white font-bold">{episodeTitle}</span>.
                        </p>
                        
                        <button 
                            onClick={startQuiz}
                            className="group relative self-center lg:self-start px-8 py-4 bg-white text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl hover:scale-[1.03] transition-all hover:shadow-[0_8px_30px_rgb(255,255,255,0.15)] active:scale-[0.97] overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                COMENZAR RETO
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                            </span>
                        </button>
                    </div>

                    <div className="lg:col-span-5 w-full flex flex-col h-full mt-4 lg:mt-0">
                        <div className="bg-zinc-900/30 border border-white/5 backdrop-blur-3xl p-6 rounded-[32px] shadow-2xl flex-1 flex flex-col min-h-[300px]">
                             <div className="flex items-center justify-between mb-5">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                    <span className="text-sm">👑</span> HALL OF FAME
                                </h3>
                                <span className="text-[9px] font-bold text-zinc-600 bg-white/5 px-2 py-0.5 rounded border border-white/5">TOP 10</span>
                             </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar h-[200px] space-y-2.5 pr-1">
                                {leaderboard.length > 0 ? (
                                    leaderboard.map((entry, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border ${idx === 0 ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'bg-white/5 text-zinc-600 border-white/5'}`}>
                                                    {idx + 1}
                                                </div>
                                                <img src={entry.picture || '/placeholder-user.webp'} alt={entry.name} className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                                                <span className="text-xs font-bold text-zinc-200 line-clamp-1">{entry.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-violet-400">{entry.score}/{entry.totalQuestions}</p>
                                                <p className="text-[9px] font-medium text-zinc-600 tabular-nums">{formatTime(entry.timeSpent)}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                                        <span className="text-3xl mb-4 grayscale">🏔️</span>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Sin registros</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {step === 'playing' && (
                <div className="relative z-10 p-6 md:p-10 flex flex-col flex-1">
                    {/* Progress Bar Top */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(139,92,246,0.3)]" 
                            style={{ width: `${((currentQuestion + 1) / quiz.length) * 100}%` }}
                        ></div>
                    </div>

                    <div ref={questionRef} className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full pb-20">
                        <div className="mb-4">
                             <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">Pregunta {currentQuestion + 1} de {quiz.length}</span>
                        </div>
                        <h3 className="text-2xl md:text-4xl font-black mb-8 leading-[1.05] tracking-tight text-white italic">
                            {quiz[currentQuestion].question}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {quiz[currentQuestion].options.map((option, idx) => {
                                let statusClasses = "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 translate-y-0";
                                if (isAnswered) {
                                    if (idx === quiz[currentQuestion].correctAnswer) {
                                        statusClasses = "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.15)]";
                                    } else if (idx === selectedOption) {
                                        statusClasses = "bg-red-500/20 border-red-500/40 text-red-500 opacity-70 scale-[0.98]";
                                    } else {
                                        statusClasses = "bg-white/5 border-white/5 opacity-20 scale-[0.97] blur-[1px]";
                                    }
                                }

                                return (
                                    <button
                                        key={idx}
                                        disabled={isAnswered}
                                        onClick={() => handleOptionSelect(idx)}
                                        className={`group relative p-4 rounded-xl border text-left font-bold transition-all duration-300 flex items-center gap-4 ${statusClasses}`}
                                    >
                                        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-[10px] font-black border border-white/10 group-hover:bg-white/10 group-active:scale-90 transition-all uppercase shrink-0">
                                            {String.fromCharCode(65 + idx)}
                                        </div>
                                        <span className="text-sm md:text-base tracking-tight leading-snug">{option}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* New Bottom HUD */}
                    <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between pointer-events-none">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl flex flex-col pointer-events-auto">
                            <p className="text-[8px] font-black uppercase text-zinc-500 mb-0.5">Puntos</p>
                            <span className="text-xl font-black text-white leading-none">{score}</span>
                        </div>
                        
                        <div className="bg-pink-500/10 backdrop-blur-xl border border-pink-500/20 px-4 py-2 rounded-2xl flex flex-col items-end pointer-events-auto">
                             <p className="text-[8px] font-black uppercase text-pink-500/70 mb-0.5">Reloj</p>
                             <div className="flex items-center gap-2">
                                 <span className="text-xl font-black text-pink-500 tabular-nums leading-none">{elapsed}s</span>
                                 <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse"></div>
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {step === 'result' && (
                <div className="relative z-10 p-8 md:p-12 md:pt-20 text-center flex flex-col items-center flex-1 justify-center">
                    <div className="mb-8 relative">
                         <div className="absolute inset-0 bg-violet-600/30 blur-[80px] rounded-full animate-pulse"></div>
                         <div className="relative transform">
                             <div className="w-24 h-24 md:w-32 md:h-32 rounded-[28px] bg-gradient-to-br from-violet-600 to-amber-500 flex items-center justify-center shadow-3xl">
                                <span className="text-4xl md:text-6xl">{score === quiz.length ? '🥇' : '🎯'}</span>
                             </div>
                             <div className="absolute -bottom-3 -right-3 bg-white text-black text-sm font-black w-10 h-10 flex items-center justify-center rounded-xl border-4 border-[#030303] shadow-xl rotate-12">
                                {score}
                             </div>
                         </div>
                    </div>

                    <h2 className="text-4xl md:text-6xl font-black mb-2 tracking-tighter text-white uppercase leading-none">
                        {score === quiz.length ? 'PERFECCIÓN' : 'COMPLETADO'}
                    </h2>
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-10">Tiempo: <span className="text-white">{finalTime} segundos</span></p>

                    {/* Achievement Unlocks - Compact Cards */}
                    {unlockedAchievements.length > 0 && (
                        <div className="mb-8 w-full max-w-sm">
                            <div className="space-y-2">
                                {unlockedAchievements.map((ach, idx) => (
                                    <div key={idx} className="flex items-center gap-4 bg-white/5 border border-amber-500/30 p-3 rounded-2xl text-left animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <span className="text-2xl">{ach.icon}</span>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-amber-500 uppercase">{ach.name}</p>
                                            <p className="text-[9px] text-zinc-500 font-bold">{ach.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 w-full max-w-xs">
                        <button 
                            onClick={startQuiz}
                            className="flex-1 py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:scale-[1.02] transition-all shadow-xl"
                        >
                            REINTENTAR
                        </button>
                        <button 
                            onClick={() => window.location.reload()}
                            className="flex-1 py-4 bg-zinc-900 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-800 transition-all"
                        >
                            SALIR
                        </button>
                    </div>
                </div>
            )}
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
            `}} />
        </div>
    );
};

export default EpisodeQuiz;
