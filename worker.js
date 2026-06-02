// worker.js - Whisper AI transcription in a background Web Worker
// Uses @xenova/transformers v2.17.2 from jsdelivr (static ESM import)

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriber = null;

self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  if (type === 'load') {
    if (transcriber) {
      self.postMessage({ status: 'ready', message: 'Whisper AI model is already loaded and cached.' });
      return;
    }

    try {
      self.postMessage({ status: 'progress', message: 'Initializing Whisper AI model (downloading ~75MB on first run)...' });

      transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
        progress_callback: (progressData) => {
          if (progressData.status === 'progress') {
            self.postMessage({
              status: 'downloading',
              file: progressData.file || 'model',
              progress: progressData.progress || 0,
              loaded: progressData.loaded || 0,
              total: progressData.total || 1
            });
          } else if (progressData.status === 'done') {
            self.postMessage({ status: 'progress', message: `Downloaded: ${progressData.file || 'file'}` });
          }
        }
      });

      self.postMessage({ status: 'ready', message: 'Whisper AI model loaded successfully!' });
    } catch (error) {
      self.postMessage({ status: 'error', error: `Model load failed: ${error.message}` });
    }
  }

  else if (type === 'transcribe') {
    if (!transcriber) {
      self.postMessage({ status: 'error', error: 'AI model not loaded yet.' });
      return;
    }

    try {
      self.postMessage({ status: 'progress', message: 'Transcribing audio with Whisper AI...' });

      // Defensive type checking and diagnostics
      let audio = data.audio;
      let statsMessage = "";
      
      if (!audio) {
        throw new Error("No audio data received in worker.");
      }
      
      if (!(audio instanceof Float32Array)) {
        self.postMessage({ 
          status: 'progress', 
          message: `Worker warning: Audio is ${audio.constructor ? audio.constructor.name : typeof audio}, converting to Float32Array.` 
        });
        audio = new Float32Array(audio);
      }
      
      // Calculate basic stats for verification
      let maxVal = 0;
      let minVal = 0;
      let nonZeroCount = 0;
      for (let i = 0; i < Math.min(audio.length, 50000); i++) {
        const val = audio[i];
        if (val > maxVal) maxVal = val;
        if (val < minVal) minVal = val;
        if (Math.abs(val) > 1e-5) nonZeroCount++;
      }
      statsMessage = `Worker audio buffer verification: length=${audio.length}, min=${minVal.toFixed(4)}, max=${maxVal.toFixed(4)}, nonZeroIn50k=${nonZeroCount}`;
      self.postMessage({ status: 'progress', message: statsMessage });

      // Select dynamic options based on audio duration to avoid chunking issues on short files
      const options = { return_timestamps: 'word' };
      const duration = data.duration || (audio.length / 16000);
      if (duration > 30) {
        options.chunk_length_s = 30;
        options.stride_length_s = 5;
      }
      
      self.postMessage({ status: 'progress', message: `Running Whisper inference with options: ${JSON.stringify(options)}` });

      const result = await transcriber(audio, options);

      self.postMessage({ status: 'success', result });
    } catch (error) {
      self.postMessage({ status: 'error', error: `Transcription failed: ${error.message}` });
    }
  }
});

// Signal that the worker script itself loaded OK
self.postMessage({ status: 'progress', message: 'Worker script loaded. AI library imported from CDN.' });
