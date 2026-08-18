import fs from 'node:fs'
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const launcher=read('src/components/launcher/NewEntryLauncher.jsx')
const chrome=read('src/components/forms/EntryFormChrome/EntryFormChrome.jsx')
const checks=[
 ['WHO footer uses explicit click handler',launcher.includes('onPrimary={() => saveEntry()}')],
 ['WHO footer no longer depends on form attribute submit',launcher.includes('primaryType="button"')&&!launcher.includes('form="hand-hygiene-entry-form"')],
 ['Save handler accepts direct invocation',launcher.includes('event?.preventDefault?.()')],
 ['Successful WHO save closes launcher',launcher.includes("if (isWho) {")&&launcher.includes('resetAndClose()')],
 ['WHO save has double-submit protection',launcher.includes('if (savingEntry) return')&&launcher.includes('setSavingEntry(true)')],
 ['Entry footer forwards saving state',chrome.includes('saving = false')&&chrome.includes('saving={saving}')],
]
let failed=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`\nrc.86 WHO save-close audit: ${checks.length-failed}/${checks.length} passed`)
if(failed)process.exit(1)
