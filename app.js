// CaptionFlow AI - Main Controller
// (Transcriber is managed on a background thread inside worker.js)

// --- Application State ---
const state = {
  audioBuffer: null,
  audioFile: null,
  audioDuration: 0,
  isPlaying: false,
  currentTime: 0,
  
  // Caption list: [{ id, word, start, end, sourceStart, sourceEnd }]
  captions: [],
  activeCaptionIndex: -1,
  
  // Timeline clips: [{ id, sourceStart, sourceEnd, timelineStart, timelineEnd, type }]
  clips: [],
  
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
  
  // AI provider state
  api: {
    provider: 'local',
    geminiKey: '',
    openaiKey: ''
  },
  
  // Exporter state
  isExporting: false,
  aspectRatio: '9:16', // '9:16', '16:9'
  
  // AI model state
  aiModelReady: false,
  pendingTranscription: false,
  workerFailed: false,
  rawWhisperChunks: null,
  
  // TTS (Kokoro) state
  tts: {
    modelReady: false,
    isGenerating: false
  },

  // App mode: 'caption' | 'video'
  appMode: 'caption',

  // Video Mode independent state
  videoMode: {
    videoFile: null,
    videoObjectUrl: null,
    videoBuffer: null,
    videoDuration: 0,
    videoBgElement: null,      // <video> element for preview
    attachedAudio: null,       // { file, buffer, objectUrl } or null
    muteOriginal: false,
    captions: [],
    clips: [],
    selectedClipId: null,
    isPlaying: false,
    currentTime: 0,
    aspectRatio: '9:16',
    rawWhisperChunks: null,
    isExporting: false
  }
};

// --- DOM Elements ---
const el = {
  // Config / Indicators
  statusDot: document.querySelector('#aiStatusIndicator .status-dot'),
  statusText: document.getElementById('statusText'),

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
  currentTimeMobile: document.getElementById('currentTimeMobile'),
  durationTimeMobile: document.getElementById('durationTimeMobile'),
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
  chkAlignPastedText: document.getElementById('chkAlignPastedText'),
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
  exportFormat: document.getElementById('exportFormat') || { value: 'webm-transparent' },
  exportAudio: document.getElementById('exportAudio') || { value: 'silent' },
  btnExportVideo: document.getElementById('btnExportVideo'),
  btnExportSRT: document.getElementById('btnExportSRT'),
  btnSendToVideoMode: document.getElementById('btnSendToVideoMode'),
  btnExportVideoMobile: document.getElementById('btnExportVideoMobile'),
  btnExportSRTMobile: document.getElementById('btnExportSRTMobile'),
  btnExportToggle: document.getElementById('btnExportToggle'),
  exportDropdownMenu: document.getElementById('exportDropdownMenu'),
  exportProgressContainer: document.getElementById('exportProgressContainer'),
  exportProgressLabel: document.getElementById('exportProgressLabel'),
  exportProgressPercentage: document.getElementById('exportProgressPercentage'),
  exportProgressFill: document.getElementById('exportProgressFill'),

  // Config / Modals / Indicators
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

  // Canvas HUD overlay
  hudOverlay: document.getElementById('hudOverlay'),
  hudPlayIcon: document.getElementById('hudPlayIcon'),
  hudPauseIcon: document.getElementById('hudPauseIcon'),

  // Timeline components
  timelineScrollContainer: document.getElementById('timelineScrollContainer'),
  timelineSubtitleTrack: document.getElementById('timelineSubtitleTrack'),
  timelineTracksWidthWrapper: document.getElementById('timelineTracksWidthWrapper'),
  timelineVideoTrack: document.getElementById('timelineVideoTrack'),
  btnSplitClip: document.getElementById('btnSplitClip'),
  btnDeleteClip: document.getElementById('btnDeleteClip'),

  // TTS (Kokoro) Controls
  ttsVoice: document.getElementById('ttsVoice'),
  ttsSpeed: document.getElementById('ttsSpeed'),
  ttsPitch: document.getElementById('ttsPitch'),
  ttsSpeedVal: document.getElementById('ttsSpeedVal'),
  ttsPitchVal: document.getElementById('ttsPitchVal'),
  btnGenerateTTS: document.getElementById('btnGenerateTTS'),
  ttsDownloadProgress: document.getElementById('ttsDownloadProgress'),
  ttsProgressPercent: document.getElementById('ttsProgressPercent'),
  ttsProgressFill: document.getElementById('ttsProgressFill'),
  ttsStatus: document.getElementById('ttsStatus'),
  ttsLogLines: document.getElementById('ttsLogLines'),

  // ——— VIDEO MODE elements ———
  videoModeLayout: document.getElementById('videoModeLayout'),
  desktopLayout: document.getElementById('desktopLayout'),
  btnCaptionMode: document.getElementById('btnCaptionMode'),
  btnVideoMode: document.getElementById('btnVideoMode'),

  // VM Canvas
  vmCanvasViewport: document.getElementById('vmCanvasViewport'),
  vmPreviewCanvas: document.getElementById('vmPreviewCanvas'),
  vmBgMediaContainer: document.getElementById('vmBgMediaContainer'),
  vmCanvasOverlay: document.getElementById('vmCanvasOverlay'),
  vmCanvasUploadPrompt: document.getElementById('vmCanvasUploadPrompt'),
  vmCanvasLoadingPrompt: document.getElementById('vmCanvasLoadingPrompt'),
  vmCanvasLoadingSubText: document.getElementById('vmCanvasLoadingSubText'),

  // VM Player
  vmBtnPlayPause: document.getElementById('vmBtnPlayPause'),
  vmBtnStop: document.getElementById('vmBtnStop'),
  vmPlaybackVolume: document.getElementById('vmPlaybackVolume'),
  vmPlaybackSpeed: document.getElementById('vmPlaybackSpeed'),
  vmTimeDisplay: document.getElementById('vmTimeDisplay'),
  vmBtnAspectPortrait: document.getElementById('vmBtnAspectPortrait'),
  vmBtnAspectLandscape: document.getElementById('vmBtnAspectLandscape'),

  // VM File upload
  vmVideoFileInput: document.getElementById('vmVideoFileInput'),
  vmVideoFileDetails: document.getElementById('vmVideoFileDetails'),
  vmVideoFileName: document.getElementById('vmVideoFileName'),
  vmVideoFileSize: document.getElementById('vmVideoFileSize'),
  vmBtnRemoveVideo: document.getElementById('vmBtnRemoveVideo'),
  vmVideoFileHint: document.getElementById('vmVideoFileHint'),

  // VM Audio Attach
  vmAudioAttachInput: document.getElementById('vmAudioAttachInput'),
  vmAttachedAudioDetails: document.getElementById('vmAttachedAudioDetails'),
  vmAttachedAudioName: document.getElementById('vmAttachedAudioName'),
  vmAttachedAudioSize: document.getElementById('vmAttachedAudioSize'),
  vmBtnRemoveAttachedAudio: document.getElementById('vmBtnRemoveAttachedAudio'),
  vmBtnAttachAudio: document.getElementById('vmBtnAttachAudio'),
  vmAudioBadge: document.getElementById('vmAudioBadge'),
  vmMuteOriginalAudio: document.getElementById('vmMuteOriginalAudio'),

  // VM Sync
  vmBtnRunAISync: document.getElementById('vmBtnRunAISync'),
  vmPastedText: document.getElementById('vmPastedText'),
  vmChkAlignPastedText: document.getElementById('vmChkAlignPastedText'),
  vmModelDownloadProgress: document.getElementById('vmModelDownloadProgress'),
  vmModelProgressPercent: document.getElementById('vmModelProgressPercent'),
  vmModelProgressFill: document.getElementById('vmModelProgressFill'),
  vmAiLogBox: document.getElementById('vmAiLogBox'),
  vmAiLogLines: document.getElementById('vmAiLogLines'),

  // VM Clip Tools
  vmBtnSplitClip: document.getElementById('vmBtnSplitClip'),
  vmBtnDeleteClip: document.getElementById('vmBtnDeleteClip'),

  // VM Subtitle Editor
  vmWordTimelineList: document.getElementById('vmWordTimelineList'),
  vmBtnAddWord: document.getElementById('vmBtnAddWord'),
  vmBtnClearAllWords: document.getElementById('vmBtnClearAllWords'),

  // VM Export
  vmExportFormat: document.getElementById('vmExportFormat'),
  vmExportAudio: document.getElementById('vmExportAudio') || { value: 'original' },
  vmBtnExportVideo: document.getElementById('vmBtnExportVideo'),
  vmBtnExportSRT: document.getElementById('vmBtnExportSRT'),
  vmExportProgressContainer: document.getElementById('vmExportProgressContainer'),
  vmExportProgressLabel: document.getElementById('vmExportProgressLabel'),
  vmExportProgressPct: document.getElementById('vmExportProgressPct'),
  vmExportProgressFill: document.getElementById('vmExportProgressFill'),
};

// Canvas rendering context
const ctx = el.previewCanvas.getContext('2d');

// Timeline Zoom Scale (pixels per second)
const PIXELS_PER_SECOND = 150;

// Mock WaveSurfer fallback to prevent script failures if CDN is offline or blocked
const wavesurferMock = {
  isMock: true,
  on: () => {},
  once: () => {},
  un: () => {},
  destroy: () => {},
  load: () => {},
  play: () => {},
  pause: () => {},
  stop: () => {},
  setTime: () => {},
  getCurrentTime: () => 0,
  getDuration: () => 0,
  setVolume: () => {},
  setPlaybackRate: () => {},
  isPlaying: () => false,
  zoom: () => {}
};

// WaveSurfer Instance
let wavesurfer = wavesurferMock;

// Background Web Worker for Local AI
let aiWorker = null;

// Background Web Worker for TTS (Kokoro)
let ttsWorker = null;

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
  initResponsiveLayout();
  
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

// --- Responsive Layout Handler (Moves DOM cards between Desktop 3-columns and Mobile InShot Tab panels) ---
// --- Responsive Layout Handler (Moves DOM cards between Desktop 3-columns and Mobile InShot Tab panels) ---
function initResponsiveLayout() {
  const handleLayoutSwitch = () => {
    const isDesktop = window.innerWidth >= 992;
    const desktopLayout = document.getElementById('desktopLayout');
    const mobileLayout = document.getElementById('mobileLayout');
    
    if (!desktopLayout || !mobileLayout) return;
    
    const desktopWaveformParent = document.getElementById('desktopWaveformContainerParent');
    const mobileTimelineSection = document.getElementById('mobileTimelineSection');
    
    if (isDesktop) {
      desktopLayout.classList.toggle('hidden', state.appMode !== 'caption');
      el.videoModeLayout?.classList.toggle('hidden', state.appMode !== 'video');
      mobileLayout.classList.add('hidden');
      
      // Hide the redundant static waveform card on desktop resolutions
      if (desktopWaveformParent) {
        desktopWaveformParent.classList.add('hidden');
      }
      
      // Move style cards to desktop left panel content
      const leftContent = document.getElementById('desktopLeftContent');
      if (leftContent) {
        leftContent.appendChild(document.getElementById('stylePresetsCard'));
        leftContent.appendChild(document.getElementById('styleTypographyCard'));
        leftContent.appendChild(document.getElementById('styleColorsCard'));
        leftContent.appendChild(document.getElementById('styleLayoutCard'));
      }
      if (state.appMode === 'video') {
        vmMoveStylePanel(document.getElementById('vmLeftContent'));
      }
      
      // Move preview stage elements and timeline container to desktop center content
      const centerContent = document.getElementById('desktopCenterContent');
      if (centerContent) {
        centerContent.appendChild(document.getElementById('canvasViewport'));
        centerContent.appendChild(document.getElementById('playerToolbarContainer'));
        if (mobileTimelineSection) {
          centerContent.appendChild(mobileTimelineSection);
        }
        if (desktopWaveformParent) {
          centerContent.appendChild(desktopWaveformParent); // Keep hidden in DOM here
        }
        centerContent.appendChild(document.getElementById('exportSectionDesktop'));
      }
      
      // Move sync cards and editor cards to desktop right content
      const rightContent = document.getElementById('desktopRightContent');
      if (rightContent) {
        rightContent.appendChild(document.getElementById('pastedTextCard'));
        rightContent.appendChild(document.getElementById('ttsCard'));
        rightContent.appendChild(document.getElementById('syncEngineCard'));
        rightContent.appendChild(document.getElementById('audioDetailsCard'));
        rightContent.appendChild(document.getElementById('tapSyncPanel'));
        rightContent.appendChild(document.getElementById('transcriptEditorCard'));
      }
      
      // Ensure the shared audio waveform remains inside mobileWaveformTrackBody on all viewports
      const mobileWaveformTrack = document.getElementById('mobileWaveformTrackBody');
      const audioWaveform = document.getElementById('audioWaveform');
      if (mobileWaveformTrack && audioWaveform && audioWaveform.parentElement !== mobileWaveformTrack) {
        mobileWaveformTrack.appendChild(audioWaveform);
      }
      
      if (wavesurfer && typeof wavesurfer.zoom === 'function') {
        // Zoom WaveSurfer track on desktop timeline
        wavesurfer.zoom(PIXELS_PER_SECOND);
      }
    } else {
      state.appMode = 'caption';
      desktopLayout.classList.add('hidden');
      el.videoModeLayout?.classList.add('hidden');
      mobileLayout.classList.remove('hidden');
      el.btnCaptionMode?.classList.add('active');
      el.btnVideoMode?.classList.remove('active');
      
      if (desktopWaveformParent) {
        desktopWaveformParent.classList.remove('hidden');
      }
      
      // Move cards to mobile tab panels
      const panelMedia = document.getElementById('panel-media');
      if (panelMedia) {
        panelMedia.appendChild(document.getElementById('audioDetailsCard'));
        panelMedia.appendChild(document.getElementById('bgSelectorCard'));
      }
      
      const panelVoice = document.getElementById('panel-voice');
      if (panelVoice) {
        panelVoice.appendChild(document.getElementById('pastedTextCard'));
        panelVoice.appendChild(document.getElementById('ttsCard'));
        panelVoice.appendChild(document.getElementById('syncEngineCard'));
        panelVoice.appendChild(document.getElementById('tapSyncPanel'));
      }
      
      const panelStyle = document.getElementById('panel-style');
      if (panelStyle) {
        panelStyle.appendChild(document.getElementById('stylePresetsCard'));
        panelStyle.appendChild(document.getElementById('styleTypographyCard'));
        panelStyle.appendChild(document.getElementById('styleColorsCard'));
        panelStyle.appendChild(document.getElementById('styleLayoutCard'));
      }
      
      const panelEditor = document.getElementById('panel-editor');
      if (panelEditor) {
        panelEditor.appendChild(document.getElementById('transcriptEditorCard'));
      }
      
      // Move preview stage to mobile stage
      const mobilePreview = document.getElementById('mobilePreviewSection');
      if (mobilePreview) {
        mobilePreview.appendChild(document.getElementById('canvasViewport'));
        mobilePreview.appendChild(document.getElementById('playerToolbarContainer'));
      }
      
      // Move the timeline container back to the mobile layout stage
      const mobileMainStage = document.querySelector('#mobileLayout .main-stage');
      if (mobileMainStage && mobileTimelineSection) {
        mobileMainStage.appendChild(mobileTimelineSection);
      }
      
      // Ensure the shared audio waveform remains inside mobileWaveformTrackBody on all viewports
      const mobileWaveformTrack = document.getElementById('mobileWaveformTrackBody');
      const audioWaveform = document.getElementById('audioWaveform');
      if (mobileWaveformTrack && audioWaveform && audioWaveform.parentElement !== mobileWaveformTrack) {
        mobileWaveformTrack.appendChild(audioWaveform);
      }
      
      if (wavesurfer && typeof wavesurfer.zoom === 'function') {
        // Zoom WaveSurfer track on mobile timeline
        wavesurfer.zoom(PIXELS_PER_SECOND);
      }
    }
    
    // Force timeline re-render and synchronization on layout switch
    if (state.audioDuration && state.audioDuration > 0) {
      renderTimelineRuler();
      renderTimelineWords();
      renderTimelineVideoTrack();
    }
  };
  
  window.addEventListener('resize', handleLayoutSwitch);
  handleLayoutSwitch();
}

