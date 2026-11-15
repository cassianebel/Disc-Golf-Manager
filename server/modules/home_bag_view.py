from __future__ import annotations


class HomeBagView:
    def render_home_bag(self, user_id: str) -> list[dict[str, object]]:
        raise NotImplementedError(
            "HomeBagView.render_home_bag is not implemented."
        )

    def route_to_add_disc(self, user_id: str) -> str:
        raise NotImplementedError(
            "HomeBagView.route_to_add_disc is not implemented."
        )
