# This server serves the webpages. It does not interact with the websockets.

import string, cgi, time
import json
from os import curdir, sep
from http.server import BaseHTTPRequestHandler, HTTPServer

# This is a simple server and is not very safe in its current form.
class MyHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        try:
            if self.path == '/':
                self.path = "/index.html"
            if self.path[0:4] == "/lib":
                self.path = "/PyWebPlug" + self.path[4:]
            qInd = self.path.find("?")
            if (qInd >= 0):
                self.path = self.path[:qInd]
            f = open(curdir + sep + self.path)
            out = f.read()
            ext = self.path.split('.')
            ext = ext[len(ext)-1]
            if (ext != '.ico'):
                out = bytes(out, 'utf-8')
            self.gen_headers(ext)
            self.wfile.write(out)
            f.close()
            return
        except IOError:
            self.send_error(404, 'File Not Found: %s' % self.path)

    def gen_headers(self, ext):
        self.send_response(200)
        contentType = 'text/html'
        if (ext == "css"):
            contentType = 'text/css'
        elif (ext == "js"):
            contentType = 'application/javascript'
        self.send_header('Content-type', contentType)
        self.end_headers()

    def do_POST(self):
        pass

def main():
    try:
        # Server on the standard webserver port of 80.
        server = HTTPServer(('', 80), MyHandler)
        print("Starting webpage server...")
        server.serve_forever()
    except KeyboardInterrupt:
        print(' received, closing server.')
        server.socket.close()

if __name__ == '__main__':
    main()
