# Healthcare Suite v0.12.0-rc.7 — Clean Data / Demo Isolation

- Normal sign-in starts with an empty operational workspace.
- Demo sign-in clears operational data first and then generates Demo-only records.
- Reference/master libraries are preserved.
- Legacy operational `patients-library` data is purged and patients no longer sync into master libraries.
- Static patient and patient-case mock files were removed.
- Production/Supabase startup still purges browser operational cache before mount.
- Production, seed-isolation, architecture, navigation, security, clinical, quality, organization and management audits pass.
- The final syntax audit could not be executed in this sandbox because the dev dependency `@babel/parser` was not available after package installation timed out; earlier import/production audits completed successfully.
