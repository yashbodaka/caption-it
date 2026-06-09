import re
import pytest
from playwright.sync_api import Page, expect

def test_t1_01_server_up(page: Page):
    response = page.goto("http://127.0.0.1:8080")
    assert response is not None
    assert response.status == 200

def test_t1_02_page_title(page: Page):
    page.goto("http://127.0.0.1:8080")
    expect(page).to_have_title("CaptionFlow Studio - Synced Subtitle Video Generator")

def test_t1_03_desktop_layout_visibility(page: Page):
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto("http://127.0.0.1:8080")
    expect(page.locator("#desktopLayout")).to_be_visible()
    expect(page.locator("#mobileLayout")).to_be_hidden()

def test_t1_04_mobile_layout_visibility(page: Page):
    page.set_viewport_size({"width": 375, "height": 667})
    page.goto("http://127.0.0.1:8080")
    expect(page.locator("#mobileLayout")).to_be_visible()
    expect(page.locator("#desktopLayout")).to_be_hidden()

def test_t1_05_sidebar_tab_media(page: Page):
    page.set_viewport_size({"width": 375, "height": 667})
    page.goto("http://127.0.0.1:8080")
    tab_btn = page.locator('.sidebar-tabs .tab-btn[data-tab="media"]')
    tab_btn.click()
    expect(tab_btn).to_have_class(re.compile(r"active"))
    expect(page.locator("#panel-media")).to_have_class(re.compile(r"active"))

def test_t1_06_sidebar_tab_voice(page: Page):
    page.set_viewport_size({"width": 375, "height": 667})
    page.goto("http://127.0.0.1:8080")
    tab_btn = page.locator('.sidebar-tabs .tab-btn[data-tab="voice"]')
    tab_btn.click()
    expect(tab_btn).to_have_class(re.compile(r"active"))
    expect(page.locator("#panel-voice")).to_have_class(re.compile(r"active"))

def test_t1_07_sidebar_tab_style(page: Page):
    page.set_viewport_size({"width": 375, "height": 667})
    page.goto("http://127.0.0.1:8080")
    tab_btn = page.locator('.sidebar-tabs .tab-btn[data-tab="style"]')
    tab_btn.click()
    expect(tab_btn).to_have_class(re.compile(r"active"))
    expect(page.locator("#panel-style")).to_have_class(re.compile(r"active"))

def test_t1_08_sidebar_tab_editor(page: Page):
    page.set_viewport_size({"width": 375, "height": 667})
    page.goto("http://127.0.0.1:8080")
    tab_btn = page.locator('.sidebar-tabs .tab-btn[data-tab="editor"]')
    tab_btn.click()
    expect(tab_btn).to_have_class(re.compile(r"active"))
    expect(page.locator("#panel-editor")).to_have_class(re.compile(r"active"))

def test_t1_09_desktop_timeline_container(page: Page):
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto("http://127.0.0.1:8080")
    expect(page.locator(".timeline-section")).to_be_visible()

def test_t1_10_redundant_waveform_hidden(page: Page):
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto("http://127.0.0.1:8080")
    waveform = page.locator("#desktopWaveformContainerParent")
    expect(waveform).to_be_hidden()

def test_t1_11_settings_modal_open(page: Page):
    page.goto("http://127.0.0.1:8080")
    btn = page.locator("#btnSettings")
    modal = page.locator("#settingsModal")
    expect(modal).to_have_class(re.compile(r"hidden"))
    btn.click()
    expect(modal).not_to_have_class(re.compile(r"hidden"))

def test_t1_12_settings_modal_close(page: Page):
    page.goto("http://127.0.0.1:8080")
    page.locator("#btnSettings").click()
    modal = page.locator("#settingsModal")
    expect(modal).not_to_have_class(re.compile(r"hidden"))
    page.locator("#btnModalClose").click()
    expect(modal).to_have_class(re.compile(r"hidden"))

def test_t1_13_aspect_ratio_portrait(page: Page):
    page.goto("http://127.0.0.1:8080")
    expect(page.locator("#btnAspectPortrait")).to_have_class(re.compile(r"active"))

def test_t1_14_aspect_ratio_landscape(page: Page):
    page.goto("http://127.0.0.1:8080")
    portrait = page.locator("#btnAspectPortrait")
    landscape = page.locator("#btnAspectLandscape")
    landscape.click()
    expect(landscape).to_have_class(re.compile(r"active"))
    expect(portrait).not_to_have_class(re.compile(r"active"))

def test_t1_15_ai_status_offline(page: Page):
    page.goto("http://127.0.0.1:8080")
    expect(page.locator("#statusText")).to_have_text("AI Model Offline")
    expect(page.locator("#aiStatusIndicator .status-dot")).to_have_class(re.compile(r"idle"))
