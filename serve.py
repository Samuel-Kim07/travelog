import http.server
import socketserver

PORT = 8000
Handler = http.server.SimpleHTTPRequestHandler

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
