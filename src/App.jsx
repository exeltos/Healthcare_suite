import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { APP_ROUTES } from './config/routes'
import { useI18n } from './i18n'

import AppLayout from './components/layout/AppLayout'

const LoginPage = lazy(() => import('./pages/Login/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const PatientsPage = lazy(() => import('./pages/Patients/PatientsPage'))
const PatientWorkflowPage = lazy(() => import('./pages/Patients/PatientWorkflowPage'))
const PlaceholderPage = lazy(() => import('./pages/PlaceholderPage'))
const LiraPage = lazy(() => import('./pages/Lira/LiraPage'))
const LaboratoryPage = lazy(() => import('./pages/Laboratory/LaboratoryPage'))
const LaboratoryWorkspacePage = lazy(() => import('./pages/Laboratory/LaboratoryWorkspacePage'))
const InfectionsPage = lazy(() => import('./pages/Infections/InfectionsPage'))
const IsolationPage = lazy(() => import('./pages/Isolation/IsolationPage'))
const PatientSamplesPage = lazy(() => import('./pages/PatientSamples/PatientSamplesPage'))
const PreventionCenterPage = lazy(() => import('./pages/Prevention/PreventionCenterPage'))
const HandHygienePage = lazy(() => import('./pages/Prevention/HandHygienePage'))
const AntisepticConsumptionPage = lazy(() => import('./pages/Prevention/AntisepticConsumptionPage'))
const WasteMeasurementsPage = lazy(() => import('./pages/Prevention/WasteMeasurementsPage'))
const PreventionAuditsPage = lazy(() => import('./pages/Prevention/PreventionAuditsPage'))
const BundlesPage = lazy(() => import('./pages/Prevention/BundlesPage'))
const VaccinationsPage = lazy(() => import('./pages/Prevention/VaccinationsPage'))
const PromotedAntibioticsPage = lazy(() => import('./pages/Prevention/PromotedAntibioticsPage'))
const EmployeesPage = lazy(() => import('./pages/Employees/EmployeesPage'))
const EmployeeWorkspacePage = lazy(() => import('./pages/Employees/EmployeeWorkspacePage'))
const FormDesignerPage = lazy(() => import('./pages/Forms/FormDesignerPage'))
const QualityCenterPage = lazy(() => import('./pages/Quality/QualityCenterPage'))
const IncidentsPage = lazy(() => import('./pages/Quality/IncidentsPage'))
const CapaPage = lazy(() => import('./pages/Quality/CapaPage'))
const IndicatorsPage = lazy(() => import('./pages/Quality/IndicatorsPage'))
const IndicatorDesignerPage = lazy(() => import('./pages/Studio/IndicatorDesignerPage'))
const QualityReportsPage = lazy(() => import('./pages/Quality/QualityReportsPage'))
const AuditsPage = lazy(() => import('./pages/Quality/AuditsPage'))
const LimoxisStudioPage = lazy(() => import('./pages/Studio/LimoxisStudioPage'))
const DeveloperCenterPage = lazy(() => import('./pages/Studio/DeveloperCenterPage'))
const StudioConfigPage = lazy(() => import('./pages/Studio/StudioConfigPage'))
const UserAccessPage = lazy(() => import('./pages/Studio/UserAccessPage'))
const RolePermissionsPage = lazy(() => import('./pages/Studio/RolePermissionsPage'))
const OrganizationCenterPage = lazy(() => import('./pages/Organization/OrganizationCenterPage'))
const TrainingPage = lazy(() => import('./pages/Organization/TrainingPage'))
const CommitteesPage = lazy(() => import('./pages/Organization/CommitteesPage'))
const DocumentsPage = lazy(() => import('./pages/Organization/DocumentsPage'))
const CoreShowcasePage = lazy(() => import('./pages/Core/CoreShowcasePage'))
const NotifiableDiseasesPage = lazy(() => import('./pages/Records/NotifiableDiseasesPage'))
const SurveillanceControlsPage = lazy(() => import('./pages/Surveillance/SurveillanceControlsPage'))

export default function App() {
  const { t } = useI18n()
  return (
    <Suspense fallback={<div className="route-loading" role="status" aria-live="polite">{t('common.loading')}</div>}>
      <Routes>
      <Route path={APP_ROUTES.ROOT} element={<LoginPage />} />
      <Route path={APP_ROUTES.LOGIN} element={<LoginPage />} />

      <Route element={<AppLayout />}>
        <Route path={APP_ROUTES.DASHBOARD} element={<DashboardPage />} />

        <Route path={APP_ROUTES.CORE} element={<CoreShowcasePage />} />

        <Route path={APP_ROUTES.NOTIFIABLE_DISEASES} element={<NotifiableDiseasesPage />} />
        <Route path={APP_ROUTES.VACCINATIONS} element={<VaccinationsPage />} />
        <Route path={APP_ROUTES.PROMOTED_ANTIBIOTICS} element={<PromotedAntibioticsPage />} />

        <Route path={APP_ROUTES.PREVENTION} element={<PreventionCenterPage />} />
        <Route path={APP_ROUTES.HAND_HYGIENE} element={<HandHygienePage />} />
        <Route path={APP_ROUTES.ANTISEPTIC_CONSUMPTION} element={<AntisepticConsumptionPage />} />
        <Route path={APP_ROUTES.WASTE} element={<WasteMeasurementsPage />} />
        <Route path={APP_ROUTES.PREVENTION_AUDITS} element={<PreventionAuditsPage />} />
        <Route path={APP_ROUTES.BUNDLES} element={<BundlesPage />} />

        <Route path={APP_ROUTES.SURVEILLANCE} element={<SurveillanceControlsPage />} />
        <Route path={APP_ROUTES.SURVEILLANCE_PATIENTS} element={<Navigate to={APP_ROUTES.PATIENTS} replace />} />
        <Route path={APP_ROUTES.SURVEILLANCE_STAFF_SAMPLES} element={<Navigate to={APP_ROUTES.LABORATORY_STAFF} replace />} />
        <Route path={APP_ROUTES.SURVEILLANCE_ENVIRONMENT} element={<Navigate to={APP_ROUTES.LABORATORY_ENVIRONMENT} replace />} />
        <Route path={APP_ROUTES.WATER} element={<Navigate to={APP_ROUTES.LABORATORY_WATER} replace />} />

        <Route
          path={APP_ROUTES.INFECTIONS}
          element={<InfectionsPage />}
        />

        <Route
          path={APP_ROUTES.ISOLATIONS}
          element={<IsolationPage />}
        />

        <Route
          path={APP_ROUTES.PATIENT_SAMPLES}
          element={<PatientSamplesPage />}
        />




        <Route
          path={APP_ROUTES.PATIENTS}
          element={<PatientsPage />}
        />
        <Route path={APP_ROUTES.PATIENT_WORKFLOW} element={<PatientWorkflowPage />} />

        <Route path={APP_ROUTES.LABORATORY} element={<LaboratoryPage />} />
        <Route path={APP_ROUTES.LABORATORY_NEW_WORKSPACE} element={<LaboratoryWorkspacePage />} />
        <Route path={APP_ROUTES.LABORATORY_RECORD_WORKSPACE} element={<LaboratoryWorkspacePage />} />
        <Route path={APP_ROUTES.LABORATORY_VIEW} element={<LaboratoryPage />} />

        <Route
          path={APP_ROUTES.QUALITY}
          element={<QualityCenterPage />}
        />

        <Route
          path={APP_ROUTES.QUALITY_INCIDENTS}
          element={<IncidentsPage />}
        />

        <Route path={APP_ROUTES.QUALITY_AUDITS} element={<AuditsPage />} />

        <Route
          path={APP_ROUTES.QUALITY_CAPA}
          element={<CapaPage />}
        />

        <Route path={APP_ROUTES.INDICATORS} element={<IndicatorsPage />} />
        <Route path={APP_ROUTES.QUALITY_INDICATORS} element={<Navigate to={APP_ROUTES.INDICATORS} replace />} />

        <Route path={APP_ROUTES.STUDIO_DEVELOPER} element={<DeveloperCenterPage />} />
        <Route path={APP_ROUTES.STUDIO_INDICATORS} element={<IndicatorDesignerPage />} />
        <Route path={APP_ROUTES.STUDIO_WORKFLOWS} element={<StudioConfigPage moduleKey="workflows" />} />
        <Route path={APP_ROUTES.STUDIO_RULES} element={<StudioConfigPage moduleKey="rules" />} />
        <Route path={APP_ROUTES.STUDIO_NOTIFICATIONS} element={<StudioConfigPage moduleKey="notifications" />} />
        <Route path={APP_ROUTES.STUDIO_DASHBOARDS} element={<StudioConfigPage moduleKey="dashboards" />} />
        <Route path={APP_ROUTES.STUDIO_AI} element={<StudioConfigPage moduleKey="ai" />} />
        <Route path={APP_ROUTES.STUDIO_SECURITY} element={<UserAccessPage />} />
        <Route path={APP_ROUTES.STUDIO_USERS} element={<UserAccessPage />} />
        <Route path={APP_ROUTES.STUDIO_ROLES} element={<RolePermissionsPage />} />
        <Route path={APP_ROUTES.STUDIO_SETTINGS} element={<LimoxisStudioPage />} />
        <Route path={`${APP_ROUTES.STUDIO}/*`} element={<LimoxisStudioPage />} />
        <Route path={APP_ROUTES.FORM_DESIGNER} element={<FormDesignerPage />} />

        <Route path={APP_ROUTES.ORGANIZATION} element={<OrganizationCenterPage />} />
        <Route path={APP_ROUTES.EMPLOYEES} element={<EmployeesPage />} />
        <Route path={APP_ROUTES.EMPLOYEE_WORKSPACE} element={<EmployeeWorkspacePage />} />

        <Route path={APP_ROUTES.TRAINING} element={<TrainingPage />} />

        <Route path={APP_ROUTES.COMMITTEES} element={<CommitteesPage />} />

        <Route path={APP_ROUTES.DOCUMENTS} element={<DocumentsPage />} />

        <Route
          path={APP_ROUTES.REPORTS}
          element={<QualityReportsPage />}
        />

        <Route
          path={APP_ROUTES.LIRA}
          element={<LiraPage />}
        />

        <Route path={APP_ROUTES.SETTINGS} element={<Navigate to={APP_ROUTES.STUDIO_SETTINGS} replace />} />
      </Route>

      <Route path="*" element={<Navigate to={APP_ROUTES.DASHBOARD} replace />} />
      </Routes>
    </Suspense>
  )
}
