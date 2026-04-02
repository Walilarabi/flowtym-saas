import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { HotelProvider } from '@/context/HotelContext'
import { I18nProvider } from '@/context/I18nContext'
import { LoginPage } from '@/pages/LoginPage'
import { MainLayout } from '@/components/layout/MainLayout'
import { PlanningPage } from '@/pages/PlanningPage'
import { ReservationsPage } from '@/pages/ReservationsPage'
import { ClientsPage } from '@/pages/ClientsPage'
import { ArrivalsPage } from '@/pages/ArrivalsPage'
import { DeparturesPage } from '@/pages/DeparturesPage'
import { NightAuditPage } from '@/pages/NightAuditPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { StaffDashboard } from '@/pages/staff/StaffDashboard'
import { StaffEmployees } from '@/pages/staff/StaffEmployees'
import { StaffPlanning } from '@/pages/staff/StaffPlanning'
import { StaffTimeTracking } from '@/pages/staff/StaffTimeTracking'
import { StaffPointage } from '@/pages/staff/StaffPointage'
import { StaffContracts } from '@/pages/staff/StaffContracts'
import { StaffPayroll } from '@/pages/staff/StaffPayroll'
import { StaffReporting } from '@/pages/staff/StaffReporting'
import { StaffConfiguration } from '@/pages/staff/StaffConfiguration'
import { StaffRecruitment } from '@/pages/staff/StaffRecruitment'
import { SuperAdminApp } from '@/pages/superadmin/SuperAdminApp'
import CRMPage from '@/pages/crm/index'
import { ChannelView } from '@/pages/channel/ChannelManager'
import { BookingEngine } from '@/pages/booking/BookingEngine'
import { RMS } from '@/pages/rms/RMS'
import DataHubOverview from '@/pages/datahub/DataHubOverview'
import DataHubConnectors from '@/pages/datahub/DataHubConnectors'
import DataHubSync from '@/pages/datahub/DataHubSync'
import DataHubData from '@/pages/datahub/DataHubData'
import DataHubAPI from '@/pages/datahub/DataHubAPI'
import DataHubMonitoring from '@/pages/datahub/DataHubMonitoring'
import DataHubPhase2 from '@/pages/datahub/DataHubPhase2'
import ConfigurationPage from '@/pages/config/ConfigurationPage'
import HousekeepingModule from '@/pages/housekeeping/HousekeepingModule'
import EReputationModule from '@/pages/ereputation/EReputationModule'
import Flowboard from '@/pages/flowboard/Flowboard'
import IntegrationsHub from '@/pages/integrations/IntegrationsHub'
import MobilePointage from '@/pages/pointage/MobilePointage'
import SatisfactionSurvey from '@/pages/public/SatisfactionSurvey'
import HousekeepingScan from '@/pages/public/HousekeepingScan'
import SupportCenter from '@/pages/support/SupportCenter'
import SupportDashboard from '@/pages/support/SupportDashboard'
import SupportAgentApp from '@/pages/support-agent/SupportAgentApp'
import ConsignesModule from '@/pages/consignes/ConsignesModule'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full spinner" />
          <span className="text-sm text-slate-500">Chargement...</span>
        </div>
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

