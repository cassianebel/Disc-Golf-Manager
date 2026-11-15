from __future__ import annotations

import json
import socket
import subprocess
import sys
import time
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]


class ApiSkeletonTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            cls.port = sock.getsockname()[1]

        cls.base_url = f"http://127.0.0.1:{cls.port}"
        cls.server = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "server.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(cls.port),
            ],
            cwd=ROOT,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            if cls.server.poll() is not None:
                raise RuntimeError("The API server exited before becoming ready.")
            try:
                with socket.create_connection(("127.0.0.1", cls.port), timeout=0.2):
                    return
            except OSError:
                time.sleep(0.1)
        cls.server.terminate()
        cls.server.wait(timeout=5)
        raise RuntimeError("The API server did not become ready within 10 seconds.")

    @classmethod
    def tearDownClass(cls) -> None:
        if cls.server.poll() is None:
            cls.server.terminate()
            try:
                cls.server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                cls.server.kill()
                cls.server.wait(timeout=5)

    def request_json(
        self, method: str, path: str, body: dict[str, object] | None = None
    ) -> object:
        request = Request(
            f"{self.base_url}{path}",
            data=json.dumps(body).encode("utf-8") if body is not None else None,
            headers={"Content-Type": "application/json"},
            method=method,
        )
        try:
            response = urlopen(request, timeout=3)
        except HTTPError as error:
            error_body = error.read().decode("utf-8")
            error.close()
            self.fail(
                f"{method} {path} returned HTTP {error.code}, expected a successful "
                f"2xx response; body: {error_body}"
            )
        else:
            with response:
                self.assertGreaterEqual(response.status, 200)
                self.assertLess(response.status, 300)
                return json.loads(response.read())

    def test_list_discs_returns_bag(self) -> None:
        result = self.request_json("GET", "/bags/user-123/discs")
        self.assertIsInstance(result, list)

    def test_add_disc_returns_saved_record(self) -> None:
        result = self.request_json(
            "POST",
            "/bags/user-123/discs",
            {"brand": "Innova", "name": "Destroyer"},
        )
        self.assertIsInstance(result, dict)

    def test_update_disc_returns_updated_record(self) -> None:
        result = self.request_json(
            "PUT",
            "/bags/user-123/discs/disc-1",
            {"condition": "new"},
        )
        self.assertIsInstance(result, dict)


if __name__ == "__main__":
    unittest.main()
