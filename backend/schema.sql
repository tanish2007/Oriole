-- Columns the chore, reward, and leaderboard screens use
-- beyond the original groups, group_members, chores, and rewards tables.
-- Safe to run more than once.

alter table chores add column if not exists assignee_id bigint;
alter table chores add column if not exists due date;

alter table group_members add column if not exists points integer not null default 0;
alter table group_members add column if not exists week_points integer not null default 0;
alter table group_members add column if not exists month_points integer not null default 0;
