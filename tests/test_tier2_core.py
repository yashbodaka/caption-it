import re
import os
import pytest
from playwright.sync_api import Page, expect

def test_t2_01_upload_media_details(page: Page):
    page.goto("http://127.0.0.1:8080")
    # Set up files path relative to the test file
    dummy_wav = os.path.join(os.path.dirname(__file__), "dummy.wav")
    
    # Upload the file
    file_input = page.locator("#audioFileInput")
    file_input.set_input_files(dummy_wav)
    
    # Verify details are visible and filename is correct
    expect(page.locator("#audioFileDetails")).to_be_visible()
    expect(page.locator("#selectedFileName")).to_have_text("dummy.wav")

def test_t2_02_remove_media(page: Page):
    page.goto("http://127.0.0.1:8080")
    dummy_wav = os.path.join(os.path.dirname(__file__), "dummy.wav")
    file_input = page.locator("#audioFileInput")
    file_input.set_input_files(dummy_wav)
    
    expect(page.locator("#audioFileDetails")).to_be_visible()
    
    # Click remove
    page.locator("#btnRemoveAudio").click()
    
    # Verify details are hidden and upload hint is visible
    expect(page.locator("#audioFileDetails")).to_be_hidden()
    expect(page.locator("#audioFileHint")).to_be_visible()

def test_t2_03_timeline_populated_on_load(page: Page):
    page.goto("http://127.0.0.1:8080")
    dummy_wav = os.path.join(os.path.dirname(__file__), "dummy.wav")
    file_input = page.locator("#audioFileInput")
    file_input.set_input_files(dummy_wav)
    
    # Wait for the clips track to contain at least one clip
    expect(page.locator(".timeline-clip")).to_have_count(1)

def test_t2_04_play_pause_button(page: Page):
    page.goto("http://127.0.0.1:8080")
    dummy_wav = os.path.join(os.path.dirname(__file__), "dummy.wav")
    page.locator("#audioFileInput").set_input_files(dummy_wav)
    
    # Wait for loading decoding to finish
    page.wait_for_selector(".timeline-clip")
    
    play_btn = page.locator("#btnPlayPause")
    expect(play_btn).to_be_enabled()
    expect(play_btn.locator("i")).to_have_class(re.compile(r"fa-play"))
    
    play_btn.click()
    expect(play_btn.locator("i")).to_have_class(re.compile(r"fa-pause"))
    
    play_btn.click()
    expect(play_btn.locator("i")).to_have_class(re.compile(r"fa-play"))

def test_t2_05_stop_button(page: Page):
    page.goto("http://127.0.0.1:8080")
    dummy_wav = os.path.join(os.path.dirname(__file__), "dummy.wav")
    page.locator("#audioFileInput").set_input_files(dummy_wav)
    page.wait_for_selector(".timeline-clip")
    
    # Play
    page.locator("#btnPlayPause").click()
    # Click stop
    page.locator("#btnStop").click()
    
    # Play button should revert to play icon
    expect(page.locator("#btnPlayPause i")).to_have_class(re.compile(r"fa-play"))
    
    # Timecode should show 00:00.0 or close
    expect(page.locator("#currentTimeDisplay")).to_contain_text("00:00.0")

def test_t2_06_timecode_updates(page: Page):
    page.goto("http://127.0.0.1:8080")
    dummy_wav = os.path.join(os.path.dirname(__file__), "dummy.wav")
    page.locator("#audioFileInput").set_input_files(dummy_wav)
    page.wait_for_selector(".timeline-clip")
    
    # Play and wait to verify text changes
    initial_text = page.locator("#currentTimeDisplay").inner_text()
    page.locator("#btnPlayPause").click()
    
    # Let it play for a bit
    page.wait_for_timeout(1000)
    current_text = page.locator("#currentTimeDisplay").inner_text()
    
    assert initial_text != current_text

def test_t2_07_volume_control_input(page: Page):
    page.goto("http://127.0.0.1:8080")
    slider = page.locator("#playbackVolume")
    # Change value to 0.2
    slider.fill("0.2")
    slider.evaluate("el => el.dispatchEvent(new Event('input'))")
    
    # Verify icon class changed to volume-low
    expect(page.locator("#volumeIcon")).to_have_class(re.compile(r"fa-volume-low"))
    
    # Change to 0.0
    slider.fill("0.0")
    slider.evaluate("el => el.dispatchEvent(new Event('input'))")
    expect(page.locator("#volumeIcon")).to_have_class(re.compile(r"fa-volume-mute"))

