import re

from playwright.sync_api import Page, expect


def open_video_mode(page: Page):
    page.set_viewport_size({"width": 1440, "height": 900})
    page.goto("http://127.0.0.1:8080")
    page.locator("#btnVideoMode").click()


def test_caption_mode_is_audio_only_and_transparent_export(page: Page):
    page.set_viewport_size({"width": 1440, "height": 900})
    page.goto("http://127.0.0.1:8080")

    expect(page.locator("#audioFileInput")).to_have_attribute("accept", "audio/*")
    expect(page.locator("#canvasUploadPrompt")).to_contain_text("Upload Narration Audio")
    expect(page.locator("#exportFormat")).to_have_value("webm-transparent")
    expect(page.locator("#exportAudio")).to_have_value("silent")
    expect(page.locator("#btnSendToVideoMode")).to_be_disabled()


def test_video_mode_switches_layouts_and_active_pill(page: Page):
    open_video_mode(page)

    expect(page.locator("#videoModeLayout")).to_be_visible()
    expect(page.locator("#desktopLayout")).to_be_hidden()
    expect(page.locator("#btnVideoMode")).to_have_class(re.compile(r"active"))
    expect(page.locator("#btnCaptionMode")).not_to_have_class(re.compile(r"active"))


def test_style_controls_return_to_caption_mode(page: Page):
    open_video_mode(page)
    expect(page.locator("#vmLeftContent #stylePresetsCard")).to_have_count(1)

    page.locator("#btnCaptionMode").click()

    expect(page.locator("#desktopLeftContent #stylePresetsCard")).to_have_count(1)
    expect(page.locator("#desktopLayout")).to_be_visible()


def test_video_upload_zone_explains_manual_sync(page: Page):
    open_video_mode(page)

    expect(page.locator("#vmCanvasOverlay")).to_have_class(re.compile(r"vm-upload-zone"))
    expect(page.locator("#vmCanvasUploadPrompt")).to_contain_text("AI sync will NOT auto-start")
    expect(page.locator("#vmBtnRunAISync")).to_be_disabled()


def test_video_mode_has_no_attached_audio_ui(page: Page):
    open_video_mode(page)

    expect(page.locator("#vmAudioAttachCard")).to_have_count(0)
    expect(page.locator("#vmExportAudio")).to_have_count(1)
