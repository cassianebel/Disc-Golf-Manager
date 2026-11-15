from __future__ import annotations

from server.modules.bag_repository import BagRepository


class HomeBagView:
    def render_home_bag(self, user_id: str) -> list[dict[str, object]]:
        return BagRepository().list_disc_records(user_id)

    def route_to_add_disc(self, user_id: str) -> str:
        raise NotImplementedError(
            "HomeBagView.route_to_add_disc is not implemented."
        )
