
"""Tests for the rewards API."""

import pytest
from pydantic import ValidationError

from rewards import RewardCreate, RewardUpdate


# Validation tests

def test_reward_create_rejects_empty_name():
    with pytest.raises(ValidationError):
        RewardCreate(group_id=1, name="", cost=10, type="individual")


def test_reward_create_rejects_zero_cost():
    with pytest.raises(ValidationError):
        RewardCreate(group_id=1, name="Coffee", cost=0, type="individual")


def test_reward_create_rejects_invalid_type():
    with pytest.raises(ValidationError):
        RewardCreate(group_id=1, name="Coffee", cost=10, type="personal")


def test_reward_update_rejects_empty_name():
    with pytest.raises(ValidationError):
        RewardUpdate(name="", cost=10, type="individual")


# Create and retrieve tests

def test_create_reward(client, auth_header):
    response = client.post(
        "/rewards",
        headers=auth_header,
        json={
            "group_id": 1,
            "name": "Pizza night",
            "cost": 25,
            "type": "group",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Pizza night"
    assert body["cost"] == 25
    assert body["type"] == "group"
    assert body["created_by"] == 1


def test_list_rewards(client, auth_header):
    response = client.get(
        "/rewards",
        headers=auth_header,
        params={"group_id": 1},
    )

    assert response.status_code == 200
    rewards = response.json()
    assert len(rewards) == 3
    assert all(reward["group_id"] == 1 for reward in rewards)


def test_get_reward(client, auth_header):
    response = client.get("/rewards/1", headers=auth_header)

    assert response.status_code == 200
    assert response.json()["name"] == "Free coffee run"


def test_get_missing_reward(client, auth_header):
    response = client.get("/rewards/9999", headers=auth_header)

    assert response.status_code == 404


# Update and delete tests

def test_update_reward(client, auth_header):
    response = client.patch(
        "/rewards/1",
        headers=auth_header,
        json={
            "name": "Coffee and snacks",
            "cost": 35,
            "type": "individual",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Coffee and snacks"
    assert body["cost"] == 35


def test_delete_reward(client, auth_header):
    # Reward 1 is created_by user 1 (the authenticated demo user).
    response = client.delete("/rewards/1", headers=auth_header)

    assert response.status_code == 204
    assert client.get("/rewards/1", headers=auth_header).status_code == 404


def test_delete_reward_rejects_non_creator(client, auth_header):
    # Reward 3 is created_by user 2; user 1 may not remove it.
    response = client.delete("/rewards/3", headers=auth_header)

    assert response.status_code == 403
    assert "creator" in response.json()["detail"].lower()


# Redemption tests

def test_redeem_reward(client, auth_header, db):
    response = client.post("/rewards/1/redeem", headers=auth_header)

    assert response.status_code == 200
    assert response.json()["points"] == 10

    member = next(
        m for m in db.tables["group_members"] if m["user_id"] == 1
    )
    assert member["points"] == 10


def test_redeem_reward_insufficient_points(client, auth_header):
    response = client.post("/rewards/2/redeem", headers=auth_header)

    assert response.status_code == 400
    assert "Not enough points" in response.json()["detail"]


def test_redeem_missing_reward(client, auth_header):
    response = client.post("/rewards/9999/redeem", headers=auth_header)

    assert response.status_code == 404


# Membership tests

def test_create_reward_rejects_non_member(client, auth_header, as_user):
    as_user(8)

    response = client.post(
        "/rewards",
        headers=auth_header,
        json={
            "group_id": 1,
            "name": "Pizza night",
            "cost": 25,
            "type": "group",
        },
    )

    assert response.status_code == 403


def test_list_rewards_rejects_non_member(client, auth_header, as_user):
    as_user(8)

    response = client.get(
        "/rewards",
        headers=auth_header,
        params={"group_id": 1},
    )

    assert response.status_code == 403
