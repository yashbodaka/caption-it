import http.server
import socketserver

PORT = 8080

class ReusableTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

class SafeMimeHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def end_headers(self):
        # Prevent caching during development so updates to app.js reflect immediately
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

# Explicitly force correct MIME types, bypassing any broken Windows Registry mappings
SafeMimeHandler.extensions_map.update({
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.html': 'text/html',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webm': 'video/webm',
    '.mp4': 'video/mp4',
    '.wasm': 'application/wasm'
})

# Bind to localhost (127.0.0.1) to avoid triggering Windows Firewall security prompts
try:
    with ReusableTCPServer(("127.0.0.1", PORT), SafeMimeHandler) as httpd:
        print(f"Safe dev server running at http://127.0.0.1:{PORT}")
        print("Explicit MIME types registered. Browser caching is disabled.")
        httpd.serve_forever()
except Exception as e:
    print(f"Error starting server: {e}")
