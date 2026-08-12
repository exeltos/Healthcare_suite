export const designTokens = [
  ['Primary','--primary'],['Primary dark','--primary-dark'],['Surface','--surface'],['Background','--background'],['Text','--text'],['Muted','--muted'],['Border','--border'],['Success','--success'],['Warning','--warning'],['Danger','--danger']
]

export const componentRegistry = [
  { group:'Navigation', items:['PageHeader','BackLink','Sidebar','Tabs'] },
  { group:'Actions', items:['Button','IconButton','FormActions'] },
  { group:'Data display', items:['Card','StatCard','Badge','DataTable','Pagination','EmptyState','ListWorkspace'] },
  { group:'Forms', items:['FormField','FormGrid','FormSection','LibraryField','AttachmentManager','HybridPatientSelector','HybridMultiSelector'] },
  { group:'Overlays', items:['Drawer','Dialog','EntryFormChrome','WorkspaceShell'] },
  { group:'Templates', items:['Dashboard','Registry','Center','Wizard','Studio','Detail'] },
]

export const pageAudit = [
  ['Έλεγχοι','Registry','Κοινό header, KPIs, filters, drawer'],
  ['Πρόληψη & Συμμόρφωση','Dashboard / Registry','Κοινό header, KPIs, actions'],
  ['Ποιότητα & Βελτίωση','Center / Registry','Κοινό header, tabs, forms'],
  ['Οργάνωση','Dashboard / Registry','Κοινό header, forms, drawer'],
  ['Limoxis Studio','Studio','Κοινό header, back link, tool cards'],
]