// --- Event Listeners setup ---
function setupEventListeners() {
  // Settings & Modals
  if (el.btnSettings) {
    el.btnSettings.addEventListener('click', () => {
      el.geminiApiKey.value = state.api.geminiKey || '';
      el.openaiApiKey.value = state.api.openaiKey || '';
      el.apiProvider.value = state.api.provider || 'local';
      updateApiFieldsVisibility();
      el.settingsModal.classList.remove('hidden');
    });
  }

  el.apiProvider?.addEventListener('change', updateApiFieldsVisibility);

  el.btnSaveSettings?.addEventListener('click', () => {
    state.api.provider = el.apiProvider.value;
    state.api.geminiKey = el.geminiApiKey.value.trim();
    state.api.openaiKey = el.openaiApiKey.value.trim();
    
    localStorage.setItem('capflow_api_provider', state.api.provider);
    localStorage.setItem('capflow_gemini_key', state.api.geminiKey);
    localStorage.setItem('capflow_openai_key', state.api.openaiKey);
    
    el.settingsModal.classList.add('hidden');
    updateStatusIndicator();
  });

  el.btnCancelSettings?.addEventListener('click', () => {
    el.settingsModal.classList.add('hidden');
  });

  el.btnModalClose?.addEventListener('click', () => {
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

  el.btnUploadBg?.addEventListener('click', () => {
    el.bgFileInput?.click();
  });

  el.bgFileInput?.addEventListener('change', handleBgUpload);

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
      wavesurfer.setPlaybackRate(parseFloat(e.target.value));
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

  el.chkAlignPastedText.addEventListener('change', () => {
    if (state.rawWhisperChunks) {
      realignCaptions();
    }
  });

  // Exporters
  el.btnExportVideo.addEventListener('click', startExportingSubtitlesVideo);
  el.btnExportSRT.addEventListener('click', downloadSRTFile);
  el.btnSendToVideoMode?.addEventListener('click', transferCaptionsToVideoMode);
  el.btnExportVideoMobile?.addEventListener('click', startExportingSubtitlesVideo);
  el.btnExportSRTMobile?.addEventListener('click', downloadSRTFile);

  // TTS (Kokoro) Controls
  el.ttsSpeed.addEventListener('input', () => {
    el.ttsSpeedVal.textContent = `${parseFloat(el.ttsSpeed.value).toFixed(1)}x`;
  });
  el.ttsPitch.addEventListener('input', () => {
    el.ttsPitchVal.textContent = `${parseFloat(el.ttsPitch.value).toFixed(1)}x`;
  });
  el.btnGenerateTTS.addEventListener('click', generateTTSVoiceover);

  // Sidebar Tab Switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const sidebarPanels = document.getElementById('sidebarPanels');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      const isAlreadyActive = btn.classList.contains('active') && sidebarPanels && sidebarPanels.classList.contains('open');
      
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      
      if (isAlreadyActive) {
        if (sidebarPanels) sidebarPanels.classList.remove('open');
      } else {
        btn.classList.add('active');
        const activePanel = document.getElementById(`panel-${targetTab}`);
        if (activePanel) activePanel.classList.add('active');
        if (sidebarPanels) sidebarPanels.classList.add('open');
      }
    });
  });

  const btnCloseDrawer = document.getElementById('btnCloseDrawer');
  if (btnCloseDrawer) {
    btnCloseDrawer.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      if (sidebarPanels) sidebarPanels.classList.remove('open');
    });
  }

  // Save / Export dropdown toggling
  if (el.btnExportToggle && el.exportDropdownMenu) {
    el.btnExportToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      el.exportDropdownMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!el.exportDropdownMenu.classList.contains('hidden') && !el.exportDropdownMenu.contains(e.target) && e.target !== el.btnExportToggle) {
        el.exportDropdownMenu.classList.add('hidden');
      }
    });
  }

  // Click preview canvas viewport to toggle play/pause and trigger HUD icons
  if (el.canvasViewport) {
    el.canvasViewport.addEventListener('click', (e) => {
      // If overlay is showing, let it handle the click (it might be the file upload prompt)
      if (el.canvasOverlay && !el.canvasOverlay.classList.contains('hidden')) {
        return;
      }
      
      togglePlayback();
      
      // Trigger HUD overlay animation
      if (el.hudOverlay) {
        const isPlaying = wavesurfer && wavesurfer.isPlaying();
        if (isPlaying) {
          if (el.hudPlayIcon) el.hudPlayIcon.style.display = 'none';
          if (el.hudPauseIcon) el.hudPauseIcon.style.display = 'block';
        } else {
          if (el.hudPlayIcon) el.hudPlayIcon.style.display = 'block';
          if (el.hudPauseIcon) el.hudPauseIcon.style.display = 'none';
        }
        
        el.hudOverlay.classList.remove('animate');
        void el.hudOverlay.offsetWidth; // force reflow
        el.hudOverlay.classList.add('animate');
      }
    });
  }

  // Click timeline track width wrapper to seek Playback time
  if (el.timelineTracksWidthWrapper) {
    el.timelineTracksWidthWrapper.addEventListener('click', (e) => {
      if (!wavesurfer || state.audioDuration === 0) return;
      
      // Ignore if clicked on a subtitle word block or a clip block (they have their own click handlers)
      if (e.target.closest('.timeline-word-block') || e.target.closest('.timeline-clip')) {
        return;
      }
      
      const rect = el.timelineTracksWidthWrapper.getBoundingClientRect();
      const style = window.getComputedStyle(el.timelineTracksWidthWrapper);
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const clickX = e.clientX - rect.left - paddingLeft;
      const clickTime = clickX / PIXELS_PER_SECOND;
      
      const totalDuration = state.clips && state.clips.length > 0
        ? Math.max(...state.clips.map(c => c.timelineEnd))
        : state.audioDuration;

      if (clickTime >= 0 && clickTime <= totalDuration) {
        state.currentTime = clickTime;
        
        // Map to media time and seek wavesurfer/video
        const { time: sourceTime, clip } = getMediaTimeFromTimelineTime(clickTime);
        if (clip) {
          wavesurfer.setTime(sourceTime);
          if (state.bgMediaElement) {
            state.bgMediaElement.currentTime = sourceTime;
          }
        } else {
          // In a gap, seek wavesurfer to nearby clip or let it be
          wavesurfer.setTime(0);
        }
        
        // Redraw/update UI
        el.currentTimeDisplay.textContent = `${formatTime(state.currentTime)} / ${formatTime(totalDuration)}`;
        if (el.currentTimeMobile) el.currentTimeMobile.textContent = formatTime(state.currentTime);
        el.timelinePositionDisplay.textContent = `Time: ${state.currentTime.toFixed(2)}s | Frame: ${Math.floor(state.currentTime * 30)} | Word Count: ${state.captions.length}`;
        highlightActiveSubtitleWord(state.currentTime);
        drawCanvas(state.currentTime);
        if (el.timelineScrollContainer) {
          el.timelineScrollContainer.scrollLeft = state.currentTime * PIXELS_PER_SECOND;
        }
      }
    });
  }

  // Split and Delete clip buttons click events
  el.btnSplitClip?.addEventListener('click', splitSelectedClip);
  el.btnDeleteClip?.addEventListener('click', deleteSelectedClip);

  // Preview Canvas Double Click to edit subtitle word on-screen
  el.previewCanvas?.addEventListener('dblclick', (e) => {
    if (state.captions.length === 0) return;

    const rect = el.previewCanvas.getBoundingClientRect();
    const clickX_client = e.clientX - rect.left;
    const clickY_client = e.clientY - rect.top;
    
    // Scale to canvas internal dimensions
    const clickX = clickX_client * (el.previewCanvas.width / rect.width);
    const clickY = clickY_client * (el.previewCanvas.height / rect.height);

    const w = el.previewCanvas.width;
    const h = el.previewCanvas.height;
    
    const phrases = groupCaptionsIntoPhrases(state.captions, state.style.wordsPerLine);
    const currentPhrase = phrases.find(p => state.currentTime >= p.start && state.currentTime <= p.end);
    
    if (!currentPhrase) return;

    const ctx = el.previewCanvas.getContext('2d');
    ctx.save();
    
    let fontString = '';
    if (state.style.textItalic) fontString += 'italic ';
    fontString += `${state.style.fontWeight} ${state.style.fontSize * (w / 1080)}px "${state.style.fontFamily}"`;
    ctx.font = fontString;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = currentPhrase.words;
    const fontSizeScaled = state.style.fontSize * (w / 1080);
    const spacing = 32 * (w / 1080);
    const maxTextWidth = w * 0.85;

    // Wrap words into lines
    const lines = [];
    let currentLine = [];
    let currentLineWidth = 0;

    words.forEach((wd) => {
      let text = wd.word;
      if (state.style.textUppercase) text = text.toUpperCase();
      const wordWidth = ctx.measureText(text).width;

      if (currentLine.length > 0 && currentLineWidth + spacing + wordWidth > maxTextWidth) {
        lines.push({ words: currentLine, width: currentLineWidth });
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
      lines.push({ words: currentLine, width: currentLineWidth });
    }

    const anchorY = h * (state.style.captionPosition / 100);
    const lineHeight = fontSizeScaled * 1.35;
    const totalBlockHeight = (lines.length - 1) * lineHeight;
    const startY = anchorY - (totalBlockHeight / 2);

    let foundWord = null;
    let foundIndex = -1;
    let foundRect = null;

    lines.forEach((line, lineIdx) => {
      if (foundWord) return;

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
        if (foundWord) return;

        let text = wd.word;
        if (state.style.textUppercase) text = text.toUpperCase();

        const wordWidth = ctx.measureText(text).width;
        
        const wordLeft = currentX;
        const wordRight = currentX + wordWidth;
        const wordTop = lineY - fontSizeScaled / 2;
        const wordBottom = lineY + fontSizeScaled / 2;

        const pad = 20;
        if (clickX >= wordLeft - pad && clickX <= wordRight + pad &&
            clickY >= wordTop - pad && clickY <= wordBottom + pad) {
          foundWord = wd;
          foundIndex = state.captions.indexOf(wd);
          foundRect = {
            left: wordLeft,
            top: wordTop,
            width: wordWidth,
            height: fontSizeScaled
          };
        }

        currentX += wordWidth + spacing;
      });
    });

    ctx.restore();

    if (foundWord && foundIndex !== -1 && foundRect) {
      // Pause playback
      if (state.isPlaying) {
        togglePlayback();
      }

      // Map canvas coordinates to client coordinates relative to #canvasViewport
      const viewportRect = el.canvasViewport.getBoundingClientRect();
      
      const clientLeft = (foundRect.left * rect.width / el.previewCanvas.width) + (rect.left - viewportRect.left);
      const clientTop = (foundRect.top * rect.height / el.previewCanvas.height) + (rect.top - viewportRect.top);
      const clientWidth = foundRect.width * rect.width / el.previewCanvas.width;
      const clientHeight = foundRect.height * rect.height / el.previewCanvas.height;

      // Spawn overlay text input box
      spawnCanvasTextInput(foundWord, foundIndex, clientLeft, clientTop, clientWidth, clientHeight);
    }
  });
}

// --- Status Indicator & Config ---
function loadApiConfig() {
  state.api.provider = localStorage.getItem('capflow_api_provider') || 'local';
  state.api.geminiKey = localStorage.getItem('capflow_gemini_key') || '';
  state.api.openaiKey = localStorage.getItem('capflow_openai_key') || '';
  
  updateApiFieldsVisibility();
  updateStatusIndicator();
}

function updateApiFieldsVisibility() {
  if (!el.apiProvider) return;
  const provider = el.apiProvider.value;
  el.geminiSettings?.classList.add('hidden');
  el.openaiSettings?.classList.add('hidden');
  
  if (provider === 'gemini') el.geminiSettings?.classList.remove('hidden');
  if (provider === 'openai') el.openaiSettings?.classList.remove('hidden');
}

function updateStatusIndicator() {
  if (!el.statusDot) return;
  el.statusDot.className = 'status-dot';
  if (state.api.provider === 'local') {
    if (state.aiModelReady) {
      el.statusDot.classList.add('active');
      el.statusText.textContent = 'Local AI Ready';
    } else if (state.workerFailed) {
      el.statusDot.classList.add('error');
      el.statusText.textContent = 'Local AI Failed';
    } else {
      el.statusDot.classList.add('idle');
      el.statusText.textContent = 'AI Model Offline';
    }
  } else {
    const isConfigured = (state.api.provider === 'gemini' && state.api.geminiKey) || 
                          (state.api.provider === 'openai' && state.api.openaiKey);
    if (isConfigured) {
      el.statusDot.classList.add('active');
      el.statusText.textContent = `Cloud AI (${state.api.provider.toUpperCase()})`;
    } else {
      el.statusDot.classList.add('idle');
      el.statusText.textContent = 'Cloud Config Needed';
    }
  }
}

