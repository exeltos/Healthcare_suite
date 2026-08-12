import { APP_EVENTS } from '../../../core/events'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../../core/events'
import {
  loadPatientRegistry,
  PATIENT_CONFIG_EVENT,
  PATIENT_REGISTRY_EVENT,
} from '../../../services/patientService'
import './HybridPatientSelector.css'

export default function HybridPatientSelector({
  value,
  onChange,
  disabled = false,
}) {
  const [mode, setMode] = useState('list')
  const [patients, setPatients] = useState(loadPatientRegistry)
  const [selectedId, setSelectedId] = useState('')

  useAppEvents([PATIENT_REGISTRY_EVENT, PATIENT_CONFIG_EVENT, APP_EVENTS.MASTER_DATA_UPDATED], () => {
    setPatients(loadPatientRegistry())
  }, { includeStorage: true })

  const currentPatient = useMemo(
    () => patients.find((item) => String(item.id) === String(selectedId)),
    [patients, selectedId],
  )

  function choosePatient(patientId) {
    setSelectedId(patientId)
    const patient = patients.find(
      (item) => String(item.id) === String(patientId),
    )
    if (!patient) return

    onChange({
      patientId: patient.id,
      patientName: patient.fullName || '',
      patientCode: patient.patientCode || '',
      department: patient.department || '',
      room: patient.room || '',
      admissionDate: patient.admissionDate || '',
      amka: patient.amka || '',
      primaryDiagnosis: patient.primaryDiagnosis || '',
    })
  }

  return (
    <div className="hybrid-patient-selector">
      <div className="hybrid-patient-modes">
        <button
          type="button"
          className={mode === 'list' ? 'active' : ''}
          onClick={() => setMode('list')}
          disabled={disabled}
        >
          Επιλογή από βιβλιοθήκη
        </button>
        <button
          type="button"
          className={mode === 'manual' ? 'active' : ''}
          onClick={() => {
            setMode('manual')
            setSelectedId('')
          }}
          disabled={disabled}
        >
          Χειροκίνητα
        </button>
      </div>

      {mode === 'list' ? (
        <label>
          <span>Ασθενής</span>
          <select
            value={selectedId}
            onChange={(event) => choosePatient(event.target.value)}
            disabled={disabled}
          >
            <option value="">Επιλέξτε ασθενή</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.fullName} · {patient.patientCode || 'Χωρίς κωδικό'} ·{' '}
                {patient.department || 'Χωρίς τμήμα'}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="hybrid-patient-manual-grid">
          <label>
            <span>Ονοματεπώνυμο</span>
            <input
              value={value.patientName || ''}
              onChange={(event) =>
                onChange({ ...value, patientName: event.target.value })
              }
              disabled={disabled}
            />
          </label>
          <label>
            <span>Κωδικός ασθενούς</span>
            <input
              value={value.patientCode || ''}
              onChange={(event) =>
                onChange({ ...value, patientCode: event.target.value })
              }
              disabled={disabled}
            />
          </label>
        </div>
      )}

      {mode === 'list' && currentPatient && (
        <div className="hybrid-patient-summary">
          <span>{currentPatient.department || '—'}</span>
          <span>{currentPatient.room || '—'}</span>
          <span>{currentPatient.admissionDate || '—'}</span>
        </div>
      )}
    </div>
  )
}
