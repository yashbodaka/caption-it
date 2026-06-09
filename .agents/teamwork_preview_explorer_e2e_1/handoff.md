# Handoff Report — teamwork_preview_explorer_e2e_1

## 1. Observation
- **Local Server**: Setup is defined in `server.py` lines 29-33:
  ```python
  with socketserver.TCPServer(("127.0.0.1", PORT), SafeMimeHandler) as httpd:
      print(f"Safe dev server running at http://127.0.0.1:{PORT}")
  ```
- **Timeline Scale**: Zoom and scaling factor is defined in `app.js` line 227:
  ```javascript
  const PIXELS_PER_SECOND = 150;
  ```
- **Responsiveness**: Layout handles viewports in `app.js` lines 369-371:
  ```javascript
  const isDesktop = window.innerWidth >= 992;
  const desktopLayout = document.getElementById('desktopLayout');
  const mobileLayout = document.getElementById('mobileLayout');
  ```
- **Timeline Actions (Split)**: Implemented in `app.js` lines 3852-3855:
  ```javascript
  function splitSelectedClip() {
    if (!state.clips || state.clips.length === 0) return;
    const currentTime = state.currentTime;
  ```
- **Timeline Actions (Delete)**: Implemented in `app.js` lines 3911-3913:
  ```javascript
  function deleteSelectedClip() {
    if (!state.selectedClipId) return;
  ```
- **Canvas Editing Mapping**: Double click event is bound in `app.js` line 857:
  ```javascript
  el.previewCanvas?.addEventListener('dblclick', (e) => {
  ```
  And calculations are performed to find the word index:
  ```javascript
  const anchorY = h * (state.style.captionPosition / 100);
  ```
- **MediaRecorder Configuration**: Initialized in `app.js` line 3366:
  ```javascript
  const recorder = new MediaRecorder(combinedStream, { mimeType: mimeType });
  ```
  It does not configure `videoBitsPerSecond` in the options block.
- **Timeline seeking**: Handled by clicking the width wrapper in `app.js` line 806:
  ```javascript
  el.timelineTracksWidthWrapper.addEventListener('click', (e) => {
  ```
- **Timeline word double-click**: Switches mobile tabs and scrolls editor card into view in `app.js` lines 2550-2561:
  ```javascript
  block.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    const tabBtn = document.querySelector('.tab-btn[data-tab="editor"]');
    ...
    setTimeout(() => {
      const card = document.getElementById(`edit-card-${index}`);
  ```

## 2. Logic Chain
1. Using the observed `server.py` setup, we can write a pytest session-scoped fixture to programmatically launch the local development server on port 8080 and ensure it is up before starting any test class.
2. Based on the responsive layout switching code in `app.js`, we can configure Playwright to resize the viewport to `>=992px` (desktop layout) or `<992px` (mobile layout) and check for elements visibility (e.g. `.timeline-section` visible and `#desktopWaveformContainerParent` hidden on desktop).
3. The absolute mapping scale `PIXELS_PER_SECOND = 150` allows us to calculate target offsets relative to `#timelineTracksWidthWrapper` for seeking playhead and dragging left/right trim handles.
4. Using the canvas double-click coordinate mapping math where `anchorY` depends on `captionPosition` (default 75%), we can target Playwright's `dblclick` at coordinate position `{x: width/2, y: height * 0.75}` on `#previewCanvas` to spawn the editing input overlay.
5. Observing that `videoBitsPerSecond` is currently omitted in the `MediaRecorder` setup in `app.js`, we conclude that a Playwright spy/mock script injected before page load is the most robust way to verify options passed to the `MediaRecorder` constructor.
6. Combining all these logical elements, we can map 71 test cases distributed across 4 Tiers to exhaustively verify the app's functionality.

## 3. Caveats
- Since the AI synchronization and voice generator (Kokoro TTS and Whisper) use browser-side caching and fetch models (~75MB and ~330MB), standard network calls must be mocked in the test environment to prevent timeout delays and network boundary failures.
- Canvas text measuring (`measureText`) depends slightly on OS-level font rendering, so coordinate matching bounds should maintain a tolerance margin (e.g. 20px padding) which is already in the app's code.

## 4. Conclusion
We have established a complete end-to-end Python Playwright test suite design. By using the existing pytest/playwright environment, mock injection scripts, and pointer dragging sequences, we can fully automate the verification of CaptionFlow Studio features including the desktop timeline layout, clip actions, timeline seek/focus, canvas editing, and high-quality MediaRecorder export.

## 5. Verification Method
1. Inspect the layout report in `d:\internship\caption-creator\.agents\teamwork_preview_explorer_e2e_1\analysis.md` to verify the selectors registry and coordinate mapping formulas.
2. Run standard local pytest suite commands once implemented, e.g.:
   ```powershell
   pytest tests/ -v
   ```
3. Test suite invalidation condition: If class names/IDs of layout wrappers (e.g., `#desktopLayout` or `#mobileLayout`) are renamed in `index.html`/`app.js`, the tests will fail.
