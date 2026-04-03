import { NavLink, useLocation } from 'react-router-dom'
import { Calendar, List, Users, LogIn, LogOut, Moon, BarChart3, Clock, FileText, Receipt, UsersRound, Settings, UserPlus, PieChart, LayoutDashboard, Euro } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'

export const SubNavigation = () => {
  const location = useLocation()
  const { t } = useI18n()

  const pmsSubNav = [
    { label: t('pms.planning'),      icon: Calendar,    path: '/pms/planning' },
    { label: t('pms.reservations'),  icon: List,        path: '/pms/reservations' },
    { label: t('pms.clients'),       icon: Users,       path: '/pms/clients' },
    { label: t('pms.arrivals'),      icon: LogIn,       path: '/pms/arrivals' },
    { label: t('pms.departures'),    icon: LogOut,      path: '/pms/departures' },
    { label: t('pms.nightaudit'),    icon: Moon,        path: '/pms/night-audit' },
    { label: t('pms.reports'),       icon: BarChart3,   path: '/pms/reports' },
  ]

  const staffSubNav = [
    { label: t('staff.dashboard'),   icon: LayoutDashboard, path: '/staff/dashboard' },
    { label: t('staff.planning'),    icon: Calendar,        path: '/staff/planning' },
    { label: t('staff.pointage'),    icon: Clock,           path: '/staff/pointage' },
    { label: t('staff.employees'),   icon: UsersRound,      path: '/staff/employees' },
    { label: t('staff.contracts'),   icon: FileText,        path: '/staff/contracts' },
    { label: t('staff.payroll'),     icon: Euro,            path: '/staff/payroll' },
    { label: t('staff.recruitment'), icon: UserPlus,        path: '/staff/recruitment' },
    { label: t('staff.reporting'),   icon: PieChart,        path: '/staff/reporting' },
    { label: t('staff.config'),      icon: Settings,        path: '/staff/configuration' },
  ]

  const isPMS = location.pathname.startsWith('/pms')
  const isStaff = location.pathname.startsWith('/staff')

  if (!isPMS && !isStaff) return null

  const navItems = isPMS ? pmsSubNav : staffSubNav

  return (
    <div 
      className="h-12 flex items-center px-6 shrink-0"
      style={{ 
        background: 'var(--bg-hover, #F3F4F6)', 
        borderBottom: '1px solid var(--border-light, #F3F4F6)' 
      }}
    >
      <nav className="flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path || 
            (item.path === '/staff/planning' && location.pathname === '/staff') ||
            (item.path === '/pms/planning' && location.pathname === '/pms')
          const isDisabled = item.disabled
          
          if (isDisabled) {
            return (
              <div
                key={item.path}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium cursor-not-allowed"
                style={{ color: 'var(--text-muted, #9CA3AF)' }}
                data-testid={`subnav-${item.label.toLowerCase().replace(/ /g, '-')}`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
            )
          }
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg"
              style={{ 
                background: isActive ? 'var(--bg-card, #FFFFFF)' : 'transparent',
                color: isActive ? 'var(--primary, #6C5CE7)' : 'var(--text-secondary, #6B7280)',
                boxShadow: isActive ? 'var(--shadow-sm, 0 2px 4px rgba(0,0,0,0.04))' : 'none',
                border: isActive ? '1px solid var(--border-light, #F3F4F6)' : '1px solid transparent',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 150ms ease'
              }}
              data-testid={`subnav-${item.label.toLowerCase().replace(/ /g, '-')}`}
            >
              <Icon className="w-4 h-4" style={{ opacity: isActive ? 1 : 0.7 }} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
