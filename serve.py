"""Tiny static server: python3 serve.py  ->  http://localhost:8000"""
import http.server, socketserver, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = 8000
with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
    print(f"MindFrame running at http://localhost:{PORT}")
    httpd.serve_forever()
