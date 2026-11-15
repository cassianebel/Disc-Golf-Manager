from __future__ import annotations


class UserSessionAndBagIdentity:
    def get_active_user(self, user_id: str) -> str:
        raise NotImplementedError(
            "UserSessionAndBagIdentity.get_active_user is not implemented."
        )

    def get_bag_id_for_user(self, user_id: str) -> str:
        return user_id
