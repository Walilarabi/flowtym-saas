/**
 * CRM Module - Main Page
 * Integrated CRM system for Flowtym Hotel PMS
 */
import CRMDashboard from './components/CRMDashboard'

export default function CRMPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <CRMDashboard />
    </div>
  )
}

export { CRMDashboard }
