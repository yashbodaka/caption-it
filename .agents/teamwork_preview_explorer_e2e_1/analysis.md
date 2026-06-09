# CaptionFlow Studio Playwright E2E Test Suite Design

## Executive Summary
This document provides a comprehensive blueprint for designing and implementing an end-to-end Python Playwright test suite for the **CaptionFlow Studio** application. It details selector strategies, exact Playwright interaction sequences for timeline operations (split, delete, trim, reorder), canvas double-click coordinate mapping calculations, test environment integration with `server.py`, and a complete breakdown of 71 tests structured across Tiers 1-4.

---

## 1. Element Selector Registry
The following table maps critical application components to their Playwright-accessible selectors.

| Component Group | Component Name | Selector | Verification Property / Behavior |
| :--- | :--- | :--- | :--- |
| **Config & Info** | AI Status Dot | `#aiStatusIndicator .status-dot` | Class list check (`idle` or `active`) |
| | AI Status Text | `#statusText` | `.inner_text()` value ("AI Model Offline") |
| **Layout Mode** | Desktop Layout | `#desktopLayout` | `.is_visible()` under viewport >= 992px |
| | Mobile Layout | `#mobileLayout` | `.is_visible()` under viewport < 992px |
| **Preview Stage** | Canvas Viewport | `#canvasViewport` | Bounding box aspect-ratio checks |
| | Preview Canvas | `#previewCanvas` | Canvas element node, mouse coordinate clicks |
| | Canvas Overlay | `#canvasOverlay` | Pointer events target |
| | Upload Prompt | `#canvasUploadPrompt` | `.is_visible()` when empty |
| | Loading Prompt | `#canvasLoadingPrompt` | `.is_visible()` during sync |
| | Play/Pause HUD | `#hudOverlay` | Displays play/pause icon overlay on action |
| **Timeline** | Timeline Container | `.timeline-section` | Visually loaded; contains ruler/tracks |
| | Scroll Container | `#timelineScrollContainer` | Horizontally scrollable viewport |
| | Tracks Width Wrapper | `#timelineTracksWidthWrapper`| Handles timeline clicks to seek playhead |
| | Time Ruler | `#timelineRulerCanvas` | Canvas for ticks, ticks scale to zoom |
| | Clips Track | `#timelineVideoTrack` | Contains list of clip blocks |
| | Waveform Track | `#mobileWaveformTrackBody` | Holds wavesurfer `#audioWaveform` |
| | Subtitles Track | `#timelineSubtitleTrack` | Holds word timing blocks |
| | Timeline Clip Block | `.timeline-clip` | Represent clip segments; drag target |
| | Left Trim Handle | `.timeline-clip .clip-trim-left` | Pointerdown drag target to trim start |
| | Right Trim Handle | `.timeline-clip .clip-trim-right` | Pointerdown drag target to trim end |
| | Subtitle Word Block | `.timeline-word-block` | Seeks on click; focuses editor on dblclick |
| | Split Button | `button#btnSplitClip` | Click to split clip at current time |
| | Delete Button | `button#btnDeleteClip` | Click to delete selected clip segment |
| **Sidebar Editor** | Editor Tab Button | `.tab-btn[data-tab="editor"]` | Class list contains `active` |
| | Subtitle Editor Card | `[id^="edit-card-"]` | Focus target; ID format `edit-card-{index}` |
| | Subtitle Text Input | `[id^="edit-card-"] input[type="text"]` | Inputs custom text correction |
| | Word Delete Button | `.word-card-delete` | Deletes single word from transcript |
| **Exporters** | Export Format Select | `select#exportFormat` | Options: `composite`, `webm-transparent`, `webm-green`, `mp4-green` |
| | Export Audio Select | `select#exportAudio` | Options: `include`, `silent` |
| | Export Render Button| `button#btnExportVideo` | Triggers MediaRecorder rendering pipeline |
| | SRT Export Button | `button#btnExportSRT` | Downloads `.srt` file |
| | Export Progress Bar | `#exportProgressContainer` | Progress details percentage updates |

