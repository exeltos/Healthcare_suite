import { confirmAction, notifyAction } from '../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { Archive, Pencil } from 'lucide-react'
import { loadMasterData } from '../services/masterDataService'
import { hydrateMasterDataBackend, saveMasterDataBackend } from '../services/backend/configurationBackendService'
import {
  loadPatientSourceConfig,
  savePatientSourceConfig,
} from '../services/patientService'

import { masterDataSections } from '../config/masterDataSections'
import { useI18n } from '../i18n'
import { masterSectionPresentation, studioDisplayValue, studioFieldLabel, studioOptionLabel } from './Studio/studioPresentation'
import { loadDirectoryDepartments, saveDirectoryDepartment } from '../services/backend/directoryService'
import { IS_PRODUCTION } from '../core/runtime'
import { buildInitialMasterData } from './Studio/masterDataPageState'

import './SettingsPage.css'


export default function SettingsPage({ embedded = false }) {
  const { language }=useI18n()
  const L=(el,en)=>language==='en'?en:el
  const [activeSectionId, setActiveSectionId] = useState('departments')
  const [masterData, setMasterData] = useState(buildInitialMasterData)
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({})
  const [patientSourceConfig, setPatientSourceConfig] = useState(
    loadPatientSourceConfig,
  )

  useEffect(()=>{
    let active=true
    Promise.all([hydrateMasterDataBackend(),loadDirectoryDepartments()])
      .then(([libraries,departments])=>{
        if(!active)return
        const visible=Object.fromEntries(masterDataSections.map(section=>[section.id,Array.isArray(libraries[section.id])?libraries[section.id]:section.initialItems]))
        setMasterData({...visible,departments})
      })
      .catch(()=>{})
    return()=>{active=false}
  },[])

  const activeSection = useMemo(
    () =>
      masterDataSections.find(
        (section) => section.id === activeSectionId,
      ),
    [activeSectionId],
  )

  const activePresentation = masterSectionPresentation(activeSection, language)

  const items = masterData[activeSectionId] || []

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(language==='en'?'en':'el-GR')
    if (!query) return items

    return items.filter((item) =>
      Object.values(item).some((value) =>
        String(value || '')
          .toLocaleLowerCase(language==='en'?'en':'el-GR')
          .includes(query),
      ),
    )
  }, [items, search, language])

  async function persist(nextData) {
    setMasterData(nextData)
    await saveMasterDataBackend({ ...loadMasterData(), ...nextData })
  }

  function openNewItem() {
    const emptyValues = Object.fromEntries(
      activeSection.fields.map((field) => [
        field.id,
        field.type === 'select'
          ? field.options?.[0] || ''
          : field.type === 'checkbox'
            ? false
            : '',
      ]),
    )

    setEditingItem(null)
    setFormData(emptyValues)
    setDrawerOpen(true)
  }

  function openEditItem(item) {
    setEditingItem(item)
    setFormData({ ...item })
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditingItem(null)
    setFormData({})
  }

  async function saveItem(event) {
    event.preventDefault()

    const missingRequired = activeSection.fields.some(
      (field) => field.required && !String(formData[field.id] || '').trim(),
    )

    if (missingRequired) {
      notifyAction(L('Συμπληρώστε τα υποχρεωτικά πεδία.','Complete the required fields.'))
      return
    }

    const duplicate = items.find((item) => {
      if (item.id === editingItem?.id) return false
      const sameName = formData.name && String(item.name || '').trim().toLocaleLowerCase() === String(formData.name).trim().toLocaleLowerCase()
      const sameCode = formData.code && String(item.code || '').trim().toLocaleLowerCase() === String(formData.code).trim().toLocaleLowerCase()
      return sameName || sameCode
    })
    if (duplicate) {
      notifyAction(L('Υπάρχει ήδη εγγραφή με την ίδια ονομασία ή κωδικό.','A record with the same name or code already exists.'))
      return
    }

    if(activeSectionId==='departments'){
      try{
        await saveDirectoryDepartment({...formData,id:editingItem?.id})
        const departments=await loadDirectoryDepartments()
        setMasterData(current=>({...current,departments}))
        closeDrawer()
      }catch(error){
        notifyAction(error?.message||L('Δεν ήταν δυνατή η αποθήκευση του τμήματος.','The department could not be saved.'))
      }
      return
    }

    const nextItem = {
      ...formData,
      id: editingItem?.id || `${activeSectionId}-${Date.now()}`,
    }

    const nextItems = editingItem
      ? items.map((item) =>
          item.id === editingItem.id ? nextItem : item,
        )
      : [nextItem, ...items]

    persist({
      ...masterData,
      [activeSectionId]: nextItems,
    })

    closeDrawer()
  }

  async function deleteItem(item) {
    const hasStatusField=activeSection.fields.some(field=>field.id==='status')
    if(hasStatusField){
      if(String(item.status||'')==='Ανενεργό'){
        notifyAction(L('Η εγγραφή είναι ήδη ανενεργή.','This record is already inactive.'))
        return
      }
      if (!confirmAction(L('Να γίνει η εγγραφή ανενεργή; Θα παραμείνει διαθέσιμη στο ιστορικό.','Make this record inactive? It will remain available in history.'))) return
      if(activeSectionId==='departments'){
        try{
          await saveDirectoryDepartment({...item,status:'Ανενεργό'})
          const departments=await loadDirectoryDepartments()
          setMasterData(current=>({...current,departments}))
        }catch(error){
          notifyAction(error?.message||L('Δεν ήταν δυνατή η απενεργοποίηση του τμήματος.','The department could not be deactivated.'))
        }
        return
      }
      await persist({
        ...masterData,
        [activeSectionId]: items.map(row=>row.id===item.id?{...row,status:'Ανενεργό'}:row),
      })
      return
    }

    if (!confirmAction(L('Να διαγραφεί η εγγραφή;','Delete this record?'))) return
    await persist({
      ...masterData,
      [activeSectionId]: items.filter((row) => row.id !== item.id),
    })
  }

  function resetSection() {
    if(IS_PRODUCTION&&activeSectionId==='departments'){
      notifyAction(L('Στο Production mode τα τμήματα δεν επαναφέρονται σε demo αρχικές τιμές.','Production departments cannot be reset to demo defaults.'))
      return
    }
    if (
      !confirmAction(
        L('Να επανέλθει η συγκεκριμένη λίστα στις αρχικές τιμές;','Restore this list to its initial values?'),
      )
    ) {
      return
    }

    persist({
      ...masterData,
      [activeSectionId]: activeSection.initialItems,
    })
  }

  return (
    <section className={`settings-page ${embedded ? 'settings-page--embedded' : ''}`}>
      {!embedded && <div className="settings-page-heading">
        <div>
          <span className="settings-eyebrow">Healthcare Suite</span>
          <h1>{L('Ρυθμίσεις','Settings')}</h1>
          <p>{L('Κεντρική διαχείριση των λιστών που χρησιμοποιούνται σε όλες τις φόρμες.','Central management of lists used throughout the application.')}</p>
        </div>
      </div>}

      <section className="settings-patient-source">
        <div>
          <span>{L('Υβριδική λειτουργία ασθενών','Hybrid patient workflow')}</span>
          <strong>{L('Πηγή λίστας ασθενών','Patient list source')}</strong>
          <p>{L('Επιλέξτε αν οι φόρμες θα χρησιμοποιούν τη βιβλιοθήκη ρυθμίσεων, χειροκίνητους ασθενείς, demo δεδομένα ή όλα μαζί.','Choose whether forms use the settings library, manually entered patients, demo data or a combination.')}</p>
        </div>

        <label>
          <span>{L('Τρόπος λειτουργίας','Mode')}</span>
          <select
            value={patientSourceConfig.sourceMode}
            onChange={(event) => {
              const nextConfig = savePatientSourceConfig({
                ...patientSourceConfig,
                sourceMode: event.target.value,
              })
              setPatientSourceConfig(nextConfig)
            }}
          >
            <option value="Υβριδική">{studioDisplayValue('Υβριδική',language)}</option>
            <option value="Βιβλιοθήκη Ρυθμίσεων">{studioDisplayValue('Βιβλιοθήκη Ρυθμίσεων',language)}</option>
            <option value="Χειροκίνητη Καταχώρηση">{studioDisplayValue('Χειροκίνητη Καταχώρηση',language)}</option>
            {!IS_PRODUCTION&&<option value="Προσωρινή Demo Λίστα">{studioDisplayValue('Προσωρινή Demo Λίστα',language)}</option>}
          </select>
        </label>

        <label className="settings-config-checkbox">
          <input
            type="checkbox"
            checked={patientSourceConfig.allowManualCreation}
            onChange={(event) => {
              const nextConfig = savePatientSourceConfig({
                ...patientSourceConfig,
                allowManualCreation: event.target.checked,
              })
              setPatientSourceConfig(nextConfig)
            }}
          />
          {L('Επιτρέπεται δημιουργία νέου ασθενούς από την υβριδική φόρμα','Allow new patient creation from the hybrid form')}
        </label>
      </section>

      <div className="settings-layout">
        <aside className="settings-menu">
          <div className="settings-menu-header">
            <span>Master Data Center</span>
            <strong>{L('Κεντρικά λεξικά','Central dictionaries')}</strong>
          </div>

          <nav>
            {masterDataSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={
                  activeSectionId === section.id ? 'active' : ''
                }
                onClick={() => {
                  setActiveSectionId(section.id)
                  setSearch('')
                }}
              >
                <span>{section.icon}</span>
                <div>
                  <strong>{masterSectionPresentation(section,language).label}</strong>
                  <small>
                    {(masterData[section.id] || []).length} {L('εγγραφές','records')}
                  </small>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        <main className="settings-content">
          <header className="settings-content-header">
            <div className="settings-section-title">
              <span className="settings-section-icon">
                {activeSection.icon}
              </span>

              <div>
                <span>Master Data</span>
                <h2>{activePresentation.label}</h2>
                <p>{activePresentation.description}</p>
              </div>
            </div>

            <button
              className="settings-primary-button"
              type="button"
              onClick={openNewItem}
            >
              {L('＋ Νέα εγγραφή','＋ New record')}
            </button>
          </header>

          <div className="settings-toolbar">
            <label className="settings-search">
              <span>⌕</span>
              <input
                value={search}
                placeholder={language==='en'
                  ? `Search ${activePresentation.label.toLocaleLowerCase('en')}...`
                  : `Αναζήτηση σε ${activePresentation.label.toLocaleLowerCase('el-GR')}...`}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            {!IS_PRODUCTION&&<button type="button" onClick={resetSection}>
              {L('Επαναφορά αρχικών τιμών','Restore defaults')}
            </button>}
          </div>

          <div className="settings-table-card">
            <div className="settings-table-wrapper">
              <table>
                <thead>
                  <tr>
                    {activeSection.columns.map((column) => {
                      const field = activeSection.fields.find(
                        (item) => item.id === column,
                      )

                      return (
                        <th key={column}>
                          {field ? studioFieldLabel(field,language) : column}
                        </th>
                      )
                    })}

                    <th>{L('Ενέργειες','Actions')}</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id}>
                      {activeSection.columns.map((column) => (
                        <td key={column}>
                          {column === 'status' ? (
                            <span
                              className={`settings-status ${
                                item[column] === 'Ενεργό'
                                  ? 'active'
                                  : 'inactive'
                              }`}
                            >
                              {studioDisplayValue(item[column],language)}
                            </span>
                          ) : column === 'resistance' &&
                            item[column] ? (
                            <span className="settings-risk">
                              {item[column]}
                            </span>
                          ) : (
                            studioDisplayValue(item[column],language) || '—'
                          )}
                        </td>
                      ))}

                      <td>
                        <div className="settings-row-actions">
                          <button
                            className="icon-action"
                            type="button"
                            title={L('Επεξεργασία','Edit')}
                            aria-label={L('Επεξεργασία','Edit')}
                            onClick={() => openEditItem(item)}
                          >
                            <Pencil size={16} aria-hidden="true" />
                          </button>

                          <button
                            className="delete icon-action"
                            type="button"
                            title={activeSection.fields.some(field=>field.id==='status')?L('Απενεργοποίηση','Deactivate'):L('Διαγραφή','Delete')}
                            aria-label={activeSection.fields.some(field=>field.id==='status')?L('Απενεργοποίηση','Deactivate'):L('Διαγραφή','Delete')}
                            onClick={() => deleteItem(item)}
                          >
                            <Archive size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td
                        className="settings-empty"
                        colSpan={activeSection.columns.length + 1}
                      >
                        {L('Δεν βρέθηκαν εγγραφές.','No records found.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {drawerOpen && (
        <div
          className="settings-drawer-backdrop"
          onMouseDown={closeDrawer}
        >
          <aside
            className="settings-drawer"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>{activePresentation.label}</span>
                <h3>
                  {editingItem ? L('Επεξεργασία εγγραφής','Edit record') : L('Νέα εγγραφή','New record')}
                </h3>
              </div>

              <button type="button" onClick={closeDrawer}>
                ×
              </button>
            </header>

            <form onSubmit={saveItem}>
              <div className="settings-form-fields">
                {activeSection.fields.map((field) => (
                  <label key={field.id}>
                    <span>
                      {studioFieldLabel(field,language)}
                      {field.required ? ' *' : ''}
                    </span>

                    {field.type === 'select' ? (
                      <select
                        value={formData[field.id] || ''}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            [field.id]: event.target.value,
                          }))
                        }
                      >
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {studioOptionLabel(option,language) || '—'}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <span className="settings-checkbox-field">
                        <input
                          type="checkbox"
                          checked={Boolean(formData[field.id])}
                          onChange={(event) =>
                            setFormData((current) => ({
                              ...current,
                              [field.id]: event.target.checked,
                            }))
                          }
                        />
                        <span>{formData[field.id]?L('Ναι','Yes'):L('Όχι','No')}</span>
                      </span>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        step={field.type === 'number' ? 'any' : undefined}
                        value={formData[field.id] ?? ''}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            [field.id]: field.type === 'number' ? event.target.value : event.target.value,
                          }))
                        }
                      />
                    )}
                  </label>
                ))}
              </div>

              <footer>
                <button type="button" onClick={closeDrawer}>
                  {L('Ακύρωση','Cancel')}
                </button>

                <button className="primary" type="submit">
                  {L('Αποθήκευση','Save')}
                </button>
              </footer>
            </form>
          </aside>
        </div>
      )}


    </section>
  )
}