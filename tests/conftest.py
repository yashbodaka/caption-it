import sys
import time
import socket
import subprocess
import os
import wave
import struct
import pytest
from playwright.sync_api import sync_playwright

def create_dummy_wav(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(16000)
        # 48000 frames (3 seconds) of silence
        for _ in range(48000):
            data = struct.pack('<h', 0)
            f.writeframesraw(data)

@pytest.fixture(scope="session", autouse=True)
def setup_dummy_files():
    dummy_wav_path = os.path.join(os.path.dirname(__file__), "dummy.wav")
    create_dummy_wav(dummy_wav_path)
    yield
    if os.path.exists(dummy_wav_path):
        try:
            os.remove(dummy_wav_path)
        except OSError:
            pass

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
        stdout, stderr = server_process.communicate()
        raise RuntimeError(
            f"Local safe server failed to launch on http://127.0.0.1:8080.\n"
            f"stdout: {stdout.decode()}\n"
            f"stderr: {stderr.decode()}"
        )
        
    yield "http://127.0.0.1:8080"
    
    # Tear down
    server_process.terminate()
    server_process.wait()

@pytest.fixture(scope="function")
def page():
    with sync_playwright() as p:
        # Launch headless chromium
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        yield page
        page.close()
        context.close()
        browser.close()
