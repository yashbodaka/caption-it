// CaptionFlow AI - Main Controller
// (Transcriber is managed on a background thread inside worker.js)

// --- Application State ---
const state = {
  audioBuffer: null,
  audioFile: null,
  audioDuration: 0,
  isPlaying: false,
  currentTime: 0,
  
  // Caption list: [{ id, word, start, end }]
  captions: [],
  activeCaptionIndex: -1,
  
  // Custom Background Media
  bgType: 'grid', // 'grid', 'green', 'black', 'custom'
  bgMediaUrl: null,
  bgMediaElement: null,
  
  // Styling settings (Default: Hormozi preset)
  style: {
    preset: 'classic_bold',
    fontFamily: 'Montserrat',
    fontSize: 58,
    fontWeight: '900',
    textUppercase: true,
    textItalic: false,
    letterSpacing: -1,
    textColor: '#ffffff',
    highlightColor: '#ffeb3b',
    strokeColor: '#000000',
    strokeWidth: 8,
    shadowColor: '#000000',
    shadowBlur: 10,
    showBoxBg: false,
    boxBgColor: '#000000',
    boxBgOpacity: 80,
    boxPadding: 12,
    boxBorderRadius: 8,
    captionPosition: 65, // Vertical position (%) - safely in middle third
    wordsPerLine: 2,
    textAlignment: 'center',
    activeWordAnimation: 'scale'
  },
  
  // Tap to Sync Mode State
  tapSync: {
    isActive: false,
    words: [],
    currentIndex: 0,
    isSyncing: false
  },
  
  // API Keys (Stored in localStorage)
  api: {
    provider: 'local', // 'local', 'gemini', 'openai'
    geminiKey: localStorage.getItem('capflow_gemini_key') || '',
    openaiKey: localStorage.getItem('capflow_openai_key') || ''
  },
  
  // Exporter state
  isExporting: false,
  aspectRatio: '9:16', // '9:16', '16:9'
  
  // AI model state
  aiModelReady: false,
  pendingTranscription: false,
  workerFailed: false,
  rawWhisperChunks: null
};

