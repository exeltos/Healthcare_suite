import { useMemo, useState } from 'react'
import {
  ActionBar,
  Alert,
  Badge,
  BulkActions,
  Button,
  Card,
  DataTable,
  EmptyState,
  FilterBar,
  FilterGroup,
  FormGrid,
  PageChrome,
  PageHeader,
  PageSection,
  Pagination,
  SelectField,
  StatCard,
  TextAreaField,
  TextField,
} from '../../components/core'
import './CoreShowcasePage.css'

const allRows = [
  { id: 1, name: 'Δείγμα ασθενούς', department: 'ΜΕΘ', status: 'Εκκρεμεί' },
  { id: 2, name: 'Έλεγχος υγιεινής χεριών', department: 'Χειρουργείο', status: 'Ολοκληρώθηκε' },
  { id: 3, name: 'Περιβαλλοντικό δείγμα', department: 'Αποστείρωση', status: 'Σε εξέλιξη' },
]

export default function CoreShowcasePage() {
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('')
  const [selected, setSelected] = useState([])
  const [page, setPage] = useState(1)

  const rows = useMemo(() => allRows.filter((row) => {
    const matchesQuery = row.name.toLocaleLowerCase('el').includes(query.toLocaleLowerCase('el'))
    const matchesDepartment = !department || row.department === department
    return matchesQuery && matchesDepartment
  }), [query, department])

  const activeCount = Number(Boolean(query)) + Number(Boolean(department))

  return (
    <PageChrome
      header={(
        <PageHeader
          eyebrow="Healthcare Suite Core"
          title="Design System"
          description="Η μοναδική πηγή αλήθειας για τα κοινά components, τα states και τους κανόνες αλληλεπίδρασης."
          actions={<ActionBar create={{ onClick: () => {} }} exportAction={{ onClick: () => {} }} />}
        />
      )}
    >
      <Alert tone="info" title="Κανόνας Core">
        Κάθε νέα οθόνη χρησιμοποιεί τα components αυτής της σελίδας. Δεν δημιουργούμε δεύτερο Card, Button, FilterBar, ActionBar ή DataTable.
      </Alert>

      <PageSection title="Ενέργειες" description="Μία κοινή σειρά ενεργειών για όλες τις λίστες και τις εγγραφές.">
        <Card className="core-showcase-surface">
          <ActionBar
            create={{ onClick: () => {} }}
            edit={{ onClick: () => {} }}
            duplicate={{ onClick: () => {} }}
            exportAction={{ onClick: () => {} }}
            print={{ onClick: () => {} }}
            remove={{ onClick: () => {} }}
            more={{ onClick: () => {} }}
          />
        </Card>
      </PageSection>

      <PageSection title="Κουμπιά και καταστάσεις">
        <Card className="core-showcase-surface core-showcase-row">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
          <Badge tone="success">Ενεργό</Badge>
          <Badge tone="warning">Εκκρεμεί</Badge>
          <Badge tone="danger">Κρίσιμο</Badge>
        </Card>
      </PageSection>

      <PageSection title="KPI Cards">
        <div className="core-showcase-stats">
          <StatCard label="Ενεργές εγγραφές" value="128" subtitle="Τρέχουσα περίοδος" />
          <StatCard label="Εκκρεμότητες" value="12" tone="warning" subtitle="Χρειάζονται έλεγχο" />
          <StatCard label="Κρίσιμα" value="3" tone="danger" subtitle="Άμεση προσοχή" />
          <StatCard label="Ολοκληρωμένα" value="94" tone="success" subtitle="Τελευταίες 30 ημέρες" />
        </div>
      </PageSection>

      <PageSection title="Φίλτρα, πίνακας και μαζικές ενέργειες">
        <div className="core-showcase-stack">
          <FilterBar
            searchValue={query}
            onSearchChange={setQuery}
            searchPlaceholder="Αναζήτηση εγγραφής…"
            activeCount={activeCount}
            onClear={() => { setQuery(''); setDepartment('') }}
            onMoreFilters={() => {}}
          >
            <FilterGroup label="Τμήμα">
              <select value={department} onChange={(event) => setDepartment(event.target.value)}>
                <option value="">Όλα τα τμήματα</option>
                <option value="ΜΕΘ">ΜΕΘ</option>
                <option value="Χειρουργείο">Χειρουργείο</option>
                <option value="Αποστείρωση">Αποστείρωση</option>
              </select>
            </FilterGroup>
          </FilterBar>

          <BulkActions count={selected.length} onClear={() => setSelected([])}>
            <Button size="sm" variant="secondary">Εξαγωγή</Button>
            <Button size="sm" variant="danger">Διαγραφή</Button>
          </BulkActions>

          <DataTable
            rows={rows}
            selectable
            selectedKeys={selected}
            onSelectionChange={setSelected}
            onRowClick={() => {}}
            columns={[
              { key: 'name', label: 'Εγγραφή', sortable: true },
              { key: 'department', label: 'Τμήμα' },
              { key: 'status', label: 'Κατάσταση', render: (row) => <Badge tone={row.status === 'Ολοκληρώθηκε' ? 'success' : 'warning'}>{row.status}</Badge> },
            ]}
          />
          <Pagination page={page} totalPages={5} onPageChange={setPage} />
        </div>
      </PageSection>

      <PageSection title="Πεδία φόρμας">
        <Card className="core-showcase-surface">
          <FormGrid columns={2}>
            <TextField label="Τίτλος" placeholder="Συμπληρώστε τίτλο" required />
            <SelectField label="Κατάσταση" options={['Πρόχειρο', 'Ενεργό', 'Ολοκληρωμένο']} />
            <TextAreaField label="Περιγραφή" placeholder="Περιγραφή εγγραφής" fullWidth />
          </FormGrid>
        </Card>
      </PageSection>

      <PageSection title="Empty state">
        <Card className="core-showcase-surface">
          <EmptyState title="Δεν υπάρχουν εγγραφές" description="Δημιουργήστε την πρώτη εγγραφή για να ξεκινήσετε." action={<Button>Νέα εγγραφή</Button>} />
        </Card>
      </PageSection>
    </PageChrome>
  )
}
