// tts-worker.js - Kokoro TTS in a background Web Worker
// Uses kokoro-js from jsdelivr CDN (ESM import)

import { KokoroTTS } from 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';

let tts = null;
let voiceList = null;

self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  if (type === 'load') {
    if (tts) {
      self.postMessage({ status: 'ready', voices: voiceList, message: 'Kokoro TTS model already loaded!' });
      return;
    }

    const supportsWebGPU = !!(self.navigator && self.navigator.gpu);
    let device = supportsWebGPU ? 'webgpu' : 'wasm';
    let dtype = device === 'webgpu' ? 'fp32' : 'q8';
    const sizeMsg = device === 'webgpu' ? '~330MB (FP32 precision)' : '~82MB (Q8 quantized)';

    self.postMessage({ 
      status: 'progress', 
      message: `Device detection: WebGPU is ${supportsWebGPU ? 'SUPPORTED' : 'NOT supported'} by browser. Attempting to initialize on device: "${device}" with dtype: "${dtype}" (${sizeMsg})...` 
    });

    const initModel = async (selectedDevice, selectedDtype) => {
      return await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        dtype: selectedDtype,
        device: selectedDevice,
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
    };

    try {
      try {
        tts = await initModel(device, dtype);
      } catch (gpuError) {
        if (device === 'webgpu') {
          self.postMessage({ 
            status: 'progress', 
            message: `WebGPU initialization failed: ${gpuError.message || gpuError}. Falling back to CPU (WASM) with "q8" quantization...` 
          });
          device = 'wasm';
          dtype = 'q8';
          tts = await initModel(device, dtype);
        } else {
          throw gpuError;
        }
      }

      // Get available voices
      try {
        voiceList = tts.list_voices();
      } catch (e) {
        voiceList = null;
        self.postMessage({ status: 'progress', message: `Could not list voices: ${e.message}` });
      }

      self.postMessage({ 
        status: 'ready', 
        voices: voiceList, 
        message: `Kokoro TTS model loaded successfully on ${device.toUpperCase()}!` 
      });
    } catch (error) {
      self.postMessage({ status: 'error', error: `TTS model load failed: ${error.message || error}` });
    }
  }

  else if (type === 'generate') {
    if (!tts) {
      self.postMessage({ status: 'error', error: 'TTS model not loaded yet.' });
      return;
    }

    try {
      const { text, voice, speed } = data;
      
      // Split text into manageable chunks (sentences/phrases)
      const lines = text.split(/\r?\n+/).map(l => l.trim()).filter(l => l.length > 0);
      const chunks = [];
      for (const line of lines) {
        const sentences = line.match(/[^.!?]+[.!?]+(\s+|$)/g) || [line];
        for (let sentence of sentences) {
          sentence = sentence.trim();
          if (!sentence) continue;

          // If a single sentence is longer than 300 characters, break it by punctuation pauses
          if (sentence.length > 300) {
            const parts = sentence.split(/[,;:\-\u2014]+/).map(p => p.trim()).filter(p => p.length > 0);
            let currentChunk = "";
            for (const part of parts) {
              if ((currentChunk + " " + part).length > 250) {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = part;
              } else {
                currentChunk = currentChunk ? currentChunk + ", " + part : part;
              }
            }
            if (currentChunk) chunks.push(currentChunk);
          } else {
            chunks.push(sentence);
          }
        }
      }

      const cleanChunks = chunks.filter(c => c.length > 0);
      if (cleanChunks.length === 0) {
        throw new Error("No readable text provided for voice generation.");
      }

      const totalWords = text.split(/\s+/).filter(w => w.length > 0).length;
      self.postMessage({ 
        status: 'progress', 
        message: `Parsed script: Split into ${cleanChunks.length} chunks (${totalWords} words total). Synthesizing...` 
      });

      const startTime = performance.now();
      const audioChunks = [];
      let sampleRate = 24000;

      for (let i = 0; i < cleanChunks.length; i++) {
        const sentence = cleanChunks[i];
        self.postMessage({ 
          status: 'progress', 
          message: `Synthesizing chunk ${i + 1} of ${cleanChunks.length}: "${sentence.substring(0, 40)}${sentence.length > 40 ? '...' : ''}"` 
        });

        const audio = await tts.generate(sentence, {
          voice: voice || 'af_heart',
          speed: speed || 1.0
        });

        audioChunks.push(audio.audio);
        if (audio.sampling_rate) {
          sampleRate = audio.sampling_rate;
        }
      }

      // Add a natural 150ms silence gap between chunks
      const silenceDuration = 0.15;
      const silenceSamples = Math.round(silenceDuration * sampleRate);
      const silenceBuffer = new Float32Array(silenceSamples);
      
      const finalChunks = [];
      for (let i = 0; i < audioChunks.length; i++) {
        finalChunks.push(audioChunks[i]);
        if (i < audioChunks.length - 1) {
          finalChunks.push(silenceBuffer);
        }
      }

      // Merge buffers
      let totalLength = 0;
      for (const chunk of finalChunks) {
        totalLength += chunk.length;
      }
      const concatenatedAudio = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of finalChunks) {
        concatenatedAudio.set(chunk, offset);
        offset += chunk.length;
      }

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
      const audioDuration = (concatenatedAudio.length / sampleRate).toFixed(1);

      self.postMessage({ status: 'progress', message: `Stitched ${cleanChunks.length} chunks: Generated ${audioDuration}s of audio in ${elapsed}s.` });

      self.postMessage({
        status: 'success',
        audio: concatenatedAudio,
        sampleRate: sampleRate
      }, [concatenatedAudio.buffer]);

    } catch (error) {
      self.postMessage({ status: 'error', error: `Speech generation failed: ${error.message || error}` });
    }
  }
});

// Signal that the worker script loaded
self.postMessage({ status: 'progress', message: 'TTS Worker script loaded. Kokoro library imported from CDN.' });