// --- DOM Elements ---
const el = {
  // Config / Indicators
  statusDot: document.querySelector('#aiStatusIndicator .status-dot'),
  statusText: document.getElementById('statusText'),
  btnSettings: document.getElementById('btnSettings'),
  settingsModal: document.getElementById('settingsModal'),
  apiProvider: document.getElementById('apiProvider'),
  geminiSettings: document.getElementById('geminiSettings'),
  openaiSettings: document.getElementById('openaiSettings'),
  geminiApiKey: document.getElementById('geminiApiKey'),
  openaiApiKey: document.getElementById('openaiApiKey'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  btnCancelSettings: document.getElementById('btnCancelSettings'),
  btnModalClose: document.getElementById('btnModalClose'),

  // Background Customization
  btnAspectPortrait: document.getElementById('btnAspectPortrait'),
  btnAspectLandscape: document.getElementById('btnAspectLandscape'),
  canvasViewport: document.getElementById('canvasViewport'),
  previewCanvas: document.getElementById('previewCanvas'),
  canvasOverlay: document.getElementById('canvasOverlay'),
  canvasUploadPrompt: document.getElementById('canvasUploadPrompt'),
  canvasLoadingPrompt: document.getElementById('canvasLoadingPrompt'),
  canvasLoadingSubText: document.getElementById('canvasLoadingSubText'),
  bgMediaContainer: document.getElementById('bgMediaContainer'),
  bgButtons: document.querySelectorAll('.bg-btn'),
  btnUploadBg: document.getElementById('btnUploadBg'),
  bgFileInput: document.getElementById('bgFileInput'),
  btnActiveCustomBg: document.getElementById('btnActiveCustomBg'),

  // Subtitle customizer controls
  presetButtons: document.querySelectorAll('.preset-btn'),
  fontFamily: document.getElementById('fontFamily'),
  fontSize: document.getElementById('fontSize'),
  fontWeight: document.getElementById('fontWeight'),
  textUppercase: document.getElementById('textUppercase'),
  textItalic: document.getElementById('textItalic'),
  letterSpacing: document.getElementById('letterSpacing'),
  textColor: document.getElementById('textColor'),
  highlightColor: document.getElementById('highlightColor'),
  strokeColor: document.getElementById('strokeColor'),
  strokeWidth: document.getElementById('strokeWidth'),
  shadowColor: document.getElementById('shadowColor'),
  shadowBlur: document.getElementById('shadowBlur'),
  showBoxBg: document.getElementById('showBoxBg'),
  boxBgControls: document.getElementById('boxBgControls'),
  boxBgColor: document.getElementById('boxBgColor'),
  boxBgOpacity: document.getElementById('boxBgOpacity'),
  boxPadding: document.getElementById('boxPadding'),
  boxBorderRadius: document.getElementById('boxBorderRadius'),
  captionPosition: document.getElementById('captionPosition'),
  wordsPerLine: document.getElementById('wordsPerLine'),
  textAlignment: document.getElementById('textAlignment'),
  activeWordAnimation: document.getElementById('activeWordAnimation'),

  // Playback Timeline
  currentTimeDisplay: document.getElementById('currentTimeDisplay'),
  btnPlayPause: document.getElementById('btnPlayPause'),
  btnStop: document.getElementById('btnStop'),
  playbackVolume: document.getElementById('playbackVolume'),
  playbackSpeed: document.getElementById('playbackSpeed'),
  timelinePositionDisplay: document.getElementById('timelinePositionDisplay'),

  // Step controls & Triggers
  audioFileInput: document.getElementById('audioFileInput'),
  audioFileDetails: document.getElementById('audioFileDetails'),
  audioFileHint: document.getElementById('audioFileHint'),
  selectedFileName: document.getElementById('selectedFileName'),
  selectedFileSize: document.getElementById('selectedFileSize'),
  btnRemoveAudio: document.getElementById('btnRemoveAudio'),
  pastedText: document.getElementById('pastedText'),
  btnRunAISync: document.getElementById('btnRunAISync'),
  modelDownloadProgress: document.getElementById('modelDownloadProgress'),
  modelProgressPercent: document.getElementById('modelProgressPercent'),
  modelProgressFill: document.getElementById('modelProgressFill'),
  aiLogBox: document.getElementById('aiLogBox'),
  aiLogLines: document.getElementById('aiLogLines'),

  // Tap-to-Sync Studio Panel
  tapSyncPanel: document.getElementById('tapSyncPanel'),
  btnCloseTapSync: document.getElementById('btnCloseTapSync'),
  tapWordBubbleContainer: document.getElementById('tapWordBubbleContainer'),
  tapWordIndex: document.getElementById('tapWordIndex'),
  tapTotalWords: document.getElementById('tapTotalWords'),
  tapCurrentWord: document.getElementById('tapCurrentWord'),
  btnTapAction: document.getElementById('btnTapAction'),
  btnTapPlayPause: document.getElementById('btnTapPlayPause'),
  btnTapReset: document.getElementById('btnTapReset'),

  // Word Editor
  wordTimelineList: document.getElementById('wordTimelineList'),
  btnAddWord: document.getElementById('btnAddWord'),
  btnClearAllWords: document.getElementById('btnClearAllWords'),

  // Video Exporter
  exportFormat: document.getElementById('exportFormat'),
  exportAudio: document.getElementById('exportAudio'),
  btnExportVideo: document.getElementById('btnExportVideo'),
  btnExportSRT: document.getElementById('btnExportSRT'),
  exportProgressContainer: document.getElementById('exportProgressContainer'),
  exportProgressLabel: document.getElementById('exportProgressLabel'),
  exportProgressPercentage: document.getElementById('exportProgressPercentage'),
  exportProgressFill: document.getElementById('exportProgressFill')
};

// Canvas rendering context
const ctx = el.previewCanvas.getContext('2d');

// WaveSurfer Instance
let wavesurfer = null;

// Background Web Worker for Local AI
let aiWorker = null;

// Styling Presets Dictionary
const PRESETS = {
  classic_bold: {
    fontFamily: 'Montserrat',
    fontSize: 58,
    fontWeight: '900',
    textUppercase: true,
    textItalic: false,
    letterSpacing: -1,
    textColor: '#ffffff',
    highlightColor: '#ffeb3b',
    strokeColor: '#000000',
    strokeWidth: 8,
    shadowColor: '#000000',
    shadowBlur: 10,
    showBoxBg: false,
    activeWordAnimation: 'scale',
    wordsPerLine: 2,
    captionPosition: 65
  },
  tiktok_kinetic: {
    fontFamily: 'Oswald',
    fontSize: 60,
    fontWeight: '900',
    textUppercase: true,
    textItalic: true,
    letterSpacing: 1,
    textColor: '#ff007f',
    highlightColor: '#00f0ff',
    strokeColor: '#000000',
    strokeWidth: 9,
    shadowColor: '#000000',
    shadowBlur: 8,
    showBoxBg: false,
    activeWordAnimation: 'bounce',
    wordsPerLine: 1,
    captionPosition: 60
  },
  aesthetic_minimalist: {
    fontFamily: 'Montserrat',
    fontSize: 42,
    fontWeight: '500',
    textUppercase: false,
    textItalic: false,
    letterSpacing: 0,
    textColor: '#fffdd0',
    highlightColor: '#fffdd0',
    strokeColor: '#000000',
    strokeWidth: 0,
    shadowColor: '#000000',
    shadowBlur: 0,
    showBoxBg: true,
    boxBgColor: '#000000',
    boxBgOpacity: 35,
    boxPadding: 12,
    boxBorderRadius: 8,
    activeWordAnimation: 'none',
    wordsPerLine: 999,
    captionPosition: 75
  },
  thought_leadership: {
    fontFamily: 'Inter',
    fontSize: 44,
    fontWeight: '700',
    textUppercase: false,
    textItalic: false,
    letterSpacing: 0,
    textColor: '#ffffff',
    highlightColor: '#4f46e5',
    strokeColor: '#000000',
    strokeWidth: 3,
    shadowColor: '#000000',
    shadowBlur: 6,
    showBoxBg: false,
    activeWordAnimation: 'scale',
    wordsPerLine: 3,
    captionPosition: 68
  }
};

// --- Initialization ---
function init() {
  setupEventListeners();
  loadApiConfig();
  setupWaveSurfer();
  initWorker();
  
  // Render default canvas
  drawCanvas(0);

  // Auto-collapse details panels on mobile screens and auto-expand on desktop
  const handleResponsiveCollapse = () => {
    if (window.innerWidth <= 991) {
      document.querySelectorAll('.collapsible-section').forEach(details => {
        details.removeAttribute('open');
      });
    } else {
      document.querySelectorAll('.collapsible-section').forEach(details => {
        details.setAttribute('open', 'true');
      });
    }
  };
  
  handleResponsiveCollapse();
  window.addEventListener('resize', handleResponsiveCollapse);
}

// --- Event Listeners setup ---
function setupEventListeners() {
  // Settings & Modals
  el.btnSettings.addEventListener('click', () => {
    el.geminiApiKey.value = state.api.geminiKey;
    el.openaiApiKey.value = state.api.openaiKey;
    el.apiProvider.value = state.api.provider;
    updateApiFieldsVisibility();
    el.settingsModal.classList.remove('hidden');
  });

  el.apiProvider.addEventListener('change', updateApiFieldsVisibility);

  el.btnSaveSettings.addEventListener('click', () => {
    state.api.provider = el.apiProvider.value;
    state.api.geminiKey = el.geminiApiKey.value.trim();
    state.api.openaiKey = el.openaiApiKey.value.trim();
    
    localStorage.setItem('capflow_api_provider', state.api.provider);
    localStorage.setItem('capflow_gemini_key', state.api.geminiKey);
    localStorage.setItem('capflow_openai_key', state.api.openaiKey);
    
    el.settingsModal.classList.add('hidden');
    updateStatusIndicator();
  });

  el.btnCancelSettings.addEventListener('click', () => {
    el.settingsModal.classList.add('hidden');
  });

  el.btnModalClose.addEventListener('click', () => {
    el.settingsModal.classList.add('hidden');
  });

  // Toggle Password Visibilities
  document.querySelectorAll('.toggle-password-btn').forEach(button => {
    button.addEventListener('click', () => {
      const input = button.previousElementSibling;
      if (input.type === 'password') {
        input.type = 'text';
        button.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
      } else {
        input.type = 'password';
        button.innerHTML = '<i class="fa-solid fa-eye"></i>';
      }
    });
  });

  // Aspect Ratios
  el.btnAspectPortrait.addEventListener('click', () => {
    state.aspectRatio = '9:16';
    el.btnAspectPortrait.classList.add('active');
    el.btnAspectLandscape.classList.remove('active');
    el.canvasViewport.classList.add('portrait-mode');
    el.canvasViewport.classList.remove('landscape-mode');
    
    el.previewCanvas.width = 1080;
    el.previewCanvas.height = 1920;
    drawCanvas(wavesurfer ? wavesurfer.getCurrentTime() : 0);
  });

  el.btnAspectLandscape.addEventListener('click', () => {
    state.aspectRatio = '16:9';
    el.btnAspectLandscape.classList.add('active');
    el.btnAspectPortrait.classList.remove('active');
    el.canvasViewport.classList.add('landscape-mode');
    el.canvasViewport.classList.remove('portrait-mode');
    
    el.previewCanvas.width = 1920;
    el.previewCanvas.height = 1080;
    drawCanvas(wavesurfer ? wavesurfer.getCurrentTime() : 0);
  });

  // Background Media Button Handlers
  el.bgButtons.forEach(button => {
    button.addEventListener('click', () => {
      const bg = button.dataset.bg;
      if (bg === 'custom') {
        state.bgType = 'custom';
        el.bgButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Restore custom background media
        el.bgMediaContainer.innerHTML = '';
        if (state.bgMediaElement) {
          el.bgMediaContainer.appendChild(state.bgMediaElement);
        }
        drawCanvas(wavesurfer ? wavesurfer.getCurrentTime() : 0);
        return;
      }
      
      state.bgType = bg;
      el.bgButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Clear custom background media
      el.bgMediaContainer.innerHTML = '';
      el.canvasViewport.style.backgroundColor = '';
      
      if (bg === 'green') {
        el.canvasViewport.style.backgroundColor = '#00ff00';
      } else if (bg === 'black') {
        el.canvasViewport.style.backgroundColor = '#000000';
      }
      
      drawCanvas(wavesurfer ? wavesurfer.getCurrentTime() : 0);
    });
  });

  el.btnUploadBg.addEventListener('click', () => {
    el.bgFileInput.click();
  });

  el.bgFileInput.addEventListener('change', handleBgUpload);

  // Audio Upload Handlers bound to main canvas viewport overlay
  el.canvasOverlay.addEventListener('click', () => {
    if (el.canvasLoadingPrompt.classList.contains('hidden')) {
      el.audioFileInput.click();
    }
  });
  
  el.canvasOverlay.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (el.canvasLoadingPrompt.classList.contains('hidden')) {
      el.canvasOverlay.style.borderColor = 'var(--primary)';
      el.canvasOverlay.style.backgroundColor = 'rgba(138, 43, 226, 0.08)';
    }
  });

  el.canvasOverlay.addEventListener('dragleave', () => {
    el.canvasOverlay.style.borderColor = '';
    el.canvasOverlay.style.backgroundColor = '';
  });

  el.canvasOverlay.addEventListener('drop', (e) => {
    e.preventDefault();
    el.canvasOverlay.style.borderColor = '';
    el.canvasOverlay.style.backgroundColor = '';
    if (!el.canvasLoadingPrompt.classList.contains('hidden')) return;

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      handleAudioFile(file);
    }
  });

  el.audioFileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleAudioFile(e.target.files[0]);
  });

  el.btnRemoveAudio.addEventListener('click', removeAudioFile);

  // Style Preset triggers
  el.presetButtons.forEach(button => {
    button.addEventListener('click', () => {
      const preset = button.dataset.preset;
      applyStylePreset(preset);
      el.presetButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
    });
  });

  // Style input changes -> trigger canvas redraw
  const styleInputs = [
    el.fontFamily, el.fontSize, el.fontWeight, el.textUppercase, el.textItalic,
    el.letterSpacing, el.textColor, el.highlightColor, el.strokeColor, el.strokeWidth,
    el.shadowColor, el.shadowBlur, el.showBoxBg, el.boxBgColor, el.boxBgOpacity,
    el.boxPadding, el.boxBorderRadius, el.captionPosition, el.wordsPerLine,
    el.textAlignment, el.activeWordAnimation
  ];

  styleInputs.forEach(input => {
    input.addEventListener('input', () => {
      updateStateStyle();
      drawCanvas(wavesurfer ? wavesurfer.getCurrentTime() : 0);
    });
    input.addEventListener('change', () => {
      updateStateStyle();
      drawCanvas(wavesurfer ? wavesurfer.getCurrentTime() : 0);
    });
  });

  // Playback buttons
  el.btnPlayPause.addEventListener('click', togglePlayback);
  el.btnStop.addEventListener('click', stopPlayback);
  
  el.playbackVolume.addEventListener('input', (e) => {
    if (wavesurfer) {
      wavesurfer.setVolume(e.target.value);
    }
    const icon = document.getElementById('volumeIcon');
    if (e.target.value == 0) {
      icon.className = 'fa-solid fa-volume-mute';
    } else if (e.target.value < 0.5) {
      icon.className = 'fa-solid fa-volume-low';
    } else {
      icon.className = 'fa-solid fa-volume-high';
    }
  });

  el.playbackSpeed.addEventListener('change', (e) => {
    if (wavesurfer) {
      wavesurfer.setSpeed(parseFloat(e.target.value));
    }
  });

  // Sync Action Triggers
  el.btnRunAISync.addEventListener('click', runAISynchronization);

  // Tap-to-Sync Studio Controls
  el.btnCloseTapSync.addEventListener('click', closeTapSyncStudio);
  el.btnTapAction.addEventListener('click', recordTapWordTimestamp);
  el.btnTapPlayPause.addEventListener('click', toggleTapSyncPlayback);
  el.btnTapReset.addEventListener('click', resetTapSync);
  
  // Spacebar triggers tapping in tap-sync-studio
  window.addEventListener('keydown', handleSpacebarTapping);

  // Transcript Editors
  el.btnAddWord.addEventListener('click', addNewSubtitleWord);
  el.btnClearAllWords.addEventListener('click', clearAllSubtitleWords);

  // Real-time re-alignment when editing pasted transcript
  el.pastedText.addEventListener('input', () => {
    if (state.rawWhisperChunks) {
      realignCaptions();
    }
  });

  // Exporters
  el.btnExportVideo.addEventListener('click', startExportingSubtitlesVideo);
  el.btnExportSRT.addEventListener('click', downloadSRTFile);
}

// --- Local Storage API Keys ---
function loadApiConfig() {
  state.api.provider = localStorage.getItem('capflow_api_provider') || 'local';
  updateApiFieldsVisibility();
  updateStatusIndicator();
}

function updateApiFieldsVisibility() {
  const provider = el.apiProvider.value;
  el.geminiSettings.classList.add('hidden');
  el.openaiSettings.classList.add('hidden');
  
  if (provider === 'gemini') el.geminiSettings.classList.remove('hidden');
  if (provider === 'openai') el.openaiSettings.classList.remove('hidden');
}

function updateStatusIndicator() {
  el.statusDot.className = 'status-dot';
  if (state.api.provider === 'local') {
    el.statusDot.classList.add('idle');
    el.statusText.textContent = 'Local AI Offline';
  } else {
    const isConfigured = (state.api.provider === 'gemini' && state.api.geminiKey) || 
                          (state.api.provider === 'openai' && state.api.openaiKey);
    if (isConfigured) {
      el.statusDot.classList.add('active');
      el.statusText.textContent = `Cloud AI Mode (${state.api.provider.toUpperCase()})`;
    } else {
      el.statusDot.classList.add('idle');
      el.statusText.textContent = 'Cloud Config Needed';
    }
  }
}

