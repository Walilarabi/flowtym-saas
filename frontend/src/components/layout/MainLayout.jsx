import { TopNavigation } from './TopNavigation'
import { SubNavigation } from './SubNavigation'
import { useHotel } from '@/context/HotelContext'
import { SetupWizard } from '@/components/setup/SetupWizard'
import { CommandPalette } from '@/components/CommandPalette'
import { SupportFloatingButton } from '@/components/support/SupportFloatingButton'

export const MainLayout = ({ children }) => {
  const { currentHotel, loading } = useHotel()

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: 'var(--bg-app, #F8F9FC)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 rounded-full spinner" style={{ borderColor: 'var(--primary, #6C5CE7)', borderTopColor: 'transparent' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary, #6B7280)' }}>Chargement...</span>
        </div>
      </div>
    )
  }

  if (!currentHotel) {
    return <SetupWizard />
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-app, #F8F9FC)' }}>
      <TopNavigation />
      <SubNavigation />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
      {/* Command Palette - CTRL+K */}
      <CommandPalette />
      {/* Support Floating Button - Global */}
      <SupportFloatingButton />
    </div>
  )
}