// --- Setup WaveSurfer ---
function setupWaveSurfer() {
  if (typeof WaveSurfer === 'undefined') {
    console.warn("WaveSurfer library is not loaded. Using fallback mock.");
    addLogLine("[WARNING] WaveSurfer library is unavailable (CDN offline or blocked). Audio playback is disabled.");
    wavesurfer = wavesurferMock;
    return;
  }

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

  try {
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

    // Safely wrap methods to prevent "No audio loaded" or other state exceptions in WaveSurfer v7
    const safeMethods = ['getCurrentTime', 'getDuration', 'play', 'pause', 'stop', 'setTime', 'setVolume', 'setPlaybackRate', 'zoom'];
    safeMethods.forEach(method => {
      if (typeof wavesurfer[method] === 'function') {
        const original = wavesurfer[method].bind(wavesurfer);
        wavesurfer[method] = (...args) => {
          try {
            return original(...args);
          } catch (e) {
            // Silence common "No audio loaded" or other expected errors
            if (e.message !== 'No audio loaded') {
              console.warn(`WaveSurfer.${method} error:`, e.message);
            }
            if (method === 'getCurrentTime' || method === 'getDuration') return 0;
            return null;
          }
        };
      }
    });

    // Sync state and redraw canvas when timeline scrubs
    wavesurfer.on('timeupdate', (time) => {
      if (state.isPlaying) return; // Managed by renderStep

      // Manual seek or scrub on wavesurfer waveform
      state.currentTime = getTimelineTimeFromMediaTime(time);
      
      const totalDuration = state.clips && state.clips.length > 0
        ? Math.max(...state.clips.map(c => c.timelineEnd))
        : state.audioDuration;
        
      el.currentTimeDisplay.textContent = `${formatTime(state.currentTime)} / ${formatTime(totalDuration)}`;
      if (el.currentTimeMobile) {
        el.currentTimeMobile.textContent = formatTime(state.currentTime);
      }
      if (el.durationTimeMobile) {
        el.durationTimeMobile.textContent = formatTime(totalDuration);
      }
      el.timelinePositionDisplay.textContent = `Time: ${state.currentTime.toFixed(2)}s | Frame: ${Math.floor(state.currentTime * 30)} | Word Count: ${state.captions.length}`;
      highlightActiveSubtitleWord(state.currentTime);
      drawCanvas(state.currentTime);
      if (el.timelineScrollContainer) {
        el.timelineScrollContainer.scrollLeft = state.currentTime * PIXELS_PER_SECOND;
      }
      if (state.bgMediaElement) {
        if (Math.abs(state.bgMediaElement.currentTime - time) > 0.15) {
          state.bgMediaElement.currentTime = time;
        }
      }
    });

    wavesurfer.on('ready', () => {
      state.audioDuration = wavesurfer.getDuration();
      const trackWidth = state.audioDuration * PIXELS_PER_SECOND;
      if (el.timelineTracksWidthWrapper) {
        el.timelineTracksWidthWrapper.style.width = `${trackWidth}px`;
      }
      if (el.currentTimeMobile) {
        el.currentTimeMobile.textContent = '00:00.0';
      }
      if (el.durationTimeMobile) {
        el.durationTimeMobile.textContent = formatTime(state.audioDuration);
      }

      // Initialize default single clip covering the entire media file
      const isVideo = state.audioFile && state.audioFile.type.startsWith('video/');
      state.clips = [
        {
          id: 'clip-1',
          sourceStart: 0,
          sourceEnd: state.audioDuration,
          timelineStart: 0,
          timelineEnd: state.audioDuration,
          type: isVideo ? 'video' : 'audio'
        }
      ];
      state.selectedClipId = 'clip-1';

      if (isVideo) {
        const objectUrl = URL.createObjectURL(state.audioFile);
        generateClipThumbnails(state.clips[0], objectUrl).then(thumbs => {
          state.clips[0].thumbnails = thumbs;
          renderTimelineVideoTrack();
        });
      }

      renderTimelineWords();
      renderTimelineVideoTrack();
      renderTimelineRuler();
    });

    wavesurfer.on('play', () => {
      state.isPlaying = true;
      el.btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
      startRenderLoop();
    });

    wavesurfer.on('pause', () => {
      state.isPlaying = false;
      el.btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
      stopRenderLoop();
    });

    wavesurfer.on('finish', () => {
      state.isPlaying = false;
      el.btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
      stopRenderLoop();
      if (state.tapSync.isActive && state.tapSync.isSyncing) {
        finishTapSync();
      }
    });
  } catch (err) {
    console.error("WaveSurfer initialization failed:", err);
    addLogLine(`[WARNING] WaveSurfer initialization failed: ${err.message}. Fallback mock active.`);
    wavesurfer = wavesurferMock;
  }
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

// --- TTS Worker Initialization (Kokoro AI) ---
function initTTSWorker() {
  if (typeof Worker !== 'undefined') {
    try {
      ttsWorker = new Worker('tts-worker.js?cb=' + Date.now(), { type: 'module' });
      setupTTSWorkerListeners();
      addTTSLog('TTS Worker created. Kokoro library loading from CDN...');
    } catch (e) {
      console.warn('TTS Worker failed:', e.message);
      addTTSLog(`TTS Worker failed: ${e.message}`);
    }
  } else {
    addTTSLog('Web Workers not supported. TTS unavailable.');
  }
}

function setupTTSWorkerListeners() {
  if (!ttsWorker) return;

  ttsWorker.onerror = (e) => {
    console.error('TTS Worker error:', e);
    addTTSLog(`[TTS ERROR] ${e.message || 'Worker script failed.'}`);
    state.tts.isGenerating = false;
    el.btnGenerateTTS.classList.remove('generating');
    el.btnGenerateTTS.removeAttribute('disabled');
  };

  ttsWorker.onmessage = (event) => {
    const { status, progress, loaded, total, file, message, audio, sampleRate, voices, error } = event.data;

    if (status === 'downloading') {
      el.ttsDownloadProgress.classList.remove('hidden');
      const percent = Math.round(progress || 0);
      el.ttsProgressPercent.textContent = `${percent}%`;
      el.ttsProgressFill.style.width = `${percent}%`;
      addTTSLog(`Downloading: ${file || 'model'} (${((loaded || 0) / 1024 / 1024).toFixed(1)}MB / ${((total || 1) / 1024 / 1024).toFixed(1)}MB)`);
    }

    else if (status === 'ready') {
      el.ttsDownloadProgress.classList.add('hidden');
      state.tts.modelReady = true;
      addTTSLog(message || 'Kokoro TTS model loaded!');
      if (voices) {
        addTTSLog(`Available voices: ${Array.isArray(voices) ? voices.length : Object.keys(voices).length}`);
      }

      // If generation was pending (model just loaded), trigger it now
      if (state.tts.isGenerating) {
        sendTTSGenerateRequest();
      }
    }

    else if (status === 'progress') {
      addTTSLog(message);
    }

    else if (status === 'success') {
      addTTSLog('Voice generation complete!');
      processTTSOutput(audio, sampleRate);
    }

    else if (status === 'error') {
      addTTSLog(`[TTS ERROR] ${error}`);
      state.tts.isGenerating = false;
      el.btnGenerateTTS.classList.remove('generating');
      el.btnGenerateTTS.removeAttribute('disabled');
      alert(`TTS Error: ${error}`);
    }
  };
}

function addTTSLog(text) {
  el.ttsStatus.classList.remove('hidden');
  const line = document.createElement('div');
  line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  el.ttsLogLines.appendChild(line);
  el.ttsLogLines.scrollTop = el.ttsLogLines.scrollHeight;
}

// --- TTS Generation Pipeline ---
async function generateTTSVoiceover() {
  const text = el.pastedText.value.trim();
  if (!text) {
    alert('Please paste your script text into the text box above first.');
    return;
  }

  if (state.tts.isGenerating) return;

  state.tts.isGenerating = true;
  el.btnGenerateTTS.classList.add('generating');
  el.btnGenerateTTS.setAttribute('disabled', 'true');
  addTTSLog('Starting voice generation...');

  if (!ttsWorker) {
    initTTSWorker();
  }

  if (ttsWorker) {
    if (state.tts.modelReady) {
      sendTTSGenerateRequest();
    } else {
      addTTSLog('Loading Kokoro TTS model...');
      ttsWorker.postMessage({ type: 'load' });
    }
  } else {
    state.tts.isGenerating = false;
    el.btnGenerateTTS.classList.remove('generating');
    el.btnGenerateTTS.removeAttribute('disabled');
    alert("TTS Worker failed to initialize. Likely you opened the HTML file directly (file:/// protocol) or your browser blocks Module Workers. Please run a local server.");
    addTTSLog("[ERROR] TTS Worker is unavailable.");
  }
}

function sendTTSGenerateRequest() {
  if (!ttsWorker) {
    addTTSLog("[ERROR] Cannot send request: TTS Worker is null.");
    return;
  }
  const text = el.pastedText.value.trim();
  const voice = el.ttsVoice.value;
  const speed = parseFloat(el.ttsSpeed.value);
  const pitchFactor = parseFloat(el.ttsPitch.value);

  // When pitch != 1.0, we adjust the generation speed to compensate for
  // the resampling that will shift the pitch.
  // Generate at speed * pitchFactor, then resample by 1/pitchFactor.
  const adjustedSpeed = speed * pitchFactor;

  addTTSLog(`Voice: ${voice} | Speed: ${speed}x | Pitch: ${pitchFactor}x (gen speed: ${adjustedSpeed.toFixed(2)}x)`);

  ttsWorker.postMessage({
    type: 'generate',
    data: {
      text: text,
      voice: voice,
      speed: adjustedSpeed
    }
  });
}

function processTTSOutput(audioData, sampleRate) {
  const pitchFactor = parseFloat(el.ttsPitch.value);

  // Apply pitch shift via resampling if pitch != 1.0
  let processedAudio = audioData;
  if (Math.abs(pitchFactor - 1.0) > 0.01) {
    addTTSLog(`Applying pitch shift (factor: ${pitchFactor.toFixed(1)}x)...`);
    processedAudio = resampleForPitch(audioData, pitchFactor);
  }

  // Encode to WAV
  addTTSLog('Encoding WAV audio...');
  const wavBlob = encodeWAV(processedAudio, sampleRate);

  // Create a File object and feed it into the existing audio pipeline
  const wavFile = new File([wavBlob], 'kokoro-voiceover.wav', { type: 'audio/wav' });

  addTTSLog(`Generated ${(wavFile.size / 1024 / 1024).toFixed(2)}MB WAV file. Loading into player...`);

  state.tts.isGenerating = false;
  el.btnGenerateTTS.classList.remove('generating');
  el.btnGenerateTTS.removeAttribute('disabled');

  // Feed into the audio pipeline — but skip Whisper transcription since
  // we already know the exact text. Use handleTTSAudioFile which loads
  // the audio and runs Whisper for word-level timestamps.
  handleAudioFile(wavFile);
}

// Pitch-shift via linear interpolation resampling
function resampleForPitch(audioData, pitchFactor) {
  const newLength = Math.round(audioData.length / pitchFactor);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * pitchFactor;
    const srcFloor = Math.floor(srcIndex);
    const srcCeil = Math.min(srcFloor + 1, audioData.length - 1);
    const frac = srcIndex - srcFloor;
    result[i] = audioData[srcFloor] * (1 - frac) + audioData[srcCeil] * frac;
  }
  return result;
}

// Encode Float32Array to 16-bit PCM WAV blob
function encodeWAV(samples, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataLength = samples.length * (bitsPerSample / 8);
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true);  // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write PCM samples (float32 -> int16)
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
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
  if (!file || !file.type.startsWith('audio/')) {
    alert('Caption Mode accepts audio files only. Upload your video later in Video Mode.');
    return;
  }

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

      // Initialize default single clip covering the entire media file
      state.clips = [
        {
          id: 'clip-1',
          sourceStart: 0,
          sourceEnd: state.audioDuration,
          timelineStart: 0,
          timelineEnd: state.audioDuration,
          type: 'audio'
        }
      ];
      state.selectedClipId = 'clip-1';

      const trackWidth = state.audioDuration * PIXELS_PER_SECOND;
      if (el.timelineTracksWidthWrapper) {
        el.timelineTracksWidthWrapper.style.width = `${trackWidth}px`;
      }
      renderTimelineWords();
      renderTimelineVideoTrack();
      
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
      if (el.currentTimeMobile) {
        el.currentTimeMobile.textContent = '00:00.0';
      }
      if (el.durationTimeMobile) {
        el.durationTimeMobile.textContent = formatTime(decodedBuffer.duration);
      }
      
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

  if (state.bgMediaElement) {
    if (typeof state.bgMediaElement.pause === 'function') state.bgMediaElement.pause();
    state.bgMediaElement = null;
  }
  if (el.bgMediaContainer) {
    el.bgMediaContainer.innerHTML = '';
  }
  
  wavesurfer.destroy();
  setupWaveSurfer();
  
  // Reset UI
  el.audioFileDetails.classList.add('hidden');
  if (el.audioFileHint) el.audioFileHint.classList.remove('hidden');
  resetUploadPrompt();
  
  disableExporters();
  el.btnRunAISync.setAttribute('disabled', 'true');
  el.btnPlayPause.setAttribute('disabled', 'true');
  el.btnStop.setAttribute('disabled', 'true');
  el.btnAddWord.setAttribute('disabled', 'true');
  el.btnClearAllWords.setAttribute('disabled', 'true');

  state.captions = [];
  state.clips = [];
  state.selectedClipId = null;
  if (el.timelineTracksWidthWrapper) {
    el.timelineTracksWidthWrapper.style.width = '0px';
  }
  if (el.currentTimeMobile) el.currentTimeMobile.textContent = '00:00.0';
  if (el.durationTimeMobile) el.durationTimeMobile.textContent = '00:00.0';
  renderSubtitleEditor();
  renderTimelineWords();
  renderTimelineVideoTrack();
  renderTimelineRuler();
  drawCanvas(0);
}

