**English** | [한국어](README.ko.md)

# my-shadow-ts

A web application for audio shadowing and language learning, built with React and TypeScript.  
This tool visualizes audio waveforms, manages study history, and provides analytics to track your progress.

## Features

- **Audio Visualization**: Interactive waveform display using `wavesurfer.js` for precise playback control.
- **Shadowing Tools**: Repeat sections, bookmark timestamps, and control playback speed.
- **Learning Analytics**: Visualize your study habits with charts (e.g., Bookmarks per Audio) using `recharts`.
- **History Management**: Automatically saves your recently played audio files.
- **Data Management**: Manage your local data and clear history.

## Usage

1. **Upload Audio**: Click the file input or drag & drop an audio file.
2. **Controls**:
    - **Play/Pause**: `Space` or click the button.
    - **Navigation**: `Left Arrow` / `Right Arrow` to skip 5 seconds. `Home` to restart. Click waveform to jump.
    - **Bookmarks**: Press `M` or click "Add Bookmark" to mark a spot.
    - **Speed**: Adjust playback speed (0.5x, 1.0x, 1.5x, 2.0x).
3. **Sessions**:
    - Click "Save Record" to save your current bookmarks and progress.
    - Previous sessions are displayed below the main waveform.

## Tech Stack

- **Framework**: React 19, TypeScript
- **Build Tool**: Vite
- **Routing**: React Router DOM v7
- **UI & Icons**: Lucide React
- **Visualization**: Recharts (Charts), Wavesurfer.js (Audio)
- **Styling**: CSS Modules / Vanilla CSS

## Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- npm or bun

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/my-shadow-ts.git
   ```
2. Navigate to the project directory:
   ```bash
   cd my-shadow-ts
   ```
3. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```

### Running the App

Start the development server:
```bash
npm run dev
# or
bun dev
```

Build for production:
```bash
npm run build
```
