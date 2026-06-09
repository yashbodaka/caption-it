# Scope: E2E Testing Track

## Architecture
- Client-side application: `index.html`, `app.js`, `style.css`.
- Test suite: Python Playwright using the existing python packages (`playwright 1.58.0` and `pytest`).
- Test layout: Opaque-box testing of the running web server (`http://127.0.0.1:8080`).

## Feature Inventory (N = 6)
1. **F1: Desktop Timeline Layout & Visibility** - Checks timeline container visibility on desktop (>=992px) and ensuring static/redundant waveform card is hidden.
2. **F2: Timeline Clip Actions** - Checks clip splitting, deleting, trimming, and reordering on both mobile and desktop viewports.
3. **F3: Waveform Alignment & Zoom** - Verifies audio waveform zoom and subtitle track sync/alignment (zoom factor of 150).
4. **F4: High-Quality Export Controls UI & Config** - Verifies the export options dropdown and MediaRecorder configuration of 10 Mbps (videoBitsPerSecond: 10000000).
5. **F5: Export Compositing & Audio Alignment** - Validates the exported composite/transparent outputs and correct alignment of audio silent gaps.
6. **F6: Canvas & Timeline Interactive Editing** - Verifies canvas double-click spawning a text input overlay, and timeline word block click seeking/focusing sidebar card.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Plan & Infra Design | Investigate runtime, design test harness/runner, and write TEST_INFRA.md | None | IN_PROGRESS |
| 2 | Test Case Implementation | Write Tiers 1-4 test cases covering all 6 features (71 test cases total) | M1 | PLANNED |
| 3 | Verification & Run | Run tests, verify execution, and publish TEST_READY.md | M2 | PLANNED |

## Interface Contracts
- Tests must interact with the application solely through the DOM elements (opaque-box).
- Page viewport sizes: Desktop (>= 992px, e.g. 1280x800), Mobile (< 992px, e.g. 375x667).
- Playwright page interactions must map canvas coordinates properly for double click edit overlay.