const AppRoutes = () => {
  return (
    <Routes>
      {/* Super Admin Routes */}
      <Route path="/superadmin/*" element={<SuperAdminApp />} />
      
      {/* Support Agent Routes - Interface dédiée */}
      <Route path="/support-agent/*" element={<SupportAgentApp />} />
      
      <Route path="/login" element={<LoginPage />} />
      
      {/* Mobile Pointage - Accessible after QR scan (needs auth) */}
      <Route path="/pointage/mobile" element={
        <ProtectedRoute>
          <MobilePointage />
        </ProtectedRoute>
      } />
      
      {/* Public Satisfaction Survey - No auth required */}
      <Route path="/satisfaction/:token" element={<SatisfactionSurvey />} />
      
      {/* Housekeeping Scan - Needs auth for tracking */}
      <Route path="/scan/:token" element={
        <ProtectedRoute>
          <HousekeepingScan />
        </ProtectedRoute>
      } />
      
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <HotelProvider>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/pms/planning" replace />} />
                  {/* PMS Routes */}
                  <Route path="/pms/planning" element={<PlanningPage />} />
                  <Route path="/pms/reservations" element={<ReservationsPage />} />
                  <Route path="/pms/clients" element={<ClientsPage />} />
                  <Route path="/pms/arrivals" element={<ArrivalsPage />} />
                  <Route path="/pms/departures" element={<DeparturesPage />} />
                  <Route path="/pms/night-audit" element={<NightAuditPage />} />
                  <Route path="/pms/reports" element={<ReportsPage />} />
                  {/* Staff Routes */}
                  <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
                  <Route path="/staff/dashboard" element={<StaffDashboard />} />
                  <Route path="/staff/planning" element={<StaffPlanning />} />
                  <Route path="/staff/pointage" element={<StaffPointage />} />
                  <Route path="/staff/employees" element={<StaffEmployees />} />
                  <Route path="/staff/time-tracking" element={<StaffTimeTracking />} />
                  <Route path="/staff/contracts" element={<StaffContracts />} />
                  <Route path="/staff/payroll" element={<StaffPayroll />} />
                  <Route path="/staff/reporting" element={<StaffReporting />} />
                  <Route path="/staff/configuration" element={<StaffConfiguration />} />
                  <Route path="/staff/recruitment" element={<StaffRecruitment />} />
                  {/* CRM Routes */}
                  <Route path="/crm" element={<CRMPage />} />
                  <Route path="/crm/*" element={<CRMPage />} />
                  {/* Channel Manager Routes */}
                  <Route path="/channel" element={<ChannelView />} />
                  <Route path="/channel/*" element={<ChannelView />} />
                  {/* Booking Engine Routes */}
                  <Route path="/booking" element={<BookingEngine />} />
                  <Route path="/booking/*" element={<BookingEngine />} />
                  {/* Hoptym RMS Routes */}
                  <Route path="/rms" element={<RMS />} />
                  <Route path="/rms/*" element={<RMS />} />
                  {/* Data Hub Routes */}
                  <Route path="/datahub" element={<DataHubOverview />} />
                  <Route path="/datahub/connectors" element={<DataHubConnectors />} />
                  <Route path="/datahub/sync" element={<DataHubSync />} />
                  <Route path="/datahub/data" element={<DataHubData />} />
                  <Route path="/datahub/data/*" element={<DataHubData />} />
                  <Route path="/datahub/api" element={<DataHubAPI />} />
                  <Route path="/datahub/monitoring" element={<DataHubMonitoring />} />
                  {/* Configuration Module Routes */}
                  <Route path="/config" element={<ConfigurationPage />} />
                  <Route path="/config/*" element={<ConfigurationPage />} />
                  {/* Housekeeping Module Routes */}
                  <Route path="/housekeeping" element={<HousekeepingModule />} />
                  <Route path="/housekeeping/*" element={<HousekeepingModule />} />
                  {/* E-Reputation Module Routes */}
                  <Route path="/e-reputation" element={<EReputationModule />} />
                  <Route path="/e-reputation/*" element={<EReputationModule />} />
                  {/* Flowboard (Central Dashboard) Routes */}
                  <Route path="/flowboard" element={<Flowboard />} />
                  <Route path="/flowboard/*" element={<Flowboard />} />
                  {/* Consignes (Operations Hub) Routes */}
                  <Route path="/consignes" element={<ConsignesModule />} />
                  <Route path="/consignes/*" element={<ConsignesModule />} />
                  {/* Integrations Hub Routes */}
                  <Route path="/integrations" element={<IntegrationsHub />} />
                  <Route path="/integrations/*" element={<IntegrationsHub />} />
                  {/* Support Center Routes */}
                  <Route path="/support" element={<SupportCenter />} />
                  <Route path="/support/*" element={<SupportCenter />} />
                  {/* Settings */}
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/pms/planning" replace />} />
                </Routes>
              </MainLayout>
            </HotelProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
