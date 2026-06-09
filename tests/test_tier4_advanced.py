import re
import os
import pytest
from playwright.sync_api import Page, expect

def setup_page_and_mocks(page: Page):
    page.add_init_script("""
        window.renderedWordBounds = [];
        const origFillText = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
            window.renderedWordBounds.push({ text, x, y });
            return origFillText.apply(this, arguments);
        };

        window.mediaRecorderArgs = [];
        const origMediaRecorder = window.MediaRecorder;
        window.MediaRecorder = class SpyMediaRecorder extends origMediaRecorder {
            constructor(stream, options) {
                super(stream, options);
                window.mediaRecorderArgs.push(options);
            }
        };

        window.Worker = class MockWorker {
            constructor(url, options) {
                this.url = url;
                this.onerror = null;
                this.onmessage = null;
                
                setTimeout(() => {
                    if (this.url.includes('worker.js') && !this.url.includes('tts-worker.js')) {
                        if (this.onmessage) {
                            this.onmessage({ data: { status: 'ready', message: 'Whisper model ready' } });
                        }
                    } else if (this.url.includes('tts-worker.js')) {
                        if (this.onmessage) {
                            this.onmessage({ data: { status: 'ready', message: 'Kokoro model ready', voices: ['af_heart'] } });
                        }
                    }
                }, 50);
            }
            
            postMessage(msg) {
                if (msg.type === 'load') {
                    setTimeout(() => {
                        if (this.onmessage) {
                            this.onmessage({ data: { status: 'ready', message: 'Model ready' } });
                        }
                    }, 50);
                } else if (msg.type === 'transcribe') {
                    setTimeout(() => {
                        if (this.onmessage) {
                            this.onmessage({
                                data: {
                                    status: 'success',
                                    result: {
                                        text: "hello world",
                                        chunks: [
                                            { text: "hello", timestamp: [0.0, 1.0] },
                                            { text: "world", timestamp: [1.0, 2.0] }
                                        ]
                                    }
                                }
                            });
                        }
                    }, 100);
                } else if (msg.type === 'generate') {
                    setTimeout(() => {
                        if (this.onmessage) {
                            this.onmessage({
                                data: {
                                    status: 'success',
                                    audio: new Float32Array(24000),
                                    sampleRate: 24000
                                }
                            });
                        }
                    }, 100);
                }
            }
            
            terminate() {}
        };
    """)
    page.goto("http://127.0.0.1:8080")

def load_media_and_sync(page: Page):
    dummy_wav = os.path.join(os.path.dirname(__file__), "dummy.wav")
    page.locator("#audioFileInput").set_input_files(dummy_wav)
    page.wait_for_selector(".timeline-clip")
    page.locator("#pastedText").fill("hello world")
    page.locator("#btnRunAISync").click()
    page.wait_for_selector(".timeline-word-block")

