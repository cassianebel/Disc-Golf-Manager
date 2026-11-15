from __future__ import annotations


class DiscFormEditor:
    def build_disc_form(
        self,
        disc_id: str | None,
        catalog_match: dict[str, object] | None,
        existing_record: dict[str, object] | None = None,
    ) -> dict[str, object]:
        if existing_record is not None:
            return dict(existing_record)
        if catalog_match is not None:
            return dict(catalog_match)
        return {}

    def submit_disc_form(
        self,
        disc_id: str | None,
        values: dict[str, object],
    ) -> dict[str, object]:
        if disc_id is None:
            return values
        return {**values, "disc_id": disc_id}