// --- Setup WaveSurfer ---
function setupWaveSurfer() {
  // Read colors from CSS variables to ensure high contrast in monochrome/custom themes
  const textMuted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#8e8e9f';
  const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || 'hsl(262, 85%, 60%)';
  const secondary = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() || 'hsl(190, 95%, 48%)';

  // Format rgba/hex correctly for wavesurfer
  let computedWaveColor = 'rgba(142, 142, 159, 0.3)';
  if (textMuted.startsWith('#')) {
    computedWaveColor = textMuted + '40'; // 25% opacity
  } else if (textMuted.startsWith('rgb')) {
    computedWaveColor = textMuted.replace('rgb', 'rgba').replace(')', ', 0.25)');
  } else if (textMuted.startsWith('hsl')) {
    computedWaveColor = textMuted.replace('hsl', 'hsla').replace(')', ', 0.25)');
  } else {
    computedWaveColor = 'rgba(100, 100, 100, 0.25)';
  }

  wavesurfer = WaveSurfer.create({
    container: '#audioWaveform',
    waveColor: computedWaveColor,
    progressColor: secondary || 'var(--secondary)',
    cursorColor: primary || 'var(--primary)',
    cursorWidth: 2,
    barWidth: 2,
    barGap: 3,
    height: 48,
    fillParent: true,
    interact: true
  });

  // Sync state and redraw canvas when timeline scrubs
  wavesurfer.on('timeupdate', (time) => {
    state.currentTime = time;
    el.currentTimeDisplay.textContent = `${formatTime(time)} / ${formatTime(state.audioDuration)}`;
    el.timelinePositionDisplay.textContent = `Time: ${time.toFixed(2)}s | Frame: ${Math.floor(time * 30)} | Word Count: ${state.captions.length}`;
    
    // Highlight the active playing card
    highlightActiveSubtitleWord(time);
    
    // Draw canvas
    drawCanvas(time);
    
    // Update Tap-to-Sync bubble active states
    if (state.tapSync.isActive && state.tapSync.isSyncing) {
      updateTapBubbleActiveState(time);
    }
  });

  wavesurfer.on('play', () => {
    state.isPlaying = true;
    el.btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
    startRenderLoop();
  });

  wavesurfer.on('pause', () => {
    state.isPlaying = false;
    el.btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i> Play';
    stopRenderLoop();
  });

  wavesurfer.on('finish', () => {
    state.isPlaying = false;
    el.btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i> Play';
    stopRenderLoop();
    if (state.tapSync.isActive && state.tapSync.isSyncing) {
      finishTapSync();
    }
  });
}

// --- Web Worker Initialization (Whisper AI) ---
function initWorker() {
  if (typeof Worker !== 'undefined') {
    try {
      aiWorker = new Worker('worker.js?cb=' + Date.now(), { type: 'module' });
      setupWorkerListeners();
      addLogLine('AI Worker created (module mode). Library loading from CDN...');
    } catch (e) {
      console.warn("Module worker failed:", e.message);
      addLogLine(`Module worker failed: ${e.message}. Main-thread fallback available.`);
      state.workerFailed = true;
    }
  } else {
    addLogLine('Web Workers not supported. Main-thread AI fallback will be used.');
    state.workerFailed = true;
  }
}

function setupWorkerListeners() {
  if (!aiWorker) return;
  
  aiWorker.onerror = (e) => {
    console.error('Worker error:', e);
    addLogLine(`[WORKER ERROR] ${e.message || 'Worker script failed to load. Will use main-thread fallback.'}`);
    state.workerFailed = true;
    // Don't block — the main-thread fallback will handle it
  };
  
  aiWorker.onmessage = (event) => {
    const { status, progress, loaded, total, file, message, result, error } = event.data;

    if (status === 'downloading') {
      el.modelDownloadProgress.classList.remove('hidden');
      const percent = Math.round(progress || 0);
      el.modelProgressPercent.textContent = `${percent}%`;
      el.modelProgressFill.style.width = `${percent}%`;
      addLogLine(`Downloading: ${file || 'model'} (${((loaded || 0) / 1024 / 1024).toFixed(1)}MB / ${((total || 1) / 1024 / 1024).toFixed(1)}MB)`);
    } 
    
    else if (status === 'ready') {
      el.modelDownloadProgress.classList.add('hidden');
      el.statusDot.className = 'status-dot active';
      el.statusText.textContent = 'Local AI Ready';
      state.aiModelReady = true;
      addLogLine(message);
      
      // If a transcription was pending, auto-trigger it now
      if (state.pendingTranscription && state.audioBuffer) {
        state.pendingTranscription = false;
        sendAudioForTranscription();
      }
    } 
    
    else if (status === 'progress') {
      addLogLine(message);
    } 
    
    else if (status === 'success') {
      el.statusDot.className = 'status-dot active';
      el.statusText.textContent = 'Sync Complete';
      addLogLine('Speech-to-Text completed successfully!');
      processLocalWhisperOutput(result);
    } 
    
    else if (status === 'error') {
      addLogLine(`[WORKER ERROR] ${error}`);
      state.pendingTranscription = false;
      
      // If the worker's AI library/model fails, mark it and try main-thread fallback
      if (error && (error.includes('model') || error.includes('load') || error.includes('Unsupported'))) {
        addLogLine('Worker AI failed. Switching to main-thread AI fallback...');
        state.workerFailed = true;
        // Auto-retry with main-thread if there was a pending transcription
        if (state.audioBuffer) {
          runMainThreadTranscription();
        }
      } else {
        el.statusDot.className = 'status-dot idle';
        el.statusText.textContent = 'AI Error';
        alert(`AI Error: ${error}`);
        resetUploadPrompt();
      }
    }
  };
}

function addLogLine(text) {
  el.aiLogBox.classList.remove('hidden');
  const line = document.createElement('div');
  line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  el.aiLogLines.appendChild(line);
  el.aiLogLines.scrollTop = el.aiLogLines.scrollHeight;
}

function showTranscribingLoading(message = 'AI Sync Transcribing...') {
  el.canvasOverlay.classList.remove('hidden');
  el.canvasOverlay.classList.remove('clickable');
  el.canvasUploadPrompt.classList.add('hidden');
  el.canvasLoadingPrompt.classList.remove('hidden');
  el.canvasLoadingSubText.textContent = message;
}

function hideTranscribingLoading() {
  el.canvasOverlay.classList.add('hidden');
  el.canvasOverlay.classList.remove('clickable');
  el.canvasUploadPrompt.classList.add('hidden');
  el.canvasLoadingPrompt.classList.add('hidden');
}

function resetUploadPrompt() {
  el.canvasOverlay.classList.remove('hidden');
  el.canvasOverlay.classList.add('clickable');
  el.canvasUploadPrompt.classList.remove('hidden');
  el.canvasLoadingPrompt.classList.add('hidden');
}

// --- Upload Handlers ---
function handleAudioFile(file) {
  state.audioFile = file;
  
  // Update UI file status
  el.audioFileDetails.classList.remove('hidden');
  el.selectedFileName.textContent = file.name;
  el.selectedFileSize.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
  if (el.audioFileHint) el.audioFileHint.classList.add('hidden');

  // Change canvas overlay to show "Decoding Audio..."
  showTranscribingLoading('Decoding audio file...');

  // Load into wavesurfer
  const objectUrl = URL.createObjectURL(file);
  wavesurfer.load(objectUrl);

  // Decode audio data to extract Float32Array for local Whisper model
  const reader = new FileReader();
  reader.onload = async (e) => {
    const arrayBuffer = e.target.result;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    addLogLine('Decoding audio file...');
    try {
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      state.audioBuffer = decodedBuffer;
      state.audioDuration = decodedBuffer.duration;
      
      // Original buffer diagnostics
      const origChannelData = decodedBuffer.getChannelData(0);
      let origMax = 0;
      let origMin = 0;
      let origNonZeroCount = 0;
      for (let i = 0; i < Math.min(origChannelData.length, 50000); i++) {
        const val = origChannelData[i];
        if (val > origMax) origMax = val;
        if (val < origMin) origMin = val;
        if (Math.abs(val) > 1e-4) origNonZeroCount++;
      }
      addLogLine(`Original audio stats (first 50k samples): min=${origMin.toFixed(4)}, max=${origMax.toFixed(4)}, nonZero=${origNonZeroCount}/50000`);
      
      // Update UI displays
      el.currentTimeDisplay.textContent = `00:00.0 / ${formatTime(decodedBuffer.duration)}`;
      
      // Enable Sync triggers
      el.btnRunAISync.removeAttribute('disabled');
      el.btnPlayPause.removeAttribute('disabled');
      el.btnStop.removeAttribute('disabled');
      
      // Keep overlay open, show "AI Sync Transcribing..."
      showTranscribingLoading('AI Sync Transcribing...');
      
      addLogLine(`Audio file decoded. Duration: ${decodedBuffer.duration.toFixed(2)}s`);
      
      // Automatically run synchronization
      addLogLine('Automatically starting AI synchronization...');
      runAISynchronization();
    } catch (err) {
      addLogLine(`[ERROR] Audio decode failed: ${err.message}`);
      alert(`Could not decode audio file: ${err.message}`);
      resetUploadPrompt();
    }
  };
  reader.readAsArrayBuffer(file);
}

function removeAudioFile() {
  state.audioFile = null;
  state.audioBuffer = null;
  state.audioDuration = 0;
  
  wavesurfer.destroy();
  setupWaveSurfer();
  
  // Reset UI
  el.audioFileDetails.classList.add('hidden');
  if (el.audioFileHint) el.audioFileHint.classList.remove('hidden');
  resetUploadPrompt();
  
  el.btnRunAISync.setAttribute('disabled', 'true');
  el.btnPlayPause.setAttribute('disabled', 'true');
  el.btnStop.setAttribute('disabled', 'true');
  el.btnExportVideo.setAttribute('disabled', 'true');
  el.btnExportSRT.setAttribute('disabled', 'true');
  el.btnAddWord.setAttribute('disabled', 'true');
  el.btnClearAllWords.setAttribute('disabled', 'true');

  state.captions = [];
  renderSubtitleEditor();
  drawCanvas(0);
}

