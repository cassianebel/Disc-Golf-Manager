from __future__ import annotations

import json
import os
from typing import cast
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import HTTPException


class TryDiscsCatalogLookup:
    def find_candidate_matches(self, query: str) -> dict[str, object]:
        if not query.strip():
            raise HTTPException(
                status_code=400,
                detail="Search query must not be empty.",
            )

        api_key = os.environ.get("TRYDISCS_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail=(
                    "TryDiscs API key is not configured. Set TRYDISCS_API_KEY "
                    "in the server environment and restart the API server."
                ),
            )

        request = Request(
            f"https://api.trydiscs.com/v1/discs?{urlencode({'q': query})}",
            headers={"X-API-Key": api_key},
        )
        try:
            with urlopen(request, timeout=10) as response:
                payload = json.loads(response.read())
        except HTTPError as error:
            raise HTTPException(
                status_code=502,
                detail=f"TryDiscs returned HTTP {error.code}.",
            ) from error
        except (URLError, TimeoutError, OSError) as error:
            raise HTTPException(
                status_code=502,
                detail="TryDiscs could not be reached.",
            ) from error
        except (json.JSONDecodeError, UnicodeDecodeError) as error:
            raise HTTPException(
                status_code=502,
                detail="TryDiscs returned an invalid response.",
            ) from error

        if not isinstance(payload, dict):
            raise HTTPException(
                status_code=502,
                detail="TryDiscs returned an invalid response.",
            )

        data = payload.get("data")
        meta = payload.get("meta")
        attribution = meta.get("attribution") if isinstance(meta, dict) else None
        if (
            not isinstance(data, list)
            or not all(isinstance(match, dict) for match in data)
            or not isinstance(attribution, str)
        ):
            raise HTTPException(
                status_code=502,
                detail="TryDiscs response is missing catalog data or attribution.",
            )

        return {
            "matches": cast(list[dict[str, object]], data),
            "attribution": attribution,
        }
