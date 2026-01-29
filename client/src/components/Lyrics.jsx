import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './Lyrics.css';

const Lyrics = ({ lyrics, currentTime, isOpen, onClose }) => {
    const [parsedLyrics, setParsedLyrics] = useState([]);
    const [offset] = useState(0.5); // Default Sync offset: +0.5s (display later)
    const scrollRef = useRef(null);
    const activeLineRef = useRef(null);

    // Parse LRC format
    useEffect(() => {
        if (!lyrics) {
            setParsedLyrics([]);
            return;
        }

        const lines = lyrics.split('\n');
        const parsed = lines
            .map(line => {
                const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
                if (match) {
                    const minutes = parseInt(match[1]);
                    const seconds = parseInt(match[2]);
                    const milliseconds = parseInt(match[3]);
                    const time = minutes * 60 + seconds + milliseconds / 1000;
                    return { time, text: match[4].trim() };
                }
                return null;
            })
            .filter(line => line !== null && line.text.length > 0);

        setParsedLyrics(parsed);
    }, [lyrics]);

    // Auto-scroll to active line
    useEffect(() => {
        if (activeLineRef.current && scrollRef.current && isOpen) {
            activeLineRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [currentTime, isOpen, offset]); // Scroll updates when offset changes

    // Find active line index
    const activeIndex = parsedLyrics.findIndex((line, index) => {
        const nextLine = parsedLyrics[index + 1];
        // Apply offset to lyric time: Line Time + Offset
        const lineTime = line.time + offset;
        const nextTime = nextLine ? nextLine.time + offset : Infinity;

        return currentTime >= lineTime && currentTime < nextTime;
    });

    if (!isOpen) return null;

    return (
        <div className="lyrics-container glass-panel">
            <div className="lyrics-header-mobile">
                <button className="close-btn" onClick={onClose}>
                    <ChevronDown size={24} />
                </button>
                <span>Lyrics</span>
            </div>



            <div className="lyrics-scroll" ref={scrollRef}>
                {parsedLyrics.length > 0 ? (
                    parsedLyrics.map((line, index) => (
                        <p
                            key={index}
                            ref={index === activeIndex ? activeLineRef : null}
                            className={`lyrics-line ${index === activeIndex ? 'active' : ''}`}
                        >
                            {line.text}
                        </p>
                    ))
                ) : (
                    <div className="no-lyrics">
                        <p>No lyrics available</p>
                    </div>
                )}
                {/* Spacer (bottom padding) */}
                <div style={{ height: '50%' }}></div>
            </div>
        </div>
    );
};

export default Lyrics;
