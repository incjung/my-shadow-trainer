import { useRef, useState, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import './App.css';

interface Bookmark {
  id: number;
  time: number;
  label: string;
  regionId: string;
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. WaveSurfer 생성
    const ws = WaveSurfer.create({
      container: containerRef.current,
      // [수정] waveColor와 progressColor를 동일하게 설정하여
      // 재생 시 색상 변화가 없도록 함 (북마크 강조를 위함)
      waveColor: '#d1d5db',      
      progressColor: '#d1d5db',  
      cursorColor: '#333',       // 재생 위치를 알려주는 선 (진한 회색)
      barWidth: 2,
      barGap: 3,
      barRadius: 3,
      height: 120,
      normalize: true, 
    });

    // 2. Regions 플러그인 등록
    const wsRegions = ws.registerPlugin(RegionsPlugin.create({
      dragSelection: false, // 드래그 방지
    }));
    
    regionsRef.current = wsRegions;
    wavesurferRef.current = ws;

    // === 이벤트 리스너 ===
    ws.on('ready', () => {
      setIsReady(true);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('timeupdate', (time) => setCurrentTime(time));
    
    // 북마크 클릭 시 재생
    wsRegions.on('region-clicked', (region, e) => {
      e.stopPropagation();
      region.play();
      setIsPlaying(true);
    });

    return () => {
      ws.destroy();
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && wavesurferRef.current && regionsRef.current) {
      setIsReady(false); 
      setIsPlaying(false);
      setBookmarks([]);
      regionsRef.current.clearRegions();
      setFileName(file.name);

      const url = URL.createObjectURL(file);
      wavesurferRef.current.load(url);
    }
  };

  const togglePlay = () => {
    wavesurferRef.current?.playPause();
  };

  const addBookmark = () => {
    if (!wavesurferRef.current || !regionsRef.current || !isReady) return;
    
    const time = wavesurferRef.current.getCurrentTime();
    
    // 3. 북마크 생성
    const region = regionsRef.current.addRegion({
      start: time,
      // end 속성을 아예 생략하면 'Marker(선)' 모드로 동작합니다.
      // 이렇게 하면 확대/축소 상관없이 항상 선명한 선이 보입니다.
      color: 'rgba(255, 0, 0, 1)', 
      drag: false,
      resize: false,
      // content: '🚩', // 필요하면 마커 위에 이모지 등을 띄울 수 있습니다.
    });

    const newBookmark: Bookmark = {
      id: Date.now(),
      time,
      label: formatTime(time),
      regionId: region.id
    };

    setBookmarks((prev) => [...prev, newBookmark].sort((a, b) => a.time - b.time));
  };

  const jumpToBookmark = (time: number) => {
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.setTime(time);
      wavesurferRef.current.play();
    }
  };

  const removeBookmark = (id: number) => {
    const target = bookmarks.find(b => b.id === id);
    if (target && regionsRef.current) {
      const region = regionsRef.current.getRegions().find(r => r.id === target.regionId);
      if (region) region.remove();
    }
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="player-container">
      <h1>🎵 Bun Audio Shadow Player</h1>
      
	<div className="upload-section">
          <input type="file" accept="audio/*" onChange={handleFileUpload} className="file-input" />
        {fileName && <p className="file-name">Playing: <strong>{fileName}</strong></p>}
      </div>

      <div className="waveform-wrapper">
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
      </div>

	  <div className="controls">
            <button onClick={togglePlay} className="btn-primary" disabled={!isReady}>
          {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
        </button>
        <button onClick={addBookmark} className="btn-secondary" disabled={!isReady}>
          📍 북마크 추가 ({formatTime(currentTime)})
        </button>
      </div>

      <div className="bookmarks-section">
        <h3>북마크 목록 ({bookmarks.length})</h3>
        {bookmarks.length === 0 ? (
          <p className="empty-state">북마크가 없습니다. 듣고 싶은 구간을 저장해보세요!</p>
        ) : (
          <ul className="bookmark-list">
            {bookmarks.map((bm) => (
              <li key={bm.id} className="bookmark-item">
                <span onClick={() => jumpToBookmark(bm.time)} className="bookmark-time">
                  ⏱ {bm.label}
                </span>
                <button onClick={() => removeBookmark(bm.id)} className="btn-delete">×</button>
              </li>
		  ))}
          </ul>
		  )}
		  </div>
    </div>
    );
    }

export default App;
