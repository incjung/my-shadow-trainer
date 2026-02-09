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

interface SessionRecord {
  id: number;
  date: string;       
  fileName: string;   
  count: number;      
  bookmarks: Bookmark[]; 
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
  
  // [추가] 재생 속도 State (기본 1.0)
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
      // [중요] 파일이 바뀌거나 준비되었을 때, 현재 설정된 배속 적용
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
  }, []); // 의존성 배열은 비워둠 (playbackRate는 ref로 접근하거나 이벤트에서 처리)

  // [추가] playbackRate가 변경될 때마다 WaveSurfer에 적용
  useEffect(() => {
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate, isReady]);


  // 키보드 이벤트
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!wavesurferRef.current || !isReady) return;

      if (e.code === 'ArrowLeft') wavesurferRef.current.skip(-5);
      else if (e.code === 'ArrowRight') wavesurferRef.current.skip(5);
      else if (e.code === 'Space') {
        e.preventDefault(); 
        wavesurferRef.current.playPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReady]);


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

  // [추가] 속도 변경 핸들러
  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
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

    if (region.element) region.element.style.zIndex = '100'; 

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 배속 옵션 리스트
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

      {/* [추가] 배속 조절 버튼 그룹 */}
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
      
      <p className="hint-text">💡 Tip: 키보드 좌우 화살표(←, →)로 5초씩 이동하세요.</p>

      <div className="bookmarks-section">
        <h3>현재 북마크 ({bookmarks.length})</h3>
        {bookmarks.length === 0 ? (
          <p className="empty-state">북마크가 없습니다. 잘 안 들리는 부분을 체크해보세요!</p>
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