---

## 2. Playwright API Timeline Action Sequence

### A. Split Selected Clip
* **Pre-condition**: Media loaded. Timeline has at least one clip spanning from `0.0s` to `duration`.
* **Action**: Seek playhead to middle of the clip and click split.
* **Sequence**:
```python
# 1. Seek to T = 1.5s (inside the clip boundaries)
timeline = page.locator("#timelineTracksWidthWrapper")
rect = await timeline.bounding_box()
padding_left = await page.evaluate("parseFloat(window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft) || 0")
# Calculate click x coordinate (1.5 seconds * 150 pixels/sec = 225px offset)
seek_x = padding_left + (1.5 * 150)
await timeline.click(position={"x": seek_x, "y": 15})

# 2. Click the Split button
split_btn = page.locator("button#btnSplitClip")
await expect(split_btn).to_be_enabled()
await split_btn.click()

# 3. Verify clip count has doubled
clips = page.locator(".timeline-clip")
await expect(clips).to_have_count(2)
```

### B. Delete Selected Clip
* **Pre-condition**: Clips track populated.
* **Action**: Select a clip block and click delete.
* **Sequence**:
```python
# 1. Click first clip block to select it
clip = page.locator(".timeline-clip").first()
await clip.click()
await expect(clip).to_have_class(re.compile(r"selected"))

# 2. Trigger Delete action
delete_btn = page.locator("button#btnDeleteClip")
await expect(delete_btn).to_be_enabled()
await delete_btn.click()

# 3. Verify clip is removed and overall clip count decreases
# Check if gap is closed (subsequent clips are pulled left by deleted clip's duration)
```

### C. Trim Clip Boundaries (Start / End)
* **Pre-condition**: Clip block rendered.
* **Action**: Drag left trim handle to shorten from start, or right handle to shorten from end.
* **Sequence (Left Trim Handle - Drag right by 0.5s = 75px)**:
```python
handle = page.locator(".timeline-clip .clip-trim-left").first()
box = await handle.bounding_box()

# Move mouse to handle, press down, drag right, release
await page.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
await page.mouse.down()
await page.mouse.move(box["x"] + box["width"]/2 + 75, box["y"] + box["height"]/2)
await page.mouse.up()

# Validation: Check that the clip's style.left style attribute reflects the trimmed start position
```

### D. Drag and Reorder Clips (Magnetic Swap)
* **Pre-condition**: Two clips adjacent on the timeline.
* **Action**: Drag the first clip rightward past the center boundary of the second clip.
* **Sequence**:
```python
clip_a = page.locator(".timeline-clip").nth(0)
box_a = await clip_a.bounding_box()

clip_b = page.locator(".timeline-clip").nth(1)
box_b = await clip_b.bounding_box()

# Drag clip A past the center of clip B to trigger the CANVA magnetic swap
target_x = box_b["x"] + box_b["width"]/2 + 20
await page.mouse.move(box_a["x"] + box_a["width"]/2, box_a["y"] + box_a["height"]/2)
await page.mouse.down()
await page.mouse.move(target_x, box_a["y"] + box_a["height"]/2, steps=10)
await page.mouse.up()

# Validation: Verify timelineStart of clip_a is now greater than timelineStart of clip_b
```

---

## 3. Canvas Coordinate Mapping & Double-Click Verification
The preview subtitle editor maps double-clicks on the HTML5 canvas to specific words in the transcript.

### The Mapping Logic
1. Get click client coordinates relative to the canvas viewport (`clientX - rect.left`, `clientY - rect.top`).
2. Scale coordinates to the internal canvas coordinate space (`1080` x `1920`):
   $$\text{clickX} = \text{clickX\_client} \times \frac{\text{canvas.width}}{\text{rect.width}}$$
   $$\text{clickY} = \text{clickY\_client} \times \frac{\text{canvas.height}}{\text{rect.height}}$$