async function handleBgUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  state.bgType = 'custom';
  el.bgButtons.forEach(btn => btn.classList.remove('active'));
  if (el.btnActiveCustomBg) {
    el.btnActiveCustomBg.style.display = 'inline-flex';
    el.btnActiveCustomBg.classList.add('active');
  }

  const mediaUrl = URL.createObjectURL(file);
  state.bgMediaUrl = mediaUrl;
  
  el.bgMediaContainer.innerHTML = '';
  
  if (file.type.startsWith('video/')) {
    const video = document.createElement('video');
    video.src = mediaUrl;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    el.bgMediaContainer.appendChild(video);
    state.bgMediaElement = video;
    
    // Play background video if audio is playing
    if (state.isPlaying) {
      video.play();
    }
  } else if (file.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = mediaUrl;
    el.bgMediaContainer.appendChild(img);
    state.bgMediaElement = img;
  }
}

// --- Sync engine implementations ---

// Dynamic trigger based on Settings Modal selection
async function runAISynchronization() {
  if (!state.audioBuffer) {
    alert('Please upload an audio file first (Step 1).');
    return;
  }

  showTranscribingLoading('AI Sync Transcribing...');

  if (state.api.provider === 'local') {
    el.statusDot.className = 'status-dot loading';
    el.statusText.textContent = 'Loading Local AI...';
    wavesurfer.pause();

    // If worker has failed (or never loaded), use main-thread fallback directly
    if (state.workerFailed || !aiWorker) {
      addLogLine('Using main-thread AI (worker unavailable)...');
      await runMainThreadTranscription();
      return;
    }

    // If model is already loaded in worker, send transcription directly
    if (state.aiModelReady) {
      state.pendingTranscription = true;
      await sendAudioForTranscription();
    } else {
      // Load the model first — transcription will be triggered on 'ready' callback
      state.pendingTranscription = true;
      addLogLine('Requesting AI model load via worker...');
      aiWorker.postMessage({ type: 'load' });
    }
  }
  
  else if (state.api.provider === 'gemini') {
    if (!state.api.geminiKey) {
      alert('Please enter your Google Gemini API Key in Settings first.');
      el.btnSettings.click();
      return;
    }
    await runGeminiCloudSync();
  }
  
  else if (state.api.provider === 'openai') {
    if (!state.api.openaiKey) {
      alert('Please enter your OpenAI API Key in Settings first.');
      el.btnSettings.click();
      return;
    }
    await runOpenAICloudSync();
  }
}

// Helper: send audio buffer to worker for transcription
async function sendAudioForTranscription() {
  addLogLine('Preparing audio for transcription...');
  const downsampledAudio = await downsampleAudioBuffer(state.audioBuffer, 16000);
  addLogLine('Sending audio to AI worker...');
  aiWorker.postMessage({
    type: 'transcribe',
    data: { 
      audio: downsampledAudio,
      duration: state.audioDuration
    }
  }, [downsampledAudio.buffer]);
}

// --- Main-Thread AI Fallback ---
// Runs Whisper directly in the browser's main thread when the worker fails.
// Uses dynamic import() to load @xenova/transformers from a CDN.
let mainThreadTranscriber = null;

function showAIOverlay(title, message) {
  const overlay = document.getElementById('aiLoadingOverlay');
  document.getElementById('aiLoadingTitle').textContent = title;
  document.getElementById('aiLoadingMessage').textContent = message;
  document.getElementById('aiLoadingProgressFill').style.width = '0%';
  overlay.classList.remove('hidden');
}

function updateAIOverlay(message, progress) {
  document.getElementById('aiLoadingMessage').textContent = message;
  if (progress !== undefined) {
    document.getElementById('aiLoadingProgressFill').style.width = `${Math.round(progress)}%`;
  }
}

function hideAIOverlay() {
  document.getElementById('aiLoadingOverlay').classList.add('hidden');
}

async function runMainThreadTranscription() {
  showAIOverlay('Loading AI Model...', 'Importing Whisper speech recognition library from CDN. Please wait...');
  addLogLine('[Main Thread] Starting AI transcription...');

  try {
    // Step 1: Load the library if not already loaded
    if (!mainThreadTranscriber) {
      addLogLine('[Main Thread] Importing @xenova/transformers from jsdelivr...');
      updateAIOverlay('Importing AI library from CDN...', 5);
      
      let transformersModule = null;
      
      // Try jsdelivr first (serves raw ESM, no tree-shaking)
      try {
        transformersModule = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
        addLogLine('[Main Thread] Library loaded from jsdelivr successfully.');
      } catch (e1) {
        addLogLine(`[Main Thread] jsdelivr failed: ${e1.message}. Trying esm.sh...`);
        updateAIOverlay('First CDN failed. Trying alternative...', 10);
        
        try {
          transformersModule = await import('https://esm.sh/@xenova/transformers@2.17.2');
          addLogLine('[Main Thread] Library loaded from esm.sh successfully.');
        } catch (e2) {
          addLogLine(`[Main Thread] esm.sh also failed: ${e2.message}. Trying unpkg...`);
          updateAIOverlay('Trying third CDN source...', 15);
          
          transformersModule = await import('https://unpkg.com/@xenova/transformers@2.17.2');
          addLogLine('[Main Thread] Library loaded from unpkg successfully.');
        }
      }

      const { pipeline, env } = transformersModule;
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      
      // Step 2: Download and initialize the Whisper model
      updateAIOverlay('Downloading Whisper AI model (~75MB). This only happens once...', 20);
      addLogLine('[Main Thread] Creating speech recognition pipeline (Xenova/whisper-tiny.en)...');

      mainThreadTranscriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
        progress_callback: (data) => {
          if (data.status === 'progress' && data.progress !== undefined) {
            const percent = 20 + (data.progress * 0.6); // Map 0-100% to 20-80% of our bar
            updateAIOverlay(`Downloading model: ${Math.round(data.progress)}%`, percent);
            addLogLine(`Downloading: ${data.file || 'model'} — ${Math.round(data.progress)}%`);
          } else if (data.status === 'done') {
            addLogLine(`Downloaded: ${data.file || 'file'}`);
          }
        }
      });

      addLogLine('[Main Thread] Whisper model loaded and ready!');
      el.statusDot.className = 'status-dot active';
      el.statusText.textContent = 'AI Ready (Main Thread)';
      state.aiModelReady = true;
    }

    // Step 3: Downsample audio to 16000Hz
    updateAIOverlay('Preparing audio for transcription...', 82);
    addLogLine('[Main Thread] Downsampling audio to 16000Hz...');
    const audioData = await downsampleAudioBuffer(state.audioBuffer, 16000);

    // Step 4: Run inference
    updateAIOverlay('Transcribing audio with Whisper AI... (this may take 10-30 seconds)', 85);
    addLogLine('[Main Thread] Running Whisper transcription...');

    const options = { return_timestamps: 'word' };
    if (state.audioDuration > 30) {
      options.chunk_length_s = 30;
      options.stride_length_s = 5;
    }
    const result = await mainThreadTranscriber(audioData, options);

    updateAIOverlay('Processing results...', 98);
    addLogLine('[Main Thread] Transcription complete!');

    // Step 5: Process the output
    processLocalWhisperOutput(result);

    el.statusDot.className = 'status-dot active';
    el.statusText.textContent = 'Sync Complete';
    hideAIOverlay();
    addLogLine('[Main Thread] AI Sync finished successfully!');

  } catch (error) {
    hideAIOverlay();
    el.statusDot.className = 'status-dot idle';
    el.statusText.textContent = 'AI Failed';
    addLogLine(`[Main Thread ERROR] ${error.message}`);
    console.error('Main thread AI error:', error);
    alert(`AI Transcription Failed: ${error.message}\n\nAlternatives:\n1. Use "Smart Estimator Sync" (paste your text + upload audio)\n2. Use "Tap-to-Sync" to manually sync\n3. Configure Gemini API in Settings for cloud sync`);
    resetUploadPrompt();
  }
}

// Downsamples AudioBuffer to 16000Hz mono Float32Array for Whisper model
async function downsampleAudioBuffer(audioBuffer, targetSampleRate) {
  const numChannels = 1; // Force mono
  const duration = audioBuffer.duration;
  const offlineCtx = new OfflineAudioContext(numChannels, duration * targetSampleRate, targetSampleRate);
  
  const bufferSource = offlineCtx.createBufferSource();
  bufferSource.buffer = audioBuffer;
  bufferSource.connect(offlineCtx.destination);
  bufferSource.start(0);
  
  addLogLine(`Downsampling audio from ${audioBuffer.sampleRate}Hz to ${targetSampleRate}Hz...`);
  const renderedBuffer = await offlineCtx.startRendering();
  const channelData = renderedBuffer.getChannelData(0);

  // Stats calculation for diagnostic logging
  let maxVal = 0;
  let minVal = 0;
  let sumSq = 0;
  let nonZeroCount = 0;
  for (let i = 0; i < channelData.length; i++) {
    const val = channelData[i];
    if (val > maxVal) maxVal = val;
    if (val < minVal) minVal = val;
    sumSq += val * val;
    if (Math.abs(val) > 1e-5) nonZeroCount++;
  }
  const rms = Math.sqrt(sumSq / channelData.length);
  addLogLine(`Downsampled audio stats: len=${channelData.length}, min=${minVal.toFixed(4)}, max=${maxVal.toFixed(4)}, RMS=${rms.toFixed(4)}, nonZero=${nonZeroCount}/${channelData.length}`);

  return channelData;
}

// Helper: Normalizes segment-level or word-level chunks into a flat array of words with timestamps
function getWordLevelTimestamps(chunks) {
  const words = [];
  chunks.forEach(chunk => {
    const text = chunk.text.trim();
    if (!text) return;
    
    const start = chunk.timestamp[0] !== null ? chunk.timestamp[0] : 0;
    const end = chunk.timestamp[1] !== null ? chunk.timestamp[1] : start + 0.4;
    
    // Check if the chunk is segment-level (has spaces) or word-level
    const splitWords = text.split(/\s+/).filter(w => w.length > 0);
    if (splitWords.length <= 1) {
      // Already a single word-level chunk
      words.push({
        word: text,
        start: start,
        end: end
      });
    } else {
      // Segment-level chunk (fallback), distribute words uniformly over the segment duration
      const duration = end - start;
      const timePerWord = duration / splitWords.length;
      splitWords.forEach((w, idx) => {
        words.push({
          word: w,
          start: start + idx * timePerWord,
          end: start + (idx + 1) * timePerWord
        });
      });
    }
  });
  return words;
}

