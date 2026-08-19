# RC133 — Water / Surfaces stability fix

- Fixed recursive Supabase refresh caused by laboratory source hydration emitting its own domain events.
- Notification escalation policies are no longer re-fetched for every patient/laboratory data event.
- DateField uses the canonical `core-control` visual path, matching text/select controls.
- Water collection defaults to `Νερό δικτύου`; surfaces default to `Επίχρισμα επιφάνειας`.
- Laboratory-owned fields remain read-only outside Laboratory/Admin and protected by the RC132 database migration.
