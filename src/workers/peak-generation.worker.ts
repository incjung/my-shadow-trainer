// Web Worker for calculating waveform peaks
// This runs in a separate thread to avoid blocking the UI

self.onmessage = (e: MessageEvent) => {
    const { channelData, length } = e.data;

    if (!channelData || !length) {
        self.postMessage([]);
        return;
    }

    const step = Math.floor(channelData.length / length);
    const peaks: number[] = [];

    for (let i = 0; i < length; i++) {
        const start = i * step;
        const end = start + step;
        let max = 0;
        for (let j = start; j < end; j++) {
            const val = Math.abs(channelData[j]);
            if (val > max) max = val;
        }
        peaks.push(max);
    }

    self.postMessage(peaks);
};
