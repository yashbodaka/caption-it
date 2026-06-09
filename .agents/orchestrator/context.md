# Project Context - CaptionFlow Studio Updates

## Codebase Information
- Single-page application using client-side JS (`app.js`), styles (`style.css`), and template (`index.html`).
- A dev server is available via `server.py` (running Python http.server on port 8080).
- External libraries: WaveSurfer.js.
- Local AI model for transcription is loaded via `tts-worker.js` / `worker.js`.

## Tasks & Requirements
- **R1: Desktop Timeline Integration**: Bring mobile timeline to desktop, replacing static waveform card. Maintain clip operation sync, align waveform zoom/scroll.
- **R2: High-Quality Export Controls**: 10 Mbps bitrate on MediaRecorder, multiple download formats (composite, transparent WebM, chroma green WebM/MP4, black background WebM). Align silent gaps to timeline edits.
- **R3: Caption Editing**: Double-click on canvas caption to edit in-place; click/double-click timeline word blocks to seek playhead and focus/scroll editor card.
