import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import {
  LayoutDashboard, Building2, Network, TrendingUp, Star, Users, CalendarCheck,
  Brush, UsersRound, Wrench, Receipt, BarChart3, Code, Bell, Moon, ChevronDown,
  LogOut, Settings, User, Check, Database, Cog, Link2, ClipboardList
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const modules = [
  { id: 'flowboard', label: 'Flowboard', icon: LayoutDashboard, path: '/flowboard', disabled: false },
  { id: 'consignes', label: 'Consignes', icon: ClipboardList, path: '/consignes', disabled: false },
  { id: 'pms', label: 'PMS', icon: Building2, path: '/pms/planning', disabled: false },
  { id: 'channel', label: 'Channel', icon: Network, path: '/channel', disabled: false },
  { id: 'rms', label: 'Hoptym', icon: TrendingUp, path: '/rms', disabled: false },
  { id: 'ereputation', label: 'E-Reputation', icon: Star, path: '/e-reputation', disabled: false },
  { id: 'crm', label: 'CRM', icon: Users, path: '/crm', disabled: false },
  { id: 'booking', label: 'Booking', icon: CalendarCheck, path: '/booking', disabled: false },
  { id: 'housekeeping', label: 'Housekeeping', icon: Brush, path: '/housekeeping', disabled: false },
  { id: 'staff', label: 'Staff', icon: UsersRound, path: '/staff', disabled: false },
  { id: 'rapports', label: 'Rapports', icon: BarChart3, path: '/pms/reports', disabled: false },
  { id: 'datahub', label: 'Data Hub', icon: Database, path: '/datahub', disabled: false },
  { id: 'integrations', label: 'Intégrations', icon: Link2, path: '/integrations', disabled: false },
  { id: 'config', label: 'Configuration', icon: Cog, path: '/config', disabled: false },
]

export const TopNavigation = () => {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { hotels, currentHotel, switchHotel } = useHotel()

  const isActive = (path) => {
    if (path === '/pms/planning') return location.pathname.startsWith('/pms')
    if (path === '/staff') return location.pathname.startsWith('/staff')
    if (path === '/crm') return location.pathname.startsWith('/crm')
    if (path === '/channel') return location.pathname.startsWith('/channel')
    if (path === '/booking') return location.pathname.startsWith('/booking')
    if (path === '/rms') return location.pathname.startsWith('/rms')
    if (path === '/datahub') return location.pathname.startsWith('/datahub')
    if (path === '/config') return location.pathname.startsWith('/config')
    if (path === '/housekeeping') return location.pathname.startsWith('/housekeeping')
    if (path === '/e-reputation') return location.pathname.startsWith('/e-reputation')
    if (path === '/flowboard') return location.pathname.startsWith('/flowboard')
    if (path === '/integrations') return location.pathname.startsWith('/integrations')
    if (path === '/consignes') return location.pathname.startsWith('/consignes')
    return location.pathname.startsWith(path)
  }

  const getInitials = (firstName, lastName) => `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center px-6 shrink-0" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 mr-10">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)' }}>
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold" style={{ letterSpacing: '-0.02em' }}>
          <span style={{ color: '#6C5CE7' }}>FLOW</span><span style={{ color: '#1F2937' }}>TYM</span>
        </span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {modules.map((module) => {
          const Icon = module.icon
          const active = isActive(module.path)
          
          if (module.disabled) {
            return (
              <div 
                key={module.id} 
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap cursor-not-allowed rounded-lg" 
                style={{ color: '#9CA3AF' }}
                data-testid={`nav-${module.id}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden lg:inline">{module.label}</span>
              </div>
            )
          }

          return (
            <NavLink 
              key={module.id}
              to={module.path}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-all duration-150"
              style={{ 
                color: active ? '#6C5CE7' : '#6B7280',
                background: active ? '#F5F4FE' : 'transparent',
                fontWeight: active ? 600 : 500
              }}
              data-testid={`nav-${module.id}`}
            >
              <Icon className="w-4 h-4" style={{ opacity: active ? 1 : 0.7 }} />
              <span className="hidden lg:inline">{module.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Right Side Actions */}
      <div className="flex items-center gap-3 ml-6">
        {/* Theme Toggle */}
        <button 
          className="p-2 rounded-lg transition-all duration-150"
          style={{ color: '#6B7280' }}
          onMouseEnter={e => e.target.style.background = '#F8F9FC'}
          onMouseLeave={e => e.target.style.background = 'transparent'}
        >
          <Moon className="w-4 h-4" />
        </button>
        
        {/* Notifications */}
        <button 
          className="p-2 rounded-lg relative transition-all duration-150"
          style={{ color: '#6B7280' }}
          onMouseEnter={e => e.target.style.background = '#F8F9FC'}
          onMouseLeave={e => e.target.style.background = 'transparent'}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white" style={{ background: '#EF4444' }} />
        </button>

        {/* Hotel Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150" 
              style={{ border: '1px solid #E5E7EB', background: '#FFFFFF' }}
              data-testid="btn-hotel-selector"
            >
              <span className="w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />
              <span className="text-sm font-medium max-w-[120px] truncate" style={{ color: '#1F2937' }}>{currentHotel?.name || 'Selectionner'}</span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" style={{ borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.08)', border: '1px solid #F3F4F6' }}>
            {hotels.map((hotel) => (
              <DropdownMenuItem 
                key={hotel.id} 
                onClick={() => switchHotel(hotel)} 
                className="flex items-center justify-between cursor-pointer"
                style={{ borderRadius: '8px' }}
              >
                <span>{hotel.name}</span>
                {currentHotel?.id === hotel.id && <Check className="w-4 h-4" style={{ color: '#6C5CE7' }} />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-lg transition-all duration-150" 
              style={{ background: 'transparent' }}
              data-testid="btn-user-menu"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold leading-tight" style={{ color: '#1F2937', letterSpacing: '-0.01em' }}>{user?.first_name} {user?.last_name}</p>
                <p className="text-xs capitalize leading-tight" style={{ color: '#6B7280' }}>{user?.role === 'admin' ? 'Directeur' : user?.role}</p>
              </div>
              <Avatar className="w-9 h-9" style={{ borderRadius: '10px' }}>
                <AvatarFallback className="text-white font-semibold text-xs" style={{ background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)', borderRadius: '10px' }}>
                  {getInitials(user?.first_name, user?.last_name)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" style={{ borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.08)', border: '1px solid #F3F4F6' }}>
            <DropdownMenuItem className="cursor-pointer" style={{ borderRadius: '8px' }}>
              <User className="w-4 h-4 mr-2" />Mon profil
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" style={{ borderRadius: '8px' }}>
              <Settings className="w-4 h-4 mr-2" />Parametres
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer" style={{ color: '#EF4444', borderRadius: '8px' }}>
              <LogOut className="w-4 h-4 mr-2" />Deconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
