from __future__ import annotations

from uuid import uuid4


class BagRepository:
    _bags: dict[str, list[dict[str, object]]] = {}

    def list_disc_records(self, bag_id: str) -> list[dict[str, object]]:
        return self._bags.get(bag_id, [])

    def add_disc_to_bag(
        self, bag_id: str, disc_record: dict[str, object]
    ) -> dict[str, object]:
        stored_record = {**disc_record, "disc_id": str(uuid4())}
        self._bags.setdefault(bag_id, []).append(stored_record)
        return stored_record

    def update_disc_record(
        self,
        bag_id: str,
        disc_id: str,
        updated_fields: dict[str, object],
    ) -> dict[str, object]:
        for index, disc_record in enumerate(self._bags.get(bag_id, [])):
            if disc_record.get("disc_id") == disc_id:
                updated_record = {
                    **disc_record,
                    **updated_fields,
                    "disc_id": disc_id,
                }
                self._bags[bag_id][index] = updated_record
                return updated_record
        raise KeyError(disc_id)