3. Identify the active phrase using the playback head (`state.currentTime`).
4. Re-calculate text bounds in canvas space:
   - Line wrapping width and lines stack are computed.
   - Vertically anchor starting point: $Y = h \times \frac{\text{captionPosition}}{100}$.
   - Check if scaled click coordinates fall inside each word's measured bounding box with a 20px padding tolerance:
     $$\text{wordLeft} \le \text{clickX} \le \text{wordRight}$$
     $$\text{wordTop} \le \text{clickY} \le \text{wordBottom}$$
5. If matched, map canvas bounds back to client coordinates relative to `#canvasViewport` to position the overlay input element.

### Playwright Verification & Simulation
To automate this, we intercept canvas drawing calls to capture text boundaries, or programmatically simulate click targeting.

#### Spy Script (Inject before action)
```python
await page.add_init_script("""
  window.renderedWordBounds = [];
  const origFillText = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
    // Collect rendering events with coordinates
    window.renderedWordBounds.push({ text, x, y, time: window.state?.currentTime });
    return origFillText.apply(this, arguments);
  };
""")
```

#### Playwright Double Click Simulation
```python
canvas = page.locator("#previewCanvas")
box = await canvas.bounding_box()

# Default CaptionPosition is 75 (75% from top of canvas)
# X coordinate centered
target_x = box["width"] / 2
target_y = box["height"] * 0.75

# Perform double-click
await canvas.dblclick(position={"x": target_x, "y": target_y})

# Assert overlay text input spawns
input_overlay = page.locator(".canvas-text-input")
await expect(input_overlay).to_be_visible()

# Edit and commit text
await input_overlay.fill("REVOLUTIONARY")
await input_overlay.press("Enter")

# Assert overlay input is removed and transcript updated
await expect(input_overlay).to_be_detached()
```

---

## 4. Test Suite Layout Recommendations
The test suite should be organized cleanly under a standard pytest architecture.

```
caption-creator/
├── server.py                   # Safe dev server
├── index.html                  # Front-end
├── conftest.py                 # Pytest shared fixtures (server, browser config)
└── tests/
    ├── test_tier1_layout.py    # Smoke & Responsiveness layout validations
    ├── test_tier2_core.py      # Core playback, media settings, styles UI
    ├── test_tier3_timeline.py  # Timeline clips manipulation (split, trim, drag)
    └── test_tier4_advanced.py  # Canvas editing, sync engine, export MediaRecorder
```

### conftest.py: Shared Fixture Setup
```python
import sys
import time
import socket
import subprocess
import pytest

@pytest.fixture(scope="session", autouse=True)
def run_local_server():
    # Spawn server.py in the background
    server_process = subprocess.Popen(
        [sys.executable, "server.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd="."
    )
    
    # Poll port 8080 until socket responds
    is_ready = False
    for _ in range(30):
        try:
            with socket.create_connection(("127.0.0.1", 8080), timeout=0.1):
                is_ready = True
                break
        except OSError:
            time.sleep(0.1)
            
    if not is_ready:
        server_process.terminate()
        raise RuntimeError("Local safe server failed to launch on http://127.0.0.1:8080")
        
    yield "http://127.0.0.1:8080"
    
    # Tear down
    server_process.terminate()
    server_process.wait()
```

---

## 5. Tiered Test Matrix (71 Test Cases)

