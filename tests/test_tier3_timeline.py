import re
import os
import pytest
from playwright.sync_api import Page, expect

def load_media(page: Page):
    page.goto("http://127.0.0.1:8080")
    dummy_wav = os.path.join(os.path.dirname(__file__), "dummy.wav")
    page.locator("#audioFileInput").set_input_files(dummy_wav)
    page.wait_for_selector(".timeline-clip")

def test_t3_01_clips_track_contains_clip(page: Page):
    load_media(page)
    expect(page.locator("#timelineVideoTrack .timeline-clip")).to_have_count(1)

def test_t3_02_clip_active_selection(page: Page):
    load_media(page)
    clip = page.locator(".timeline-clip").nth(0)
    clip.click()
    expect(clip).to_have_class(re.compile(r"selected"))

def test_t3_03_split_clip_middle(page: Page):
    load_media(page)
    
    # Get tracks wrapper padding
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (1.5 * 150)
    
    # Seek
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    
    # Split
    split_btn = page.locator("#btnSplitClip")
    expect(split_btn).to_be_enabled()
    split_btn.click()
    
    # Check count is 2
    expect(page.locator(".timeline-clip")).to_have_count(2)

def test_t3_04_split_clip_boundary_error(page: Page):
    load_media(page)
    
    # Seek near start boundary (0.1s)
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (0.1 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    
    # Expect error dialog
    dialog_triggered = False
    def handle_dialog(dialog):
        nonlocal dialog_triggered
        dialog_triggered = True
        dialog.dismiss()
        
    page.on("dialog", handle_dialog)
    
    # Try split
    page.locator("#btnSplitClip").click()
    page.wait_for_timeout(200) # Wait brief moment
    assert dialog_triggered

def test_t3_05_delete_selected_clip(page: Page):
    load_media(page)
    
    # Split first
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (1.5 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    page.locator("#btnSplitClip").click()
    
    # Select second clip and delete
    clip2 = page.locator(".timeline-clip").nth(1)
    clip2.click()
    
    delete_btn = page.locator("#btnDeleteClip")
    expect(delete_btn).to_be_enabled()
    delete_btn.click()
    
    # Count should reduce to 1
    expect(page.locator(".timeline-clip")).to_have_count(1)

def test_t3_06_trim_start_expansion_limit(page: Page):
    load_media(page)
    
    # Split at 1.5s
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (1.5 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    page.locator("#btnSplitClip").click()
    
    # Try to trim clip 2's start (left trim handle) to the left (e.g. by 75px / 0.5s)
    # This should be blocked by clip 1's end at 1.5s.
    handle = page.locator(".timeline-clip .clip-trim-left").nth(1)
    box = handle.bounding_box()
    
    page.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
    page.mouse.down()
    page.mouse.move(box["x"] + box["width"]/2 - 75, box["y"] + box["height"]/2)
    page.mouse.up()
    
    # Verify clip 2 start remains >= 1.5s (which is style.left >= 225px)
    clip2 = page.locator(".timeline-clip").nth(1)
    left_val = clip2.evaluate("el => parseFloat(el.style.left) || 0")
    assert left_val >= 225

def test_t3_07_trim_start_source_limit(page: Page):
    load_media(page)
    
    # Drag first clip's left trim handle leftwards. Since start is 0.0s (source limit), it cannot go below 0.
    handle = page.locator(".timeline-clip .clip-trim-left").nth(0)
    box = handle.bounding_box()
    
    page.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
    page.mouse.down()
    page.mouse.move(box["x"] + box["width"]/2 - 75, box["y"] + box["height"]/2)
    page.mouse.up()
    
    clip1 = page.locator(".timeline-clip").nth(0)
    left_val = clip1.evaluate("el => parseFloat(el.style.left) || 0")
    assert left_val >= 0

def test_t3_08_trim_start_min_duration(page: Page):
    load_media(page)
    
    # Drag first clip's left trim handle rightwards.
    # It cannot reduce duration below 0.5s (meaning style.left cannot exceed 150 * (duration - 0.5)).
    # Total duration is 3.0s, so max left should be 150 * 2.5 = 375px.
    # Drag it by 400px.
    handle = page.locator(".timeline-clip .clip-trim-left").nth(0)
    box = handle.bounding_box()
    
    page.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
    page.mouse.down()
    page.mouse.move(box["x"] + box["width"]/2 + 400, box["y"] + box["height"]/2)
    page.mouse.up()
    
    clip1 = page.locator(".timeline-clip").nth(0)
    width_val = clip1.evaluate("el => parseFloat(el.style.width) || 0")
    # Width must be >= 75px (0.5s * 150px/s)
    assert width_val >= 75

def test_t3_09_trim_end_expansion_limit(page: Page):
    load_media(page)
    
    # Split at 1.5s
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (1.5 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    page.locator("#btnSplitClip").click()
    
    # Try to drag clip 1's right trim handle rightwards. Blocked by clip 2's start at 1.5s.
    handle = page.locator(".timeline-clip .clip-trim-right").nth(0)
    box = handle.bounding_box()
    
    page.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
    page.mouse.down()
    page.mouse.move(box["x"] + box["width"]/2 + 75, box["y"] + box["height"]/2)
    page.mouse.up()
    
    clip1 = page.locator(".timeline-clip").nth(0)
    width_val = clip1.evaluate("el => parseFloat(el.style.width) || 0")
    # Width must remain <= 225px (1.5s * 150px/s)
    assert width_val <= 225

def test_t3_10_trim_end_source_limit(page: Page):
    load_media(page)
    
    # Drag right trim handle of only clip past media duration (3.0s = 450px).
    handle = page.locator(".timeline-clip .clip-trim-right").nth(0)
    box = handle.bounding_box()
    
    page.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
    page.mouse.down()
    page.mouse.move(box["x"] + box["width"]/2 + 100, box["y"] + box["height"]/2)
    page.mouse.up()
    
    clip1 = page.locator(".timeline-clip").nth(0)
    width_val = clip1.evaluate("el => parseFloat(el.style.width) || 0")
    assert width_val <= 450

def test_t3_11_trim_end_min_duration(page: Page):
    load_media(page)
    
    # Drag right trim handle leftwards to shorten it below 0.5s.
    # Drag by 400px (which is more than 2.5s).
    handle = page.locator(".timeline-clip .clip-trim-right").nth(0)
    box = handle.bounding_box()
    
    page.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
    page.mouse.down()
    page.mouse.move(box["x"] + box["width"]/2 - 400, box["y"] + box["height"]/2)
    page.mouse.up()
    
    clip1 = page.locator(".timeline-clip").nth(0)
    width_val = clip1.evaluate("el => parseFloat(el.style.width) || 0")
    assert width_val >= 75

def test_t3_12_drag_clip_shift_right(page: Page):
    load_media(page)
    
    # Drag clip rightwards to shift its start/end time.
    # In order to drag, we press down on the clip body and move it right.
    clip = page.locator(".timeline-clip").nth(0)
    box = clip.bounding_box()
    
    page.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
    page.mouse.down()
    page.mouse.move(box["x"] + box["width"]/2 + 75, box["y"] + box["height"]/2)
    page.mouse.up()
    
    left_val = clip.evaluate("el => parseFloat(el.style.left) || 0")
    # Should have shifted right
    assert left_val > 0

def test_t3_13_drag_clip_blocked_right(page: Page):
    load_media(page)
    
    # Split in middle
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (1.5 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    page.locator("#btnSplitClip").click()
    
    # Drag clip 1 rightwards. It should be blocked by clip 2.
    clip1 = page.locator(".timeline-clip").nth(0)
    box = clip1.bounding_box()
    
    page.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
    page.mouse.down()
    page.mouse.move(box["x"] + box["width"]/2 + 100, box["y"] + box["height"]/2)
    page.mouse.up()
    
    left_val = clip1.evaluate("el => parseFloat(el.style.left) || 0")
    # Should not exceed 0 (since it's already adjacent to clip 2 starting at 1.5s)
    assert left_val == 0

def test_t3_14_drag_clip_blocked_left(page: Page):
    load_media(page)
    
    # Split in middle
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (1.5 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    page.locator("#btnSplitClip").click()
    
    # Try to drag clip 2 leftwards. It should be blocked by clip 1.
    clip2 = page.locator(".timeline-clip").nth(1)
    box = clip2.bounding_box()
    
    page.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
    page.mouse.down()
    page.mouse.move(box["x"] + box["width"]/2 - 100, box["y"] + box["height"]/2)
    page.mouse.up()
    
    left_val = clip2.evaluate("el => parseFloat(el.style.left) || 0")
    assert left_val >= 225

def test_t3_15_magnetic_swap_right(page: Page):
    load_media(page)
    
    # Split in middle
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (1.5 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    page.locator("#btnSplitClip").click()
    
    # Drag clip 1 past center of clip 2 to trigger swap.
    clip1 = page.locator(".timeline-clip").nth(0)
    clip2 = page.locator(".timeline-clip").nth(1)
    
    box1 = clip1.bounding_box()
    box2 = clip2.bounding_box()
    
    # Target past center of B
    target_x = box2["x"] + box2["width"]/2 + 20
    page.mouse.move(box1["x"] + box1["width"]/2, box1["y"] + box1["height"]/2)
    page.mouse.down()
    page.mouse.move(target_x, box1["y"] + box1["height"]/2, steps=10)
    page.mouse.up()
    
    # Verify clips swapped: check if clip at index 0 now has left >= 225 or starts later
    # (In native swap, the element order in DOM might swap or their left style/id maps)
    # We can evaluate state.clips in the browser
    clips_state = page.evaluate("state.clips")
    # Clip 1 should now start at 1.5s and Clip 2 should start at 0s
    assert clips_state[0]["timelineStart"] >= 1.5

def test_t3_16_magnetic_swap_left(page: Page):
    load_media(page)
    
    # Split in middle
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (1.5 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    page.locator("#btnSplitClip").click()
    
    # Swap B left past center of A
    clip1 = page.locator(".timeline-clip").nth(0)
    clip2 = page.locator(".timeline-clip").nth(1)
    
    box1 = clip1.bounding_box()
    box2 = clip2.bounding_box()
    
    target_x = box1["x"] + box1["width"]/2 - 20
    page.mouse.move(box2["x"] + box2["width"]/2, box2["y"] + box2["height"]/2)
    page.mouse.down()
    page.mouse.move(target_x, box2["y"] + box2["height"]/2, steps=10)
    page.mouse.up()
    
    clips_state = page.evaluate("state.clips")
    assert clips_state[1]["timelineStart"] == 0

def test_t3_17_waveform_zoom_factor(page: Page):
    page.goto("http://127.0.0.1:8080")
    # Verify that the zoom factor or PIXELS_PER_SECOND is set to 150
    zoom = page.evaluate("PIXELS_PER_SECOND")
    assert zoom == 150

def test_t3_18_playhead_line_position(page: Page):
    load_media(page)
    
    # Seek to 1.0s
    padding_left = float(page.evaluate("window.getComputedStyle(document.getElementById('timelineTracksWidthWrapper')).paddingLeft || '0'"))
    seek_x = padding_left + (1.0 * 150)
    page.locator("#timelineTracksWidthWrapper").click(position={"x": seek_x, "y": 15})
    
    # Check that current time in state is 1.0
    current_time = page.evaluate("state.currentTime")
    assert abs(current_time - 1.0) < 0.05
