import React, { useRef, useState, useEffect, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import WaveformMini from '../components/WaveformMini';
import { storage } from '../lib/storage';
import { useAudio } from '../context/AudioContext'; // Import context
import type { Bookmark, SessionRecord } from '../types';


// 시간 포맷 함수 (MM:SS)
const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function Home() {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const regionsRef = useRef<RegionsPlugin | null>(null);

    // Use Context for file persistence
    const { file: contextFile, fileName: contextFileName, setAudioFile } = useAudio();
    const fileName = contextFileName; // Alias for compatibility with existing code

    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    // Local fileName state is synced with context, but we use context source of truth
    const [currentTime, setCurrentTime] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [fileSessions, setFileSessions] = useState<any[]>([]); // Sessions loaded from OPFS for current file
    const [currentPeaks, setCurrentPeaks] = useState<number[]>([]); // Memoized peaks for current file
    const [mainWaveformWidth, setMainWaveformWidth] = useState(0); // Exact width of the main waveform container

    const loadSessions = useCallback(async (name: string) => {
        if (!name) {
            setFileSessions([]);
            return;
        }
        try {
            const sessionPaths = await storage.listSessions(name);
            const sessions = await Promise.all(
                sessionPaths.map(path => storage.readSessionFile(path).then(data => ({ ...data, path }))) // Attach path
            );
            setFileSessions(sessions);
        } catch (e) {
            console.error("Failed to load sessions", e);
        }
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        const ws = WaveSurfer.create({
            container: containerRef.current,
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
            // Capture width
            if (containerRef.current) {
                setMainWaveformWidth(containerRef.current.clientWidth);
            }
        });

        // Update width on resize
        const resizeObserver = new ResizeObserver(() => {
            if (containerRef.current) {
                setMainWaveformWidth(containerRef.current.clientWidth);
            }
        });
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        ws.on('decode', (duration) => {
            setDuration(duration);
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
        };
    }, []); // Init WaveSurfer ONCE

    // Effect to load audio when contextFile changes
    useEffect(() => {
        if (wavesurferRef.current && contextFile) {
            const url = URL.createObjectURL(contextFile);
            wavesurferRef.current.load(url);
            loadSessions(contextFile.name);

            // Reset state
            setIsPlaying(false);
            setDuration(0);
            setBookmarks([]);
            if (regionsRef.current) regionsRef.current.clearRegions();
        }
    }, [contextFile, loadSessions]);

    useEffect(() => {
        if (wavesurferRef.current && isReady) {
            wavesurferRef.current.setPlaybackRate(playbackRate);
        }
    }, [playbackRate, isReady]);



    const addBookmark = useCallback(() => {
        if (!wavesurferRef.current || !regionsRef.current || !isReady) return;

        const time = Math.max(0, wavesurferRef.current.getCurrentTime() - 5);

        const region = regionsRef.current.addRegion({
            start: time,
            color: 'rgba(255, 0, 0, 1)',
            drag: false,
            resize: false,
        });

        if (region.element) region.element.style.zIndex = '100';

        const newBookmark: Bookmark = {
            id: Date.now(),
            time,
            label: formatTime(time),
            regionId: region.id
        };

        setBookmarks((prev) => [...prev, newBookmark].sort((a, b) => a.time - b.time));
    }, [isReady]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!wavesurferRef.current || !isReady) return;

            if (e.code === 'ArrowLeft') {
                wavesurferRef.current.skip(-5);
            } else if (e.code === 'ArrowRight') {
                wavesurferRef.current.skip(5);
            } else if (e.code === 'Space') {
                e.preventDefault();
                wavesurferRef.current.playPause();
            } else if (e.code === 'KeyM') {
                addBookmark();
            } else if (e.code === 'Home') {
                e.preventDefault();
                wavesurferRef.current.setTime(0);
                wavesurferRef.current.play();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isReady, addBookmark]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAudioFile(file); // Update context, which triggers useEffect

            // Allow re-uploading the same file
            e.target.value = '';
        }
    };

    const togglePlay = () => {
        wavesurferRef.current?.playPause();
    };

    const handleSpeedChange = (rate: number) => {
        setPlaybackRate(rate);
    };

    const jumpToBookmark = (time: number) => {
        if (wavesurferRef.current && isReady) {
            wavesurferRef.current.setTime(time);
            wavesurferRef.current.play();
        }
    };

    const removeBookmark = (id: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation(); // Prevent event bubbling if button is inside a clickable area
        const target = bookmarks.find(b => b.id === id);
        if (target && regionsRef.current) {
            const region = regionsRef.current.getRegions().find(r => r.id === target.regionId);
            if (region) region.remove();
        }
        setBookmarks((prev) => prev.filter((b) => b.id !== id));
    };

    const removeAllBookmarks = () => {
        if (bookmarks.length === 0) return;

        // Immediate deletion without confirmation as per user preference
        setBookmarks([]);
        if (regionsRef.current) {
            regionsRef.current.clearRegions();
        }
    };

    const constCapturePeaks = (length: number = 200): number[] => {
        if (!wavesurferRef.current) return [];
        const decodedData = wavesurferRef.current.getDecodedData();
        if (!decodedData) return [];

        const data = decodedData.getChannelData(0); // Get first channel
        const step = Math.floor(data.length / length);
        const peaks: number[] = [];

        for (let i = 0; i < length; i++) {
            const start = i * step;
            const end = start + step;
            let max = 0;
            for (let j = start; j < end; j++) {
                const val = Math.abs(data[j]);
                if (val > max) max = val;
            }
            peaks.push(max);
        }
        return peaks;
    };

    // Capture peaks when ready
    useEffect(() => {
        if (isReady && wavesurferRef.current) {
            const peaks = constCapturePeaks(300);
            setCurrentPeaks(peaks);
        }
    }, [isReady]);

    const saveSession = async () => {
        if (!fileName) return;

        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Use memoized peaks or capture if missing
        const peaks = currentPeaks.length > 0 ? currentPeaks : constCapturePeaks(300);

        const newRecord: SessionRecord = {
            id: Date.now(),
            date: dateStr,
            fileName: fileName,
            count: bookmarks.length,
            bookmarks: [...bookmarks],
            duration: duration,
            peaks: peaks
        };

        // 1. Save deep data to OPFS (File System)
        await storage.saveSessionFile(fileName, newRecord);

        // 3. Refresh file sessions list
        const sessionPaths = await storage.listSessions(fileName);
        const sessions = await Promise.all(
            sessionPaths.map(path => storage.readSessionFile(path).then(data => ({ ...data, path })))
        );
        setFileSessions(sessions);
        console.log("Session saved to OPFS");
    };

    const handleDeleteSession = async (path: string) => {
        console.log("Deleting session:", path);
        await storage.deleteSessionFile(path);

        // Update state immediately
        setFileSessions(prev => prev.filter(s => s.path !== path));

        // Also update the order file if it exists
        const order = await storage.getSessionOrder(fileName);
        const newOrder = order.filter(p => p !== path);
        await storage.saveSessionOrder(fileName, newOrder);
    };



    const speedOptions = [0.5, 1.0, 1.5, 2.0];

    return (
        <div className="player-container">
            {/* <h1>🎵 Bun Audio Study</h1> --> Title moved to App Layout */}

            <div className="upload-section">
                <input type="file" accept="audio/*" onChange={handleFileUpload} className="file-input" />
                {fileName && <p className="file-name">Playing: <strong>{fileName}</strong></p>}
            </div>

            {/* Top Controls Section */}
            <div className="controls-group" style={{ marginBottom: '1rem' }}>
                <div className="controls" style={{ marginBottom: '0.5rem' }}>
                    <button onClick={togglePlay} className="btn-primary" disabled={!isReady}>
                        {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
                    </button>
                    <button onClick={addBookmark} className="btn-secondary" disabled={!isReady}>
                        📍 북마크 추가
                    </button>
                    <button onClick={saveSession} className="btn-save" disabled={!isReady}>
                        💾 기록 저장
                    </button>
                </div>

                <div className="speed-controls" style={{ marginBottom: '0.5rem' }}>
                    <span className="speed-label">재생 속도:</span>
                    {speedOptions.map((rate) => (
                        <button
                            key={rate}
                            onClick={() => handleSpeedChange(rate)}
                            className={`btn-speed ${playbackRate === rate ? 'active' : ''}`}
                            disabled={!isReady}
                        >
                            x{rate}
                        </button>
                    ))}
                </div>

                <p className="hint-text" style={{ fontSize: '0.9rem', color: '#666' }}>
                    💡 Tip: ←/→(5초 이동), Space(재생/멈춤), <strong>M(북마크), Home(처음으로)</strong>
                </p>
            </div>

            {/* Main Waveform */}
            <div className="waveform-wrapper" style={{ marginBottom: 0 }}>
                {fileName && !isReady && (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                        <p>음원 분석 중...</p>
                    </div>
                )}

                <div
                    id="waveform"
                    ref={containerRef}
                    className={`waveform-container ${isReady ? 'visible' : 'hidden'}`}
                />

                {isReady && (
                    <div className="time-display-overlay">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                )}

                {/* Current File History Visualization (Attached to bottom of waveform) */}
                {fileSessions.length > 0 && (
                    <div className="file-history-section" style={{ marginTop: '10px' }}>
                        <div className="visual-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {/* Past Sessions */}
                            {fileSessions.map((session) => {
                                return (
                                    <div key={session.path} className="history-item" style={{
                                        position: 'relative',
                                        opacity: 0.8,
                                        marginTop: '0px',
                                        width: mainWaveformWidth, // Force exact width
                                        boxSizing: 'border-box'
                                    }}>
                                        <div style={{
                                            position: 'absolute',
                                            top: 2,
                                            left: 5,
                                            display: 'flex',
                                            gap: '5px',
                                            zIndex: 10,
                                            pointerEvents: 'none'
                                        }}>
                                            <span style={{ fontSize: '0.7rem', background: 'rgba(0,0,0,0.2)', color: '#333', padding: '1px 4px', borderRadius: 3 }}>
                                                {session.date} ({session.count}개)
                                            </span>
                                        </div>

                                        <div style={{
                                            position: 'absolute',
                                            top: 2,
                                            right: 5,
                                            display: 'flex',
                                            gap: '5px',
                                            zIndex: 10
                                        }}>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSession(session.path);
                                                }}
                                                style={{ fontSize: '0.7rem', padding: '1px 4px', background: 'rgba(200,0,0,0.1)', color: '#d00', border: '1px solid #fcc', borderRadius: 3, cursor: 'pointer' }}
                                                title="Delete"
                                            >×</button>
                                        </div>

                                        <WaveformMini
                                            peaks={session.peaks || []}
                                            bookmarks={session.bookmarks}
                                            duration={session.duration}
                                            width={mainWaveformWidth} // Pass exact width
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>



            <div className="bookmarks-section">
                <div className="bookmarks-header">
                    <h3>현재 북마크 ({bookmarks.length})</h3>

                    {bookmarks.length > 0 && (
                        <button onClick={removeAllBookmarks} className="btn-clear-all">
                            🗑️ 전체 삭제
                        </button>
                    )}
                </div>

                {bookmarks.length === 0 ? (
                    <p className="empty-state">북마크가 없습니다. M 키를 눌러 추가해보세요!</p>
                ) : (
                    <ul className="bookmark-list">
                        {bookmarks.map((bm) => (
                            <li key={bm.id} className="bookmark-item">
                                <span onClick={() => jumpToBookmark(bm.time)} className="bookmark-time">
                                    ⏱ {bm.label}
                                </span>
                                <button onClick={(e) => removeBookmark(bm.id, e)} className="btn-delete">×</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default Home;
