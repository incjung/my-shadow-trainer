import React, { useEffect, useRef } from 'react';
import type { Bookmark } from '../types';

interface WaveformMiniProps {
    peaks: number[];
    bookmarks: Bookmark[];
    duration: number;
    width?: number; // Optional numeric width
    height?: number;
}

const WaveformMini: React.FC<WaveformMiniProps> = ({
    peaks,
    bookmarks,
    duration,
    width,
    height = 60
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        // Use prop width if provided, otherwise container width
        const drawWidth = width || container.clientWidth;

        // Update canvas size (resolution)
        canvas.width = drawWidth;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, drawWidth, height);

        const center = height / 2;
        const scale = height / 2;

        // Draw Waveform (Very Subtle)
        if (peaks.length > 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            const barWidth = drawWidth / peaks.length;

            peaks.forEach((peak, index) => {
                const x = index * barWidth;
                const magnitude = Math.abs(peak);
                const yUp = center - (magnitude * scale);
                const yDown = center + (magnitude * scale);
                // Draw rectangles with slight overlap to avoid gaps
                ctx.fillRect(x, yUp, barWidth + 0.5, yDown - yUp);
            });
        }

        // Draw Bookmarks (Strong Red)
        ctx.lineWidth = 1; // Crisp 1px line (or 2px)
        ctx.strokeStyle = '#ff0000';

        bookmarks.forEach(bm => {
            const percent = bm.time / duration;
            // Map percentage to pixel position
            const x = percent * drawWidth;

            // Draw crisp line at 0.5 offset for 1px, or exact for 2px
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        });

    }, [peaks, bookmarks, duration, width, height]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: height }}>
            <canvas
                ref={canvasRef}
                style={{
                    width: '100%',
                    height: `${height}px`,
                    backgroundColor: '#f9fafb',
                    borderRadius: '4px',
                    display: 'block' // Remove inline-block spacing
                }}
            />
        </div>
    );
};

export default WaveformMini;