// Aligns custom user script words with the speech model's word-level timestamps proportionally
function alignPastedTextWithWordTimestamps(pastedText, transcribedWords) {
  const userWords = pastedText.split(/\s+/).filter(w => w.length > 0);
  if (userWords.length === 0) return [];
  
  if (transcribedWords.length === 0) {
    // Fallback: If no transcription words, distribute uniformly over audio duration
    const totalDuration = state.audioDuration || 5;
    const timePerWord = totalDuration / userWords.length;
    return userWords.map((word, idx) => ({
      id: idx + 1,
      word: word,
      start: parseFloat((idx * timePerWord).toFixed(3)),
      end: parseFloat(((idx + 1) * timePerWord).toFixed(3))
    }));
  }

  // Map each user word to its proportionally matching transcribed word timestamp
  return userWords.map((word, idx) => {
    const mappedIdx = Math.min(
      transcribedWords.length - 1,
      Math.round(idx * (transcribedWords.length - 1) / (userWords.length - 1))
    );
    const match = transcribedWords[mappedIdx];
    return {
      id: idx + 1,
      word: word,
      start: parseFloat(match.start.toFixed(3)),
      end: parseFloat(match.end.toFixed(3))
    };
  });
}

// Re-aligns existing transcription chunks with current text in the textarea
function realignCaptions() {
  if (!state.rawWhisperChunks) return;
  
  const pastedTextRaw = el.pastedText.value.trim();
  const transcribedWords = getWordLevelTimestamps(state.rawWhisperChunks);
  
  if (pastedTextRaw) {
    state.captions = alignPastedTextWithWordTimestamps(pastedTextRaw, transcribedWords);
    addLogLine(`Successfully aligned ${state.captions.length} custom text words with precise word-level audio timestamps!`);
  } else {
    // Use transcribed words directly as captions
    state.captions = transcribedWords.map((w, idx) => ({
      id: idx + 1,
      word: w.word,
      start: parseFloat(w.start.toFixed(3)),
      end: parseFloat(w.end.toFixed(3))
    }));
    addLogLine(`Generated ${state.captions.length} word captions directly from Whisper AI.`);
  }
  
  onCaptionsUpdated();
}

// Processes the Local Whisper Output segments
function processLocalWhisperOutput(result) {
  addLogLine(`Whisper output text: "${result.text}"`);
  
  let rawChunks = result.chunks || [];
  if (rawChunks.length === 0 && result.text) {
    rawChunks = [{ text: result.text, timestamp: [0, state.audioDuration] }];
  }

  // Cache raw chunks in state so we can instantly re-align if user edits text
  state.rawWhisperChunks = rawChunks;
  
  realignCaptions();
}

// --- Gemini Cloud Sync ---
async function runGeminiCloudSync() {
  addLogLine('Initializing Gemini Cloud Sync...');
  wavesurfer.pause();
  showTranscribingLoading('Uploading & Transcribing with Google Gemini AI...');

  const file = state.audioFile;
  const apiKey = state.api.geminiKey;

  // Convert audio file to Base64
  addLogLine('Reading audio file as Base64...');
  const reader = new FileReader();
  reader.readAsDataURL(file);
  
  reader.onload = async () => {
    const base64Data = reader.result.split(',')[1];
    
    try {
      addLogLine('Uploading audio and transcribing via Gemini 1.5 Flash...');
      
      const prompt = `Transcribe the audio file. Return a JSON array of word objects, where each object has precisely:
      'word' (string, the exact spoken word),
      'start' (float, start time in seconds),
      'end' (float, end time in seconds).
      Return ONLY valid raw JSON array, no markdown markers, no extra text, just raw JSON.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: file.type, data: base64Data } },
              { text: prompt }
            ]
          }],
          generationConfig: { 
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.statusText} (${response.status})`);
      }

      const resJson = await response.json();
      const textResponse = resJson.candidates[0].content.parts[0].text;
      
      // Parse JSON from Gemini response
      let geminiWords = [];
      try {
        geminiWords = JSON.parse(textResponse.trim());
      } catch (err) {
        // Strip markdown backticks if Gemini added any
        const cleanedText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        geminiWords = JSON.parse(cleanedText);
      }

      if (Array.isArray(geminiWords)) {
        // If user provided custom text, we match words, else use direct gemini words
        const pastedTextRaw = el.pastedText.value.trim();
        if (pastedTextRaw) {
          const userWords = pastedTextRaw.split(/\s+/).filter(w => w.length > 0);
          state.captions = userWords.map((word, idx) => {
            const match = geminiWords[Math.min(idx, geminiWords.length - 1)] || { start: 0, end: 1 };
            return {
              id: idx + 1,
              word: word,
              start: parseFloat(match.start.toFixed(3)),
              end: parseFloat(match.end.toFixed(3))
            };
          });
        } else {
          state.captions = geminiWords.map((item, idx) => ({
            id: idx + 1,
            word: item.word,
            start: parseFloat(item.start.toFixed(3)),
            end: parseFloat(item.end.toFixed(3))
          }));
        }
        
        onCaptionsUpdated();
        addLogLine(`Gemini synced ${state.captions.length} words!`);
      } else {
        throw new Error('Gemini API returned JSON that was not an array of words.');
      }
    } catch (err) {
      addLogLine(`[ERROR] Gemini Cloud Sync failed: ${err.message}`);
      alert(`Gemini Sync failed: ${err.message}`);
      resetUploadPrompt();
    }
  };
}