def test_t2_08_playback_speed_change(page: Page):
    page.goto("http://127.0.0.1:8080")
    dropdown = page.locator("#playbackSpeed")
    dropdown.select_option("1.5")
    expect(dropdown).to_have_value("1.5")

def test_t2_09_bg_media_selector_black(page: Page):
    page.goto("http://127.0.0.1:8080")
    black_btn = page.locator('.bg-selector-row .bg-btn[data-bg="black"]')
    black_btn.click()
    expect(black_btn).to_have_class(re.compile(r"active"))
    
    # Check viewport style background is black
    viewport = page.locator("#canvasViewport")
    expect(viewport).to_have_css("background-color", "rgb(0, 0, 0)")

def test_t2_10_bg_media_selector_green(page: Page):
    page.goto("http://127.0.0.1:8080")
    green_btn = page.locator('.bg-selector-row .bg-btn[data-bg="green"]')
    green_btn.click()
    expect(green_btn).to_have_class(re.compile(r"active"))
    
    viewport = page.locator("#canvasViewport")
    expect(viewport).to_have_css("background-color", "rgb(0, 255, 0)")

def test_t2_11_style_preset_tiktok(page: Page):
    page.goto("http://127.0.0.1:8080")
    preset_btn = page.locator('.presets-card .preset-btn[data-preset="tiktok_kinetic"]')
    preset_btn.click()
    
    expect(preset_btn).to_have_class(re.compile(r"active"))
    # The font family dropdown should change to Oswald
    expect(page.locator("#fontFamily")).to_have_value("Oswald")
    expect(page.locator("#textUppercase")).to_be_checked()
    expect(page.locator("#textItalic")).to_be_checked()

def test_t2_12_style_preset_classic(page: Page):
    page.goto("http://127.0.0.1:8080")
    # Set to tiktok first
    page.locator('.presets-card .preset-btn[data-preset="tiktok_kinetic"]').click()
    
    # Set back to classic
    classic_btn = page.locator('.presets-card .preset-btn[data-preset="classic_bold"]')
    classic_btn.click()
    
    expect(classic_btn).to_have_class(re.compile(r"active"))
    expect(page.locator("#fontFamily")).to_have_value("Montserrat")

def test_t2_13_font_family_select(page: Page):
    page.goto("http://127.0.0.1:8080")
    dropdown = page.locator("#fontFamily")
    dropdown.select_option("Impact")
    expect(dropdown).to_have_value("Impact")

def test_t2_14_font_size_bounds_low(page: Page):
    page.goto("http://127.0.0.1:8080")
    input_el = page.locator("#fontSize")
    input_el.fill("10")
    input_el.evaluate("el => el.dispatchEvent(new Event('change'))")
    
    # Verify it defaults back or co-erces to 16
    expect(input_el).to_have_value("16")

def test_t2_15_font_size_bounds_high(page: Page):
    page.goto("http://127.0.0.1:8080")
    input_el = page.locator("#fontSize")
    input_el.fill("200")
    input_el.evaluate("el => el.dispatchEvent(new Event('change'))")
    
    # Verify it defaults back or co-erces to 150
    expect(input_el).to_have_value("150")

def test_t2_16_uppercase_toggle(page: Page):
    page.goto("http://127.0.0.1:8080")
    chk = page.locator("#textUppercase")
    expect(chk).to_be_checked()
    
    chk.uncheck()
    expect(chk).not_to_be_checked()

def test_t2_17_italic_toggle(page: Page):
    page.goto("http://127.0.0.1:8080")
    chk = page.locator("#textItalic")
    expect(chk).not_to_be_checked()
    
    chk.check()
    expect(chk).to_be_checked()

def test_t2_18_caption_vertical_position(page: Page):
    page.goto("http://127.0.0.1:8080")
    slider = page.locator("#captionPosition")
    slider.fill("50")
    slider.evaluate("el => el.dispatchEvent(new Event('input'))")
    expect(slider).to_have_value("50")
