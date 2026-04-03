
import React, { useState, useEffect } from 'react';
import ClipEditor from './ClipEditor';

interface ClipData {
    audioUrl: string;
    title: string;
    author: string;
    cover: string;
    duration: number;
}

export default function ClipModalWrapper() {
    const [isOpen, setIsOpen] = useState(false);
    const [clipData, setClipData] = useState<ClipData | null>(null);

    useEffect(() => {
        const handleOpen = (e: CustomEvent<ClipData>) => {
            setClipData(e.detail);
            setIsOpen(true);
        };

        window.addEventListener('veredillas:open-clip-editor' as any, handleOpen);
        
        return () => {
            window.removeEventListener('veredillas:open-clip-editor' as any, handleOpen);
        };
    }, []);

    if (!isOpen || !clipData) return null;

    return (
        <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
                if(e.target === e.currentTarget) setIsOpen(false);
            }}
        >
            <ClipEditor 
                {...clipData} 
                onClose={() => setIsOpen(false)} 
            />
        </div>
    );
}
