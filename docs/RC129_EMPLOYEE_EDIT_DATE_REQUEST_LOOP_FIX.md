# rc.129 — Employee edit, date controls and Supabase request-loop fix

- Restored shared native `DateField` styling/behavior (`type=date`) so date fields use the same core control geometry as other inputs.
- Removed duplicate required markers from employee-health date labels.
- Prevented Supabase read-through mirrors from re-emitting employee/user events when cached data are unchanged. This breaks the recursive `employees` / `user_profiles` refresh loop that could exhaust browser request resources.
- Employee profile background hydration no longer closes an edit session after the user has pressed Edit.
- Existing staff, Supabase-readiness and production-persistence static audits remain green.
