from __future__ import annotations

import asyncio
import json
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse
from urllib.request import Request

from fastapi import HTTPException

from server import main
from server.modules.trydiscs_catalog_lookup import TryDiscsCatalogLookup


class TryDiscsCatalogLookupTests(unittest.TestCase):
    def setUp(self) -> None:
        self.lookup = TryDiscsCatalogLookup()

    @patch.dict("os.environ", {"TRYDISCS_API_KEY": "test-key"})
    @patch("server.modules.trydiscs_catalog_lookup.urlopen")
    def test_lookup_sends_exact_query_and_returns_matches_with_attribution(
        self, urlopen_mock
    ) -> None:
        payload = {
            "meta": {"attribution": "Disc data by Try Discs"},
            "data": [{"brand": "Innova", "name": "Destroyer"}],
        }
        response = urlopen_mock.return_value.__enter__.return_value
        response.read.return_value = json.dumps(payload).encode("utf-8")

        result = self.lookup.find_candidate_matches("Innova Destroyer!")

        request = urlopen_mock.call_args.args[0]
        self.assertIsInstance(request, Request)
        self.assertEqual(
            parse_qs(urlparse(request.full_url).query),
            {"q": ["Innova Destroyer!"]},
        )
        self.assertEqual(request.get_header("X-api-key"), "test-key")
        self.assertEqual(
            result,
            {
                "matches": payload["data"],
                "attribution": "Disc data by Try Discs",
            },
        )

    @patch("server.modules.trydiscs_catalog_lookup.urlopen")
    @patch.dict("os.environ", {"TRYDISCS_API_KEY": "test-key"})
    def test_lookup_rejects_empty_query_without_request(self, urlopen_mock) -> None:
        with self.assertRaises(HTTPException) as error:
            self.lookup.find_candidate_matches(" \t ")

        self.assertEqual(error.exception.status_code, 400)
        urlopen_mock.assert_not_called()

    @patch.dict("os.environ", {}, clear=True)
    @patch("server.modules.trydiscs_catalog_lookup.urlopen")
    def test_lookup_reports_missing_api_key(self, urlopen_mock) -> None:
        with self.assertRaises(HTTPException) as error:
            self.lookup.find_candidate_matches("Destroyer")

        self.assertEqual(error.exception.status_code, 503)
        self.assertIn("TRYDISCS_API_KEY", error.exception.detail)
        urlopen_mock.assert_not_called()

    @patch("server.modules.trydiscs_catalog_lookup.urlopen")
    @patch.dict("os.environ", {"TRYDISCS_API_KEY": "test-key"})
    def test_lookup_surfaces_upstream_failure(self, urlopen_mock) -> None:
        from urllib.error import URLError

        urlopen_mock.side_effect = URLError("unavailable")

        with self.assertRaises(HTTPException) as error:
            self.lookup.find_candidate_matches("Destroyer")

        self.assertEqual(error.exception.status_code, 502)


class CatalogRouteTests(unittest.TestCase):
    def test_catalog_route_passes_query_to_lookup(self) -> None:
        with patch.object(
            main.trydiscs_catalog_lookup,
            "find_candidate_matches",
            return_value={"matches": [], "attribution": "Disc data by Try Discs"},
        ) as lookup_mock:
            result = asyncio.run(main.find_catalog_discs("edited query"))

        self.assertEqual(
            result,
            {"matches": [], "attribution": "Disc data by Try Discs"},
        )
        lookup_mock.assert_called_once_with("edited query")

        route = next(
            route
            for route in main.app.routes
            if getattr(route, "path", None) == "/catalog/discs"
        )
        self.assertIn("GET", route.methods)


if __name__ == "__main__":
    unittest.main()
