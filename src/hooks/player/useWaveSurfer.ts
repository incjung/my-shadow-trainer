import { useRef, useState, useEffect, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

export const useWaveSurfer = (containerRef: React.RefObject<HTMLElement | null>) => {
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const regionsRef = useRef<RegionsPlugin | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [isReady, setIsReady] = useState(false);
    const [mainWaveformWidth, setMainWaveformWidth] = useState(0);

    // Initialize WaveSurfer
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const ws = WaveSurfer.create({
            container: container,
            waveColor: '#d1d5db',
            progressColor: '#d1d5db',
            cursorColor: '#333',
            barWidth: 2,
            barGap: 3,
            barRadius: 3,
            height: 120,
            normalize: true,
        });

        const wsRegions = ws.registerPlugin(RegionsPlugin.create({
            dragSelection: false,
        } as any));

        regionsRef.current = wsRegions;
        wavesurferRef.current = ws;

        ws.on('ready', () => {
            setIsReady(true);
            setDuration(ws.getDuration());
            ws.setPlaybackRate(playbackRate);
            if (containerRef.current) {
                setMainWaveformWidth(containerRef.current.clientWidth);
            }
        });

        const resizeObserver = new ResizeObserver(() => {
            if (containerRef.current) {
                setMainWaveformWidth(containerRef.current.clientWidth);
            }
        });
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        ws.on('decode', (d) => {
            setDuration(d);
        });

        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));
        ws.on('timeupdate', (time) => setCurrentTime(time));

        wsRegions.on('region-clicked', (region, e) => {
            e.stopPropagation();
            region.play();
            setIsPlaying(true);
        });

        return () => {
            ws.destroy();
            resizeObserver.disconnect();
        };
    }, []);

    const togglePlay = useCallback(() => {
        wavesurferRef.current?.playPause();
    }, []);

    const handleSpeedChange = useCallback((rate: number) => {
        setPlaybackRate(rate);
        if (wavesurferRef.current && isReady) {
            wavesurferRef.current.setPlaybackRate(rate);
        }
    }, [isReady]);

    return {
        wavesurferRef,
        regionsRef,
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        isReady,
        mainWaveformWidth,
        togglePlay,
        handleSpeedChange // Renamed to align with usage
    };
};