### Tier 1: Environment & Layout Responsiveness Tests (15 cases)
1. **test_t1_01_server_up**: Verifies local dev server starts and responds with HTTP status 200 on http://127.0.0.1:8080.
2. **test_t1_02_page_title**: Checks document title matches "CaptionFlow Studio - Synced Subtitle Video Generator".
3. **test_t1_03_desktop_layout_visibility**: Viewport >= 992px, verifies `#desktopLayout` is visible and `#mobileLayout` is hidden.
4. **test_t1_04_mobile_layout_visibility**: Viewport < 992px, verifies `#mobileLayout` is visible and `#desktopLayout` is hidden.
5. **test_t1_05_sidebar_tab_media**: On mobile view, verifies clicking the "Media" tab activates the media tab panel.
6. **test_t1_06_sidebar_tab_voice**: On mobile view, verifies clicking the "Voice & Sync" tab activates the voice tab panel.
7. **test_t1_07_sidebar_tab_style**: On mobile view, verifies clicking the "Style" tab activates the style tab panel.
8. **test_t1_08_sidebar_tab_editor**: On mobile view, verifies clicking the "Editor" tab activates the editor tab panel.
9. **test_t1_09_desktop_timeline_container**: On desktop view, confirms the multi-track timeline container (`.timeline-section`) is visible.
10. **test_t1_10_redundant_waveform_hidden**: On desktop view, verifies that `#desktopWaveformContainerParent` has a CSS display of `none` (or hidden class).
11. **test_t1_11_settings_modal_open**: Verifies clicking `#btnSettings` opens `#settingsModal` (removes `.hidden`).
12. **test_t1_12_settings_modal_close**: Verifies clicking modal close btn hides `#settingsModal`.
13. **test_t1_13_aspect_ratio_portrait**: Confirms `#btnAspectPortrait` is active by default.
14. **test_t1_14_aspect_ratio_landscape**: Confirms clicking `#btnAspectLandscape` sets active state and alters class.
15. **test_t1_15_ai_status_offline**: Asserts default status text matches "AI Model Offline" and dot is `idle`.

### Tier 2: Core Functional & Media Manipulation Tests (18 cases)
16. **test_t2_01_upload_media_details**: Simulates uploading an audio/video file and verifies `#audioFileDetails` displays correct filename/size.
17. **test_t2_02_remove_media**: Verifies clicking `#btnRemoveAudio` removes details and restores upload hint.
18. **test_t2_03_timeline_populated_on_load**: Uploading media populates timeline clips track and waveform track.
19. **test_t2_04_play_pause_button**: Clicking `#btnPlayPause` toggles play/pause icon and updates internal state `isPlaying`.
20. **test_t2_05_stop_button**: Clicking `#btnStop` pauses playback and resets playhead to `0.0s`.
21. **test_t2_06_timecode_updates**: Checks `#currentTimeDisplay` text updates continuously during playback.
22. **test_t2_07_volume_control_input**: Sliding volume slider alters wavesurfer volume.
23. **test_t2_08_playback_speed_change**: Changing `#playbackSpeed` dropdown option changes media playback speed.
24. **test_t2_09_bg_media_selector_black**: Clicking "Black" background button updates canvas background color.
25. **test_t2_10_bg_media_selector_green**: Clicking "Green" background button sets background to green screen.
26. **test_t2_11_style_preset_tiktok**: Clicking "TikTok Kinetic" style preset button updates UI inputs values (cyan accent, fast pop).
27. **test_t2_12_style_preset_classic**: Verifies classic preset restores uppercase, yellow highlight.
28. **test_t2_13_font_family_select**: Changing `#fontFamily` dropdown updates canvas text styling.
29. **test_t2_14_font_size_bounds_low**: Entering size <16 defaults back to minimum bound.
30. **test_t2_15_font_size_bounds_high**: Entering size >150 limits to 150px.
31. **test_t2_16_uppercase_toggle**: Unchecking force uppercase displays normal text case.
32. **test_t2_17_italic_toggle**: Toggling italic checkbox updates canvas text rendering font string.
33. **test_t2_18_caption_vertical_position**: Adjusting caption position slider updates render anchor offset.

