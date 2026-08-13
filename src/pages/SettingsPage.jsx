import { confirmAction, notifyAction } from '../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { loadMasterData } from '../services/masterDataService'
import { hydrateMasterDataBackend, saveMasterDataBackend } from '../services/backend/configurationBackendService'
import {
  loadPatientSourceConfig,
  savePatientSourceConfig,
} from '../services/patientService'

import { masterDataSections } from '../config/masterDataSections'
import { useI18n } from '../i18n'
import { masterSectionPresentation, studioDisplayValue, studioFieldLabel, studioOptionLabel } from './Studio/studioPresentation'
import { deleteDirectoryDepartment, loadDirectoryDepartments, saveDirectoryDepartment } from '../services/backend/directoryService'
import { IS_PRODUCTION } from '../core/runtime'
import { buildInitialMasterData } from './Studio/masterDataPageState'


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

  async function deleteItem(itemId) {
    if (!confirmAction(L('Να διαγραφεί η εγγραφή;','Delete this record?'))) return

    if(activeSectionId==='departments'){
      try{
        await deleteDirectoryDepartment(itemId)
        const departments=await loadDirectoryDepartments()
        setMasterData(current=>({...current,departments}))
      }catch(error){
        notifyAction(error?.message||L('Δεν ήταν δυνατή η διαγραφή του τμήματος.','The department could not be deleted.'))
      }
      return
    }

    persist({
      ...masterData,
      [activeSectionId]: items.filter((item) => item.id !== itemId),
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
            <option value="Προσωρινή Demo Λίστα">{studioDisplayValue('Προσωρινή Demo Λίστα',language)}</option>
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

            <button type="button" onClick={resetSection} disabled={IS_PRODUCTION&&activeSectionId==='departments'}>
              {IS_PRODUCTION&&activeSectionId==='departments'?L('Διαχείριση από Supabase','Managed by Supabase'):L('Επαναφορά αρχικών τιμών','Restore defaults')}
            </button>
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
                            title={L('Διαγραφή','Delete')}
                            aria-label={L('Διαγραφή','Delete')}
                            onClick={() => deleteItem(item.id)}
                          >
                            <Trash2 size={16} aria-hidden="true" />
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
                    ) : (
                      <input
                        value={formData[field.id] || ''}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            [field.id]: event.target.value,
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

      <style>{`
        .settings-page {
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 26px;
          overflow: hidden;
        }

        .settings-page-heading {
          flex: 0 0 auto;
        }

        .settings-page-heading h1 {
          margin: 3px 0 0;
        }

        .settings-page-heading p {
          margin: 6px 0 0;
          color: var(--muted);
        }

        .settings-eyebrow {
          color: var(--primary);
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .settings-patient-source {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px auto;
          align-items: center;
          gap: 16px;
          padding: 15px 17px;
          border: 1px solid var(--border);
          border-radius: 13px;
          background: #ffffff;
          box-shadow: var(--shadow);
        }

        .settings-patient-source > div {
          display: grid;
          gap: 4px;
        }

        .settings-patient-source > div > span {
          color: var(--primary);
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .settings-patient-source p {
          margin: 0;
          color: var(--muted);
          font-size: 0.72rem;
        }

        .settings-patient-source label {
          display: grid;
          gap: 5px;
          color: var(--muted);
          font-size: 0.7rem;
          font-weight: 700;
        }

        .settings-patient-source select {
          height: 41px;
          padding: 0 10px;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: #ffffff;
        }

        .settings-config-checkbox {
          grid-template-columns: auto 1fr !important;
          align-items: center;
          gap: 8px !important;
          color: var(--text) !important;
        }

        .settings-config-checkbox input {
          width: 17px;
          height: 17px;
          accent-color: var(--primary);
        }

        .settings-layout {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: 270px minmax(0, 1fr);
          overflow: hidden;
          border: var(--surface-border);
          border-radius: var(--surface-radius);
          background: var(--surface);
          box-shadow: var(--surface-shadow);
        }

        .settings-menu {
          min-height: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border);
          background: #f7fafb;
          overflow: hidden;
        }

        .settings-menu-header {
          display: grid;
          gap: 4px;
          padding: 18px;
          border-bottom: 1px solid var(--border);
        }

        .settings-menu-header span {
          color: var(--primary);
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .settings-menu nav {
          flex: 1 1 0;
          height: 0;
          min-height: 0;
          display: grid;
          align-content: start;
          gap: 7px;
          padding: 12px 10px 18px;
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          scrollbar-gutter: stable;
        }

        .settings-menu nav::-webkit-scrollbar {
          width: 9px;
        }

        .settings-menu nav::-webkit-scrollbar-thumb {
          border: 2px solid #f7fafb;
          border-radius: 999px;
          background: #c8dadd;
        }

        .settings-menu nav button {
          min-height: var(--menu-item-height);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: var(--menu-item-padding);
          border: 1px solid transparent;
          border-radius: var(--menu-item-radius);
          color: #42575f;
          background: transparent;
          text-align: left;
        }

        .settings-menu nav button > span {
          width: 30px;
          font-size: 1.1rem;
          text-align: center;
        }

        .settings-menu nav button > div {
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .settings-menu nav button small {
          color: var(--muted);
          font-size: 0.67rem;
        }

        .settings-menu nav button:hover,
        .settings-menu nav button.active {
          color: var(--primary);
          border-color: rgba(11, 107, 117, 0.14);
          background: var(--primary-soft);
        }

        .settings-content {
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .settings-content-header {
          flex: 0 0 auto;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding: 20px;
          border-bottom: 1px solid var(--border);
        }

        .settings-section-title {
          display: flex;
          align-items: flex-start;
          gap: 13px;
        }

        .settings-section-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 12px;
          background: var(--primary-soft);
          font-size: 1.2rem;
        }

        .settings-section-title > div {
          display: grid;
          gap: 4px;
        }

        .settings-section-title > div > span {
          color: var(--primary);
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .settings-section-title h2,
        .settings-section-title p {
          margin: 0;
        }

        .settings-section-title p {
          color: var(--muted);
          font-size: 0.78rem;
        }

        .settings-primary-button {
          min-height: 42px;
          padding: 0 15px;
          border: 1px solid var(--primary);
          border-radius: 10px;
          color: #ffffff;
          background: var(--primary);
          font-weight: 750;
        }

        .settings-toolbar {
          flex: 0 0 auto;
          display: grid;
          grid-template-columns: minmax(260px, 560px) auto;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          background: #ffffff;
        }

        .settings-search {
          width: 100%;
          min-width: 0;
          min-height: 42px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 12px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: #ffffff;
        }

        .settings-search input {
          width: 100%;
          min-width: 0;
          height: 38px;
          padding: 0;
          border: 0 !important;
          border-radius: 0;
          outline: 0;
          background: transparent !important;
          box-shadow: none !important;
        }

        .settings-search input:focus,
        .settings-search input:hover {
          border: 0 !important;
          box-shadow: none !important;
        }

        .settings-toolbar > button {
          min-height: 38px;
          padding: 0 12px;
          border: 1px solid var(--border);
          border-radius: 9px;
          color: var(--muted);
          background: #ffffff;
          font-weight: 700;
        }

        .settings-table-card {
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        .settings-table-wrapper {
          width: 100%;
          height: 100%;
          min-width: 0;
          min-height: 0;
          overflow-y: auto;
          overflow-x: auto;
          overscroll-behavior: contain;
          scrollbar-gutter: stable;
        }

        .settings-table-wrapper table {
          width: 100%;
          min-width: 0;
          table-layout: auto;
          border-collapse: collapse;
          white-space: normal;
        }

        .settings-table-wrapper th,
        .settings-table-wrapper td {
          max-width: 320px;
          padding: 12px 14px;
          border-bottom: 1px solid #edf2f3;
          text-align: left;
          vertical-align: middle;
          font-size: 0.78rem;
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .settings-table-wrapper th:last-child,
        .settings-table-wrapper td:last-child {
          width: 150px;
          min-width: 150px;
          white-space: nowrap;
        }

        .settings-table-wrapper th {
          position: sticky;
          top: 0;
          z-index: 1;
          color: var(--muted);
          background: #f7fafb;
          font-size: 0.68rem;
          text-transform: uppercase;
        }

        .settings-status,
        .settings-risk {
          min-height: 26px;
          display: inline-flex;
          align-items: center;
          padding: 0 8px;
          border-radius: 999px;
          font-size: 0.67rem;
          font-weight: 800;
        }

        .settings-status.active {
          color: #176d4a;
          background: #e7f6ef;
        }

        .settings-status.inactive {
          color: #6f7d82;
          background: #edf2f3;
        }

        .settings-risk {
          color: #a32f3d;
          background: #fdebed;
        }

        .settings-row-actions {
          display: flex;
          gap: 10px;
        }

        .settings-row-actions button {
          padding: 0;
          border: 0;
          color: var(--primary);
          background: transparent;
          font-weight: 750;
        }


        .settings-row-actions button.icon-action {
          width: 34px;
          height: 34px;
          padding: 0;
          display: inline-grid;
          place-items: center;
          border-radius: 9px;
        }

        .settings-row-actions button.delete {
          color: #b43b48;
        }

        .settings-empty {
          padding: 34px !important;
          color: var(--muted);
          text-align: center !important;
        }

        .settings-drawer-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1500;
          display: flex;
          justify-content: flex-end;
          background: rgba(13, 31, 37, 0.48);
        }

        .settings-drawer {
          width: min(520px, 96vw);
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          box-shadow: -20px 0 60px rgba(13, 31, 37, 0.22);
        }

        .settings-drawer > header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 20px;
          border-bottom: 1px solid var(--border);
        }

        .settings-drawer > header span {
          color: var(--primary);
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .settings-drawer > header h3 {
          margin: 5px 0 0;
        }

        .settings-drawer > header button {
          width: 40px;
          height: 40px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: #ffffff;
          font-size: 1.3rem;
        }

        .settings-drawer form {
          min-height: 0;
          display: flex;
          flex: 1;
          flex-direction: column;
        }

        .settings-form-fields {
          min-height: 0;
          display: grid;
          align-content: start;
          gap: 13px;
          padding: 20px;
          overflow-y: auto;
        }

        .settings-form-fields label {
          display: grid;
          gap: 6px;
        }

        .settings-form-fields label > span {
          color: var(--muted);
          font-size: 0.72rem;
          font-weight: 700;
        }

        .settings-form-fields input,
        .settings-form-fields select {
          width: 100%;
          height: 42px;
          padding: 0 11px;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: #ffffff;
        }

        .settings-drawer footer {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          padding: 16px 20px;
          border-top: 1px solid var(--border);
        }

        .settings-drawer footer button {
          min-height: 40px;
          padding: 0 14px;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: #ffffff;
          font-weight: 750;
        }

        .settings-drawer footer button.primary {
          color: #ffffff;
          border-color: var(--primary);
          background: var(--primary);
        }

        .settings-page--embedded {
          height: 100%;
          min-height: 0;
          flex: 1 1 0;
          overflow: hidden;
          background: transparent;
        }

        .settings-page--embedded .settings-patient-source {
          flex: 0 0 auto;
        }

        .settings-page--embedded .settings-layout {
          min-height: 0;
          flex: 1 1 0;
          border: 1px solid var(--border);
          border-radius: 18px;
          overflow: hidden;
          background: #ffffff;
        }

        @media (max-width: 900px) {
          .settings-page {
            height: auto;
            overflow: visible;
          }

          .settings-layout {
            grid-template-columns: 1fr;
            overflow: visible;
          }

          .settings-menu {
            border-right: 0;
            border-bottom: 1px solid var(--border);
          }

          .settings-menu nav {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            max-height: 340px;
          }

          .settings-content {
            min-height: 600px;
          }

          .settings-page--embedded .settings-content {
            min-height: 0;
          }
        }

        @media (max-width: 620px) {
          .settings-content-header,
          .settings-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .settings-primary-button {
            width: 100%;
          }

          .settings-menu nav {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  )
}