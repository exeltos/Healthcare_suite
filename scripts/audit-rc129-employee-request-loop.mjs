import fs from 'node:fs'
const directory=fs.readFileSync(new URL('../src/services/backend/directoryService.js',import.meta.url),'utf8')
const page=fs.readFileSync(new URL('../src/pages/Employees/EmployeeWorkspacePage.jsx',import.meta.url),'utf8')
const required=[
  [directory,"JSON.stringify(current)===JSON.stringify(rows)",'employee mirror equality guard'],
  [directory,"readJsonArray('healthcare-suite.user-accounts',[])",'user cache equality read'],
  [page,"event?.type === EMPLOYEES_EVENT || event?.type === USER_ACCOUNTS_EVENT",'domain-scoped directory refresh'],
  [page,"event?.type === STAFF_VACCINATIONS_EVENT",'vaccination-only refresh'],
]
for(const [text,needle,label] of required){if(!text.includes(needle))throw new Error(`Missing ${label}`)}
console.log('rc.129 employee request-loop audit OK')
