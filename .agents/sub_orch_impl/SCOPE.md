# Scope: Implementation Track

## Architecture
- Client-side web application: index.html, app.js, style.css.
- WaveSurfer.js for audio waveform rendering.
- Subtitle phrases rendered on 2D canvas overlaying background media.
- Background media: grid, green, black, or custom media.
- Video export: canvas stream capture + offline AudioContext buffer.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Desktop Timeline Integration (R1) | Move multi-track timeline container into desktop layout, hide redundant static waveform, ensure identical clip actions, align zoom/scroll. | None | DONE |
| 2 | High-Quality Export Controls (R2) | Add all required export options, set MediaRecorder videoBitsPerSecond to 10000000, align silent gaps to timeline edits. | R1 | DONE |
| 3 | In-Preview & Timeline Caption Editing (R3) | Canvas double-click text editing; seek playhead and focus/scroll sidebar card when timeline word blocks clicked. | R1, R2 | IN_PROGRESS |

## Interface Contracts
### Layout changes
- `#mobileTimelineSection` relocated/appended to desktop center content on desktop resolutions.
- `wavesurfer.zoom` set to `PIXELS_PER_SECOND` (150) on all viewports to align waveform and subtitle tracks.
### Export controls
- MediaRecorder initialized with `videoBitsPerSecond: 10000000`.
- Export formats (composite, webm-transparent, webm-green, mp4-green, webm-black) correctly set background fill in `drawCanvas`.
### Caption editing
- Canvas double-click relative client coordinate mapping matches scale ratios.
- Timeline word blocks single click seeks playhead, double click focuses/scrolls editor card on both desktop and mobile.
