import fs from'node:fs'
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const d=read('src/pages/Organization/DocumentsPage.jsx')
const h=read('src/components/help/helpContentAdmin.js')
const checks=[
 ['Approval captures preparer',d.includes("const preparer=String(form.preparedBy||'').trim()")],
 ['Approval captures submitter',d.includes("const submitter=String(form.submittedBy||'').trim()")],
 ['Self-approval by preparer is blocked',d.includes('actor===preparer')],
 ['Self-approval by submitter is blocked',d.includes('actor===submitter')],
 ['SoD failure is explained bilingually',d.includes('διαχωρισμός καθηκόντων')&&d.includes('segregation of duties')],
 ['Approved version still captures approver/time',d.includes('approvedBy:actor')&&d.includes('approvedAt:new Date().toISOString()')],
 ['Approved versions remain locked',d.includes('isLocked')&&d.includes('Create a new version to make changes')],
 ['Help Center documents controlled-document SoD',h.includes('ο συντάκτης/υποβάλλων δεν μπορεί να εγκρίνει')&&h.includes('preparer/submitter cannot approve')],
]
let f=0;for(const[n,ok]of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)f++}
console.log(`\nP2 rc.96 document SoD audit: ${checks.length-f}/${checks.length} passed`);if(f)process.exit(1)