function transferCaptionsToVideoMode() {
  if (!state.captions.length) return;

  state.videoMode.captions = state.captions.map((cap, index) => ({
    id: index + 1,
    word: cap.word,
    start: parseFloat(cap.start.toFixed(3)),
    end: parseFloat(cap.end.toFixed(3)),
    sourceStart: cap.sourceStart ?? cap.start,
    sourceEnd: cap.sourceEnd ?? cap.end
  }));
  state.videoMode.rawWhisperChunks = null;

  vmRenderSubtitleEditor();
  vmDrawCanvas(state.videoMode.currentTime || 0);
  if (el.vmBtnExportSRT) el.vmBtnExportSRT.removeAttribute('disabled');
  if (el.vmBtnAddWord) el.vmBtnAddWord.removeAttribute('disabled');
  if (el.vmBtnClearAllWords) el.vmBtnClearAllWords.removeAttribute('disabled');

  switchMode('video');

  if (!state.videoMode.videoFile) {
    vmShowUploadPrompt();
    vmAddLogLine('Captions imported from Caption Mode. Upload a video to continue in Video Mode.');
  }
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
    alert(`AI Transcription Failed: ${error.message}\n\nAlternatives:\n1. Use "Smart Estimator Sync" (paste your text + upload audio)\n2. Use "Tap-to-Sync" to manually sync`);
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
  
  if (pastedTextRaw && el.chkAlignPastedText && el.chkAlignPastedText.checked) {
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
function enableExporters() {
  el.btnExportVideo?.removeAttribute('disabled');
  el.btnExportSRT?.removeAttribute('disabled');
  el.btnSendToVideoMode?.removeAttribute('disabled');
  el.btnExportVideoMobile?.removeAttribute('disabled');
  el.btnExportSRTMobile?.removeAttribute('disabled');
  el.btnExportToggle?.removeAttribute('disabled');
}

function disableExporters() {
  el.btnExportVideo?.setAttribute('disabled', 'true');
  el.btnExportSRT?.setAttribute('disabled', 'true');
  el.btnSendToVideoMode?.setAttribute('disabled', 'true');
  el.btnExportVideoMobile?.setAttribute('disabled', 'true');
  el.btnExportSRTMobile?.setAttribute('disabled', 'true');
  el.btnExportToggle?.setAttribute('disabled', 'true');
  if (el.exportDropdownMenu) {
    el.exportDropdownMenu.classList.add('hidden');
  }
}

function syncCaptionTimestampsWithClips() {
  if (!state.clips || state.clips.length === 0) return;
  
  state.captions.forEach(c => {
    // Ensure baseline source times are set
    if (c.sourceStart === undefined) c.sourceStart = c.start;
    if (c.sourceEnd === undefined) c.sourceEnd = c.end;

    // Find which clip covers the original source time of this caption
    const clip = state.clips.find(clip => c.sourceStart >= clip.sourceStart && c.sourceStart <= clip.sourceEnd);
    if (clip) {
      // Calculate relative position within the clip and set timeline start/end
      c.start = parseFloat((clip.timelineStart + (c.sourceStart - clip.sourceStart)).toFixed(3));
      c.end = parseFloat((clip.timelineStart + (c.sourceEnd - clip.sourceStart)).toFixed(3));

      // Clamp to clip boundaries (e.g. if clip is trimmed)
      if (c.start < clip.timelineStart) c.start = clip.timelineStart;
      if (c.end > clip.timelineEnd) c.end = clip.timelineEnd;
      if (c.start >= c.end) {
        c.start = -1;
        c.end = -1;
      }
    } else {
      // Clip deleted, make word inactive
      c.start = -1;
      c.end = -1;
    }
  });
}

function onCaptionsUpdated() {
  // Ensure baseline source times are populated first based on active clips
  state.captions.forEach(c => {
    if (c.sourceStart === undefined) {
      const clip = state.clips && state.clips.find(clip => c.start >= clip.timelineStart && c.start <= clip.timelineEnd);
      if (clip) {
        c.sourceStart = parseFloat((clip.sourceStart + (c.start - clip.timelineStart)).toFixed(3));
      } else {
        c.sourceStart = c.start;
      }
    }
    if (c.sourceEnd === undefined) {
      const clip = state.clips && state.clips.find(clip => c.end >= clip.timelineStart && c.end <= clip.timelineEnd);
      if (clip) {
        c.sourceEnd = parseFloat((clip.sourceStart + (c.end - clip.timelineStart)).toFixed(3));
      } else {
        c.sourceEnd = c.end;
      }
    }
  });

  // Calculate matching timeline positions based on active clips
  syncCaptionTimestampsWithClips();

  renderSubtitleEditor();
  renderTimelineWords();
  renderTimelineVideoTrack();
  
  // Enable exporters
  if (state.captions.length > 0) {
    enableExporters();
    el.btnAddWord.removeAttribute('disabled');
    el.btnClearAllWords.removeAttribute('disabled');
    hideTranscribingLoading();
  } else {
    disableExporters();
    el.btnAddWord.setAttribute('disabled', 'true');
    el.btnClearAllWords.setAttribute('disabled', 'true');
    resetUploadPrompt();
  }

  // Redraw
  drawCanvas(state.currentTime);
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
      <p>Upload narration audio, generate a voiceover, or run sync to generate captions.</p>
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
      const cap = state.captions[index];
      cap.start = parseFloat(val.toFixed(3));
      
      const clip = state.clips && state.clips.find(clip => cap.start >= clip.timelineStart && cap.start <= clip.timelineEnd);
      if (clip) {
        cap.sourceStart = parseFloat((clip.sourceStart + (cap.start - clip.timelineStart)).toFixed(3));
      } else {
        cap.sourceStart = cap.start;
      }
      
      onCaptionsUpdated();
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
      const cap = state.captions[index];
      cap.end = parseFloat(val.toFixed(3));
      
      const clip = state.clips && state.clips.find(clip => cap.end >= clip.timelineStart && cap.end <= clip.timelineEnd);
      if (clip) {
        cap.sourceEnd = parseFloat((clip.sourceStart + (cap.end - clip.timelineStart)).toFixed(3));
      } else {
        cap.sourceEnd = cap.end;
      }
      
      onCaptionsUpdated();
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

// Render horizontal timeline word blocks proportional to their durations
function renderTimelineWords() {
  const track = el.timelineSubtitleTrack;
  if (!track) return;
  
  track.innerHTML = '';
  
  if (state.captions.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'timeline-no-data-msg';
    placeholder.textContent = 'Upload audio file to view caption timeline';
    track.appendChild(placeholder);
    return;
  }
  
  state.captions.forEach((cap, index) => {
    const block = document.createElement('div');
    block.className = 'timeline-word-block';
    block.id = `timeline-word-${index}`;
    block.dataset.index = index;
    
    // Position blocks absolutely on the horizontal timeline
    const left = cap.start * PIXELS_PER_SECOND;
    const duration = cap.end - cap.start;
    const width = Math.max(15, (duration * PIXELS_PER_SECOND) - 4);
    
    block.style.left = `${left}px`;
    block.style.width = `${width}px`;
    
    const span = document.createElement('span');
    span.textContent = cap.word;
    block.appendChild(span);
    
    // Clicking seeks WaveSurfer playhead AND scrolls the editor card into view
    block.addEventListener('click', (e) => {
      e.stopPropagation();
      if (wavesurfer) {
        wavesurfer.setTime(cap.start);
      }
      // Also scroll the corresponding editor card into view
      const card = document.getElementById(`edit-card-${index}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('active-playing');
        // Remove highlight from other cards
        document.querySelectorAll('.word-edit-card').forEach(c => {
          if (c !== card) c.classList.remove('active-playing');
        });
      }
    });
    
    // Double clicking jumps to Sidebar Subtitle Editor card, scrolls it, and focuses it
    block.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      
      // Select the sidebar tab editor
      const tabBtn = document.querySelector('.tab-btn[data-tab="editor"]');
      if (tabBtn) {
        tabBtn.click();
      }
      
      // Delay slightly to allow panel display transition, then scroll and focus
      setTimeout(() => {
        const card = document.getElementById(`edit-card-${index}`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const input = card.querySelector('input[type="text"]');
          if (input) {
            input.focus();
            input.select();
          }
        }
      }, 80);
    });
    
    track.appendChild(block);
  });
}

// Render a high-performance Canvas-based timeline ruler
function renderTimelineRuler() {
  const canvas = document.getElementById('timelineRulerCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const duration = state.audioDuration || 0;
  const width = duration * PIXELS_PER_SECOND;

  // Set canvas dimensions
  canvas.width = width;
  canvas.height = 24;

  ctx.clearRect(0, 0, width, 24);

  if (duration <= 0) return;

  // Configure styling to match the light peach/warm slate theme
  ctx.strokeStyle = 'rgba(74, 56, 52, 0.2)'; // Warm slate brown line with opacity
  ctx.fillStyle = '#4a3834'; // Slate brown text color
  ctx.font = '10px JetBrains Mono, monospace, sans-serif';
  ctx.textBaseline = 'top';

  const step = 0.1; // Draw tick every 100ms
  const numTicks = Math.ceil(duration / step);

  for (let i = 0; i <= numTicks; i++) {
    const t = i * step;
    const x = t * PIXELS_PER_SECOND;

    ctx.beginPath();
    ctx.moveTo(x, 24);

    if (Math.abs(t % 1) < 1e-9) {
      // Major tick: 1s, 2s...
      ctx.lineTo(x, 8);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(74, 56, 52, 0.45)';
      ctx.stroke();
      ctx.fillText(`${Math.round(t)}s`, x + 3, 2);
    } else if (Math.abs((t * 2) % 1) < 1e-9) {
      // Half-second tick: 0.5s, 1.5s...
      ctx.lineTo(x, 14);
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = 'rgba(74, 56, 52, 0.25)';
      ctx.stroke();
    } else {
      // Minor tick: 0.1s, 0.2s...
      ctx.lineTo(x, 18);
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(74, 56, 52, 0.15)';
      ctx.stroke();
    }
  }
}


function highlightActiveSubtitleWord(time) {
  document.querySelectorAll('.word-edit-card').forEach(card => card.classList.remove('active-playing'));
  document.querySelectorAll('.timeline-word-block').forEach(block => block.classList.remove('active'));

  const activeIndex = state.captions.findIndex(c => time >= c.start && time <= c.end);
  if (activeIndex !== -1) {
    state.activeCaptionIndex = activeIndex;
    
    // Sidebar card highlight
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

    // Timeline block highlight
    const block = document.getElementById(`timeline-word-${activeIndex}`);
    if (block) {
      block.classList.add('active');
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

  // Clear Canvas
  ctx.clearRect(0, 0, w, h);

  // Background Compositing logic for Exporting or preview solid colors
  const isExporting = state.isExporting;
  const exportFormat = el.exportFormat ? el.exportFormat.value : 'webm-transparent';

  if (isExporting && exportFormat !== 'webm-transparent') {
    ctx.clearRect(0, 0, w, h);
  }

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

  // Check if font is loaded (only in browser environment, during preview)
  if (!state.isExporting && typeof document !== 'undefined' && document.fonts) {
    const checkSpec = `${state.style.textItalic ? 'italic' : 'normal'} ${state.style.fontWeight} 16px "${state.style.fontFamily}"`;
    if (!document.fonts.check(checkSpec)) {
      document.fonts.load(checkSpec).then(() => {
        drawCanvas(time);
      }).catch(e => console.warn(e));
    }
  }

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
let lastPlayTimestamp = 0;

function startRenderLoop() {
  if (animationFrameId) return; // already running
  lastPlayTimestamp = performance.now();
  
  function renderStep() {
    if (state.isPlaying && wavesurfer) {
      const now = performance.now();
      const dt = (now - lastPlayTimestamp) / 1000;
      lastPlayTimestamp = now;

      // Update timeline current time
      state.currentTime += dt;

      const totalDuration = state.clips && state.clips.length > 0
        ? Math.max(...state.clips.map(c => c.timelineEnd))
        : state.audioDuration;

      if (state.currentTime >= totalDuration) {
        state.currentTime = totalDuration;
        togglePlayback(); // Pause at the end
        return;
      }

      // Map timeline playhead to clip media time
      const { time: sourceTime, clip } = getMediaTimeFromTimelineTime(state.currentTime);

      if (clip) {
        // We are inside a clip: play audio/video
        if (!wavesurfer.isPlaying()) {
          wavesurfer.play();
        }
        
        // Prevent audio drift
        if (Math.abs(wavesurfer.getCurrentTime() - sourceTime) > 0.15) {
          wavesurfer.setTime(sourceTime);
        }

        // Handle background video element
        if (state.bgMediaElement) {
          if (state.bgMediaElement.paused) {
            state.bgMediaElement.play().catch(e => {});
          }
          if (Math.abs(state.bgMediaElement.currentTime - sourceTime) > 0.15) {
            state.bgMediaElement.currentTime = sourceTime;
          }
        }
      } else {
        // We are in a gap: pause wavesurfer and video, play silence
        if (wavesurfer.isPlaying()) {
          wavesurfer.pause();
        }
        if (state.bgMediaElement && !state.bgMediaElement.paused) {
          state.bgMediaElement.pause();
        }
      }

      // Update UI displays
      el.currentTimeDisplay.textContent = `${formatTime(state.currentTime)} / ${formatTime(totalDuration)}`;
      if (el.currentTimeMobile) {
        el.currentTimeMobile.textContent = formatTime(state.currentTime);
      }
      if (el.durationTimeMobile) {
        el.durationTimeMobile.textContent = formatTime(totalDuration);
      }
      el.timelinePositionDisplay.textContent = `Time: ${state.currentTime.toFixed(2)}s | Frame: ${Math.floor(state.currentTime * 30)} | Word Count: ${state.captions.length}`;
      
      highlightActiveSubtitleWord(state.currentTime);
      drawCanvas(state.currentTime);
      
      if (el.timelineScrollContainer) {
        el.timelineScrollContainer.scrollLeft = state.currentTime * PIXELS_PER_SECOND;
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
    state.isPlaying = false;
    wavesurfer.pause();
    if (state.bgMediaElement && typeof state.bgMediaElement.pause === 'function') {
      state.bgMediaElement.pause();
    }
    el.btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
    stopRenderLoop();
  } else {
    state.isPlaying = true;
    el.btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
    
    // Position wavesurfer/video correctly at start of play
    const { time: sourceTime, clip } = getMediaTimeFromTimelineTime(state.currentTime);
    if (clip) {
      wavesurfer.setTime(sourceTime);
      if (state.bgMediaElement) {
        state.bgMediaElement.currentTime = sourceTime;
      }
      wavesurfer.play();
      if (state.bgMediaElement && typeof state.bgMediaElement.play === 'function') {
        state.bgMediaElement.play().catch(e => {});
      }
    } else {
      wavesurfer.pause();
      if (state.bgMediaElement && typeof state.bgMediaElement.pause === 'function') {
        state.bgMediaElement.pause();
      }
    }
    startRenderLoop();
  }
}

function stopPlayback() {
  if (!wavesurfer) return;
  state.isPlaying = false;
  el.btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
  stopRenderLoop();
  
  wavesurfer.stop();
  wavesurfer.setTime(0);
  state.currentTime = 0;
  
  if (state.bgMediaElement) {
    state.bgMediaElement.currentTime = 0;
    if (typeof state.bgMediaElement.pause === 'function') state.bgMediaElement.pause();
  }

  // Reset UI
  const totalDuration = state.clips && state.clips.length > 0
    ? Math.max(...state.clips.map(c => c.timelineEnd))
    : state.audioDuration;

  el.currentTimeDisplay.textContent = `00:00.0 / ${formatTime(totalDuration)}`;
  if (el.currentTimeMobile) el.currentTimeMobile.textContent = '00:00.0';
  highlightActiveSubtitleWord(0);
  drawCanvas(0);
  if (el.timelineScrollContainer) {
    el.timelineScrollContainer.scrollLeft = 0;
  }
}

// --- Real-time High-Quality Canvas Exporter ---
async function startExportingSubtitlesVideo() {
  if (state.captions.length === 0 || !state.audioFile) return;

  state.isExporting = true;
  disableExporters();
  el.exportProgressContainer.classList.remove('hidden');
  
  wavesurfer.pause();
  state.currentTime = 0;
  if (state.bgMediaElement) state.bgMediaElement.currentTime = 0;
  
  const totalDuration = state.clips && state.clips.length > 0
    ? Math.max(...state.clips.map(c => c.timelineEnd))
    : state.audioDuration;
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
    
    // Construct composite audio buffer from clips
    let compositeBuffer = state.audioBuffer;
    if (state.clips && state.clips.length > 0 && state.audioBuffer) {
      const sampleRate = state.audioBuffer.sampleRate;
      const numChannels = state.audioBuffer.numberOfChannels;
      const totalSamples = Math.ceil(totalDuration * sampleRate);
      
      try {
        const compositeAudioBuffer = audioContext.createBuffer(numChannels, totalSamples, sampleRate);
        for (let channel = 0; channel < numChannels; channel++) {
          const origData = state.audioBuffer.getChannelData(channel);
          const destData = compositeAudioBuffer.getChannelData(channel);
          
          state.clips.forEach(clip => {
            const srcStartIdx = Math.round(clip.sourceStart * sampleRate);
            const srcEndIdx = Math.round(clip.sourceEnd * sampleRate);
            const destStartIdx = Math.round(clip.timelineStart * sampleRate);
            
            const clipLength = srcEndIdx - srcStartIdx;
            for (let i = 0; i < clipLength; i++) {
              const srcIdx = srcStartIdx + i;
              const destIdx = destStartIdx + i;
              if (srcIdx < origData.length && destIdx < totalSamples) {
                destData[destIdx] = origData[srcIdx];
              }
            }
          });
        }
        compositeBuffer = compositeAudioBuffer;
      } catch (err) {
        console.warn("Failed to create composite audio buffer for export:", err);
      }
    }

    // Load audio buffer into offline source
    audioSource = audioContext.createBufferSource();
    audioSource.buffer = compositeBuffer;
    audioSource.connect(mediaStreamDest);
    audioSource.connect(audioContext.destination); // Play so user hears the composite audio in sync
    
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

  const origVol = wavesurfer.getVolume();
  wavesurfer.setVolume(0); // Mute wavesurfer so it doesn't double-play with our audioSource

  const recordedChunks = [];
  const recorder = new MediaRecorder(combinedStream, { 
    mimeType: mimeType,
    videoBitsPerSecond: 10000000
  });

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
    
    // Restore wavesurfer volume
    wavesurfer.setVolume(origVol);

    // Reset UI
    state.isExporting = false;
    enableExporters();
    el.exportProgressContainer.classList.add('hidden');
    addLogLine(`Video export completed! File downloaded.`);
    alert('Subtitles video successfully rendered and downloaded!');
  };

  // Start recording
  recorder.start();
  if (audioSource) audioSource.start(0);

  // Play timeline
  state.isPlaying = true;
  lastPlayTimestamp = performance.now();
  startRenderLoop();

  // Progress monitoring interval
  const checkProgressInterval = setInterval(() => {
    const elapsed = state.currentTime;
    const percent = Math.min(100, Math.round((elapsed / totalDuration) * 100));
    
    el.exportProgressLabel.textContent = `Rendering Captions: ${elapsed.toFixed(1)}s / ${totalDuration.toFixed(1)}s`;
    el.exportProgressPercentage.textContent = `${percent}%`;
    el.exportProgressFill.style.width = `${percent}%`;

    if (elapsed >= totalDuration || !state.isPlaying) {
      clearInterval(checkProgressInterval);
      state.isPlaying = false;
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

// --- Multi-clip Timeline Helper Functions ---

function getMediaTimeFromTimelineTime(t) {
  if (!state.clips || state.clips.length === 0) return { time: t, clip: null };
  const clip = state.clips.find(c => t >= c.timelineStart && t <= c.timelineEnd);
  if (clip) {
    const relativeTime = t - clip.timelineStart;
    const sourceTime = clip.sourceStart + relativeTime;
    return { time: sourceTime, clip: clip };
  }
  return { time: -1, clip: null };
}

function getTimelineTimeFromMediaTime(sourceTime) {
  if (!state.clips || state.clips.length === 0) return sourceTime;
  const clip = state.clips.find(c => sourceTime >= c.sourceStart && sourceTime <= c.sourceEnd);
  if (clip) {
    const relativeTime = sourceTime - clip.sourceStart;
    return clip.timelineStart + relativeTime;
  }
  return sourceTime;
}

async function generateClipThumbnails(clip, videoSrc) {
  return new Promise((resolve) => {
    const tempVideo = document.createElement('video');
    tempVideo.src = videoSrc;
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    
    tempVideo.style.position = 'absolute';
    tempVideo.style.left = '-9999px';
    tempVideo.style.width = '80px';
    tempVideo.style.height = '45px';
    document.body.appendChild(tempVideo);
    
    tempVideo.addEventListener('loadeddata', async () => {
      const thumbnails = [];
      const canvas = document.createElement('canvas');
      canvas.width = 80;
      canvas.height = 45;
      const ctx = canvas.getContext('2d');
      
      const duration = clip.sourceEnd - clip.sourceStart;
      const times = [
        clip.sourceStart + duration * 0.1,
        clip.sourceStart + duration * 0.5,
        clip.sourceStart + duration * 0.9
      ];
      
      for (let t of times) {
        tempVideo.currentTime = t;
        await new Promise(r => {
          const onSeeked = () => {
            tempVideo.removeEventListener('seeked', onSeeked);
            r();
          };
          tempVideo.addEventListener('seeked', onSeeked);
        });
        
        ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
        thumbnails.push(canvas.toDataURL('image/jpeg', 0.6));
      }
      
      document.body.removeChild(tempVideo);
      resolve(thumbnails);
    });
    
    tempVideo.addEventListener('error', () => {
      if (document.body.contains(tempVideo)) {
        document.body.removeChild(tempVideo);
      }
      resolve([]);
    });
  });
}

function renderTimelineVideoTrack() {
  const track = el.timelineVideoTrack;
  if (!track) return;

  track.innerHTML = '';

  if (!state.clips || state.clips.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'timeline-no-data-msg';
    placeholder.textContent = 'Upload video/audio file to view clips';
    track.appendChild(placeholder);
    
    if (el.btnSplitClip) el.btnSplitClip.disabled = true;
    if (el.btnDeleteClip) el.btnDeleteClip.disabled = true;
    return;
  }

  if (el.btnSplitClip) el.btnSplitClip.disabled = false;
  if (el.btnDeleteClip) el.btnDeleteClip.disabled = !state.selectedClipId;

  state.clips.forEach(clip => {
    const block = document.createElement('div');
    block.className = 'timeline-clip';
    if (clip.id === state.selectedClipId) {
      block.classList.add('selected');
    }
    block.dataset.id = clip.id;

    // Position absolutely
    const left = clip.timelineStart * PIXELS_PER_SECOND;
    const duration = clip.timelineEnd - clip.timelineStart;
    const width = Math.max(20, (duration * PIXELS_PER_SECOND) - 2);

    block.style.left = `${left}px`;
    block.style.width = `${width}px`;

    // Render filmstrip / thumbnails
    const filmstrip = document.createElement('div');
    filmstrip.className = 'clip-filmstrip';
    if (clip.thumbnails && clip.thumbnails.length > 0) {
      clip.thumbnails.forEach(tUrl => {
        const img = document.createElement('img');
        img.src = tUrl;
        filmstrip.appendChild(img);
      });
    }
    block.appendChild(filmstrip);

    // Label
    const label = document.createElement('div');
    label.className = 'clip-label';
    label.textContent = `${clip.type.toUpperCase()} (${duration.toFixed(1)}s)`;
    block.appendChild(label);

    // Trim Handles
    const leftHandle = document.createElement('div');
    leftHandle.className = 'clip-trim-handle clip-trim-left';
    block.appendChild(leftHandle);

    const rightHandle = document.createElement('div');
    rightHandle.className = 'clip-trim-handle clip-trim-right';
    block.appendChild(rightHandle);

    // Click to select
    block.addEventListener('click', (e) => {
      e.stopPropagation();
      state.selectedClipId = clip.id;
      renderTimelineVideoTrack();
    });

    // Left Handle Drag (Trim Start)
    let isTrimmingLeft = false;
    let trimLeftStartX = 0;
    let trimLeftInitialSourceStart = 0;
    let trimLeftInitialTimelineStart = 0;
    let trimLeftInitialTimelineEnd = 0;

    leftHandle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      leftHandle.setPointerCapture(e.pointerId);
      isTrimmingLeft = true;
      trimLeftStartX = e.clientX;
      trimLeftInitialSourceStart = clip.sourceStart;
      trimLeftInitialTimelineStart = clip.timelineStart;
      trimLeftInitialTimelineEnd = clip.timelineEnd;
      state.selectedClipId = clip.id;
      block.classList.add('trimming-left');
      renderTimelineVideoTrack();
    });

    leftHandle.addEventListener('pointermove', (e) => {
      if (!isTrimmingLeft) return;
      e.stopPropagation();

      const deltaX = e.clientX - trimLeftStartX;
      const deltaSeconds = deltaX / PIXELS_PER_SECOND;

      const precedingClip = state.clips
        .filter(c => c.timelineEnd <= trimLeftInitialTimelineStart && c.id !== clip.id)
        .sort((a, b) => b.timelineEnd - a.timelineEnd)[0];

      // Limit expansion left by preceding clip timelineEnd or original source start = 0
      const minTimelineStart = Math.max(
        precedingClip ? precedingClip.timelineEnd : 0,
        trimLeftInitialTimelineStart - trimLeftInitialSourceStart
      );

      // Limit trimming right: minimum duration 0.5s
      const maxTimelineStart = trimLeftInitialTimelineEnd - 0.5;

      let newTimelineStart = trimLeftInitialTimelineStart + deltaSeconds;
      newTimelineStart = Math.max(minTimelineStart, Math.min(newTimelineStart, maxTimelineStart));

      const actualDelta = newTimelineStart - trimLeftInitialTimelineStart;

      clip.timelineStart = parseFloat(newTimelineStart.toFixed(3));
      clip.sourceStart = parseFloat((trimLeftInitialSourceStart + actualDelta).toFixed(3));
      
      const newWidth = trimLeftInitialTimelineEnd - clip.timelineStart;
      block.style.left = `${clip.timelineStart * PIXELS_PER_SECOND}px`;
      block.style.width = `${newWidth * PIXELS_PER_SECOND}px`;
    });

    leftHandle.addEventListener('pointerup', (e) => {
      if (!isTrimmingLeft) return;
      isTrimmingLeft = false;
      leftHandle.releasePointerCapture(e.pointerId);
      block.classList.remove('trimming-left');

      state.clips.sort((a, b) => a.timelineStart - b.timelineStart);
      onCaptionsUpdated();
      renderTimelineVideoTrack();
    });

    // Right Handle Drag (Trim End)
    let isTrimmingRight = false;
    let trimRightStartX = 0;
    let trimRightInitialSourceEnd = 0;
    let trimRightInitialTimelineStart = 0;
    let trimRightInitialTimelineEnd = 0;

    rightHandle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      rightHandle.setPointerCapture(e.pointerId);
      isTrimmingRight = true;
      trimRightStartX = e.clientX;
      trimRightInitialSourceEnd = clip.sourceEnd;
      trimRightInitialTimelineStart = clip.timelineStart;
      trimRightInitialTimelineEnd = clip.timelineEnd;
      state.selectedClipId = clip.id;
      block.classList.add('trimming-right');
      renderTimelineVideoTrack();
    });

    rightHandle.addEventListener('pointermove', (e) => {
      if (!isTrimmingRight) return;
      e.stopPropagation();

      const deltaX = e.clientX - trimRightStartX;
      const deltaSeconds = deltaX / PIXELS_PER_SECOND;

      const succeedingClip = state.clips
        .filter(c => c.timelineStart >= trimRightInitialTimelineEnd && c.id !== clip.id)
        .sort((a, b) => a.timelineStart - b.timelineStart)[0];

      // Limit expansion right by succeeding clip timelineStart or original source duration end
      const maxTimelineEnd = Math.min(
        succeedingClip ? succeedingClip.timelineStart : Infinity,
        trimRightInitialTimelineEnd + (state.audioDuration - trimRightInitialSourceEnd)
      );

      // Limit trimming left: minimum duration 0.5s
      const minTimelineEnd = trimRightInitialTimelineStart + 0.5;

      let newTimelineEnd = trimRightInitialTimelineEnd + deltaSeconds;
      newTimelineEnd = Math.max(minTimelineEnd, Math.min(newTimelineEnd, maxTimelineEnd));

      const actualDelta = newTimelineEnd - trimRightInitialTimelineEnd;

      clip.timelineEnd = parseFloat(newTimelineEnd.toFixed(3));
      clip.sourceEnd = parseFloat((trimRightInitialSourceEnd + actualDelta).toFixed(3));

      const newWidth = clip.timelineEnd - trimRightInitialTimelineStart;
      block.style.width = `${newWidth * PIXELS_PER_SECOND}px`;
    });

    rightHandle.addEventListener('pointerup', (e) => {
      if (!isTrimmingRight) return;
      isTrimmingRight = false;
      rightHandle.releasePointerCapture(e.pointerId);
      block.classList.remove('trimming-right');

      state.clips.sort((a, b) => a.timelineStart - b.timelineStart);
      onCaptionsUpdated();
      renderTimelineVideoTrack();
    });

    // Drag to shift
    let isDragging = false;
    let startX = 0;
    let initialTimelineStart = 0;
    let initialTimelineEnd = 0;

    block.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('clip-trim-handle')) {
        return; // Let the trim handles capture events
      }
      e.stopPropagation();
      block.setPointerCapture(e.pointerId);
      isDragging = true;
      startX = e.clientX;
      initialTimelineStart = clip.timelineStart;
      initialTimelineEnd = clip.timelineEnd;
      state.selectedClipId = clip.id;
      block.classList.add('dragging');
      renderTimelineVideoTrack();
    });

    block.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      e.stopPropagation();

      const deltaX = e.clientX - startX;
      const deltaSeconds = deltaX / PIXELS_PER_SECOND;

      const precedingClip = state.clips
        .filter(c => c.timelineEnd <= initialTimelineStart && c.id !== clip.id)
        .sort((a, b) => b.timelineEnd - a.timelineEnd)[0];
      const succeedingClip = state.clips
        .filter(c => c.timelineStart >= initialTimelineEnd && c.id !== clip.id)
        .sort((a, b) => a.timelineStart - b.timelineStart)[0];

      const minStart = precedingClip ? precedingClip.timelineEnd : 0;
      const maxEnd = succeedingClip ? succeedingClip.timelineStart : Infinity;
      const clipDuration = initialTimelineEnd - initialTimelineStart;

      let newStart = initialTimelineStart + deltaSeconds;
      let newEnd = newStart + clipDuration;

      if (newStart < minStart) {
        newStart = minStart;
        newEnd = newStart + clipDuration;
      }
      if (newEnd > maxEnd) {
        newEnd = maxEnd;
        newStart = newEnd - clipDuration;
      }

      block.style.left = `${newStart * PIXELS_PER_SECOND}px`;
      
      clip.timelineStart = parseFloat(newStart.toFixed(3));
      clip.timelineEnd = parseFloat(newEnd.toFixed(3));
    });

    block.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      block.releasePointerCapture(e.pointerId);
      block.classList.remove('dragging');

      // Check for slot swap / re-ordering
      const dragCenter = (clip.timelineStart + clip.timelineEnd) / 2;
      const overlapClip = state.clips.find(c => c.id !== clip.id && dragCenter >= c.timelineStart && dragCenter <= c.timelineEnd);

      if (overlapClip) {
        // Swap their slots in Canva magnetic style
        const aStart = overlapClip.timelineStart;
        const bStart = initialTimelineStart;
        
        const durationA = overlapClip.timelineEnd - overlapClip.timelineStart;
        const durationB = initialTimelineEnd - initialTimelineStart;

        if (initialTimelineStart > overlapClip.timelineStart) {
          // clip was after overlapClip, now moved before overlapClip
          clip.timelineStart = aStart;
          clip.timelineEnd = aStart + durationB;
          
          overlapClip.timelineStart = clip.timelineEnd;
          overlapClip.timelineEnd = overlapClip.timelineStart + durationA;
        } else {
          // clip was before overlapClip, now moved after overlapClip
          overlapClip.timelineStart = bStart;
          overlapClip.timelineEnd = bStart + durationA;
          
          clip.timelineStart = overlapClip.timelineEnd;
          clip.timelineEnd = clip.timelineStart + durationB;
        }
      }

      state.clips.sort((a, b) => a.timelineStart - b.timelineStart);
      
      onCaptionsUpdated();
      renderTimelineVideoTrack();
    });

    track.appendChild(block);
  });
}

function splitSelectedClip() {
  if (!state.clips || state.clips.length === 0) return;
  
  const currentTime = state.currentTime;
  const activeClipIndex = state.clips.findIndex(c => currentTime > c.timelineStart && currentTime < c.timelineEnd);
  
  if (activeClipIndex === -1) {
    alert("Seek playhead to a valid position within a clip to split.");
    return;
  }
  
  const activeClip = state.clips[activeClipIndex];
  const relativeSplitTime = currentTime - activeClip.timelineStart;
  const sourceSplitTime = activeClip.sourceStart + relativeSplitTime;
  
  if (relativeSplitTime < 0.2 || (activeClip.timelineEnd - currentTime) < 0.2) {
    alert("Cannot split too close to clip boundaries.");
    return;
  }

  const clipA = {
    id: `clip-${Date.now()}-a`,
    sourceStart: activeClip.sourceStart,
    sourceEnd: sourceSplitTime,
    timelineStart: activeClip.timelineStart,
    timelineEnd: currentTime,
    type: activeClip.type,
    thumbnails: activeClip.thumbnails ? activeClip.thumbnails.slice(0, 2) : []
  };
  
  const clipB = {
    id: `clip-${Date.now()}-b`,
    sourceStart: sourceSplitTime,
    sourceEnd: activeClip.sourceEnd,
    timelineStart: currentTime,
    timelineEnd: activeClip.timelineEnd,
    type: activeClip.type,
    thumbnails: activeClip.thumbnails ? activeClip.thumbnails.slice(1) : []
  };
  
  state.clips.splice(activeClipIndex, 1, clipA, clipB);
  state.selectedClipId = clipB.id;
  
  if (activeClip.type === 'video' && state.audioFile) {
    const objectUrl = URL.createObjectURL(state.audioFile);
    generateClipThumbnails(clipA, objectUrl).then(thumbs => {
      clipA.thumbnails = thumbs;
      renderTimelineVideoTrack();
    });
    generateClipThumbnails(clipB, objectUrl).then(thumbs => {
      clipB.thumbnails = thumbs;
      renderTimelineVideoTrack();
    });
  }
  
  onCaptionsUpdated();
  renderTimelineVideoTrack();
}

function deleteSelectedClip() {
  if (!state.selectedClipId) return;
  
  const clipIndex = state.clips.findIndex(c => c.id === state.selectedClipId);
  if (clipIndex === -1) return;
  
  const deletedClip = state.clips[clipIndex];
  const gapDuration = deletedClip.timelineEnd - deletedClip.timelineStart;
  
  state.clips.splice(clipIndex, 1);
  
  state.clips.forEach(c => {
    if (c.timelineStart > deletedClip.timelineStart) {
      c.timelineStart = parseFloat((c.timelineStart - gapDuration).toFixed(3));
      c.timelineEnd = parseFloat((c.timelineEnd - gapDuration).toFixed(3));
    }
  });
  
  state.selectedClipId = null;
  onCaptionsUpdated();
  renderTimelineVideoTrack();
}

function spawnCanvasTextInput(wordObj, wordIndex, left, top, width, height) {
  document.querySelectorAll('.canvas-text-input').forEach(el => el.remove());

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'canvas-text-input';
  input.value = wordObj.word;

  const padWidth = Math.max(80, width + 30);
  const padLeft = left - (padWidth - width) / 2;
  
  input.style.left = `${padLeft}px`;
  input.style.top = `${top - 6}px`;
  input.style.width = `${padWidth}px`;
  input.style.height = `${height + 12}px`;
  
  input.style.fontFamily = `"${state.style.fontFamily}", sans-serif`;
  input.style.fontWeight = state.style.fontWeight;
  if (state.style.textUppercase) input.style.textTransform = 'uppercase';

  el.canvasViewport.appendChild(input);
  input.focus();
  input.select();

  let committed = false;

  const commit = () => {
    if (committed) return;
    committed = true;
    
    const newVal = input.value.trim();
    if (newVal && newVal !== wordObj.word) {
      wordObj.word = newVal;
      onCaptionsUpdated();
    }
    input.remove();
  };

  const cancel = () => {
    if (committed) return;
    committed = true;
    input.remove();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  });

  input.addEventListener('blur', () => {
    commit();
  });
}

// =============================================================================
// VIDEO MODE — Complete Independent Module
// =============================================================================

// Dedicated WaveSurfer instance for Video Mode
let vmWavesurfer = null;
// VM canvas 2d context
let vmCtx = null;
// VM render loop
let vmRafId = null;

// --- Mode Switching ---
function switchMode(mode) {
  if (mode !== 'caption' && mode !== 'video') return;
  state.appMode = mode;

  const captionLayout = document.getElementById('desktopLayout');
  const videoLayout = el.videoModeLayout;
  const mobileLayout = document.getElementById('mobileLayout');

  if (window.innerWidth < 992) {
    state.appMode = 'caption';
    captionLayout?.classList.add('hidden');
    videoLayout?.classList.add('hidden');
    mobileLayout?.classList.remove('hidden');
    el.btnCaptionMode?.classList.add('active');
    el.btnVideoMode?.classList.remove('active');
    if (el.btnSplitClip?.parentElement) el.btnSplitClip.parentElement.hidden = true;
    return;
  }

  if (mode === 'caption') {
    captionLayout?.classList.remove('hidden');
    videoLayout?.classList.add('hidden');
    el.btnCaptionMode?.classList.add('active');
    el.btnVideoMode?.classList.remove('active');
    if (el.btnSplitClip?.parentElement) el.btnSplitClip.parentElement.hidden = true;
    vmMoveStylePanel(document.getElementById('desktopLeftContent'));
  } else {
    captionLayout?.classList.add('hidden');
    videoLayout?.classList.remove('hidden');
    el.btnCaptionMode?.classList.remove('active');
    el.btnVideoMode?.classList.add('active');
    if (el.btnSplitClip?.parentElement) el.btnSplitClip.parentElement.hidden = false;

    // Initialize VM canvas context on first switch
    if (!vmCtx && el.vmPreviewCanvas) {
      vmCtx = el.vmPreviewCanvas.getContext('2d');
      vmDrawCanvas(0);
    }

    // Mirror caption style panel into VM left panel
    vmMoveStylePanel(document.getElementById('vmLeftContent'));

    // Initialize vmWavesurfer if not yet done
    if (!vmWavesurfer) {
      setupVmWaveSurfer();
    }
  }
}

// Mirror the style panel contents into VM left panel
function vmMoveStylePanel(target) {
  if (!target) return;
  // Clear placeholder
  const hint = target.querySelector('.vm-placeholder-hint');
  if (hint) hint.remove();

  // Reference the same style cards (they are shared DOM nodes)
  const styleCards = [
    document.getElementById('stylePresetsCard'),
    document.getElementById('styleTypographyCard'),
    document.getElementById('styleColorsCard'),
    document.getElementById('styleLayoutCard')
  ].filter(Boolean);

  styleCards.forEach(card => {
    if (card.parentElement !== target) {
      target.appendChild(card);
    }
  });
}

// --- VM WaveSurfer ---
function setupVmWaveSurfer() {
  if (typeof WaveSurfer === 'undefined') {
    vmAddLogLine('[WARNING] WaveSurfer unavailable. Audio playback disabled in Video Mode.');
    vmWavesurfer = { ...wavesurferMock };
    return;
  }

  const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#ff7597';
  const secondary = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() || '#00f0ff';

  try {
    vmWavesurfer = WaveSurfer.create({
      container: '#vmWaveformDiv',
      waveColor: 'rgba(142, 142, 159, 0.3)',
      progressColor: secondary,
      cursorColor: primary,
      cursorWidth: 2,
      barWidth: 2,
      barGap: 3,
      height: 48,
      fillParent: true,
      interact: true
    });

    const safeMethods = ['getCurrentTime', 'getDuration', 'play', 'pause', 'stop', 'setTime', 'setVolume', 'setPlaybackRate'];
    safeMethods.forEach(method => {
      if (typeof vmWavesurfer[method] === 'function') {
        const original = vmWavesurfer[method].bind(vmWavesurfer);
        vmWavesurfer[method] = (...args) => {
          try { return original(...args); } catch (e) {
            if (method === 'getCurrentTime' || method === 'getDuration') return 0;
            return null;
          }
        };
      }
    });

    vmWavesurfer.on('timeupdate', (time) => {
      if (state.videoMode.isPlaying) return;
      state.videoMode.currentTime = time;
      const dur = state.videoMode.videoDuration;
      if (el.vmTimeDisplay) el.vmTimeDisplay.textContent = `${formatTime(time)} / ${formatTime(dur)}`;
      vmDrawCanvas(time);
      // Sync video element
      if (state.videoMode.videoBgElement) {
        if (Math.abs(state.videoMode.videoBgElement.currentTime - time) > 0.15) {
          state.videoMode.videoBgElement.currentTime = time;
        }
      }
    });

    vmWavesurfer.on('play', () => {
      state.videoMode.isPlaying = true;
      if (el.vmBtnPlayPause) el.vmBtnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
      if (state.videoMode.videoBgElement) state.videoMode.videoBgElement.play().catch(() => {});
      vmStartRenderLoop();
    });

    vmWavesurfer.on('pause', () => {
      state.videoMode.isPlaying = false;
      if (el.vmBtnPlayPause) el.vmBtnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
      if (state.videoMode.videoBgElement) state.videoMode.videoBgElement.pause();
      vmStopRenderLoop();
    });

    vmWavesurfer.on('finish', () => {
      state.videoMode.isPlaying = false;
      if (el.vmBtnPlayPause) el.vmBtnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
      if (state.videoMode.videoBgElement) state.videoMode.videoBgElement.pause();
      vmStopRenderLoop();
    });

    vmWavesurfer.on('ready', () => {
      const waveformDuration = vmWavesurfer.getDuration();
      const dur = state.videoMode.videoDuration || waveformDuration;
      if (el.vmTimeDisplay) el.vmTimeDisplay.textContent = `00:00.0 / ${formatTime(dur)}`;
      if (el.vmWaveformContainer) el.vmWaveformContainer.style.display = '';
    });

  } catch(err) {
    console.error('VM WaveSurfer init failed:', err);
    vmWavesurfer = { ...wavesurferMock };
  }
}

// --- VM Render Loop ---
function vmStartRenderLoop() {
  vmStopRenderLoop();
  const step = () => {
    if (!state.videoMode.isPlaying) return;
    const time = vmWavesurfer ? vmWavesurfer.getCurrentTime() : 0;
    state.videoMode.currentTime = time;
    const dur = state.videoMode.videoDuration;
    if (el.vmTimeDisplay) el.vmTimeDisplay.textContent = `${formatTime(time)} / ${formatTime(dur)}`;
    vmDrawCanvas(time);
    vmRafId = requestAnimationFrame(step);
  };
  vmRafId = requestAnimationFrame(step);
}

function vmStopRenderLoop() {
  if (vmRafId) {
    cancelAnimationFrame(vmRafId);
    vmRafId = null;
  }
}

// --- VM Canvas Drawing (reuses main drawCanvas logic with VM canvas) ---
function vmDrawCanvas(time) {
  if (!vmCtx || !el.vmPreviewCanvas) return;

  const canvas = el.vmPreviewCanvas;
  const w = canvas.width;
  const h = canvas.height;

  vmCtx.clearRect(0, 0, w, h);

  // Draw background
  const bgType = state.bgType;
  if (bgType === 'green') {
    vmCtx.fillStyle = '#00ff00';
    vmCtx.fillRect(0, 0, w, h);
  } else if (bgType === 'black') {
    vmCtx.fillStyle = '#000000';
    vmCtx.fillRect(0, 0, w, h);
  } else if (bgType === 'grid') {
    vmCtx.fillStyle = 'rgba(100,100,100,0.08)';
    vmCtx.fillRect(0, 0, w, h);
    const gridSize = 40;
    vmCtx.strokeStyle = 'rgba(180,180,180,0.15)';
    vmCtx.lineWidth = 1;
    for (let x = 0; x <= w; x += gridSize) {
      vmCtx.beginPath();
      vmCtx.moveTo(x, 0);
      vmCtx.lineTo(x, h);
      vmCtx.stroke();
    }
    for (let y = 0; y <= h; y += gridSize) {
      vmCtx.beginPath();
      vmCtx.moveTo(0, y);
      vmCtx.lineTo(w, y);
      vmCtx.stroke();
    }
  }

  // Draw video frame from bg element if available
  if (state.videoMode.videoBgElement && state.videoMode.videoBgElement.tagName === 'VIDEO') {
    try {
      vmCtx.drawImage(state.videoMode.videoBgElement, 0, 0, w, h);
    } catch(e) {}
  }

  // Draw captions using the shared drawCanvas caption logic style
  vmDrawCaptions(time, w, h);
}

function vmDrawCaptions(time, w, h) {
  const captions = state.videoMode.captions;
  if (!captions || captions.length === 0) return;

  const st = state.style;
  const phrases = groupCaptionsIntoPhrases(captions, st.wordsPerLine);
  const currentPhrase = phrases.find(p => time >= p.start && time <= p.end);
  if (!currentPhrase) return;

  const fontSizeScaled = st.fontSize * (w / 1080);
  const fontSizeLetterSpacing = st.letterSpacing * (w / 1080);
  const strokeWidthScaled = st.strokeWidth * (w / 1080);

  let fontString = '';
  if (st.textItalic) fontString += 'italic ';
  fontString += `${st.fontWeight} ${fontSizeScaled}px "${st.fontFamily}"`;

  vmCtx.save();
  vmCtx.font = fontString;
  vmCtx.textAlign = 'center';
  vmCtx.textBaseline = 'middle';

  const anchorY = h * (st.captionPosition / 100);
  const lineHeight = fontSizeScaled * 1.35;
  const maxTextWidth = w * 0.85;
  const spacing = 32 * (w / 1080);

  const words = currentPhrase.words;
  const lines = [];
  let currentLine = [];
  let currentLineWidth = 0;

  words.forEach(wd => {
    let text = wd.word;
    if (st.textUppercase) text = text.toUpperCase();
    const wordWidth = vmCtx.measureText(text).width;
    if (currentLine.length > 0 && currentLineWidth + spacing + wordWidth > maxTextWidth) {
      lines.push({ words: currentLine, width: currentLineWidth });
      currentLine = [wd];
      currentLineWidth = wordWidth;
    } else {
      currentLineWidth = currentLine.length === 0 ? wordWidth : currentLineWidth + spacing + wordWidth;
      currentLine.push(wd);
    }
  });
  if (currentLine.length > 0) lines.push({ words: currentLine, width: currentLineWidth });

  const totalBlockHeight = (lines.length - 1) * lineHeight;
  const startY = anchorY - totalBlockHeight / 2;

  lines.forEach((line, lineIdx) => {
    const lineY = startY + lineIdx * lineHeight;
    let lineStartX = (w - line.width) / 2;
    if (st.textAlignment === 'left') lineStartX = w * 0.1;
    if (st.textAlignment === 'right') lineStartX = w * 0.9 - line.width;

    let currentX = lineStartX;
    line.words.forEach(wd => {
      let text = wd.word;
      if (st.textUppercase) text = text.toUpperCase();
      const wordWidth = vmCtx.measureText(text).width;
      const isActive = time >= wd.start && time <= wd.end;
      const wordColor = isActive ? st.highlightColor : st.textColor;

      if (st.showBoxBg) {
        const pad = (st.boxPadding || 12) * (w / 1080);
        const alpha = (st.boxBgOpacity || 80) / 100;
        vmCtx.fillStyle = hexToRgba(st.boxBgColor, alpha);
        const br = (st.boxBorderRadius || 8) * (w / 1080);
        const bx = currentX - pad;
        const by = lineY - fontSizeScaled / 2 - pad;
        const bw = wordWidth + pad * 2;
        const bh = fontSizeScaled + pad * 2;
        vmCtx.beginPath();
        vmCtx.roundRect(bx, by, bw, bh, br);
        vmCtx.fill();
      }

      if (strokeWidthScaled > 0) {
        vmCtx.strokeStyle = st.strokeColor;
        vmCtx.lineWidth = strokeWidthScaled;
        vmCtx.lineJoin = 'round';
        vmCtx.strokeText(text, currentX + wordWidth / 2, lineY);
      }

      if (st.shadowBlur > 0) {
        vmCtx.shadowColor = st.shadowColor;
        vmCtx.shadowBlur = st.shadowBlur * (w / 1080);
      }

      vmCtx.fillStyle = wordColor;
      vmCtx.fillText(text, currentX + wordWidth / 2, lineY);
      vmCtx.shadowBlur = 0;

      currentX += wordWidth + spacing;
    });
  });

  vmCtx.restore();
}

// --- VM Upload Handler (NO AUTO SYNC) ---
async function handleVideoModeUpload(file) {
  if (!file || !file.type.startsWith('video/')) {
    alert('Please upload a valid video file (MP4, MOV, WebM, etc.)');
    return;
  }

  state.videoMode.videoFile = file;

  // Update file details UI
  if (el.vmVideoFileDetails) el.vmVideoFileDetails.classList.remove('hidden');
  if (el.vmVideoFileName) el.vmVideoFileName.textContent = file.name;
  if (el.vmVideoFileSize) el.vmVideoFileSize.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
  if (el.vmVideoFileHint) el.vmVideoFileHint.classList.add('hidden');

  // Show loading state on canvas
  vmShowLoading('Loading video file...');

  if (state.videoMode.videoObjectUrl) {
    URL.revokeObjectURL(state.videoMode.videoObjectUrl);
  }
  const objectUrl = URL.createObjectURL(file);
  state.videoMode.videoObjectUrl = objectUrl;

  // Create video element for preview background
  const videoEl = document.createElement('video');
  videoEl.src = objectUrl;
  videoEl.muted = true; // muted during preview by default
  videoEl.playsInline = true;
  videoEl.loop = false;

  videoEl.onloadedmetadata = () => {
    state.videoMode.videoBgElement = videoEl;
    state.videoMode.videoDuration = videoEl.duration;

    // Populate vmBgMediaContainer for canvas overlay preview
    if (el.vmBgMediaContainer) {
      el.vmBgMediaContainer.innerHTML = '';
      const displayVideo = document.createElement('video');
      displayVideo.src = objectUrl;
      displayVideo.muted = true;
      displayVideo.playsInline = true;
      displayVideo.style.width = '100%';
      displayVideo.style.height = '100%';
      displayVideo.style.objectFit = 'cover';
      el.vmBgMediaContainer.appendChild(displayVideo);
    }
  };

  // Decode audio from video for wavesurfer
  vmAddLogLine(`Loading video: ${file.name} (${(file.size/1024/1024).toFixed(1)}MB)`);

  // Initialize VM wavesurfer if not done
  if (!vmWavesurfer) {
    setupVmWaveSurfer();
  }

  vmWavesurfer.load(objectUrl);

  // Decode audio buffer for AI sync
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const decoded = await audioCtx.decodeAudioData(e.target.result.slice(0));
      state.videoMode.videoBuffer = decoded;
      state.videoMode.videoDuration = decoded.duration;

      // Create default clip
      state.videoMode.clips = [{
        id: 'vmclip-1',
        sourceStart: 0,
        sourceEnd: decoded.duration,
        timelineStart: 0,
        timelineEnd: decoded.duration,
        type: 'video'
      }];
      state.videoMode.selectedClipId = 'vmclip-1';

      // Enable playback and sync buttons
      if (el.vmBtnPlayPause) el.vmBtnPlayPause.removeAttribute('disabled');
      if (el.vmBtnStop) el.vmBtnStop.removeAttribute('disabled');
      if (el.vmBtnRunAISync) el.vmBtnRunAISync.removeAttribute('disabled');
      if (el.vmBtnSplitClip) el.vmBtnSplitClip.removeAttribute('disabled');

      vmHideLoading();
      vmDrawCanvas(0);

      vmAddLogLine(`Video loaded. Duration: ${decoded.duration.toFixed(2)}s. Click "Run AI Sync" to generate captions.`);
    } catch(err) {
      vmAddLogLine(`[ERROR] Could not decode video audio: ${err.message}`);
      vmHideLoading();
      // Still allow preview without audio buffer
      if (el.vmBtnPlayPause) el.vmBtnPlayPause.removeAttribute('disabled');
    }
  };
  reader.readAsArrayBuffer(file);
}

// --- VM Audio Attach ---
async function attachAudioTrack(file) {
  if (!file || !file.type.startsWith('audio/')) {
    alert('Please select a valid audio file (MP3, WAV, OGG, etc.)');
    return;
  }

  vmAddLogLine(`Attaching audio track: ${file.name}`);

  const objectUrl = URL.createObjectURL(file);

  // Decode
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const decoded = await audioCtx.decodeAudioData(e.target.result);

      if (state.videoMode.attachedAudio?.objectUrl) {
        URL.revokeObjectURL(state.videoMode.attachedAudio.objectUrl);
      }
      state.videoMode.attachedAudio = { file, buffer: decoded, objectUrl };

      // Update UI
      if (el.vmAttachedAudioDetails) el.vmAttachedAudioDetails.classList.remove('hidden');
      if (el.vmAttachedAudioName) el.vmAttachedAudioName.textContent = file.name;
      if (el.vmAttachedAudioSize) el.vmAttachedAudioSize.textContent = `${(file.size/1024/1024).toFixed(2)} MB`;
      if (el.vmAudioBadge) el.vmAudioBadge.classList.remove('hidden');

      // Reload vmWavesurfer with the attached audio
      if (vmWavesurfer) {
        vmWavesurfer.load(objectUrl);
      }
      if (state.videoMode.videoFile && el.vmBtnRunAISync) {
        el.vmBtnRunAISync.removeAttribute('disabled');
      }

      vmAddLogLine(`Audio attached (${decoded.duration.toFixed(2)}s). This will be used for AI sync and export.`);
    } catch(err) {
      URL.revokeObjectURL(objectUrl);
      vmAddLogLine(`[ERROR] Could not decode attached audio: ${err.message}`);
      alert(`Could not decode audio: ${err.message}`);
    }
  };
  reader.readAsArrayBuffer(file);
}

function removeAttachedAudio() {
  if (state.videoMode.attachedAudio?.objectUrl) {
    URL.revokeObjectURL(state.videoMode.attachedAudio.objectUrl);
  }
  state.videoMode.attachedAudio = null;

  if (el.vmAttachedAudioDetails) el.vmAttachedAudioDetails.classList.add('hidden');
  if (el.vmAudioBadge) el.vmAudioBadge.classList.add('hidden');

  // Revert wavesurfer to video audio if video exists
  if (state.videoMode.videoFile && vmWavesurfer) {
    vmWavesurfer.load(state.videoMode.videoObjectUrl);
  }

  vmAddLogLine('Attached audio removed. Reverting to video native audio.');
}

function vmRemoveVideo() {
  if (state.videoMode.videoBgElement) {
    state.videoMode.videoBgElement.pause();
    state.videoMode.videoBgElement = null;
  }
  state.videoMode.videoFile = null;
  if (state.videoMode.videoObjectUrl) {
    URL.revokeObjectURL(state.videoMode.videoObjectUrl);
    state.videoMode.videoObjectUrl = null;
  }
  state.videoMode.videoBuffer = null;
  state.videoMode.videoDuration = 0;
  state.videoMode.captions = [];
  state.videoMode.clips = [];

  if (el.vmVideoFileDetails) el.vmVideoFileDetails.classList.add('hidden');
  if (el.vmVideoFileHint) el.vmVideoFileHint.classList.remove('hidden');
  if (el.vmBgMediaContainer) el.vmBgMediaContainer.innerHTML = '';
  if (el.vmBtnPlayPause) el.vmBtnPlayPause.setAttribute('disabled', 'true');
  if (el.vmBtnStop) el.vmBtnStop.setAttribute('disabled', 'true');
  if (el.vmBtnRunAISync) el.vmBtnRunAISync.setAttribute('disabled', 'true');
  if (el.vmBtnExportVideo) el.vmBtnExportVideo.setAttribute('disabled', 'true');
  if (el.vmBtnExportSRT) el.vmBtnExportSRT.setAttribute('disabled', 'true');

  if (vmWavesurfer) {
    vmWavesurfer.destroy();
    vmWavesurfer = null;
  }

  vmShowUploadPrompt();
  vmDrawCanvas(0);
  vmRenderSubtitleEditor();
}

// --- VM Canvas Overlay Helpers ---
function vmShowLoading(msg) {
  if (el.vmCanvasOverlay) el.vmCanvasOverlay.classList.remove('hidden');
  if (el.vmCanvasOverlay) el.vmCanvasOverlay.classList.remove('clickable');
  if (el.vmCanvasUploadPrompt) el.vmCanvasUploadPrompt.classList.add('hidden');
  if (el.vmCanvasLoadingPrompt) el.vmCanvasLoadingPrompt.classList.remove('hidden');
  if (el.vmCanvasLoadingSubText) el.vmCanvasLoadingSubText.textContent = msg || 'Processing...';
}

function vmHideLoading() {
  if (el.vmCanvasOverlay) el.vmCanvasOverlay.classList.add('hidden');
  if (el.vmCanvasUploadPrompt) el.vmCanvasUploadPrompt.classList.add('hidden');
  if (el.vmCanvasLoadingPrompt) el.vmCanvasLoadingPrompt.classList.add('hidden');
}

function vmShowUploadPrompt() {
  if (el.vmCanvasOverlay) el.vmCanvasOverlay.classList.remove('hidden');
  if (el.vmCanvasOverlay) el.vmCanvasOverlay.classList.add('clickable');
  if (el.vmCanvasUploadPrompt) el.vmCanvasUploadPrompt.classList.remove('hidden');
  if (el.vmCanvasLoadingPrompt) el.vmCanvasLoadingPrompt.classList.add('hidden');
}

// --- VM Log ---
function vmAddLogLine(text) {
  if (!el.vmAiLogBox || !el.vmAiLogLines) return;
  el.vmAiLogBox.classList.remove('hidden');
  const line = document.createElement('div');
  line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  el.vmAiLogLines.appendChild(line);
  el.vmAiLogLines.scrollTop = el.vmAiLogLines.scrollHeight;
}

// --- VM Playback ---
function vmTogglePlayback() {
  if (!vmWavesurfer) return;
  if (state.videoMode.isPlaying) {
    vmWavesurfer.pause();
  } else {
    vmWavesurfer.play();
  }
}

function vmStopPlayback() {
  if (!vmWavesurfer) return;
  vmWavesurfer.pause();
  vmWavesurfer.setTime(0);
  state.videoMode.currentTime = 0;
  if (state.videoMode.videoBgElement) state.videoMode.videoBgElement.currentTime = 0;
  vmDrawCanvas(0);
}

// --- VM AI Sync ---
async function runVMAISync() {
  const audioBuffer = state.videoMode.videoBuffer;
  if (!audioBuffer) {
    alert('Please upload a video file first.');
    return;
  }

  vmAddLogLine('Starting AI sync in Video Mode...');
  vmShowLoading('AI Transcribing...');

  // Reuse the same Whisper AI worker — but route results to Video Mode state
  state.videoMode.rawWhisperChunks = null;

  // Temporarily override whisper output processor
  if (state.workerFailed || !aiWorker) {
    await runVMMainThreadTranscription(audioBuffer);
  } else {
    if (state.aiModelReady) {
      await sendVMAudioForTranscription(audioBuffer);
    } else {
      vmAddLogLine('Loading AI model...');
      // Store VM pending flag
      window._vmPendingSync = audioBuffer;
      aiWorker.postMessage({ type: 'load' });
    }
  }
}

async function sendVMAudioForTranscription(audioBuffer) {
  vmAddLogLine('Downsampling video audio for AI...');
  try {
    const downsampled = await downsampleAudioBuffer(audioBuffer, 16000);
    vmAddLogLine('Sending audio to AI worker...');

    // Mark that the next AI result goes to VM
    window._vmSyncPending = true;

    aiWorker.postMessage({
      type: 'transcribe',
      data: { audio: downsampled, duration: audioBuffer.duration }
    }, [downsampled.buffer]);
  } catch(err) {
    vmAddLogLine(`[ERROR] ${err.message}`);
    vmHideLoading();
  }
}

async function runVMMainThreadTranscription(audioBuffer) {
  showAIOverlay('Video Mode — Loading AI...', 'Downloading Whisper model. Please wait...');
  try {
    if (!mainThreadTranscriber) {
      updateAIOverlay('Importing AI library...', 5);
      let mod;
      try { mod = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2'); } catch(e) {
        mod = await import('https://esm.sh/@xenova/transformers@2.17.2');
      }
      const { pipeline, env } = mod;
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      updateAIOverlay('Loading Whisper model...', 20);
      mainThreadTranscriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
        progress_callback: (d) => {
          if (d.status === 'progress') updateAIOverlay(`Downloading: ${Math.round(d.progress)}%`, 20 + d.progress * 0.6);
        }
      });
      state.aiModelReady = true;
    }
    updateAIOverlay('Transcribing...', 85);
    const audioData = await downsampleAudioBuffer(audioBuffer, 16000);
    const options = { return_timestamps: 'word' };
    if (audioBuffer.duration > 30) { options.chunk_length_s = 30; options.stride_length_s = 5; }
    const result = await mainThreadTranscriber(audioData, options);
    hideAIOverlay();
    vmProcessWhisperOutput(result);
  } catch(err) {
    hideAIOverlay();
    vmHideLoading();
    vmAddLogLine(`[ERROR] ${err.message}`);
    alert(`VM AI Sync failed: ${err.message}`);
  }
}

function vmProcessWhisperOutput(result) {
  vmAddLogLine(`Whisper output: "${result.text}"`);
  let rawChunks = result.chunks || [];
  if (rawChunks.length === 0 && result.text) {
    rawChunks = [{ text: result.text, timestamp: [0, state.videoMode.videoDuration] }];
  }
  state.videoMode.rawWhisperChunks = rawChunks;
  vmRealignCaptions();
}

function vmRealignCaptions() {
  if (!state.videoMode.rawWhisperChunks) return;
  const pastedText = el.vmPastedText?.value?.trim();
  const transcribed = getWordLevelTimestamps(state.videoMode.rawWhisperChunks);

  if (pastedText && el.vmChkAlignPastedText?.checked) {
    state.videoMode.captions = alignPastedTextWithWordTimestamps(pastedText, transcribed);
  } else {
    state.videoMode.captions = transcribed.map((w, i) => ({
      id: i + 1,
      word: w.word,
      start: parseFloat(w.start.toFixed(3)),
      end: parseFloat(w.end.toFixed(3))
    }));
  }

  vmOnCaptionsUpdated();
}

function vmOnCaptionsUpdated() {
  vmRenderSubtitleEditor();
  vmDrawCanvas(state.videoMode.currentTime);

  // Enable export buttons
  if (el.vmBtnExportVideo) el.vmBtnExportVideo.removeAttribute('disabled');
  if (el.vmBtnExportSRT) el.vmBtnExportSRT.removeAttribute('disabled');
  if (el.vmBtnAddWord) el.vmBtnAddWord.removeAttribute('disabled');
  if (el.vmBtnClearAllWords) el.vmBtnClearAllWords.removeAttribute('disabled');

  vmAddLogLine(`Captions generated: ${state.videoMode.captions.length} words.`);
}

// --- VM Subtitle Editor ---
function vmRenderSubtitleEditor() {
  const container = el.vmWordTimelineList;
  if (!container) return;

  const captions = state.videoMode.captions;
  if (!captions || captions.length === 0) {
    container.innerHTML = `
      <div class="empty-transcript-placeholder">
        <i class="fa-solid fa-quote-left"></i>
        <p>No synced subtitles yet.</p>
        <p>Run AI Sync to generate captions.</p>
      </div>`;
    return;
  }

  container.innerHTML = '';
  captions.forEach((cap, index) => {
    const card = document.createElement('div');
    card.className = 'word-edit-card';
    card.id = `vm-edit-card-${index}`;

    const startSec = parseFloat((cap.start || 0).toFixed(3));
    const endSec = parseFloat((cap.end || 0).toFixed(3));

    card.innerHTML = `
      <span class="word-num">${index + 1}</span>
      <input type="text" value="${cap.word || ''}" placeholder="word">
      <div class="time-input-group">
        <span>IN</span>
        <input type="number" value="${startSec}" step="0.01" min="0">
      </div>
      <div class="time-input-group">
        <span>OUT</span>
        <input type="number" value="${endSec}" step="0.01" min="0">
      </div>
      <button class="word-card-delete" title="Delete word"><i class="fa-solid fa-trash"></i></button>
    `;

    const [wordInput, startInput, endInput] = card.querySelectorAll('input');

    wordInput.addEventListener('change', () => {
      captions[index].word = wordInput.value;
      vmDrawCanvas(state.videoMode.currentTime);
    });
    startInput.addEventListener('change', () => {
      captions[index].start = parseFloat(startInput.value);
    });
    endInput.addEventListener('change', () => {
      captions[index].end = parseFloat(endInput.value);
    });

    card.querySelector('.word-card-delete').addEventListener('click', () => {
      state.videoMode.captions.splice(index, 1);
      vmRenderSubtitleEditor();
      vmDrawCanvas(state.videoMode.currentTime);
    });

    card.addEventListener('click', () => {
      if (vmWavesurfer && cap.start >= 0) {
        vmWavesurfer.setTime(cap.start);
      }
    });

    container.appendChild(card);
  });
}

// --- VM Export ---
function vmDownloadSRT() {
  const captions = state.videoMode.captions;
  if (!captions || captions.length === 0) {
    alert('No captions to export.');
    return;
  }
  const lines = captions.map((cap, i) => {
    const toSRT = (s) => {
      const h = Math.floor(s/3600).toString().padStart(2,'0');
      const m = Math.floor((s%3600)/60).toString().padStart(2,'0');
      const sec = Math.floor(s%60).toString().padStart(2,'0');
      const ms = Math.round((s%1)*1000).toString().padStart(3,'0');
      return `${h}:${m}:${sec},${ms}`;
    };
    return `${i+1}\n${toSRT(cap.start)} --> ${toSRT(cap.end)}\n${cap.word}\n`;
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (state.videoMode.videoFile?.name?.replace(/\.[^.]+$/, '') || 'captions') + '.srt';
  a.click();
}

async function vmStartExport() {
  if (state.videoMode.isExporting) return;
  const captions = state.videoMode.captions;
  if (!captions || captions.length === 0) {
    alert('No captions to export. Run AI Sync first.');
    return;
  }

  state.videoMode.isExporting = true;
  if (el.vmBtnExportVideo) el.vmBtnExportVideo.setAttribute('disabled', 'true');
  if (el.vmExportProgressContainer) el.vmExportProgressContainer.classList.remove('hidden');

  const canvas = el.vmPreviewCanvas;
  const format = el.vmExportFormat?.value || 'composite';
  const audioSource = el.vmExportAudio?.value || 'original';

  // Determine background for composite
  let renderBg = format === 'composite';
  let bgFill = null;

  // Get audio
  let audioBuffer = null;
  if (audioSource === 'original' && state.videoMode.videoBuffer) {
    audioBuffer = state.videoMode.videoBuffer;
  }

  const videoEl = state.videoMode.videoBgElement;
  const duration = state.videoMode.videoDuration;
  const fps = 30;
  const totalFrames = Math.ceil(duration * fps);

  // Encode video using MediaRecorder from canvas
  const stream = canvas.captureStream(fps);
  let mediaRecorder;
  const chunks = [];

  // Inject audio if needed
  if (audioBuffer && audioSource !== 'silent') {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      source.start(0);
      dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    } catch(e) {
      vmAddLogLine('[WARNING] Could not attach audio to stream: ' + e.message);
    }
  }

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : 'video/webm';

  try {
    mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 10000000
    });
  } catch(e) {
    mediaRecorder = new MediaRecorder(stream);
  }

  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (state.videoMode.videoFile?.name?.replace(/\.[^.]+$/, '') || 'export') + '_captioned.webm';
    a.click();
    URL.revokeObjectURL(a.href);

    state.videoMode.isExporting = false;
    if (el.vmBtnExportVideo) el.vmBtnExportVideo.removeAttribute('disabled');
    if (el.vmExportProgressContainer) el.vmExportProgressContainer.classList.add('hidden');
    vmAddLogLine('Export complete!');
  };

  mediaRecorder.start();

  // Seek video back to start
  if (videoEl) { videoEl.currentTime = 0; videoEl.pause(); }

  let frame = 0;
  const renderFrame = async () => {
    if (frame >= totalFrames) {
      mediaRecorder.stop();
      return;
    }

    const time = frame / fps;

    // Update canvas
    if (bgFill !== undefined && bgFill !== null) {
      vmCtx.fillStyle = bgFill;
      vmCtx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (format === 'webm-transparent') {
      vmCtx.clearRect(0, 0, canvas.width, canvas.height);
    } else if (renderBg && videoEl) {
      // Composite: draw video frame
      videoEl.currentTime = time;
      await new Promise(r => { videoEl.onseeked = r; setTimeout(r, 100); });
      vmCtx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    }

    vmDrawCaptions(time, canvas.width, canvas.height);

    const pct = Math.round((frame / totalFrames) * 100);
    if (el.vmExportProgressLabel) el.vmExportProgressLabel.textContent = `Frame ${frame} / ${totalFrames}`;
    if (el.vmExportProgressPct) el.vmExportProgressPct.textContent = `${pct}%`;
    if (el.vmExportProgressFill) el.vmExportProgressFill.style.width = `${pct}%`;

    frame++;
    setTimeout(renderFrame, 1000 / fps);
  };

  await renderFrame();
}

// --- VM Event Listeners (attached during init) ---
function setupVMEventListeners() {
  // Mode switcher
  el.btnCaptionMode?.addEventListener('click', () => switchMode('caption'));
  el.btnVideoMode?.addEventListener('click', () => switchMode('video'));

  // VM canvas overlay click to upload
  el.vmCanvasOverlay?.addEventListener('click', () => {
    if (el.vmCanvasLoadingPrompt?.classList.contains('hidden')) {
      el.vmVideoFileInput?.click();
    }
  });

  el.vmCanvasOverlay?.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (el.vmCanvasLoadingPrompt?.classList.contains('hidden')) {
      el.vmCanvasOverlay.style.borderColor = 'var(--primary)';
    }
  });

  el.vmCanvasOverlay?.addEventListener('dragleave', () => {
    el.vmCanvasOverlay.style.borderColor = '';
  });

  el.vmCanvasOverlay?.addEventListener('drop', (e) => {
    e.preventDefault();
    el.vmCanvasOverlay.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      handleVideoModeUpload(file);
    }
  });

  el.vmVideoFileInput?.addEventListener('change', (e) => {
    if (e.target.files[0]) handleVideoModeUpload(e.target.files[0]);
  });

  el.vmBtnRemoveVideo?.addEventListener('click', vmRemoveVideo);

  // VM canvas viewport click to play/pause
  el.vmCanvasViewport?.addEventListener('click', (e) => {
    if (el.vmCanvasOverlay && !el.vmCanvasOverlay.classList.contains('hidden')) return;
    vmTogglePlayback();
  });

  // VM canvas double click to edit caption
  el.vmPreviewCanvas?.addEventListener('dblclick', (e) => {
    if (state.videoMode.captions.length === 0) return;
    const rect = el.vmPreviewCanvas.getBoundingClientRect();
    const clickX_c = (e.clientX - rect.left) * (el.vmPreviewCanvas.width / rect.width);
    const clickY_c = (e.clientY - rect.top) * (el.vmPreviewCanvas.height / rect.height);

    const w = el.vmPreviewCanvas.width;
    const h = el.vmPreviewCanvas.height;
    const st = state.style;
    const phrases = groupCaptionsIntoPhrases(state.videoMode.captions, st.wordsPerLine);
    const cur = phrases.find(p => state.videoMode.currentTime >= p.start && state.videoMode.currentTime <= p.end);
    if (!cur) return;

    const tempCtx = el.vmPreviewCanvas.getContext('2d');
    tempCtx.save();
    let fs = '';
    if (st.textItalic) fs += 'italic ';
    fs += `${st.fontWeight} ${st.fontSize * (w/1080)}px "${st.fontFamily}"`;
    tempCtx.font = fs;

    const fontSizeScaled = st.fontSize * (w / 1080);
    const spacing = 32 * (w / 1080);
    const maxW = w * 0.85;
    const lines = [];
    let curLine = [], curW = 0;

    cur.words.forEach(wd => {
      let text = wd.word;
      if (st.textUppercase) text = text.toUpperCase();
      const ww = tempCtx.measureText(text).width;
      if (curLine.length > 0 && curW + spacing + ww > maxW) {
        lines.push({ words: curLine, width: curW });
        curLine = [wd]; curW = ww;
      } else {
        curW = curLine.length === 0 ? ww : curW + spacing + ww;
        curLine.push(wd);
      }
    });
    if (curLine.length > 0) lines.push({ words: curLine, width: curW });

    const anchorY = h * (st.captionPosition / 100);
    const lineH = fontSizeScaled * 1.35;
    const startY = anchorY - ((lines.length - 1) * lineH) / 2;

    let found = null, foundIdx = -1, foundRect = null;
    lines.forEach((line, li) => {
      if (found) return;
      const lineY = startY + li * lineH;
      let cx = st.textAlignment === 'center' ? (w - line.width) / 2
             : st.textAlignment === 'left' ? w * 0.1
             : w * 0.9 - line.width;
      line.words.forEach(wd => {
        if (found) return;
        let text = wd.word;
        if (st.textUppercase) text = text.toUpperCase();
        const ww = tempCtx.measureText(text).width;
        const pad = 20;
        if (clickX_c >= cx - pad && clickX_c <= cx + ww + pad &&
            clickY_c >= lineY - fontSizeScaled/2 - pad && clickY_c <= lineY + fontSizeScaled/2 + pad) {
          found = wd;
          foundIdx = state.videoMode.captions.indexOf(wd);
          foundRect = { left: cx, top: lineY - fontSizeScaled/2, width: ww, height: fontSizeScaled };
        }
        cx += ww + spacing;
      });
    });

    tempCtx.restore();

    if (found && foundIdx !== -1 && foundRect) {
      if (state.videoMode.isPlaying) vmTogglePlayback();
      const vr = el.vmCanvasViewport.getBoundingClientRect();
      const cL = (foundRect.left * rect.width / w) + (rect.left - vr.left);
      const cT = (foundRect.top * rect.height / h) + (rect.top - vr.top);
      const cW = foundRect.width * rect.width / w;
      const cH = foundRect.height * rect.height / h;
      // Reuse spawnCanvasTextInput but targeting VM canvas viewport and VM captions
      spawnVMCanvasTextInput(found, foundIdx, cL, cT, cW, cH);
    }
  });

  // VM playback
  el.vmBtnPlayPause?.addEventListener('click', vmTogglePlayback);
  el.vmBtnStop?.addEventListener('click', vmStopPlayback);

  el.vmPlaybackVolume?.addEventListener('input', (e) => {
    if (vmWavesurfer) vmWavesurfer.setVolume(parseFloat(e.target.value));
  });

  el.vmPlaybackSpeed?.addEventListener('change', (e) => {
    if (vmWavesurfer) vmWavesurfer.setPlaybackRate(parseFloat(e.target.value));
  });

  // VM aspect ratio
  el.vmBtnAspectPortrait?.addEventListener('click', () => {
    state.videoMode.aspectRatio = '9:16';
    el.vmBtnAspectPortrait.classList.add('active');
    el.vmBtnAspectLandscape.classList.remove('active');
    el.vmCanvasViewport.classList.add('portrait-mode');
    el.vmCanvasViewport.classList.remove('landscape-mode');
    if (el.vmPreviewCanvas) { el.vmPreviewCanvas.width = 1080; el.vmPreviewCanvas.height = 1920; }
    vmCtx = el.vmPreviewCanvas?.getContext('2d');
    vmDrawCanvas(state.videoMode.currentTime);
  });

  el.vmBtnAspectLandscape?.addEventListener('click', () => {
    state.videoMode.aspectRatio = '16:9';
    el.vmBtnAspectLandscape.classList.add('active');
    el.vmBtnAspectPortrait.classList.remove('active');
    el.vmCanvasViewport.classList.add('landscape-mode');
    el.vmCanvasViewport.classList.remove('portrait-mode');
    if (el.vmPreviewCanvas) { el.vmPreviewCanvas.width = 1920; el.vmPreviewCanvas.height = 1080; }
    vmCtx = el.vmPreviewCanvas?.getContext('2d');
    vmDrawCanvas(state.videoMode.currentTime);
  });

  // VM Sync
  el.vmBtnRunAISync?.addEventListener('click', runVMAISync);
  el.vmPastedText?.addEventListener('input', () => {
    if (state.videoMode.rawWhisperChunks) vmRealignCaptions();
  });
  el.vmChkAlignPastedText?.addEventListener('change', () => {
    if (state.videoMode.rawWhisperChunks) vmRealignCaptions();
  });

  // VM Subtitle Editor
  el.vmBtnAddWord?.addEventListener('click', () => {
    const time = state.videoMode.currentTime;
    state.videoMode.captions.push({ id: Date.now(), word: 'NEW', start: time, end: time + 0.5 });
    vmRenderSubtitleEditor();
  });
  el.vmBtnClearAllWords?.addEventListener('click', () => {
    if (confirm('Clear all captions in Video Mode?')) {
      state.videoMode.captions = [];
      state.videoMode.rawWhisperChunks = null;
      vmRenderSubtitleEditor();
      vmDrawCanvas(0);
    }
  });

  // VM Clip Tools
  el.vmBtnSplitClip?.addEventListener('click', () => {
    const time = state.videoMode.currentTime;
    const clips = state.videoMode.clips;
    const clipIdx = clips.findIndex(c => time >= c.timelineStart && time <= c.timelineEnd);
    if (clipIdx < 0) return;
    const clip = clips[clipIdx];
    const relTime = clip.sourceStart + (time - clip.timelineStart);
    const newClip1 = { ...clip, id: `vmclip-${Date.now()}a`, sourceEnd: relTime, timelineEnd: time };
    const newClip2 = { ...clip, id: `vmclip-${Date.now()}b`, sourceStart: relTime, timelineStart: time };
    clips.splice(clipIdx, 1, newClip1, newClip2);
    state.videoMode.selectedClipId = newClip2.id;
    vmAddLogLine(`Split clip at ${time.toFixed(2)}s`);
  });

  el.vmBtnDeleteClip?.addEventListener('click', () => {
    if (!state.videoMode.selectedClipId) return;
    state.videoMode.clips = state.videoMode.clips.filter(c => c.id !== state.videoMode.selectedClipId);
    state.videoMode.selectedClipId = null;
    vmAddLogLine('Clip deleted.');
  });

  // VM Export
  el.vmBtnExportVideo?.addEventListener('click', vmStartExport);
  el.vmBtnExportSRT?.addEventListener('click', vmDownloadSRT);

}

// VM inline caption text input (mirrors spawnCanvasTextInput but for VM)
function spawnVMCanvasTextInput(wordObj, wordIndex, left, top, width, height) {
  document.querySelectorAll('.canvas-text-input').forEach(e => e.remove());

  const viewport = el.vmCanvasViewport;
  if (!viewport) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'canvas-text-input';
  input.value = wordObj.word;
  input.style.left = `${left}px`;
  input.style.top = `${top}px`;
  input.style.width = `${Math.max(width, 80)}px`;
  input.style.height = `${height}px`;
  input.style.fontSize = `${Math.max(height * 0.7, 12)}px`;

  viewport.style.position = 'relative';
  viewport.appendChild(input);
  input.focus();
  input.select();

  let committed = false;
  const commit = () => {
    if (committed) return;
    committed = true;
    const val = input.value.trim();
    if (val && val !== wordObj.word) {
      wordObj.word = val;
      vmOnCaptionsUpdated();
    }
    input.remove();
  };
  const cancel = () => { if (committed) return; committed = true; input.remove(); };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  input.addEventListener('blur', commit);
}

// Patch the AI worker message handler to also route to VM when a VM sync is pending
function patchWorkerForVM() {
  if (!aiWorker) return;
  const originalOnMessage = aiWorker.onmessage;
  aiWorker.onmessage = (event) => {
    const { status, result, error, progress, loaded, total, file, message } = event.data;
    const vmWaiting = Boolean(window._vmSyncPending || window._vmPendingSync);

    if (vmWaiting && status === 'success') {
      window._vmSyncPending = false;
      window._vmPendingSync = null;
      vmHideLoading();
      vmProcessWhisperOutput(result);
      // Also update model progress for VM
      if (el.vmModelProgressFill) el.vmModelProgressFill.style.width = '100%';
      return;
    }

    if (vmWaiting && status === 'downloading') {
      if (el.vmModelDownloadProgress) el.vmModelDownloadProgress.classList.remove('hidden');
      const pct = Math.round(progress || 0);
      if (el.vmModelProgressPercent) el.vmModelProgressPercent.textContent = `${pct}%`;
      if (el.vmModelProgressFill) el.vmModelProgressFill.style.width = `${pct}%`;
    }

    if (vmWaiting && status === 'ready') {
      if (el.vmModelDownloadProgress) el.vmModelDownloadProgress.classList.add('hidden');
      state.aiModelReady = true;
      if (window._vmPendingSync) {
        const buf = window._vmPendingSync;
        window._vmPendingSync = null;
        sendVMAudioForTranscription(buf);
      }
      return;
    }

    if (vmWaiting && status === 'progress') {
      vmAddLogLine(message || 'AI processing...');
      return;
    }

    if (vmWaiting && status === 'error') {
      window._vmSyncPending = false;
      window._vmPendingSync = null;
      vmHideLoading();
      vmAddLogLine(`[WORKER ERROR] ${error || 'AI sync failed.'}`);
      alert(`Video Mode AI Error: ${error || 'AI sync failed.'}`);
      return;
    }

    // Call the original handler for caption mode
    if (originalOnMessage) originalOnMessage(event);
  };
}

// Apply init and default preset
init();
applyStylePreset('classic_bold');
setupVMEventListeners();
switchMode(state.appMode);
// Patch worker after init (which calls initWorker and sets aiWorker)
patchWorkerForVM();