### Tier 3: Timeline Tracks & Segment Operations (18 cases)
34. **test_t3_01_clips_track_contains_clip**: Verifies initial video/audio clip blocks are loaded and visible.
35. **test_t3_02_clip_active_selection**: Clicking a timeline clip applies `.selected` class.
36. **test_t3_03_split_clip_middle**: Split clip at 1.5s increases clip count to 2.
37. **test_t3_04_split_clip_boundary_error**: Splitting near clip boundaries (<0.2s) prevents split and triggers browser warning alert.
38. **test_t3_05_delete_selected_clip**: Deleting a clip segment removes it and closes timeline gap.
39. **test_t3_06_trim_start_expansion_limit**: Trimming start leftwards is blocked by preceding clip's timelineEnd.
40. **test_t3_07_trim_start_source_limit**: Trimming start leftwards is limited by original source media start (0.0s).
41. **test_t3_08_trim_start_min_duration**: Trimming start rightwards cannot reduce clip duration below 0.5s.
42. **test_t3_09_trim_end_expansion_limit**: Trimming end rightwards is blocked by succeeding clip's timelineStart.
43. **test_t3_10_trim_end_source_limit**: Trimming end rightwards is limited by original media duration length.
44. **test_t3_11_trim_end_min_duration**: Trimming end leftwards cannot reduce clip duration below 0.5s.
45. **test_t3_12_drag_clip_shift_right**: Dragging clip right shifts timelineStart and timelineEnd values.
46. **test_t3_13_drag_clip_blocked_right**: Dragging clip right is blocked by the start of the next non-overlapping clip.
47. **test_t3_14_drag_clip_blocked_left**: Dragging clip left is blocked by preceding clip end.
48. **test_t3_15_magnetic_swap_right**: Dragging clip A past center of clip B swaps their positions.
49. **test_t3_16_magnetic_swap_left**: Dragging clip B left past center of clip A swaps positions.
50. **test_t3_17_waveform_zoom_factor**: Verifies timeline wavesurfer zoom factor is set to `150` on all viewports.
51. **test_t3_18_playhead_line_position**: Checks `#timelinePlayhead` aligns with currentTime during seek actions.

### Tier 4: Canvas, Editing Synchronicity, Export & AI Engine Tests (20 cases)
52. **test_t4_01_canvas_rendered_text**: Spies on `fillText` to ensure caption text is drawn on canvas.
53. **test_t4_02_canvas_double_click_input_spawns**: Double-clicking caption area spawns `.canvas-text-input` overlay.
54. **test_t4_03_canvas_input_styling**: Overlay input text style elements matches active customizer style configurations.
55. **test_t4_04_canvas_input_commit_enter**: Pressing Enter commits edit, updates word in transcript, and removes overlay.
56. **test_t4_05_canvas_input_commit_blur**: Blurring the overlay input commits changes.
57. **test_t4_06_canvas_input_cancel_esc**: Pressing Escape discards edits and removes input overlay.
58. **test_t4_07_canvas_mapping_center**: Validates click mapping coordinates math when text alignment is centered.
59. **test_t4_08_canvas_mapping_left**: Validates click mapping coordinates math when text alignment is left.
60. **test_t4_09_canvas_mapping_right**: Validates click mapping coordinates math when text alignment is right.
61. **test_t4_10_timeline_word_click_seek**: Clicking a subtitle block on timeline seeks wavesurfer playhead to start time.
62. **test_t4_11_timeline_word_double_click_tab**: Double-clicking subtitle block switches mobile sidebar panel to editor tab.
63. **test_t4_12_timeline_word_double_click_scroll**: Double-clicking subtitle block scrolls active word editor card into view.
64. **test_t4_13_timeline_word_double_click_focus**: Double-clicking subtitle block focuses text input on corresponding editor card.
65. **test_t4_14_add_word_card**: Clicking `#btnAddWord` adds a new word timing entry.
66. **test_t4_15_clear_all_words**: Clicking `#btnClearAllWords` empties transcript list.
67. **test_t4_16_generate_tts_mock**: Triggers Kokoro AI voice generation and verifies text to speech execution logs.
68. **test_t4_17_run_ai_sync_mock**: Triggers Whisper AI transcription process logs and mock response.
69. **test_t4_18_export_format_options**: Confirms presence and accessibility of format dropdown values.
70. **test_t4_19_export_video_rendering**: Verifies clicking export button initiates rendering and progress bar increases to 100%.
71. **test_t4_20_export_media_recorder_bitrate**: Spies on `window.MediaRecorder` constructor arguments to verify `videoBitsPerSecond` is configured at `10000000` (10 Mbps) for high definition composite.