// --- OpenAI Cloud Sync ---
async function runOpenAICloudSync() {
  addLogLine('Initializing OpenAI Whisper Cloud Sync...');
  wavesurfer.pause();
  showTranscribingLoading('Uploading & Transcribing with OpenAI Whisper API...');

  const file = state.audioFile;
  const apiKey = state.api.openaiKey;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');

  try {
    addLogLine('Sending audio file to OpenAI Whisper API...');
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.statusText} (${response.status})`);
    }

    const resJson = await response.json();
    const whisperWords = resJson.words || [];

    if (whisperWords.length > 0) {
      const pastedTextRaw = el.pastedText.value.trim();
      if (pastedTextRaw) {
        const userWords = pastedTextRaw.split(/\s+/).filter(w => w.length > 0);
        state.captions = userWords.map((word, idx) => {
          const match = whisperWords[Math.min(idx, whisperWords.length - 1)] || { start: 0, end: 1 };
          return {
            id: idx + 1,
            word: word,
            start: parseFloat(match.start.toFixed(3)),
            end: parseFloat(match.end.toFixed(3))
          };
        });
      } else {
        state.captions = whisperWords.map((w, idx) => ({
          id: idx + 1,
          word: w.word,
          start: parseFloat(w.start.toFixed(3)),
          end: parseFloat(w.end.toFixed(3))
        }));
      }

      onCaptionsUpdated();
      addLogLine(`OpenAI synced ${state.captions.length} words!`);
    } else {
      throw new Error('OpenAI Whisper did not return word-level timestamps in the response.');
    }
  } catch (err) {
    addLogLine(`[ERROR] OpenAI Cloud Sync failed: ${err.message}`);
    alert(`OpenAI Sync failed: ${err.message}`);
    resetUploadPrompt();
  }
}

// --- Smart Time Estimator (Weighted by word length for natural pacing) ---
function runEstimatorSync() {
  const pastedTextRaw = el.pastedText.value.trim();
  if (!pastedTextRaw) {
    alert('Please enter/paste your transcription narration text in Step 2 to use the Smart Estimator.');
    el.pastedText.focus();
    return;
  }

  wavesurfer.pause();
  addLogLine('Running Smart Time Estimator Sync...');

  const words = pastedTextRaw.split(/\s+/).filter(w => w.length > 0);
  const totalDuration = state.audioDuration;
  
  if (words.length === 0 || totalDuration === 0) return;

  // Weight each word's duration by its character count (longer words spoken slower)
  // Add a minimum weight so short words like "I", "a" still get reasonable time
  const weights = words.map(w => Math.max(w.length, 2));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  // Small padding at start and end of audio to avoid clipping
  const padding = Math.min(0.15, totalDuration * 0.02);
  const usableDuration = totalDuration - (padding * 2);

  let currentTime = padding;
  state.captions = words.map((word, index) => {
    const wordDuration = (weights[index] / totalWeight) * usableDuration;
    const start = parseFloat(currentTime.toFixed(3));
    currentTime += wordDuration;
    const end = parseFloat(currentTime.toFixed(3));
    return { id: index + 1, word, start, end };
  });

  onCaptionsUpdated();
  addLogLine(`Smart Time Estimator synced ${state.captions.length} words over ${totalDuration.toFixed(2)}s duration. Captions are ready!`);
  alert('Captions synced! Press Play to preview. Use Tap-to-Sync for fine-tuning if needed.');
}

// --- Tap-to-Sync Studio Engine ---
function openTapSyncStudio() {
  const pastedTextRaw = el.pastedText.value.trim();
  if (!pastedTextRaw) {
    alert('Please paste the narration text in Step 2 first. Tap-to-sync requires your text inputs to sync.');
    el.pastedText.focus();
    return;
  }

  // Reset and prepare tapSync state
  state.tapSync.words = pastedTextRaw.split(/\s+/).filter(w => w.length > 0).map((w, index) => ({
    index: index,
    word: w,
    timestamp: null
  }));

  state.tapSync.currentIndex = 0;
  state.tapSync.isActive = true;
  state.tapSync.isSyncing = false;

  wavesurfer.pause();
  wavesurfer.setTime(0);

  // Render UI elements inside Tap overlay
  el.tapTotalWords.textContent = state.tapSync.words.length;
  el.tapWordIndex.textContent = '0';
  el.tapCurrentWord.textContent = 'PRESS PLAY TO START';
  el.btnTapAction.setAttribute('disabled', 'true');
  
  // Render word bubbles
  el.tapWordBubbleContainer.innerHTML = '';
  state.tapSync.words.forEach((item, idx) => {
    const bubble = document.createElement('span');
    bubble.className = 'word-bubble';
    bubble.id = `tap-bubble-${idx}`;
    bubble.textContent = item.word;
    el.tapWordBubbleContainer.appendChild(bubble);
  });

  // Display overlay panel
  el.tapSyncPanel.classList.remove('hidden');
  addLogLine('Opened Tap-to-Sync Studio.');
}

function closeTapSyncStudio() {
  state.tapSync.isActive = false;
  state.tapSync.isSyncing = false;
  wavesurfer.pause();
  el.tapSyncPanel.classList.add('hidden');
  addLogLine('Closed Tap-to-Sync Studio.');
}

function toggleTapSyncPlayback() {
  if (!state.tapSync.isActive) return;

  if (wavesurfer.isPlaying()) {
    wavesurfer.pause();
    state.tapSync.isSyncing = false;
    el.btnTapPlayPause.innerHTML = '<i class="fa-solid fa-play"></i> Resume Sync';
    el.btnTapAction.setAttribute('disabled', 'true');
  } else {
    // If starting from beginning
    if (state.tapSync.currentIndex === 0) {
      wavesurfer.setTime(0);
      resetTapSyncBubbles();
    }
    
    wavesurfer.play();
    state.tapSync.isSyncing = true;
    el.btnTapPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i> Pause Sync';
    el.btnTapAction.removeAttribute('disabled');
    
    // Highlight the active word
    updateTapDashboardWord();
  }
}

function resetTapSync() {
  wavesurfer.pause();
  wavesurfer.setTime(0);
  state.tapSync.currentIndex = 0;
  state.tapSync.isSyncing = false;
  
  state.tapSync.words.forEach(w => w.timestamp = null);
  
  resetTapSyncBubbles();
  
  el.tapWordIndex.textContent = '0';
  el.tapCurrentWord.textContent = 'PRESS PLAY TO START';
  el.btnTapPlayPause.innerHTML = '<i class="fa-solid fa-play"></i> Start Sync';
  el.btnTapAction.setAttribute('disabled', 'true');
}

function resetTapSyncBubbles() {
  document.querySelectorAll('.word-bubble').forEach(bubble => {
    bubble.className = 'word-bubble';
  });
}

function handleSpacebarTapping(e) {
  if (e.code === 'Space') {
    // If tap sync overlay is active, hijack spacebar for tapping
    if (state.tapSync.isActive && state.tapSync.isSyncing) {
      e.preventDefault();
      recordTapWordTimestamp();
    }
  }
}

function recordTapWordTimestamp() {
  if (!state.tapSync.isActive || !state.tapSync.isSyncing) return;
  
  const curTime = wavesurfer.getCurrentTime();
  const index = state.tapSync.currentIndex;
  const total = state.tapSync.words.length;

  if (index >= total) return;

  // Save start time of this word
  state.tapSync.words[index].timestamp = curTime;
  
  // Highlight bubble as synced
  const bubble = document.getElementById(`tap-bubble-${index}`);
  if (bubble) {
    bubble.classList.remove('active');
    bubble.classList.add('synced');
  }

  // Advance
  state.tapSync.currentIndex++;
  
  if (state.tapSync.currentIndex >= total) {
    // Finish sync!
    finishTapSync();
  } else {
    // Update dashboard and highlight next bubble
    updateTapDashboardWord();
  }
}

function updateTapDashboardWord() {
  const index = state.tapSync.currentIndex;
  const word = state.tapSync.words[index].word;
  
  el.tapWordIndex.textContent = index + 1;
  el.tapCurrentWord.textContent = word;

  // Reset active on all, then add to current
  document.querySelectorAll('.word-bubble').forEach(b => b.classList.remove('active'));
  
  const activeBubble = document.getElementById(`tap-bubble-${index}`);
  if (activeBubble) {
    activeBubble.classList.add('active');
    // Scroll active bubble into view
    activeBubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function updateTapBubbleActiveState(time) {
  // Find which word matches current time based on currently tapped timestamps
  // Useful for highlighting when reviewing synced taps
}

function finishTapSync() {
  wavesurfer.pause();
  state.tapSync.isSyncing = false;
  el.btnTapAction.setAttribute('disabled', 'true');
  el.btnTapPlayPause.innerHTML = '<i class="fa-solid fa-play"></i> Start Sync';

  // Build captions from tap timings
  const newCaptions = [];
  const words = state.tapSync.words;

  words.forEach((item, idx) => {
    const start = item.timestamp !== null ? item.timestamp : 0;
    
    // End time is either start of next word, or start + 1s (if last word)
    let end = idx < words.length - 1 && words[idx + 1].timestamp !== null 
              ? words[idx + 1].timestamp 
              : start + 0.8;
              
    // Ensure chronological order and non-zero duration
    if (end <= start) end = start + 0.3;

    newCaptions.push({
      id: idx + 1,
      word: item.word,
      start: parseFloat(start.toFixed(3)),
      end: parseFloat(end.toFixed(3))
    });
  });

  state.captions = newCaptions;
  onCaptionsUpdated();
  
  addLogLine(`Tap-to-Sync completed! Created ${state.captions.length} captions.`);
  alert('Caption timings are successfully synchronized via Tap-to-Sync!');
  closeTapSyncStudio();
}

// --- Captions Core handlers ---
function onCaptionsUpdated() {
  renderSubtitleEditor();
  
  // Enable exporters
  if (state.captions.length > 0) {
    el.btnExportVideo.removeAttribute('disabled');
    el.btnExportSRT.removeAttribute('disabled');
    el.btnAddWord.removeAttribute('disabled');
    el.btnClearAllWords.removeAttribute('disabled');
    hideTranscribingLoading();
  } else {
    el.btnExportVideo.setAttribute('disabled', 'true');
    el.btnExportSRT.setAttribute('disabled', 'true');
    el.btnAddWord.setAttribute('disabled', 'true');
    el.btnClearAllWords.setAttribute('disabled', 'true');
    resetUploadPrompt();
  }

  // Redraw
  drawCanvas(wavesurfer ? wavesurfer.getCurrentTime() : 0);
}

// Render Subtitle grid editor in right panel
function renderSubtitleEditor() {
  el.wordTimelineList.innerHTML = '';

  if (state.captions.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'empty-transcript-placeholder';
    placeholder.innerHTML = `
      <i class="fa-solid fa-quote-left"></i>
      <p>No synced subtitles yet.</p>
      <p>Run the AI Sync or use the Tap-to-Sync studio above to generate synchronized captions.</p>
    `;
    el.wordTimelineList.appendChild(placeholder);
    return;
  }

  state.captions.forEach((cap, index) => {
    const card = document.createElement('div');
    card.className = 'word-edit-card';
    card.id = `edit-card-${index}`;
    card.dataset.index = index;

    // Word index
    const idxSpan = document.createElement('span');
    idxSpan.className = 'word-num';
    idxSpan.textContent = cap.id;
    card.appendChild(idxSpan);

    // Text Input
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = cap.word;
    textInput.addEventListener('change', (e) => {
      state.captions[index].word = e.target.value;
      drawCanvas(wavesurfer.getCurrentTime());
    });
    card.appendChild(textInput);

    // Start Time input
    const startGroup = document.createElement('div');
    startGroup.className = 'time-input-group';
    startGroup.innerHTML = `<span>IN</span>`;
    const startInput = document.createElement('input');
    startInput.type = 'number';
    startInput.value = cap.start;
    startInput.step = '0.05';
    startInput.min = '0';
    startInput.addEventListener('change', (e) => {
      const val = parseFloat(e.target.value);
      state.captions[index].start = parseFloat(val.toFixed(3));
      drawCanvas(wavesurfer.getCurrentTime());
    });
    startGroup.appendChild(startInput);
    card.appendChild(startGroup);

    // End Time input
    const endGroup = document.createElement('div');
    endGroup.className = 'time-input-group';
    endGroup.innerHTML = `<span>OUT</span>`;
    const endInput = document.createElement('input');
    endInput.type = 'number';
    endInput.value = cap.end;
    endInput.step = '0.05';
    endInput.min = '0';
    endInput.addEventListener('change', (e) => {
      const val = parseFloat(e.target.value);
      state.captions[index].end = parseFloat(val.toFixed(3));
      drawCanvas(wavesurfer.getCurrentTime());
    });
    endGroup.appendChild(endInput);
    card.appendChild(endGroup);

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'word-card-delete';
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    deleteBtn.addEventListener('click', () => {
      deleteSubtitleWord(index);
    });
    card.appendChild(deleteBtn);

    // Click card to jump playhead to start time
    card.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'I') {
        wavesurfer.setTime(cap.start);
      }
    });

    el.wordTimelineList.appendChild(card);
  });
}

function highlightActiveSubtitleWord(time) {
  document.querySelectorAll('.word-edit-card').forEach(card => card.classList.remove('active-playing'));

  const activeIndex = state.captions.findIndex(c => time >= c.start && time <= c.end);
  if (activeIndex !== -1) {
    state.activeCaptionIndex = activeIndex;
    const card = document.getElementById(`edit-card-${activeIndex}`);
    if (card) {
      card.classList.add('active-playing');
      
      // Manual scroll container scrolling that NEVER bubbles up to the main window viewport
      const container = el.wordTimelineList;
      if (container) {
        const cardTop = card.offsetTop;
        const cardHeight = card.offsetHeight;
        const containerHeight = container.clientHeight;
        const containerScroll = container.scrollTop;
        if (cardTop < containerScroll || (cardTop + cardHeight) > (containerScroll + containerHeight)) {
          container.scrollTo({
            top: cardTop - (containerHeight / 2) + (cardHeight / 2),
            behavior: 'smooth'
          });
        }
      }
    }
  } else {
    state.activeCaptionIndex = -1;
  }
}

function addNewSubtitleWord() {
  const lastCap = state.captions[state.captions.length - 1];
  const start = lastCap ? lastCap.end : 0.0;
  const end = start + 1.0;

  state.captions.push({
    id: state.captions.length + 1,
    word: 'NEW WORD',
    start: parseFloat(start.toFixed(3)),
    end: parseFloat(end.toFixed(3))
  });

  onCaptionsUpdated();
}

function deleteSubtitleWord(index) {
  state.captions.splice(index, 1);
  // Re-id all remaining captions
  state.captions.forEach((c, idx) => {
    c.id = idx + 1;
  });
  onCaptionsUpdated();
}

function clearAllSubtitleWords() {
  if (confirm('Are you sure you want to clear all subtitle captions?')) {
    state.captions = [];
    onCaptionsUpdated();
  }
}

// --- Apply style preset configs ---
function applyStylePreset(presetName) {
  const preset = PRESETS[presetName];
  if (!preset) return;

  state.style.preset = presetName;
  state.style.fontFamily = preset.fontFamily;
  state.style.fontSize = preset.fontSize;
  state.style.fontWeight = preset.fontWeight;
  state.style.textUppercase = preset.textUppercase;
  state.style.textItalic = preset.textItalic;
  state.style.letterSpacing = preset.letterSpacing;
  state.style.textColor = preset.textColor;
  state.style.highlightColor = preset.highlightColor;
  state.style.strokeColor = preset.strokeColor;
  state.style.strokeWidth = preset.strokeWidth;
  state.style.shadowColor = preset.shadowColor;
  state.style.shadowBlur = preset.shadowBlur;
  state.style.showBoxBg = preset.showBoxBg;
  state.style.activeWordAnimation = preset.activeWordAnimation;
  state.style.wordsPerLine = preset.wordsPerLine;
  state.style.captionPosition = preset.captionPosition;
  
  if (preset.showBoxBg) {
    state.style.boxBgColor = preset.boxBgColor || '#000000';
    state.style.boxBgOpacity = preset.boxBgOpacity || 80;
    state.style.boxPadding = preset.boxPadding || 12;
    state.style.boxBorderRadius = preset.boxBorderRadius || 8;
  }

  // Update DOM inputs to match preset
  el.fontFamily.value = state.style.fontFamily;
  el.fontSize.value = state.style.fontSize;
  el.fontWeight.value = state.style.fontWeight;
  el.textUppercase.checked = state.style.textUppercase;
  el.textItalic.checked = state.style.textItalic;
  el.letterSpacing.value = state.style.letterSpacing;
  el.textColor.value = state.style.textColor;
  el.textColor.nextElementSibling.textContent = state.style.textColor;
  el.highlightColor.value = state.style.highlightColor;
  el.highlightColor.nextElementSibling.textContent = state.style.highlightColor;
  el.strokeColor.value = state.style.strokeColor;
  el.strokeColor.nextElementSibling.textContent = state.style.strokeColor;
  el.strokeWidth.value = state.style.strokeWidth;
  el.shadowColor.value = state.style.shadowColor;
  el.shadowColor.nextElementSibling.textContent = state.style.shadowColor;
  el.shadowBlur.value = state.style.shadowBlur;
  el.showBoxBg.checked = state.style.showBoxBg;
  el.activeWordAnimation.value = state.style.activeWordAnimation;
  el.wordsPerLine.value = state.style.wordsPerLine;
  el.captionPosition.value = state.style.captionPosition;

  if (state.style.showBoxBg) {
    el.boxBgControls.classList.remove('hidden');
    el.boxBgColor.value = state.style.boxBgColor;
    el.boxBgColor.nextElementSibling.textContent = state.style.boxBgColor;
    el.boxBgOpacity.value = state.style.boxBgOpacity;
    el.boxPadding.value = state.style.boxPadding;
    el.boxBorderRadius.value = state.style.boxBorderRadius;
  } else {
    el.boxBgControls.classList.add('hidden');
  }

  drawCanvas(wavesurfer ? wavesurfer.getCurrentTime() : 0);
}

function updateStateStyle() {
  state.style.fontFamily = el.fontFamily.value;
  state.style.fontSize = parseInt(el.fontSize.value);
  state.style.fontWeight = el.fontWeight.value;
  state.style.textUppercase = el.textUppercase.checked;
  state.style.textItalic = el.textItalic.checked;
  state.style.letterSpacing = parseInt(el.letterSpacing.value);
  
  state.style.textColor = el.textColor.value;
  el.textColor.nextElementSibling.textContent = state.style.textColor;
  
  state.style.highlightColor = el.highlightColor.value;
  el.highlightColor.nextElementSibling.textContent = state.style.highlightColor;
  
  state.style.strokeColor = el.strokeColor.value;
  el.strokeColor.nextElementSibling.textContent = state.style.strokeColor;
  
  state.style.strokeWidth = parseInt(el.strokeWidth.value);
  
  state.style.shadowColor = el.shadowColor.value;
  el.shadowColor.nextElementSibling.textContent = state.style.shadowColor;
  
  state.style.shadowBlur = parseInt(el.shadowBlur.value);
  
  state.style.showBoxBg = el.showBoxBg.checked;
  if (state.style.showBoxBg) {
    el.boxBgControls.classList.remove('hidden');
    state.style.boxBgColor = el.boxBgColor.value;
    el.boxBgColor.nextElementSibling.textContent = state.style.boxBgColor;
    state.style.boxBgOpacity = parseInt(el.boxBgOpacity.value);
    state.style.boxPadding = parseInt(el.boxPadding.value);
    state.style.boxBorderRadius = parseInt(el.boxBorderRadius.value);
  } else {
    el.boxBgControls.classList.add('hidden');
  }

  state.style.captionPosition = parseInt(el.captionPosition.value);
  state.style.wordsPerLine = parseInt(el.wordsPerLine.value);
  state.style.textAlignment = el.textAlignment.value;
  state.style.activeWordAnimation = el.activeWordAnimation.value;
}

// --- Real-time Subtitle Canvas Renderer ---
function drawCanvas(time) {
  const w = el.previewCanvas.width;
  const h = el.previewCanvas.height;

  // Clear Canvas (Transparent or Styled backgrounds are drawn underneath the canvas in HTML, but let's clear here)
  ctx.clearRect(0, 0, w, h);

  if (state.captions.length === 0) return;

  // Group captions into phrases/words based on state.style.wordsPerLine
  const phrases = groupCaptionsIntoPhrases(state.captions, state.style.wordsPerLine);
  
  // Find which phrase is currently playing
  const currentPhrase = phrases.find(p => time >= p.start && time <= p.end);
  if (!currentPhrase) return;

  // Subtitle styling declarations
  ctx.save();

  // Load custom font dynamically if loaded via Google Fonts
  let fontString = '';
  if (state.style.textItalic) fontString += 'italic ';
  fontString += `${state.style.fontWeight} ${state.style.fontSize * (w / 1080)}px "${state.style.fontFamily}"`; // Scales font size to canvas width resolution
  ctx.font = fontString;
  ctx.textAlign = 'center'; // Center alignment draws relatively around anchor x
  ctx.textBaseline = 'middle';

  const words = currentPhrase.words;
  const fontSizeScaled = state.style.fontSize * (w / 1080);
  const spacing = 32 * (w / 1080); // Increased horizontal space between words for premium styling
  
  // Wrap words into lines based on canvas width (max text width is 85% of canvas width)
  const maxTextWidth = w * 0.85;
  const lines = [];
  let currentLine = [];
  let currentLineWidth = 0;

  words.forEach((wd) => {
    let text = wd.word;
    if (state.style.textUppercase) text = text.toUpperCase();
    const wordWidth = ctx.measureText(text).width;

    if (currentLine.length > 0 && currentLineWidth + spacing + wordWidth > maxTextWidth) {
      lines.push({
        words: currentLine,
        width: currentLineWidth
      });
      currentLine = [wd];
      currentLineWidth = wordWidth;
    } else {
      if (currentLine.length === 0) {
        currentLineWidth = wordWidth;
      } else {
        currentLineWidth += spacing + wordWidth;
      }
      currentLine.push(wd);
    }
  });

  if (currentLine.length > 0) {
    lines.push({
      words: currentLine,
      width: currentLineWidth
    });
  }

  // Anchor Y coordinates based on vertical slider (%)
  const anchorY = h * (state.style.captionPosition / 100);
  const lineHeight = fontSizeScaled * 1.35; // line height multiplier
  const totalBlockHeight = (lines.length - 1) * lineHeight;
  const startY = anchorY - (totalBlockHeight / 2);

  // Draw Bounding box-background if enabled (rounded boxes per line)
  if (state.style.showBoxBg) {
    const boxOpacity = state.style.boxBgOpacity / 100;
    const padding = state.style.boxPadding * (w / 1080);
    const radius = state.style.boxBorderRadius * (w / 1080);

    ctx.fillStyle = hexToRgba(state.style.boxBgColor, boxOpacity);

    lines.forEach((line, lineIdx) => {
      const lineY = startY + lineIdx * lineHeight;
      let lineStartX = 0;
      if (state.style.textAlignment === 'center') {
        lineStartX = (w - line.width) / 2;
      } else if (state.style.textAlignment === 'left') {
        lineStartX = w * 0.1;
      } else if (state.style.textAlignment === 'right') {
        lineStartX = w * 0.9 - line.width;
      }

      const boxX = lineStartX - padding;
      const boxY = lineY - (fontSizeScaled / 2) - padding;
      const boxW = line.width + (padding * 2);
      const boxH = fontSizeScaled + (padding * 2);

      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, radius);
      ctx.fill();
    });
  }

  // Draw individual words line by line
  lines.forEach((line, lineIdx) => {
    const lineY = startY + lineIdx * lineHeight;
    let lineStartX = 0;
    if (state.style.textAlignment === 'center') {
      lineStartX = (w - line.width) / 2;
    } else if (state.style.textAlignment === 'left') {
      lineStartX = w * 0.1;
    } else if (state.style.textAlignment === 'right') {
      lineStartX = w * 0.9 - line.width;
    }

    let currentX = lineStartX;

    line.words.forEach((wd) => {
      const isActive = time >= wd.start && time <= wd.end;
      let text = wd.word;
      if (state.style.textUppercase) text = text.toUpperCase();

      const wordWidth = ctx.measureText(text).width;
      const centerX = currentX + (wordWidth / 2);
      const centerY = lineY;

      ctx.save();
      ctx.translate(centerX, centerY);

      // Apply Active Highlight and Animations
      if (isActive) {
        ctx.fillStyle = state.style.highlightColor;
        
        // Active Animations
        const animType = state.style.activeWordAnimation;
        const elapsed = time - wd.start;
        const duration = wd.end - wd.start;
        const progress = Math.max(0, Math.min(1, elapsed / (duration || 0.1)));

        if (animType === 'scale') {
          // High-end spring pop pop-in animation (scales up to 1.25 and settles at 1.15)
          const popDuration = 0.15; // 150ms spring
          let scaleFactor = 1.15;
          if (elapsed < popDuration) {
            const t = elapsed / popDuration;
            scaleFactor = 1.0 + 0.25 * Math.sin(t * Math.PI);
          }
          ctx.scale(scaleFactor, scaleFactor);
        } 
        else if (animType === 'bounce') {
          // Smooth bounce with organic squash-and-stretch
          const bounceHeight = 22 * (w / 1080);
          const bounceOffset = -bounceHeight * Math.sin(progress * Math.PI);
          ctx.translate(0, bounceOffset);
          
          // Stretch dynamically on the way up/down, squash slightly on landing/takeoff
          const stretch = 1.0 + 0.08 * Math.cos(progress * Math.PI * 2);
          const squash = 1.0 - 0.08 * Math.cos(progress * Math.PI * 2);
          ctx.scale(squash, stretch);
        } 
        else if (animType === 'tilt') {
          // Pop and dynamic tilt based on word index overall
          const popDuration = 0.12;
          const idx = state.captions.indexOf(wd);
          let angle = (idx % 2 === 0 ? -6 : 6) * (Math.PI / 180);
          let scale = 1.15;
          if (elapsed < popDuration) {
            const t = elapsed / popDuration;
            scale = 1.0 + 0.2 * Math.sin(t * Math.PI);
            angle *= Math.sin(t * Math.PI / 2);
          }
          ctx.rotate(angle);
          ctx.scale(scale, scale);
        } 
        else if (animType === 'glow') {
          // Pulsing glow size and pulsing text scale
          const pulse = 1.0 + 0.25 * Math.sin(progress * Math.PI * 3);
          ctx.shadowColor = state.style.highlightColor;
          ctx.shadowBlur = 24 * pulse * (w / 1080);
          const scale = 1.05 + 0.05 * pulse;
          ctx.scale(scale, scale);
        }
      } else {
        ctx.fillStyle = state.style.textColor;
      }

      // Apply Standard Text Shadows
      if (state.style.shadowBlur > 0) {
        ctx.shadowColor = state.style.shadowColor;
        ctx.shadowBlur = state.style.shadowBlur * (w / 1080);
        ctx.shadowOffsetX = 2 * (w / 1080);
        ctx.shadowOffsetY = 3 * (w / 1080);
      }

      // Outline / Stroke
      if (state.style.strokeWidth > 0) {
        ctx.strokeStyle = state.style.strokeColor;
        ctx.lineWidth = state.style.strokeWidth * (w / 1080);
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(text, 0, 0);
      }

      // Fill Text
      ctx.fillText(text, 0, 0);

      ctx.restore();

      // Move next word start pointer
      currentX += wordWidth + spacing;
    });
  });

  ctx.restore();
}

// Groups a list of word subtitles into phrases containing wordsPerLine
function groupCaptionsIntoPhrases(captions, wordsPerLine) {
  const phrases = [];
  let index = 0;

  while (index < captions.length) {
    const chunk = captions.slice(index, index + wordsPerLine);
    phrases.push({
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
      words: chunk
    });
    index += wordsPerLine;
  }
  return phrases;
}

// Helper: Rounded Rectangle
function drawRoundedRect(ctx, x, y, width, height, radius) {
  if (width < 2 * radius) radius = width / 2;
  if (height < 2 * radius) radius = height / 2;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function hexToRgba(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

let animationFrameId = null;

function startRenderLoop() {
  if (animationFrameId) return; // already running
  
  function renderStep() {
    if (state.isPlaying && wavesurfer) {
      drawCanvas(wavesurfer.getCurrentTime());
      
      // Also update background video time if synchronized
      if (state.bgType === 'custom' && state.bgMediaElement && state.bgMediaElement.tagName === 'VIDEO') {
        const audioTime = wavesurfer.getCurrentTime();
        if (Math.abs(state.bgMediaElement.currentTime - audioTime) > 0.3) {
          state.bgMediaElement.currentTime = audioTime;
        }
      }
      
      animationFrameId = requestAnimationFrame(renderStep);
    } else {
      animationFrameId = null;
    }
  }
  
  animationFrameId = requestAnimationFrame(renderStep);
}

function stopRenderLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// --- Audio Playback Functions ---
function togglePlayback() {
  if (!wavesurfer) return;
  
  if (state.isPlaying) {
    wavesurfer.pause();
    if (state.bgMediaElement && typeof state.bgMediaElement.pause === 'function') {
      state.bgMediaElement.pause();
    }
  } else {
    wavesurfer.play();
    if (state.bgMediaElement && typeof state.bgMediaElement.play === 'function') {
      state.bgMediaElement.play();
    }
  }
}

function stopPlayback() {
  if (!wavesurfer) return;
  wavesurfer.stop();
  wavesurfer.setTime(0);
  if (state.bgMediaElement) {
    state.bgMediaElement.currentTime = 0;
    if (typeof state.bgMediaElement.pause === 'function') state.bgMediaElement.pause();
  }
}

// --- Real-time High-Quality Canvas Exporter ---
async function startExportingSubtitlesVideo() {
  if (state.captions.length === 0 || !state.audioFile) return;

  state.isExporting = true;
  el.btnExportVideo.setAttribute('disabled', 'true');
  el.exportProgressContainer.classList.remove('hidden');
  
  wavesurfer.pause();
  wavesurfer.setTime(0);
  if (state.bgMediaElement) state.bgMediaElement.currentTime = 0;
  
  const totalDuration = state.audioDuration;
  const fps = 30;
  const totalFrames = Math.ceil(totalDuration * fps);
  
  // Establish MediaStream from canvas
  const canvasStream = el.previewCanvas.captureStream(fps);
  
  // Audio node merging if requested
  let combinedStream = canvasStream;
  let audioContext = null;
  let mediaStreamDest = null;
  let audioSource = null;

  if (el.exportAudio.value === 'include') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    mediaStreamDest = audioContext.createMediaStreamDestination();
    
    // Load audio buffer into offline source
    audioSource = audioContext.createBufferSource();
    audioSource.buffer = state.audioBuffer;
    audioSource.connect(mediaStreamDest);
    
    // Add audio track to recorded stream
    const audioTrack = mediaStreamDest.stream.getAudioTracks()[0];
    if (audioTrack) {
      combinedStream = new MediaStream([
        canvasStream.getVideoTracks()[0],
        audioTrack
      ]);
    }
  }

  // Setup media recorder configurations
  const format = el.exportFormat.value;
  let mimeType = 'video/webm;codecs=vp9'; // Default WebM with transparency support
  let extension = 'webm';

  if (format === 'mp4-green') {
    // Standard MP4 is typically not natively supported by browser encoding.
    // Standard browsers natively only record 'video/webm'. We record WebM but styled with green screen, which video editors can read directly.
    // We notify user or fallback. WebM is extremely widely supported now, and renaming WebM to MP4 doesn't work, but modern video editors accept WebM!
    mimeType = 'video/webm';
    extension = 'webm';
    alert("Notice: Browsers natively export high-quality WebM. For 'MP4 Green Screen', we are rendering a Green Screen WebM file which you can import directly into Premiere/CapCut. You will have full chroma key support!");
  } else if (format === 'webm-green') {
    mimeType = 'video/webm';
    extension = 'webm';
  }

  const recordedChunks = [];
  const recorder = new MediaRecorder(combinedStream, { mimeType: mimeType });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  recorder.onstop = () => {
    // Generate file download
    const blob = new Blob(recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `captionflow_${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (audioContext) audioContext.close();

    // Reset UI
    state.isExporting = false;
    el.btnExportVideo.removeAttribute('disabled');
    el.exportProgressContainer.classList.add('hidden');
    addLogLine(`Video export completed! File downloaded.`);
    alert('Subtitles video successfully rendered and downloaded!');
  };

  // Start recording
  recorder.start();
  if (audioSource) audioSource.start(0);

  // Play audio in Wavesurfer to animate canvas in sync
  wavesurfer.play();
  if (state.bgMediaElement && typeof state.bgMediaElement.play === 'function') {
    state.bgMediaElement.play();
  }

  // Progress monitoring interval
  const checkProgressInterval = setInterval(() => {
    const elapsed = wavesurfer.getCurrentTime();
    const percent = Math.min(100, Math.round((elapsed / totalDuration) * 100));
    
    el.exportProgressLabel.textContent = `Rendering Captions: ${elapsed.toFixed(1)}s / ${totalDuration.toFixed(1)}s`;
    el.exportProgressPercentage.textContent = `${percent}%`;
    el.exportProgressFill.style.width = `${percent}%`;

    if (elapsed >= totalDuration || !wavesurfer.isPlaying()) {
      clearInterval(checkProgressInterval);
      wavesurfer.pause();
      if (state.bgMediaElement && typeof state.bgMediaElement.pause === 'function') state.bgMediaElement.pause();
      
      // Stop recording
      recorder.stop();
      if (audioSource) audioSource.stop();
    }
  }, 100);
}

// --- Subtitle Exporter (SRT & VTT) ---
function downloadSRTFile() {
  if (state.captions.length === 0) return;

  // Format captions as SRT
  let srtContent = '';
  const phrases = groupCaptionsIntoPhrases(state.captions, state.style.wordsPerLine);

  phrases.forEach((phrase, idx) => {
    const text = phrase.words.map(w => w.word).join(' ');
    srtContent += `${idx + 1}\n`;
    srtContent += `${formatSRTTime(phrase.start)} --> ${formatSRTTime(phrase.end)}\n`;
    srtContent += `${state.style.textUppercase ? text.toUpperCase() : text}\n\n`;
  });

  const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `subtitles_${Date.now()}.srt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  addLogLine('SRT subtitle file downloaded.');
}

// Formatting helpers
function formatTime(sec) {
  const min = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${min.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}

function formatSRTTime(seconds) {
  const date = new Date(null);
  date.setSeconds(seconds);
  const ms = Math.floor((seconds % 1) * 1000);
  const timeString = date.toISOString().substr(11, 8);
  return `${timeString},${ms.toString().padStart(3, '0')}`;
}

// Apply default styling preset initially
init();
applyStylePreset('classic_bold');
