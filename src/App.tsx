import { useRef, useState, useEffect, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import './App.css';

interface Bookmark {
  id: number;
  time: number;
  label: string;
  regionId: string;
}

interface SessionRecord {
  id: number;
  date: string;       
  fileName: string;   
  count: number;      
  bookmarks: Bookmark[]; 
}

// [이동] 시간 포맷 함수는 상태에 의존하지 않으므로 컴포넌트 밖으로 뺌
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [history, setHistory] = useState<SessionRecord[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('audio-study-history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
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
      ws.setPlaybackRate(playbackRate); 
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
  }, []);

  useEffect(() => {
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate, isReady]);

  // ==========================================
  // [수정] addBookmark를 useEffect 위로 올리고 useCallback 적용
  // ==========================================
  const addBookmark = useCallback(() => {
    if (!wavesurferRef.current || !regionsRef.current || !isReady) return;
    
    const time = wavesurferRef.current.getCurrentTime();
    
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
  }, [isReady]); // isReady가 변할 때만 재생성

  // ==========================================
  // [수정] 키보드 이벤트 리스너 ('m' 키 추가)
  // ==========================================
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
        // [추가] 'm' 키를 누르면 북마크 추가
        addBookmark();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReady, addBookmark]); // addBookmark가 의존성에 포함됨

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

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
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

  const saveSession = () => {
    if (!fileName) return;

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newRecord: SessionRecord = {
      id: Date.now(),
      date: dateStr,
      fileName: fileName,
      count: bookmarks.length,
      bookmarks: [...bookmarks],
    };

    const updatedHistory = [newRecord, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('audio-study-history', JSON.stringify(updatedHistory));
    
    alert('학습 기록이 저장되었습니다! 📝');
  };

  const deleteHistoryItem = (id: number) => {
    if(confirm('이 기록을 삭제하시겠습니까?')) {
      const updatedHistory = history.filter(item => item.id !== id);
      setHistory(updatedHistory);
      localStorage.setItem('audio-study-history', JSON.stringify(updatedHistory));
    }
  };

  const speedOptions = [0.5, 1.0, 1.5, 2.0];

  return (
    <div className="player-container">
      <h1>🎵 Bun Audio Study</h1>
      
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

      {/* 메인 컨트롤 */}
      <div className="controls">
        <button onClick={togglePlay} className="btn-primary" disabled={!isReady}>
          {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
        </button>
        <button onClick={addBookmark} className="btn-secondary" disabled={!isReady}>
          📍 북마크 추가 ({formatTime(currentTime)})
        </button>
        <button onClick={saveSession} className="btn-save" disabled={!isReady}>
          💾 기록 저장
        </button>
      </div>

      {/* 배속 조절 버튼 그룹 */}
      <div className="speed-controls">
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
      
      <p className="hint-text">💡 Tip: ←/→(5초 이동), Space(재생/멈춤), <strong>M(북마크)</strong></p>

      <div className="bookmarks-section">
        <h3>현재 북마크 ({bookmarks.length})</h3>
        {bookmarks.length === 0 ? (
          <p className="empty-state">북마크가 없습니다. M 키를 눌러 추가해보세요!</p>
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

      <div className="history-section">
        <h2>📚 학습 기록 (History)</h2>
        {history.length === 0 ? (
          <p className="empty-state">아직 저장된 기록이 없습니다.</p>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <div key={item.id} className="history-card">
                <div className="history-header">
                  <span className="history-date">{item.date}</span>
                  <button onClick={() => deleteHistoryItem(item.id)} className="btn-text-delete">삭제</button>
                </div>
                <div className="history-body">
                  <p className="history-file">📂 {item.fileName}</p>
                  <div className="history-score">
                    <span className="score-label">북마크 개수</span>
                    <span className={`score-value ${item.count === 0 ? 'perfect' : ''}`}>
                      {item.count}개
                    </span>
                  </div>
                </div>
                {item.count > 0 && (
                  <div className="history-tags">
                    {item.bookmarks.map(b => (
                      <span key={b.id} className="time-tag">{b.label}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default App;
