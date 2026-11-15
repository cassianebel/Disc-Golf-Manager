from __future__ import annotations


class UserSessionAndBagIdentity:
    def get_active_user(self, user_id: str) -> str:
        return user_id

    def get_bag_id_for_user(self, user_id: str) -> str:
        return user_id
