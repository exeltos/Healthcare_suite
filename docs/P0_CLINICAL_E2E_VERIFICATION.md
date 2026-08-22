# P0 Clinical E2E Verification — Healthcare Suite

Use this matrix on a dedicated Supabase test organization before v1.0. Do not use real patient identifiers.

## Core scenario
1. Create Patient A and start a surveillance case.
2. Add a patient sample from the Patient workflow; verify the same record appears in Laboratory.
3. Validate the sample as positive; verify exactly one infection is linked to the same patient, sample and surveillance case.
4. Create a recheck from the positive sample; verify `parent_sample_id`, `root_sample_id` and the same surveillance case are preserved.
5. Make the recheck positive; verify no duplicate infection is created.
6. Correct the original positive result to pending/negative; verify an auto-created infection is retracted/cancelled traceably rather than silently deleted.
7. Correct it back to positive; verify the same infection can be reactivated instead of creating a duplicate.
8. Start isolation linked to the surveillance case. Attempt an end date before the start date and confirm the UI rejects it.
9. Complete the surveillance with date + outcome; verify the case closes, linked active infection completes and linked active isolation ends.
10. Return to the patient list and reopen the patient; verify historical evidence remains visible and no closed-case sample drives an active badge.

## Identity and relationship guards
- Try to create another patient in the same organization with the same AMKA: must fail.
- Try to link a sample/infection/isolation to a patient or surveillance case from another organization using a crafted request: must fail at the database/RLS/trigger boundary.
- Try to attach a recheck to a surveillance case belonging to another patient: must fail.

## Deletion / correction guards
- Delete a purely auto-created source sample with no clinical enrichment: orphaned auto-created entities may be cleaned up according to workflow rules.
- Delete a source sample after therapies/assessment/isolation have enriched the case: the clinical episode must be preserved and retain traceable source-deletion metadata.

## Pass criteria
All UI checks, database invariants and cross-module reflections must pass in both EL and EN where the action is exposed. Capture the organization ID, test user role, timestamp and evidence screenshots/log identifiers for the release record.
