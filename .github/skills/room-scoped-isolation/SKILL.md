---
name: room-scoped-isolation
description: "Use when creating, editing, reviewing, or debugging any room, chat, message, member, file, calendar, announcement, notification, realtime event, or room-related API/UI behavior. Enforce strict room isolation so data and actions affect only the selected room and are never visible or applied in other rooms."
argument-hint: "Room-scoped change to implement or review"
---

# Room-Scoped Isolation

## Purpose

This project treats each room as an isolated boundary. Any room-related operation must be scoped to one specific room, including messages, members, files, calendars, announcements, notifications, moderation actions, permissions, and realtime updates.

Never assume that selecting a room in the UI is sufficient. Enforce the boundary at every layer:

- **Server:** authenticate the actor, authorize membership/access to the target room, and scope every read, write, update, delete, broadcast, and subscription by `roomId`.
- **Database:** filter queries and mutations by the target room identifier. Do not rely on a client-provided room identifier without validating it.
- **Frontend:** keep room data, loading/error states, caches, dialogs, and optimistic updates keyed by room. Switching rooms must not display or mutate another room's state.
- **Realtime/events:** publish to and subscribe from a room-specific channel or recipient set. Never use a global channel for room-private data.

## Required Procedure

1. Identify the target room context and trace the complete flow through route/API, authorization, database, frontend state, and realtime behavior.
2. Require an explicit `roomId` (or the repository's established room identifier) for every room-scoped operation. Do not use a process-wide, module-wide, shared singleton, or last-selected-room value as an implicit fallback.
3. On the server, derive or validate the target room, authenticate the actor, and verify the actor can access that room before performing work.
4. Add the room predicate to every relevant database read and mutation. Updates and deletes must include the room predicate in the same operation, not only in a prior lookup.
5. Return or emit only records and events belonging to the target room. A message sent to Room A must be visible only to Room A; it must not be returned, cached, broadcast, or rendered in Room B.
6. In the frontend, key queries, caches, component state, subscriptions, and optimistic updates by room. Clear or replace room-specific state when changing rooms, and ignore stale responses/events from a previous room.
7. For any intentional cross-room or global behavior, stop and make the scope explicit in the implementation and user-facing requirements; do not silently broaden room behavior.
8. Add or update tests that exercise at least two rooms and verify both positive and negative cases:
   - Room A can read and mutate its own data.
   - Room B cannot read, mutate, or receive Room A's data/events.
   - Switching from Room A to Room B does not retain Room A's visible or actionable state.
   - Unauthorized or missing room context fails explicitly using the project's standard error handling.
9. Review adjacent room-related surfaces for the same leak, including list endpoints, counts, search, pagination, file downloads, notifications, websocket/SSE listeners, and admin/officer/student role paths.

## Implementation Rules

- Prefer existing room-scoping helpers, middleware, API clients, query conventions, and state-management patterns.
- Validate identifiers and authorization on the server even when the UI already filtered the room.
- Do not solve isolation by filtering only during rendering; prevent cross-room data from entering the client state in the first place.
- Do not broadcast room-private events globally and expect clients to discard them.
- Do not reuse a mutable response, cache key, subscription, or store entry across rooms unless its key includes the room identifier.
- Preserve existing behavior within the selected room while preventing cross-room effects.
- Surface authorization, missing-context, and persistence errors explicitly. Do not silently fall back to a default room or return success-shaped results.

## Completion Checklist

- [ ] Every room-related entry point has an explicit and validated room context.
- [ ] Authorization checks access to that exact room.
- [ ] Every database read and mutation is room-filtered.
- [ ] Client caches/state and realtime channels are room-keyed.
- [ ] Room switching cannot show or update stale data from another room.
- [ ] At least two-room isolation tests cover reads, writes, and events where applicable.
- [ ] No unrelated global behavior was introduced.
