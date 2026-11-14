"""Unit tests for backend/rewards.py. The database layer is faked, so nothing touches Supabase.

Run from the backend folder:  python -m pytest tests/test_rewards.py -v
"""
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import rewards

# Mount only the rewards router so these tests don't depend on main.py.
app = FastAPI()
app.include_router(rewards.router)
client = TestClient(app)

REWARD = {"id": 1, "group_id": 7, "created_by": 1, "name": "Pick dinner", "cost": 25, "type": "group"}
CREATE_BODY = {"user_id": 1, "group_id": 7, "name": "Movie night", "cost": 20, "type": "individual"}
UPDATE_BODY = {"name": "Taco night", "cost": 30, "type": "individual"}

# (method, url, query params, json body) for every endpoint.
CALLS = [
    pytest.param("get", "/rewards/1", {"user_id": 1}, None, id="get"),
    pytest.param("patch", "/rewards/1", {"user_id": 1}, UPDATE_BODY, id="update"),
    pytest.param("delete", "/rewards/1", {"user_id": 1}, None, id="delete"),
    pytest.param("post", "/rewards/1/redeem", {"user_id": 1}, None, id="redeem"),
    pytest.param("get", "/rewards", {"group_id": 7, "user_id": 1}, None, id="list"),
    pytest.param("post", "/rewards", None, CREATE_BODY, id="create"),
]
SINGLE_REWARD_CALLS = CALLS[:4]


class FakeQuery:
    """Chained calls (select, eq, insert, ...) are logged and return self; execute() returns canned rows."""

    def __init__(self, table, rows, log):
        self._table, self._rows, self._log = table, rows, log

    def __getattr__(self, method):
        def call(*args):
            self._log.append((self._table, method, args))
            return self

        return call

    def execute(self):
        return SimpleNamespace(data=self._rows)


class FakeClient:
    def __init__(self, **tables):
        self.tables = tables
        self.log = []

    def table(self, name):
        return FakeQuery(name, self.tables.get(name, []), self.log)


@pytest.fixture
def env(monkeypatch):
    """Replaces the db helpers that rewards.py imported. Tests tweak the returned state."""
    state = SimpleNamespace(
        db=FakeClient(rewards=[dict(REWARD)]),
        members=[{"user_id": 1, "points": 30, "week_points": 0, "month_points": 0}],
        supported=True,
        member_ok=True,
        saved=[],
    )

    def require_member(client, group_id, user_id):
        if not state.member_ok:
            raise HTTPException(status_code=403, detail="Not a member of this group")

    def public_member(client, group_id, user_id):
        points = state.saved[-1][2]["points"] if state.saved else state.members[0]["points"]
        return {"id": user_id, "name": "Test User", "points": points}

    monkeypatch.setattr(rewards, "get_supabase", lambda: state.db)
    monkeypatch.setattr(rewards, "require_member", require_member)
    monkeypatch.setattr(rewards, "list_group_members", lambda client, group_id: (state.members, state.supported))
    monkeypatch.setattr(rewards, "save_member_points", lambda client, g, u, fields: state.saved.append((g, u, fields)))
    monkeypatch.setattr(rewards, "public_member", public_member)
    return state


def writes(db):
    return [entry for entry in db.log if entry[1] in ("insert", "update", "delete")]


# --- redeem -------------------------------------------------------------

def test_redeem_subtracts_cost_from_points_only(env):
    response = client.post("/rewards/1/redeem", params={"user_id": 1})
    assert response.status_code == 200
    assert response.json() == {"id": 1, "name": "Test User", "points": 5}
    assert env.saved == [(7, 1, {"points": 5})]  # week/month points are not touched


def test_redeem_with_exact_balance_leaves_zero(env):
    env.members[0]["points"] = 25
    response = client.post("/rewards/1/redeem", params={"user_id": 1})
    assert response.status_code == 200
    assert response.json()["points"] == 0
    assert env.saved == [(7, 1, {"points": 0})]


