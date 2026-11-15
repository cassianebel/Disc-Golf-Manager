from __future__ import annotations


class BagRepository:
    _bags: dict[str, list[dict[str, object]]] = {}

    def list_disc_records(self, bag_id: str) -> list[dict[str, object]]:
        return self._bags.get(bag_id, [])

    def add_disc_to_bag(
        self, bag_id: str, disc_record: dict[str, object]
    ) -> dict[str, object]:
        self._bags.setdefault(bag_id, []).append(disc_record)
        return disc_record

    def update_disc_record(
        self,
        bag_id: str,
        disc_id: str,
        updated_fields: dict[str, object],
    ) -> dict[str, object]:
        raise NotImplementedError(
            "BagRepository.update_disc_record is not implemented."
        )
