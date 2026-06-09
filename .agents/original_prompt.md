## 2026-06-09T05:36:45Z

Implement a responsive multi-clip timeline editor, interactive screen-preview caption editor, and high-fidelity custom export formatting in CaptionFlow Studio on desktop and mobile viewports.

Working directory: d:/internship/caption-creator
Integrity mode: development

## Requirements

### R1. Desktop Timeline Integration
- Make the multi-track timeline container (with ruler, video clips track, audio waveform track, and subtitle track) fully visible and responsive on desktop resolutions (>= 992px), replacing the redundant static waveform view.
- Maintain identical functionality for splitting, deleting, trimming, and reordering clips on both desktop and mobile.
- Ensure that the audio waveform zoom and subtitle positions align perfectly on all viewports.

### R2. High-Quality Export Controls
- Provide distinct dropdown options to:
  1. Download Whole Video with Captions (compositing background video, audio, and captions at high quality).
  2. Download Caption Video Only (transparent WebM, chroma green WebM/MP4, or black background WebM).
- Configure MediaRecorder bitrates to export at high definition (10 Mbps) to match original download quality.

### R3. In-Preview and Timeline Caption Editing
- Support editing captions dynamically on double-click over the preview canvas by spawning a styled text input overlay.
- Clicking or double-clicking subtitle word blocks on the timeline should seek the playback head and focus/scroll the sidebar editor card for rapid correction.

## Acceptance Criteria

### UI Accessibility & Responsiveness
- [ ] Timeline is fully visible and styled as a premium glassmorphic card on desktop.
- [ ] Gaps, clips, and trim handles display properly on desktop and can be dragged, trimmed, and split.
- [ ] Default desktop waveform card is hidden when desktop layout is active.

### Export High-Fidelity
- [ ] Export formats are clearly labeled in the format dropdown.
- [ ] The MediaRecorder is configured to use `videoBitsPerSecond: 10000000` for high-fidelity composite output.
- [ ] Composited exports contain the background video and extracted/composed audio with silent gaps aligned to timeline edits.

### Editing Synchronicity
- [ ] Double-clicking caption text on the canvas spawns a text field to edit the word in-place, updating the transcript.
- [ ] Double-clicking timeline word blocks switches to the Editor tab and focuses the corresponding word card.
