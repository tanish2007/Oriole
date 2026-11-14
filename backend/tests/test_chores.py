"""Unit tests for chore validation and claim/complete flows."""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from chores import ChoreCreate, ChoreUpdate, check_chore_fields


# --- Pydantic / field validation -------------------------------------------------


def test_chore_create_rejects_empty_title():
    with pytest.raises(ValidationError):
        ChoreCreate(group_id=1, title="", points=5)


def test_chore_create_rejects_points_below_one():
    with pytest.raises(ValidationError):
        ChoreCreate(group_id=1, title="Dishes", points=0)


def test_chore_update_rejects_empty_title():
    with pytest.raises(ValidationError):
        ChoreUpdate(title="", points=5)


def test_check_chore_fields_rejects_bad_due(db):
    with pytest.raises(HTTPException) as exc:
        check_chore_fields(db, group_id=1, points=10, due="11/14/2026")
    assert exc.value.status_code == 400
    assert "due date" in exc.value.detail.lower()


def test_check_chore_fields_rejects_points_over_group_max(db):
    with pytest.raises(HTTPException) as exc:
        check_chore_fields(db, group_id=1, points=101, due="2026-11-20")
    assert exc.value.status_code == 400
    assert "100" in exc.value.detail


def test_check_chore_fields_accepts_valid_due_and_points(db):
    check_chore_fields(db, group_id=1, points=50, due="2026-11-20")


# --- Create / list / get ---------------------------------------------------------


def test_create_chore(client, auth_header):
    res = client.post(
        "/chores",
        headers=auth_header,
        json={
            "group_id": 1,
            "title": "Sweep porch",
            "description": "Front and back",
            "points": 12,
            "due": "2026-12-01",
        },
    )
    assert res.status_code == 201
    body = res.json()
    assert body["title"] == "Sweep porch"
    assert body["points"] == 12
    assert body["status"] == "available"
    assert body["due"] == "2026-12-01"
    assert body["created_by"] == 1


def test_create_chore_rejects_bad_due(client, auth_header):
    res = client.post(
        "/chores",
        headers=auth_header,
        json={"group_id": 1, "title": "Sweep", "points": 5, "due": "not-a-date"},
    )
    assert res.status_code == 400


def test_create_chore_rejects_points_over_max(client, auth_header):
    res = client.post(
        "/chores",
        headers=auth_header,
        json={"group_id": 1, "title": "Huge chore", "points": 500},
    )
    assert res.status_code == 400


def test_list_chores_for_group(client, auth_header):
    res = client.get("/chores", headers=auth_header, params={"group_id": 1})
    assert res.status_code == 200
    chores = res.json()
    assert len(chores) >= 5
    assert all(c["group_id"] == 1 for c in chores)


def test_list_chores_filter_by_status(client, auth_header):
    res = client.get(
        "/chores",
        headers=auth_header,
        params={"group_id": 1, "status": "available"},
    )
    assert res.status_code == 200
    assert all(c["status"] == "available" for c in res.json())


def test_get_chore(client, auth_header):
    res = client.get("/chores/1", headers=auth_header)
    assert res.status_code == 200
    assert res.json()["title"] == "Take out recycling"


def test_get_missing_chore(client, auth_header):
    res = client.get("/chores/9999", headers=auth_header)
    assert res.status_code == 404


# --- Update / delete -------------------------------------------------------------


def test_update_chore(client, auth_header):
    res = client.patch(
        "/chores/1",
        headers=auth_header,
        json={
            "title": "Take out recycling (bins)",
            "description": "Updated",
            "points": 11,
            "due": "2026-12-15",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["title"] == "Take out recycling (bins)"
    assert body["points"] == 11
    assert body["due"] == "2026-12-15"


def test_delete_chore(client, auth_header):
    res = client.delete("/chores/4", headers=auth_header)
    assert res.status_code == 204
    assert client.get("/chores/4", headers=auth_header).status_code == 404


# --- Claim / complete state machine ----------------------------------------------


def test_claim_available_chore(client, auth_header):
    res = client.post("/chores/1/claim", headers=auth_header)
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "in_progress"
    assert body["assignee_id"] == 1


def test_claim_rejects_already_claimed(client, auth_header):
    # Chore 2 is already in_progress with assignee 1
    res = client.post("/chores/2/claim", headers=auth_header)
    assert res.status_code == 400
    assert "not available" in res.json()["detail"].lower()


def test_complete_own_in_progress_chore(client, auth_header, db):
    before = next(m for m in db.tables["group_members"] if m["user_id"] == 1)
    start_points = before["points"]

    res = client.post("/chores/2/complete", headers=auth_header)
    assert res.status_code == 200
    body = res.json()
    assert body["chore"]["status"] == "completed"
    assert body["points"] == start_points + 15  # chore 2 is worth 15


def test_complete_rejects_wrong_assignee(client, auth_header, as_user):
    # Chore 3 is assigned to user 2; user 1 should not complete it
    as_user(1)
    res = client.post("/chores/3/complete", headers=auth_header)
    assert res.status_code == 400
    assert "can't complete" in res.json()["detail"].lower()


def test_complete_rejects_available_chore(client, auth_header):
    res = client.post("/chores/1/complete", headers=auth_header)
    assert res.status_code == 400


def test_claim_then_complete_flow(client, auth_header, db):
    claim = client.post("/chores/4/claim", headers=auth_header)
    assert claim.status_code == 200
    assert claim.json()["assignee_id"] == 1

    before = next(m for m in db.tables["group_members"] if m["user_id"] == 1)
    start = before["points"]

    done = client.post("/chores/4/complete", headers=auth_header)
    assert done.status_code == 200
    assert done.json()["chore"]["status"] == "completed"
    assert done.json()["points"] == start + 8
