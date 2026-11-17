from __future__ import annotations

from fastapi import FastAPI, HTTPException

from server.modules.bag_repository import BagRepository
from server.modules.disc_form_editor import DiscFormEditor
from server.modules.home_bag_view import HomeBagView
from server.modules.trydiscs_catalog_lookup import TryDiscsCatalogLookup
from server.modules.user_session_and_bag_identity import UserSessionAndBagIdentity

app = FastAPI(title="Disc Golf Disc Manager API", version="0.1.0")

user_session_and_bag_identity = UserSessionAndBagIdentity()
bag_repository = BagRepository()
disc_form_editor = DiscFormEditor()
home_bag_view = HomeBagView()
trydiscs_catalog_lookup = TryDiscsCatalogLookup()


@app.get("/catalog/discs")
async def find_catalog_discs(q: str) -> dict[str, object]:
    return trydiscs_catalog_lookup.find_candidate_matches(q)


@app.get("/bags/{user_id}/discs")
async def list_discs(user_id: str) -> list[dict[str, object]]:
    active_user = user_session_and_bag_identity.get_active_user(user_id)
    user_session_and_bag_identity.get_bag_id_for_user(active_user)
    return home_bag_view.render_home_bag(active_user)


@app.post("/bags/{user_id}/discs")
async def add_disc(user_id: str, disc: dict[str, object]) -> dict[str, object]:
    bag_id = user_session_and_bag_identity.get_bag_id_for_user(user_id)
    return bag_repository.add_disc_to_bag(bag_id, disc)


@app.put("/bags/{user_id}/discs/{disc_id}")
async def update_disc(
    user_id: str,
    disc_id: str,
    updated_fields: dict[str, object],
) -> dict[str, object]:
    bag_id = user_session_and_bag_identity.get_bag_id_for_user(user_id)
    form_values = disc_form_editor.submit_disc_form(disc_id, updated_fields)
    try:
        return bag_repository.update_disc_record(bag_id, disc_id, form_values)
    except KeyError as error:
        raise HTTPException(status_code=404, detail="Disc not found.") from error
