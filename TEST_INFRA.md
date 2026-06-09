# Playwright E2E Test Infrastructure

This document outlines the design, execution, and mocking strategies for the Python-based Playwright E2E test suite.

## Test Architecture

The E2E test suite contains **71 test cases** divided into 4 progressive tiers:

- **Tier 1: Environment & Layout Responsiveness Tests (15 cases)**: Verifies the local development server starts correctly, confirms correct title and metadata, tests responsive layout switches (breakpoints, element restructuring), and verifies modal behavior and aspect ratio adjustments.
- **Tier 2: Core Functional & Media Manipulation Tests (18 cases)**: Validates audio/video file uploading, details extraction, removal, basic playback controls (play/pause/stop), timecode tracking, playback volume, speed settings, style customizer presets, and individual font/uppercase/italic/vertical position selectors.
- **Tier 3: Timeline Tracks & Segment Operations (18 cases)**: Tests multi-track timeline rendering, clip active states, split clip operations, boundary validations, deleting segments, trimming start/end handles with expansion/source/minimum-duration limits, clip dragging, magnetic swaps, waveform zoom, and playhead positioning.
- **Tier 4: Advanced Interaction & Exporter Integration (20 cases)**: Asserts canvas subtitle rendering, double-click to spawn inline text editors, input commit (Enter, blur) and cancel (Escape) actions, coordinate alignment mapping, word-card timing edits (adding/clearing words), Kokoro TTS / Whisper AI mock interactions, and exporter bitrate/progress tracking.

## Test Setup & Fixtures

### 1. Session-Scoped Local Server (`tests/conftest.py`)
- Automatically spawns `server.py` as a background subprocess when running the test suite.
- Polls port `8080` until a TCP connection can be established.
- Safely terminates the server process when all tests complete.
- Pre-generates a silent, valid 3-second WAV file (`dummy.wav`) in the `tests/` directory to serve as the upload payload for E2E tests, cleaning it up at teardown.

### 2. Custom Function-Scoped Page Fixture
- Leverages the native `playwright.sync_api.sync_playwright` to construct a headless Chromium instance, context, and page on the fly for each test.
- This ensures test cases execute successfully even on environments where the `pytest-playwright` plugin is not installed.

## Mocking & Spy Strategies

### 1. Web Workers (Whisper AI and Kokoro TTS)
- Heavy deep-learning neural models (~75MB and ~330MB) are loaded as browser web workers.
- The test suite overrides `window.Worker` with a mock class during page initialization.
- This mock worker intercepts `postMessage` calls for both `worker.js` and `tts-worker.js`, firing simulated asynchronous events (e.g. download progress, model ready, transcription results, WAV generation success) deterministically.

### 2. Canvas Text Rendering Spy
- Spies on the `CanvasRenderingContext2D.prototype.fillText` method to capture subtitle texts and coordinates drawn on the preview screen for verification.

### 3. Exporter Video Recorder Spy
- Overrides `window.MediaRecorder` to intercept construction parameters, allowing tests to verify that the canvas stream records at the correct high-quality bitrate configuration of `10,000,000` bps (10 Mbps).

## Execution Instructions

Ensure you have the required dependencies and browsers installed:
```powershell
pip install pytest playwright
playwright install chromium
```

To execute the entire test suite, run the following command from the project root:
```powershell
pytest
```
