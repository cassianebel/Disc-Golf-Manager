from __future__ import annotations


class DiscFormEditor:
    def build_disc_form(
        self,
        disc_id: str | None,
        catalog_match: dict[str, object] | None,
    ) -> dict[str, object]:
        raise NotImplementedError(
            "DiscFormEditor.build_disc_form is not implemented."
        )

    def submit_disc_form(
        self,
        disc_id: str | None,
        values: dict[str, object],
    ) -> dict[str, object]:
        raise NotImplementedError(
            "DiscFormEditor.submit_disc_form is not implemented."
        )
