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

  // 1. WaveSurfer 초기화
  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      // 파형 색상 설정 (재생 진행바 색상 제거됨)
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
    }));
    
    regionsRef.current = wsRegions;
    wavesurferRef.current = ws;

    ws.on('ready', () => setIsReady(true));
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
  }, []);

  // ==========================================
  // [추가된 기능] 키보드 이벤트 리스너 (좌우 화살표)
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 파형이 준비되지 않았으면 무시
      if (!wavesurferRef.current || !isReady) return;

      if (e.code === 'ArrowLeft') {
        // 왼쪽 화살표: 5초 뒤로
        wavesurferRef.current.skip(-5);
      } else if (e.code === 'ArrowRight') {
        // 오른쪽 화살표: 5초 앞으로
        wavesurferRef.current.skip(5);
      } else if (e.code === 'Space') {
        // (선택사항) 스페이스바: 재생/일시정지 토글
        e.preventDefault(); // 스크롤 방지
        wavesurferRef.current.playPause();
      }
    };

    // 윈도우 전체에 이벤트 붙이기
    window.addEventListener('keydown', handleKeyDown);

    // 컴포넌트 사라질 때 이벤트 떼기 (청소)
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isReady]); // isReady가 바뀔 때마다 갱신


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
    
    const region = regionsRef.current.addRegion({
      start: time,
      color: 'rgba(255, 0, 0, 1)', 
      drag: false,
      resize: false,
    });

    if (region.element) {
      // z-index는 CSS에서 !important로 처리했지만, 
      // 혹시 몰라 JS에서도 안전하게 한번 더 줍니다.
      region.element.style.zIndex = '100'; 
    }

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
      <h1>🎵 Bun Audio Player</h1>
      
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
      
      <p className="hint-text">💡 Tip: 키보드 좌우 화살표(←, →)로 5초씩 이동하세요.</p>

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