def test_redeem_with_too_few_points_is_rejected(env):
    env.members[0]["points"] = 24
    response = client.post("/rewards/1/redeem", params={"user_id": 1})
    assert response.status_code == 400
    assert response.json()["detail"] == "Not enough points."
    assert env.saved == []


def test_redeem_by_user_missing_from_group_rows_is_forbidden(env):
    env.members = [{"user_id": 2, "points": 99, "week_points": 0, "month_points": 0}]
    response = client.post("/rewards/1/redeem", params={"user_id": 1})
    assert response.status_code == 403
    assert env.saved == []


def test_redeem_without_points_columns_returns_400(env):
    env.supported = False
    response = client.post("/rewards/1/redeem", params={"user_id": 1})
    assert response.status_code == 400
    assert "points column" in response.json()["detail"]
    assert env.saved == []


# --- access and missing rewards ----------------------------------------

@pytest.mark.parametrize("method,url,params,body", CALLS)
def test_non_member_is_rejected_and_nothing_is_written(env, method, url, params, body):
    env.member_ok = False
    response = client.request(method, url, params=params, json=body)
    assert response.status_code == 403
    assert writes(env.db) == []
    assert env.saved == []


@pytest.mark.parametrize("method,url,params,body", SINGLE_REWARD_CALLS)
def test_unknown_reward_returns_404(env, method, url, params, body):
    env.db = FakeClient(rewards=[])
    response = client.request(method, url, params=params, json=body)
    assert response.status_code == 404
    assert response.json()["detail"] == "Reward not found"
    assert writes(env.db) == []


# --- create / list / update / delete -----------------------------------

def test_create_returns_201_and_inserts_the_right_row(env):
    created = {"id": 9, "group_id": 7, "created_by": 1, "name": "Movie night", "cost": 20, "type": "individual"}
    env.db = FakeClient(rewards=[created])
    response = client.post("/rewards", json=CREATE_BODY)
    assert response.status_code == 201
    assert response.json() == created
    row = {"group_id": 7, "created_by": 1, "name": "Movie night", "cost": 20, "type": "individual"}
    assert ("rewards", "insert", (row,)) in env.db.log


@pytest.mark.parametrize(
    "change",
    [
        {"cost": 0},
        {"cost": -5},
        {"cost": 2.5},
        {"name": ""},
        {"name": "x" * 101},
        {"type": "team"},
    ],
    ids=["zero-cost", "negative-cost", "decimal-cost", "empty-name", "long-name", "bad-type"],
)
def test_create_rejects_invalid_input(env, change):
    response = client.post("/rewards", json={**CREATE_BODY, **change})
    assert response.status_code == 422
    assert writes(env.db) == []


def test_list_returns_only_the_requested_groups_rewards(env):
    response = client.get("/rewards", params={"group_id": 7, "user_id": 1})
    assert response.status_code == 200
    assert response.json() == [REWARD]
    assert ("rewards", "eq", ("group_id", 7)) in env.db.log


def test_update_saves_the_new_fields(env):
    updated = {**REWARD, **UPDATE_BODY}
    env.db = FakeClient(rewards=[updated])
    response = client.patch("/rewards/1", params={"user_id": 1}, json=UPDATE_BODY)
    assert response.status_code == 200
    assert response.json() == updated
    assert ("rewards", "update", (UPDATE_BODY,)) in env.db.log


def test_update_rejects_invalid_cost(env):
    response = client.patch("/rewards/1", params={"user_id": 1}, json={**UPDATE_BODY, "cost": 0})
    assert response.status_code == 422
    assert writes(env.db) == []


def test_delete_returns_204_and_deletes_the_row(env):
    response = client.delete("/rewards/1", params={"user_id": 1})
    assert response.status_code == 204
    assert response.content == b""
    assert ("rewards", "delete", ()) in env.db.log
    assert ("rewards", "eq", ("id", 1)) in env.db.log