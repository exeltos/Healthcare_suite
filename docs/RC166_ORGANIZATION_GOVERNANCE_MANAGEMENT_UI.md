# Healthcare Suite rc.166 — Organization Governance & Management UI

- Committees now use dedicated tabs: Details, Members, Meetings, Decisions & Actions, Files & Notes.
- Committee membership is permanent/current-state data; every finalized meeting stores an attendance snapshot so later membership edits never rewrite historical presence/absence.
- Membership changes are recorded in a lightweight membership history.
- Committees without meeting history can be deleted; committees with history are archived instead.
- Training records expose Delete only before governed attendance/completion; completed/history-bearing records are archived.
- Controlled documents expose Delete only while Draft; governed versions use Retire to preserve version history.
- Management Center master-data editor now uses the common Drawer, FormField/FormGrid and FormActions components.
- Studio configuration delete actions use the canonical destructive slot in FormActions.
