# Project: CaptionFlow Studio Updates

## Architecture
- Client-side web application: `index.html`, `app.js`, `style.css`.
- WaveSurfer.js for audio waveform rendering.
- Subtitle phrases rendered on 2D canvas overlaying background media.
- Background media: grid, green, black, or custom media.
- Video export: canvas stream capture + offline AudioContext buffer.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | E2E Testing Track | Design and implement the E2E test suite (Tiers 1-4) | None | PLANNED |
| 2 | Desktop Timeline Integration (R1) | Move multi-track timeline container into desktop layout, hide redundant static waveform, ensure identical clip actions, align zoom/scroll. | None | PLANNED |
| 3 | High-Quality Export Controls (R2) | Add all required export options, set MediaRecorder videoBitsPerSecond to 10000000, align silent gaps to timeline edits. | None | PLANNED |
| 4 | In-Preview & Timeline Caption Editing (R3) | Canvas double-click text editing; seek playhead and focus/scroll sidebar card when timeline word blocks clicked. | None | PLANNED |
| 5 | Integration and Verification | Run full E2E test suite (Tiers 1-4) on the final implementation. | M1, M2, M3, M4 | PLANNED |
| 6 | Adversarial Hardening (Tier 5) | White-box gap analysis, generate adversarial tests, fix uncovered issues. | M5 | PLANNED |

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
