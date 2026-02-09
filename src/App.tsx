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

// [추가] 저장될 학습 기록 데이터 타입 정의
interface SessionRecord {
  id: number;
  date: string;       // 저장 날짜 (YYYY-MM-DD HH:mm)
  fileName: string;   // 음원 파일명
  count: number;      // 북마크 개수 (실력 척도)
  bookmarks: Bookmark[]; // 북마크 상세 내용
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

  // [추가] 학습 기록 상태 관리
  const [history, setHistory] = useState<SessionRecord[]>([]);

  // 0. [추가] 앱 시작 시 LocalStorage에서 기록 불러오기
  useEffect(() => {
    const savedHistory = localStorage.getItem('audio-study-history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // 1. WaveSurfer 초기화
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

  // [추가] 현재 학습 세션 저장하기
  const saveSession = () => {
    if (!fileName) return;

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newRecord: SessionRecord = {
      id: Date.now(),
      date: dateStr,
      fileName: fileName,
      count: bookmarks.length, // 북마크 개수 저장
      bookmarks: [...bookmarks], // 현재 북마크 리스트 복사 저장
    };

    const updatedHistory = [newRecord, ...history];
    setHistory(updatedHistory);
    
    // 브라우저 저장소에 영구 저장
    localStorage.setItem('audio-study-history', JSON.stringify(updatedHistory));
    
    alert('학습 기록이 저장되었습니다! 📝');
  };

  // [추가] 기록 삭제 기능
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

      <div className="controls">
        <button onClick={togglePlay} className="btn-primary" disabled={!isReady}>
          {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
        </button>
        <button onClick={addBookmark} className="btn-secondary" disabled={!isReady}>
          📍 북마크 추가 ({formatTime(currentTime)})
        </button>
        {/* [추가] 저장 버튼 */}
        <button onClick={saveSession} className="btn-save" disabled={!isReady}>
          💾 기록 저장
        </button>
      </div>
      
      <p className="hint-text">💡 Tip: 키보드 좌우 화살표(←, →)로 5초씩 이동하세요.</p>

      {/* 현재 북마크 목록 */}
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

      {/* [추가] 학습 기록 히스토리 영역 */}
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
                {/* 기록된 북마크 시간대 나열 */}
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