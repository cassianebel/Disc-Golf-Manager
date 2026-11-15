from __future__ import annotations


class BagRepository:
    def list_disc_records(self, bag_id: str) -> list[dict[str, object]]:
        raise NotImplementedError(
            "BagRepository.list_disc_records is not implemented."
        )

    def add_disc_to_bag(
        self, bag_id: str, disc_record: dict[str, object]
    ) -> dict[str, object]:
        raise NotImplementedError(
            "BagRepository.add_disc_to_bag is not implemented."
        )

    def update_disc_record(
        self,
        bag_id: str,
        disc_id: str,
        updated_fields: dict[str, object],
    ) -> dict[str, object]:
        raise NotImplementedError(
            "BagRepository.update_disc_record is not implemented."
        )
