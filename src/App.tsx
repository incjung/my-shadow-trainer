import { useRef, useState, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import './App.css';

// 북마크 데이터 타입 정의
interface Bookmark {
  id: number;
  time: number;
  label: string;
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [currentTime, setCurrentTime] = useState(0);

  // 1. WaveSurfer 초기화
  useEffect(() => {
    if (!containerRef.current) return;

    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#b0b0b0',      // 파형 기본 색상
      progressColor: '#4f46e5',  // 진행된 부분 색상
      cursorColor: '#ff5722',    // 커서 색상
      barWidth: 2,               // 막대 너비
      barGap: 3,                 // 막대 간격
      barRadius: 3,              // 막대 둥글기
      height: 120,               // 높이
    });

    // 이벤트 리스너: 재생 상태 변경 시
    wavesurferRef.current.on('play', () => setIsPlaying(true));
    wavesurferRef.current.on('pause', () => setIsPlaying(false));
    
    // 이벤트 리스너: 시간 업데이트 (진행바 동기화용)
    wavesurferRef.current.on('timeupdate', (time) => {
      setCurrentTime(time);
    });

    // 클린업: 컴포넌트 언마운트 시 인스턴스 파괴
    return () => {
      wavesurferRef.current?.destroy();
    };
  }, []);

  // 2. 파일 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && wavesurferRef.current) {
      const url = URL.createObjectURL(file);
      wavesurferRef.current.load(url);
      setFileName(file.name);
      setBookmarks([]); // 새 파일 로드 시 북마크 초기화
      setIsPlaying(false);
    }
  };

  // 3. 재생/일시정지 토글
  const togglePlay = () => {
    wavesurferRef.current?.playPause();
  };

  // 4. 북마크 추가
  const addBookmark = () => {
    if (!wavesurferRef.current) return;
    
    const time = wavesurferRef.current.getCurrentTime();
    const newBookmark: Bookmark = {
      id: Date.now(),
      time,
      label: formatTime(time),
    };

    setBookmarks((prev) => [...prev, newBookmark].sort((a, b) => a.time - b.time));
  };

  // 5. 북마크로 이동
  const jumpToBookmark = (time: number) => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setTime(time);
      wavesurferRef.current.play();
    }
  };

  // 6. 북마크 삭제
  const removeBookmark = (id: number) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  // 시간 포맷팅 (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="player-container">
      <h1>🎵 Bun Audio Player</h1>
      
      {/* 파일 선택 영역 */}
      <div className="upload-section">
        <input type="file" accept="audio/*" onChange={handleFileUpload} className="file-input" />
        {fileName && <p className="file-name">Playing: <strong>{fileName}</strong></p>}
      </div>

      {/* 파형 영역 (WaveSurfer가 여기 그려짐) */}
      <div id="waveform" ref={containerRef} className="waveform-container" />

      {/* 컨트롤 버튼 */}
      <div className="controls">
        <button onClick={togglePlay} className="btn-primary" disabled={!fileName}>
          {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
        </button>
        <button onClick={addBookmark} className="btn-secondary" disabled={!fileName}>
          📍 북마크 추가 ({formatTime(currentTime)})
        </button>
      </div>

      {/* 북마크 리스트 */}
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
