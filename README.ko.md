[English](README.md) | **한국어**

# my-shadow-ts

React와 TypeScript로 구축된 오디오 쉐도잉 및 언어 학습용 웹 애플리케이션입니다.  
오디오 파형을 시각화하고 학습 기록을 관리하며, 진행 상황을 추적할 수 있는 통계를 제공합니다.

## 주요 기능

- **오디오 시각화**: `wavesurfer.js`를 이용한 인터랙티브 파형 표시 및 정밀한 재생 구간 제어.
- **쉐도잉 도구**: 구간 반복, 타임스탬프 북마크, 재생 속도 조절 기능.
- **학습 통계**: `recharts`를 활용하여 학습 습관(오디오별 북마크 수 등)을 차트로 시각화.
- **히스토리 관리**: 최근 재생한 오디오 파일을 자동으로 저장하고 관리.
- **데이터 관리**: 로컬 데이터를 관리하고 기록을 초기화하는 기능 제공.

## 사용 방법

1. **오디오 업로드**: 파일 입력창을 클릭하거나 오디오 파일을 드래그하여 업로드합니다.
2. **조작 방법**:
    - **재생/일시정지**: `Space` 키 또는 버튼 클릭.
    - **이동**: `왼쪽 화살표` / `오른쪽 화살표`로 5초 이동. `Home` 키로 처음으로 이동. 파형 클릭으로 점프.
    - **북마크**: `M` 키를 누르거나 "북마크 추가" 버튼 클릭.
    - **속도**: 재생 속도 조절 (0.5x, 1.0x, 1.5x, 2.0x).
3. **세션 관리**:
    - "기록 저장" 버튼을 눌러 현재 북마크와 진행 상황을 저장합니다.
    - 이전 학습 기록은 메인 파형 아래에 표시됩니다.

## 기술 스택

- **프레임워크**: React 19, TypeScript
- **빌드 도구**: Vite
- **라우팅**: React Router DOM v7
- **UI 및 아이콘**: Lucide React
- **시각화**: Recharts (차트), Wavesurfer.js (오디오 웨이브폼)
- **스타일링**: CSS Modules / Vanilla CSS

## 시작하기

### 필수 조건
- Node.js (최신 LTS 권장)
- npm 또는 bun

### 설치 방법

1. 저장소를 클론합니다:
   ```bash
   git clone https://github.com/your-username/my-shadow-ts.git
   ```
2. 프로젝트 디렉토리로 이동합니다:
   ```bash
   cd my-shadow-ts
   ```
3. 의존성 패키지를 설치합니다:
   ```bash
   npm install
   # 또는
   bun install
   ```

### 실행 방법

개발 서버를 실행합니다:
```bash
npm run dev
# 또는
bun dev
```

프로덕션 빌드를 생성합니다:
```bash
npm run build
```

## 데스크톱 앱 (Tauri)

### 개발 모드 (Development)
핫 리로딩(Hot-reloading)을 지원하며, 코드 수정 시 즉시 반영됩니다. 실행 중에는 터미널(서버)이 켜져 있어야 합니다.
```bash
npm run tauri dev
```

### 배포용 빌드 (Production)
독립 실행 가능한 설치 파일(deb, rpm, AppImage 등)을 생성합니다. 설치 후에는 터미널이나 서버 없이 단독으로 실행됩니다.
```bash
npm run tauri build
```
*생성된 파일 위치: `src-tauri/target/release/bundle/`*

### 리눅스 필수 설치 (오디오)
리눅스에서 오디오 분석이 멈춘다면, 다음 GStreamer 플러그인을 설치해 주세요:
```bash
sudo apt install gstreamer1.0-plugins-good gstreamer1.0-plugins-ugly
```

## 프로젝트 구조 (Project Structure)

```
my-shadow-ts/
├── src/
│   ├── components/  # 재사용 가능한 UI 컴포넌트
│   ├── pages/       # 페이지 라우트 (Home, Analytics 등)
│   ├── hooks/       # 커스텀 훅 (useAudio, useWaveSurfer)
│   ├── workers/     # 웹 워커 (피크 생성 및 백그라운드 작업)
│   ├── context/     # 전역 상태 관리 (AudioContext)
│   └── lib/         # 유틸리티 함수 (storage, utils)
├── src-tauri/       # Tauri 백엔드 설정 및 Rust 코드
│   ├── tauri.conf.json # Tauri 설정 (권한, 윈도우, 번들 정보)
│   └── src/         # Rust 소스 코드
├── public/          # 정적 에셋
└── dist/            # 프로덕션 빌드 결과물
```

## 새로운 기능 및 특이사항
- **데스크톱 앱 지원**: Tauri를 통해 윈도우, 리눅스, 맥OS에서 설치형 앱으로 실행 가능합니다.
- **성능 최적화**: Web Worker를 도입하여 대용량 오디오 파형 분석 시 UI 멈춤 현상을 방지했습니다.
- **데이터 저장**: OPFS(Origin Private File System)를 사용하여 브라우저와 데스크톱 앱 간의 데이터 저장 방식을 통일했습니다.
