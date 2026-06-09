## 2026-06-09T05:45:54Z
You are the In-Preview and Timeline Caption Editing Developer.
Your working directory is d:\internship\caption-creator\.
Your metadata/state folder is d:\internship\caption-creator\.agents\worker_caption_editing\.
You are tasked with implementing the R3: In-Preview & Timeline Caption Editing requirements.

### Objective:
1. Double-clicking caption text on the canvas:
   - Must pause playback (if playing) and spawn a styled text input overlay precisely over the double-clicked word.
   - The coordinates calculation must correctly map click client coordinates (relative to the canvas bounding rect) to canvas internal coordinates using width/height scale ratios.
   - On pressing 'Enter' or on input 'blur', the updated word must be saved back into the `state.captions` array at the correct index, `onCaptionsUpdated()` must be called to propagate changes, and the text input overlay must be removed.
   - On pressing 'Escape', the input overlay must be removed without committing any changes.
   - Ensure the canvas text input overlay styling (font family, weight, text transformation/case, size, etc.) matches the surrounding application design.
2. Single-clicking and double-clicking timeline word blocks:
   - Find `renderTimelineWords()` in `app.js` which builds the `.timeline-word-block` elements.
   - Make sure that both the 'click' and 'dblclick' event listeners on the word blocks seek the playback head (e.g. `wavesurfer.setTime(cap.start)`), switch to the Editor tab (by invoking the click handler for the editor tab button `[data-tab="editor"]`), scroll the corresponding sidebar word card (`#edit-card-${index}`) smoothly into view, and focus/select the text input within it.
   - (Note: Seeks, tab-switching, scrolling, and input focusing/selecting must occur reliably for both single click and double click events on any timeline word block).

### Scope Boundaries:
- Keep changes focused on the R3 canvas double-click overlay input and timeline word blocks event handlers. Do NOT modify unrelated CSS layout rules or export controls.

### Input Files:
- `index.html`, `app.js`, `style.css`.

### Output Requirements:
- Write a completion report (`handoff.md`) in `d:\internship\caption-creator\.agents\worker_caption_editing\handoff.md` detailing changes, logic chain, and verification results.
- Update `d:\internship\caption-creator\.agents\worker_caption_editing\progress.md` with your progress.

### MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
