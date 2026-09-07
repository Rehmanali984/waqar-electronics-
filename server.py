"""Small local server for the dependency-free admin panel.

Static files are served from this directory. GitHub credentials are read only
from the process environment and are never exposed to browser code.
"""

import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class AdminHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/api/github":
            self.send_json({"error": "Not found"}, 404)
            return

        repository = os.environ.get("GITHUB_REPOSITORY", "")
        token = os.environ.get("GITHUB_TOKEN", "")
        if not token or "/" not in repository:
            self.send_json({"error": "GitHub integration is not configured on the server."}, 503)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length))
            title = payload.get("title", "").strip()
            if not title:
                self.send_json({"error": "A feedback title is required."}, 400)
                return
            body = payload.get("body", "")
            request = Request(
                f"https://api.github.com/repos/{repository}/issues",
                data=json.dumps({"title": title[:200], "body": body[:10000]}).encode(),
                headers={
                    "Accept": "application/vnd.github+json",
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
                method="POST",
            )
            with urlopen(request, timeout=15) as response:
                issue = json.loads(response.read())
            self.send_json({"url": issue["html_url"], "number": issue["number"]})
        except (ValueError, KeyError, TypeError):
            self.send_json({"error": "Invalid JSON body."}, 400)
        except HTTPError as error:
            self.send_json({"error": "GitHub could not create the issue."}, error.code)
        except (URLError, TimeoutError):
            self.send_json({"error": "GitHub is unreachable."}, 502)

    def send_json(self, payload, status=200):
        encoded = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    print(f"Waqar Electronics admin: http://localhost:{port}/")
    ThreadingHTTPServer(("127.0.0.1", port), AdminHandler).serve_forever()