def test_t4_01_canvas_rendered_text(page: Page):
    setup_page_and_mocks(page)
    load_media_and_sync(page)
    
    # Seek to 0.5s
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (0.5 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    page.wait_for_timeout(200)
    
    rendered = page.evaluate("window.renderedWordBounds")
    words = [r["text"].lower() for r in rendered]
    assert any("hello" in w for w in words)

def test_t4_02_canvas_double_click_input_spawns(page: Page):
    setup_page_and_mocks(page)
    load_media_and_sync(page)
    
    # Seek to 0.5s
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (0.5 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    page.wait_for_timeout(200)
    
    canvas = page.locator("#previewCanvas")
    box = canvas.bounding_box()
    # Double click at center and 65% height
    page.mouse.dblclick(box["x"] + box["width"]/2, box["y"] + box["height"] * 0.65)
    
    expect(page.locator(".canvas-text-input")).to_be_visible()

def test_t4_03_canvas_input_styling(page: Page):
    setup_page_and_mocks(page)
    load_media_and_sync(page)
    
    # Seek
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (0.5 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    page.wait_for_timeout(200)
    
    canvas = page.locator("#previewCanvas")
    box = canvas.bounding_box()
    page.mouse.dblclick(box["x"] + box["width"]/2, box["y"] + box["height"] * 0.65)
    
    input_overlay = page.locator(".canvas-text-input")
    expect(input_overlay).to_have_css("font-family", re.compile(r"Montserrat|sans-serif"))

def test_t4_04_canvas_input_commit_enter(page: Page):
    setup_page_and_mocks(page)
    load_media_and_sync(page)
    
    # Seek
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (0.5 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    page.wait_for_timeout(200)
    
    canvas = page.locator("#previewCanvas")
    box = canvas.bounding_box()
    page.mouse.dblclick(box["x"] + box["width"]/2, box["y"] + box["height"] * 0.65)
    
    input_overlay = page.locator(".canvas-text-input")
    input_overlay.fill("REVOLUTIONARY")
    input_overlay.press("Enter")
    
    expect(input_overlay).to_be_detached()
    # Check that state.captions has updated first word
    val = page.evaluate("state.captions[0].word")
    assert val == "REVOLUTIONARY"

def test_t4_05_canvas_input_commit_blur(page: Page):
    setup_page_and_mocks(page)
    load_media_and_sync(page)
    
    # Seek
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (0.5 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    page.wait_for_timeout(200)
    
    canvas = page.locator("#previewCanvas")
    box = canvas.bounding_box()
    page.mouse.dblclick(box["x"] + box["width"]/2, box["y"] + box["height"] * 0.65)
    
    input_overlay = page.locator(".canvas-text-input")
    input_overlay.fill("BLURRED")
    # Blur by clicking elsewhere
    page.locator("#btnPlayPause").click()
    
    expect(input_overlay).to_be_detached()
    val = page.evaluate("state.captions[0].word")
    assert val == "BLURRED"

def test_t4_06_canvas_input_cancel_esc(page: Page):
    setup_page_and_mocks(page)
    load_media_and_sync(page)
    
    # Seek
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (0.5 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    page.wait_for_timeout(200)
    
    canvas = page.locator("#previewCanvas")
    box = canvas.bounding_box()
    page.mouse.dblclick(box["x"] + box["width"]/2, box["y"] + box["height"] * 0.65)
    
    input_overlay = page.locator(".canvas-text-input")
    input_overlay.fill("CANCELLED")
    input_overlay.press("Escape")
    
    expect(input_overlay).to_be_detached()
    val = page.evaluate("state.captions[0].word")
    assert val != "CANCELLED"

def test_t4_07_canvas_mapping_center(page: Page):
    setup_page_and_mocks(page)
    load_media_and_sync(page)
    
    # Align Center (default)
    page.locator("#textAlignment").select_option("center")
    
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (0.5 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    page.wait_for_timeout(200)
    
    canvas = page.locator("#previewCanvas")
    box = canvas.bounding_box()
    page.mouse.dblclick(box["x"] + box["width"]/2, box["y"] + box["height"] * 0.65)
    expect(page.locator(".canvas-text-input")).to_be_visible()

def test_t4_08_canvas_mapping_left(page: Page):
    setup_page_and_mocks(page)
    load_media_and_sync(page)
    
    # Align Left
    page.locator("#textAlignment").select_option("left")
    
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (0.5 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    page.wait_for_timeout(200)
    
    canvas = page.locator("#previewCanvas")
    box = canvas.bounding_box()
    # Click closer to left side (e.g. 15% of width)
    page.mouse.dblclick(box["x"] + box["width"] * 0.15, box["y"] + box["height"] * 0.65)
    expect(page.locator(".canvas-text-input")).to_be_visible()

def test_t4_09_canvas_mapping_right(page: Page):
    setup_page_and_mocks(page)
    load_media_and_sync(page)
    
    # Align Right
    page.locator("#textAlignment").select_option("right")
    
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (0.5 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    page.wait_for_timeout(200)
    
    canvas = page.locator("#previewCanvas")
    box = canvas.bounding_box()
    # Click closer to right side (e.g. 85% of width)
    page.mouse.dblclick(box["x"] + box["width"] * 0.85, box["y"] + box["height"] * 0.65)
    expect(page.locator(".canvas-text-input")).to_be_visible()

def test_t4_10_timeline_word_click_seek(page: Page):
    setup_page_and_mocks(page)
    load_media_and_sync(page)
    
    word_block = page.locator(".timeline-word-block").nth(1) # second word "world" at 1.0s
    word_block.click()
    
    current_time = page.evaluate("state.currentTime")
    assert abs(current_time - 1.0) < 0.05

def test_t4_11_timeline_word_double_click_tab(page: Page):
    setup_page_and_mocks(page)
    page.set_viewport_size({"width": 375, "height": 667})
    load_media_and_sync(page)
    
    word_block = page.locator(".timeline-word-block").nth(0)
    word_block.dblclick()
    
    # Check that mobile layout active editor tab is selected
    tab_btn = page.locator('.tab-btn[data-tab="editor"]')
    expect(tab_btn).to_have_class(re.compile(r"active"))

def test_t4_12_timeline_word_double_click_scroll(page: Page):
    setup_page_and_mocks(page)
    load_media_and_sync(page)
    
    word_block = page.locator(".timeline-word-block").nth(0)
    word_block.dblclick()
    
    # Card 0 should be visible
    expect(page.locator("#edit-card-0")).to_be_visible()

def test_t4_13_timeline_word_double_click_focus(page: Page):
    setup_page_and_mocks(page)
    load_media_and_sync(page)
    
    word_block = page.locator(".timeline-word-block").nth(0)
    word_block.dblclick()
    
    # Text input inside #edit-card-0 should be focused
    expect(page.locator("#edit-card-0 input[type='text']")).to_be_focused()

def test_t4_14_add_word_card(page: Page):
    setup_page_and_mocks(page)
    load_media_and_sync(page)
    
    initial_count = page.locator(".word-edit-card").count()
    page.locator("#btnAddWord").click()
    
    expect(page.locator(".word-edit-card")).to_have_count(initial_count + 1)

def test_t4_15_clear_all_words(page: Page):
    setup_page_and_mocks(page)
    load_media_and_sync(page)
    
    page.locator("#btnClearAllWords").click()
    expect(page.locator(".word-edit-card")).to_have_count(0)

def test_t4_16_generate_tts_mock(page: Page):
    setup_page_and_mocks(page)
    
    page.locator("#pastedText").fill("This is generated voice.")
    page.locator("#btnGenerateTTS").click()
    
    # Log box or status text should reflect success
    expect(page.locator("#ttsStatus")).not_to_have_class(re.compile(r"hidden"))

def test_t4_17_run_ai_sync_mock(page: Page):
    setup_page_and_mocks(page)
    
    dummy_wav = os.path.join(os.path.dirname(__file__), "dummy.wav")
    page.locator("#audioFileInput").set_input_files(dummy_wav)
    page.wait_for_selector(".timeline-clip")
    
    page.locator("#pastedText").fill("hello world")
    page.locator("#btnRunAISync").click()
    
    # Verify status indicator shows Local AI Ready / Sync Complete
    expect(page.locator("#statusText")).to_have_text(re.compile(r"Sync Complete|Local AI Ready"))

def test_t4_18_export_format_options(page: Page):
    setup_page_and_mocks(page)
    
    # Export options dropdown should contain composite, webm-green, mp4-green
    dropdown = page.locator("#exportFormat")
    expect(dropdown.locator("option[value='composite']")).to_be_visible()
    expect(dropdown.locator("option[value='webm-green']")).to_be_visible()
    expect(dropdown.locator("option[value='mp4-green']")).to_be_visible()

def test_t4_19_export_video_rendering(page: Page):
    setup_page_and_mocks(page)
    load_media_and_sync(page)
    
    page.locator("#btnExportVideo").click()
    expect(page.locator("#exportProgressContainer")).to_be_visible()
    
    # Wait for progress to finish rendering
    page.wait_for_selector("#exportProgressContainer.hidden", timeout=10000)

def test_t4_20_export_media_recorder_bitrate(page: Page):
    setup_page_and_mocks(page)
    load_media_and_sync(page)
    
    page.locator("#btnExportVideo").click()
    
    # Check window.mediaRecorderArgs
    args = page.evaluate("window.mediaRecorderArgs")
    assert len(args) > 0
    assert args[0]["videoBitsPerSecond"] == 10000000
