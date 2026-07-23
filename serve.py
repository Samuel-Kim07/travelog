import http.server
import socketserver

PORT = 8000
class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

Handler = CustomHandler

# Add proper MIME-type mappings to prevent broken images (X-box) on Windows browsers
Handler.extensions_map.update({
    '.svg': 'image/svg+xml',
    '.svgz': 'image/svg+xml',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4',
    '.ico': 'image/x-icon',
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8'
})

print(f"Starting Travelog Custom Server with SVG support on port {PORT}...")
socketserver.TCPServer.allow_reuse_address = True
try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped.")
