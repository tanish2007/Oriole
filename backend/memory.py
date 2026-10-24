"""In-memory stand-in for the Supabase client, preloaded for a local demo.

Used only when SUPABASE_URL and SUPABASE_KEY are unset. Data lasts until the
API process restarts.
"""

from datetime import date, datetime, timedelta, timezone
from copy import deepcopy


class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, name: str, rows: list[dict], sequences: dict[str, int]):
        self.name = name
        self.rows = rows
        self.sequences = sequences
        self.filters: list[tuple] = []
        self.columns: list[str] | None = None
        self.order_key: str | None = None
        self.order_desc = False
        self.one = False
        self.op = "select"
        self.payload: dict | None = None

    def select(self, columns: str = "*"):
        self.op = "select"
        self.columns = None if columns.strip() == "*" else [part.strip() for part in columns.split(",")]
        return self

    def insert(self, row: dict):
        self.op = "insert"
        self.payload = row
        return self

    def update(self, fields: dict):
        self.op = "update"
        self.payload = fields
        return self

    def delete(self):
        self.op = "delete"
        return self

    def eq(self, key: str, value):
        self.filters.append(("eq", key, value))
        return self

    def in_(self, key: str, values):
        self.filters.append(("in", key, set(values)))
        return self

    def order(self, key: str, desc: bool = False):
        self.order_key = key
        self.order_desc = desc
        return self

    def single(self):
        self.one = True
        return self

    def _matches(self, row: dict) -> bool:
        for kind, key, value in self.filters:
            current = row.get(key)
            if kind == "in":
                if current not in value:
                    return False
            elif current != value:
                return False
        return True

    def _project(self, row: dict) -> dict:
        if not self.columns:
            return dict(row)
        return {column: row.get(column) for column in self.columns}

    def execute(self):
        if self.op == "insert":
            stored = dict(self.payload or {})
            if "id" not in stored:
                self.sequences[self.name] += 1
                stored["id"] = self.sequences[self.name]
            if self.name == "chores":
                stored.setdefault("description", "")
                stored.setdefault("assignee_id", None)
                stored.setdefault("due", None)
                stored.setdefault("created_at", datetime.now(timezone.utc).isoformat())
            self.rows.append(stored)
            data = [dict(stored)]
        elif self.op == "update":
            data = []
            for row in self.rows:
                if self._matches(row):
                    row.update(self.payload or {})
                    data.append(dict(row))
        elif self.op == "delete":
            kept = []
            data = []
            for row in self.rows:
                if self._matches(row):
                    data.append(dict(row))
                else:
                    kept.append(row)
            self.rows[:] = kept
        else:
            matched = [self._project(row) for row in self.rows if self._matches(row)]
            if self.order_key:
                matched.sort(key=lambda row: row.get(self.order_key) or "", reverse=self.order_desc)
            data = matched

        if self.one:
            if len(data) != 1:
                raise RuntimeError(f"{self.name} lookup expected 1 row, found {len(data)}")
            return _Result(data[0])
        return _Result(data)


class DemoClient:
    def __init__(self, tables: dict[str, list[dict]]):
        self.tables = tables
        self.sequences = {name: max((row.get("id", 0) for row in rows), default=0) for name, rows in tables.items()}

    def table(self, name: str) -> _Query:
        rows = self.tables.get(name)
        if rows is None:
            raise RuntimeError(f'relation "{name}" does not exist')
        return _Query(name, rows, self.sequences)


def _stamp(day: date, hour: int) -> str:
    return datetime(day.year, day.month, day.day, hour, tzinfo=timezone.utc).isoformat()


def demo_client() -> DemoClient:
    today = date.today()
    tables = {
        "users": [
            {"id": 1, "name": "Jennifer Ye"},
            {"id": 2, "name": "Nathan Lam"},
            {"id": 3, "name": "Tanish Gupta"},
            {"id": 4, "name": "Will Hammond"},
            {"id": 5, "name": "Shambhavi Upadhyay"},
            {"id": 6, "name": "Aviral Poddar"},
            {"id": 7, "name": "Nathan Cardin"},
        ],
        "groups": [
            {
                "id": 1,
                "name": "Team Oriole",
                "owner_id": 1,
                "max_chore_points": 100,
                "invite_code": "ORIOLE",
            }
        ],
        "group_members": [
            {"id": 1, "group_id": 1, "user_id": 1, "role": "owner", "points": 40, "week_points": 28, "month_points": 52},
            {"id": 2, "group_id": 1, "user_id": 2, "role": "member", "points": 50, "week_points": 46, "month_points": 80},
            {"id": 3, "group_id": 1, "user_id": 3, "role": "member", "points": 35, "week_points": 34, "month_points": 60},
            {"id": 4, "group_id": 1, "user_id": 4, "role": "member", "points": 22, "week_points": 18, "month_points": 30},
            {"id": 5, "group_id": 1, "user_id": 5, "role": "member", "points": 16, "week_points": 12, "month_points": 24},
            {"id": 6, "group_id": 1, "user_id": 6, "role": "member", "points": 10, "week_points": 8, "month_points": 15},
            {"id": 7, "group_id": 1, "user_id": 7, "role": "member", "points": 6, "week_points": 4, "month_points": 10},
        ],
        "chores": [
            {
                "id": 1,
                "group_id": 1,
                "created_by": 1,
                "title": "Take out recycling",
                "description": "Bins are by the side door",
                "points": 10,
                "status": "available",
                "assignee_id": None,
                "due": (today + timedelta(days=2)).isoformat(),
                "created_at": _stamp(today, 15),
            },
            {
                "id": 2,
                "group_id": 1,
                "created_by": 1,
                "title": "Vacuum the living room",
                "description": "Move the couch first",
                "points": 15,
                "status": "in_progress",
                "assignee_id": 1,
                "due": (today + timedelta(days=1)).isoformat(),
                "created_at": _stamp(today, 14),
            },
            {
                "id": 3,
                "group_id": 1,
                "created_by": 2,
                "title": "Water the plants",
                "description": "",
                "points": 5,
                "status": "in_progress",
                "assignee_id": 2,
                "due": (today + timedelta(days=3)).isoformat(),
                "created_at": _stamp(today, 13),
            },
            {
                "id": 4,
                "group_id": 1,
                "created_by": 1,
                "title": "Wipe the counters",
                "description": "Kitchen and bathroom",
                "points": 8,
                "status": "available",
                "assignee_id": None,
                "due": (today + timedelta(days=4)).isoformat(),
                "created_at": _stamp(today, 12),
            },
            {
                "id": 5,
                "group_id": 1,
                "created_by": 3,
                "title": "Clean the fridge",
                "description": "Toss anything expired",
                "points": 20,
                "status": "completed",
                "assignee_id": 3,
                "due": (today - timedelta(days=1)).isoformat(),
                "created_at": _stamp(today - timedelta(days=2), 18),
            },
        ],
        "rewards": [
            {"id": 1, "group_id": 1, "created_by": 1, "name": "Free coffee run", "cost": 30, "type": "individual"},
            {"id": 2, "group_id": 1, "created_by": 1, "name": "Movie night pick", "cost": 60, "type": "group"},
            {"id": 3, "group_id": 1, "created_by": 2, "name": "Skip one dish night", "cost": 15, "type": "individual"},
        ],
        "profiles": [],
    }
    return DemoClient(deepcopy(tables))
