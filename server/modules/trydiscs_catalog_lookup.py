from __future__ import annotations


class TryDiscsCatalogLookup:
    def find_candidate_matches(
        self, brand_name: str, disc_name: str
    ) -> list[dict[str, str]]:
        raise NotImplementedError(
            "TryDiscsCatalogLookup.find_candidate_matches is not implemented."
        )
