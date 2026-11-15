from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from server.modules.bag_repository import BagRepository
from server.modules.home_bag_view import HomeBagView
from server.modules.user_session_and_bag_identity import UserSessionAndBagIdentity

app = FastAPI(title="Disc Golf Disc Manager API", version="0.1.0")

user_session_and_bag_identity = UserSessionAndBagIdentity()
bag_repository = BagRepository()
home_bag_view = HomeBagView()


@app.get("/bags/{user_id}/discs")
async def list_discs(user_id: str) -> JSONResponse:
    try:
        user_session_and_bag_identity.get_active_user(user_id)
        user_session_and_bag_identity.get_bag_id_for_user(user_id)
        home_bag_view.render_home_bag(user_id)
    except NotImplementedError:
        return JSONResponse(
            status_code=501,
            content={
                "error": "not_implemented",
                "message": "GET /bags/{user_id}/discs is not implemented.",
            },
        )
    return JSONResponse(
        status_code=501,
        content={
            "error": "not_implemented",
            "message": "GET /bags/{user_id}/discs is not implemented.",
        },
    )


@app.post("/bags/{user_id}/discs")
async def add_disc(user_id: str, disc: dict[str, object]) -> JSONResponse:
    try:
        bag_id = user_session_and_bag_identity.get_bag_id_for_user(user_id)
        bag_repository.add_disc_to_bag(bag_id, disc)
    except NotImplementedError:
        return JSONResponse(
            status_code=501,
            content={
                "error": "not_implemented",
                "message": "POST /bags/{user_id}/discs is not implemented.",
            },
        )
    return JSONResponse(
        status_code=501,
        content={
            "error": "not_implemented",
            "message": "POST /bags/{user_id}/discs is not implemented.",
        },
    )


@app.put("/bags/{user_id}/discs/{disc_id}")
async def update_disc(
    user_id: str,
    disc_id: str,
    updated_fields: dict[str, object],
) -> JSONResponse:
    try:
        bag_id = user_session_and_bag_identity.get_bag_id_for_user(user_id)
        bag_repository.update_disc_record(bag_id, disc_id, updated_fields)
    except NotImplementedError:
        return JSONResponse(
            status_code=501,
            content={
                "error": "not_implemented",
                "message": "PUT /bags/{user_id}/discs/{disc_id} is not implemented.",
            },
        )
    return JSONResponse(
        status_code=501,
        content={
            "error": "not_implemented",
            "message": "PUT /bags/{user_id}/discs/{disc_id} is not implemented.",
        },
    )
