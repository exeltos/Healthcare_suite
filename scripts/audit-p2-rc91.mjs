import fs from 'node:fs'
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const indicators=read('src/services/indicatorsService.js')
const analytics=read('src/components/analytics/FullReportPanel.jsx')
const notifications=read('src/components/layout/NotificationCenter.jsx')
const governance=read('src/pages/Studio/GovernancePage.jsx')
const checks=[
 ['Restricted antimicrobial approval indicator exists',indicators.includes("id:'restricted-antibiotic-approval'")&&indicators.includes('restrictedAntibioticApprovalMetric')],
 ['Restricted antimicrobial pending indicator exists',indicators.includes("id:'restricted-antibiotic-pending'")&&indicators.includes('restrictedAntibioticPendingMetric')],
 ['Stewardship indicators use promoted-antibiotic source',indicators.includes('loadPromotedAntibiotics')],
 ['Analytics includes stewardship indicators',analytics.includes("'restricted-antibiotic-approval','restricted-antibiotic-pending'")],
 ['Notification center is bilingual',notifications.includes("useI18n")&&notifications.includes("L('Ειδοποιήσεις','Notifications')")],
 ['Notification policy escalation is visible',notifications.includes('escalation_after_hours')&&notifications.includes("L('Κλιμακωμένη','Escalated')")],
 ['Governance page has readiness summary',governance.includes('const readiness=useMemo')&&governance.includes('gov-readiness')],
 ['Governance readiness covers continuity and privacy',governance.includes('continuityReady')&&governance.includes('privacyReady')&&governance.includes('recoveryRecent')],
]
let failed=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`\nP2 rc.91 audit: ${checks.length-failed}/${checks.length} passed`)
if(failed)process.exit(1)
