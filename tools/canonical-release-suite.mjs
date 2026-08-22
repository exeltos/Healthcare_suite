import { spawnSync } from 'node:child_process'

const groups = [
  ['Architecture & UI', [
    'tools/check-imports.mjs',
    'tools/navigation-audit.mjs',
    'tools/architecture-structure-audit.mjs',
    'tools/integration-readiness-audit.mjs',
    'tools/ui-audit.mjs',
    'tools/production-audit.mjs',
    'tools/consistency-audit.mjs',
    'tools/design-system-audit.mjs',
    'tools/workflow-stability-audit.mjs',
    'tools/i18n-audit.mjs',
    'tools/release-candidate-audit.mjs',
  ]],
  ['Security & tenancy', [
    'tools/security-access-audit.mjs',
    'tools/tenant-isolation-audit.mjs',
    'tools/management-center-integrity-audit.mjs',
  ]],
  ['Clinical & operational integrity', [
    'tools/clinical-integrity-audit.mjs',
    'tools/clinical-scenario-contract-audit.mjs',
    'tools/staff-integrity-audit.mjs',
    'tools/quality-integrity-audit.mjs',
    'tools/organization-integrity-audit.mjs',
    'scripts/audit-clinical-write-verification.mjs',
    'scripts/audit-production-persistence.mjs',
    'scripts/audit-production-fail-closed.mjs',
    'scripts/audit-production-read-purity.mjs',
    'scripts/audit-form-action-consistency.mjs',
  ]],
  ['Supabase & release safety', [
    'tools/migration-schema-audit.mjs',
    'tools/production-clean-data-audit.mjs',
    'tools/production-seed-isolation-audit.mjs',
    'scripts/audit-deployment-readiness.mjs',
    'scripts/audit-supabase-readiness.mjs',
    'scripts/audit-governance-visibility.mjs',
    'scripts/audit-p2-final-readiness.mjs',
    'scripts/audit-hospital-e2e-readiness.mjs',
  ]],
]

let passed = 0
let failed = 0
const results = []

console.log('Healthcare Suite — Canonical Static Release Suite')
console.log('==================================================')
for (const [group, scripts] of groups) {
  console.log(`\n## ${group}`)
  for (const script of scripts) {
    process.stdout.write(`\n[RUN] ${script}\n`)
    const r = spawnSync(process.execPath, [script], { stdio: 'inherit', env: process.env })
    const ok = r.status === 0
    results.push({ group, script, ok })
    if (ok) passed += 1
    else {
      failed += 1
      console.error(`\n[FAIL] ${script}`)
      break
    }
  }
  if (failed) break
}

console.log('\n==================================================')
console.log(`Canonical release suite: ${passed}/${passed + failed} checks passed.`)
if (failed) {
  console.error('RELEASE STATIC GATE: FAILED')
  process.exit(1)
}
console.log('RELEASE STATIC GATE: PASSED')
