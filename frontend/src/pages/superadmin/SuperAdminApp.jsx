import { useState, useEffect } from 'react'
import { useNavigate, Link, Routes, Route, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import {
  Building2, Users, CreditCard, FileText, Settings, BarChart3,
  ChevronRight, Plus, Search, MoreHorizontal, Download, Eye,
  CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp, Package, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const API_URL = import.meta.env.VITE_BACKEND_URL

// Create axios instance with auth
const createApi = (token) => {
  return axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` }
  })
}

// ==================== DASHBOARD ====================
const SADashboard = ({ api }) => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/api/superadmin/dashboard')
        setStats(res.data)
      } catch (error) {
        console.error('Dashboard error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [api])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!stats) return <div className="p-6">Erreur de chargement</div>

  const kpiCards = [
    { label: 'Hôtels Total', value: stats.total_hotels, icon: Building2, color: 'violet', sub: `${stats.active_hotels} actifs` },
    { label: 'MRR', value: `${stats.mrr.toFixed(0)}€`, icon: TrendingUp, color: 'emerald', sub: `ARR: ${stats.arr.toFixed(0)}€` },
    { label: 'Utilisateurs', value: stats.total_users, icon: Users, color: 'blue', sub: 'Total plateforme' },
    { label: 'Expiration', value: stats.expiring_soon, icon: AlertTriangle, color: 'amber', sub: '< 30 jours' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Vue d'ensemble de la plateforme Flowtym</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{kpi.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{kpi.value}</p>
                <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-${kpi.color}-100 flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 text-${kpi.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Plan Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Répartition des Plans</h3>
          <div className="space-y-3">
            {Object.entries(stats.plan_distribution).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    plan === 'basic' ? 'bg-slate-400' :
                    plan === 'pro' ? 'bg-violet-500' :
                    plan === 'premium' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <span className="text-sm capitalize">{plan}</span>
                </div>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Croissance Hôtels</h3>
          <div className="flex items-end justify-between h-32 gap-2">
            {stats.growth_data.map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div 
                  className="w-full bg-violet-500 rounded-t"
                  style={{ height: `${Math.max(10, (item.hotels / Math.max(...stats.growth_data.map(d => d.hotels), 1)) * 100)}%` }}
                />
                <span className="text-xs text-slate-500">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Activité Récente</h3>
          <div className="space-y-3">
            {stats.recent_activity.slice(0, 5).map((log, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5" />
                <div>
                  <span className="font-medium">{log.action}</span>
                  <span className="text-slate-500"> - {log.entity_name}</span>
                </div>
              </div>
            ))}
            {stats.recent_activity.length === 0 && (
              <p className="text-slate-400 text-sm">Aucune activité récente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== HOTELS LIST ====================
const SAHotels = ({ api }) => {
  const navigate = useNavigate()
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchHotels = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)
      
      const res = await api.get(`/api/superadmin/hotels?${params}`)
      setHotels(res.data)
    } catch (error) {
      console.error('Hotels error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHotels() }, [api, search, statusFilter])

  const handleSuspend = async (hotelId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    try {
      await api.patch(`/api/superadmin/hotels/${hotelId}/status?status=${newStatus}`)
      toast.success(`Hôtel ${newStatus === 'active' ? 'activé' : 'suspendu'}`)
      fetchHotels()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handleDownloadContract = async (hotelId, hotelName) => {
    try {
      const res = await api.get(`/api/superadmin/hotels/${hotelId}/contract/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `contrat-${hotelName.replace(/\s+/g, '-')}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      toast.error('Erreur téléchargement')
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">Actif</span>
      case 'suspended': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Suspendu</span>
      case 'expired': return <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Expiré</span>
      default: return <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">{status}</span>
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hôtels</h1>
          <p className="text-slate-500">Gestion des établissements clients</p>
        </div>
        <Button onClick={() => navigate('/superadmin/hotels/new')} className="bg-violet-600 hover:bg-violet-700 gap-2">
          <Plus className="w-4 h-4" />
          Ajouter un hôtel
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input 
            placeholder="Rechercher un hôtel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="suspended">Suspendu</option>
        </select>
      </div>

      {/* Hotels Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Hôtel</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Plan</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Utilisateurs</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Statut</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Fin abonnement</th>
              <th className="w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hotels.map(hotel => (
              <tr key={hotel.id} className="hover:bg-slate-50">
                <td className="p-4">
                  <div>
                    <p className="font-medium text-slate-900">{hotel.name}</p>
                    <p className="text-sm text-slate-500">{hotel.city}, {hotel.country}</p>
                  </div>
                </td>
                <td className="p-4">
                  {hotel.subscription_plan ? (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      hotel.subscription_plan === 'basic' ? 'bg-slate-100 text-slate-700' :
                      hotel.subscription_plan === 'pro' ? 'bg-violet-100 text-violet-700' :
                      hotel.subscription_plan === 'premium' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {hotel.subscription_plan.toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-sm">-</span>
                  )}
                </td>
                <td className="p-4">
                  <span className="text-sm">{hotel.users_count} / {hotel.max_users === -1 ? '∞' : hotel.max_users}</span>
                </td>
                <td className="p-4">
                  {getStatusBadge(hotel.status)}
                </td>
                <td className="p-4 text-sm text-slate-600">
                  {hotel.subscription_end_date ? new Date(hotel.subscription_end_date).toLocaleDateString('fr-FR') : '-'}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/superadmin/hotels/${hotel.id}`)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownloadContract(hotel.id, hotel.name)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleSuspend(hotel.id, hotel.status)}
                      className={hotel.status === 'active' ? 'text-red-500 hover:text-red-600' : 'text-emerald-500 hover:text-emerald-600'}
                    >
                      {hotel.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {hotels.length === 0 && !loading && (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aucun hôtel trouvé</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== HOTEL FORM ====================
const SAHotelForm = ({ api }) => {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', legal_name: '', address: '', city: '', postal_code: '',
    country: 'France', siret: '', contact_email: '', contact_phone: '', contact_name: ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/superadmin/hotels', form)
      toast.success('Hôtel créé avec succès')
      navigate('/superadmin/hotels')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nouvel Hôtel</h1>
        <p className="text-slate-500">Créer un nouveau client</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Nom de l'hôtel *</label>
            <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Raison sociale *</label>
            <Input value={form.legal_name} onChange={(e) => setForm({...form, legal_name: e.target.value})} required />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-slate-700">Adresse *</label>
            <Input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Ville *</label>
            <Input value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Code postal *</label>
            <Input value={form.postal_code} onChange={(e) => setForm({...form, postal_code: e.target.value})} required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Pays</label>
            <Input value={form.country} onChange={(e) => setForm({...form, country: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">SIRET *</label>
            <Input value={form.siret} onChange={(e) => setForm({...form, siret: e.target.value})} required />
          </div>
          <div className="col-span-2 border-t pt-4 mt-2">
            <p className="text-sm font-semibold text-slate-800 mb-3">Contact principal</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Nom complet *</label>
            <Input value={form.contact_name} onChange={(e) => setForm({...form, contact_name: e.target.value})} required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Email *</label>
            <Input type="email" value={form.contact_email} onChange={(e) => setForm({...form, contact_email: e.target.value})} required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Téléphone *</label>
            <Input value={form.contact_phone} onChange={(e) => setForm({...form, contact_phone: e.target.value})} required />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => navigate('/superadmin/hotels')}>Annuler</Button>
          <Button type="submit" className="bg-violet-600 hover:bg-violet-700" disabled={saving}>
            {saving ? 'Création...' : 'Créer l\'hôtel'}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ==================== MAIN LAYOUT ====================
export const SuperAdminApp = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [token, setToken] = useState(localStorage.getItem('sa_token'))
  const [user, setUser] = useState(null)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [logging, setLogging] = useState(false)

  const api = token ? createApi(token) : null

  useEffect(() => {
    if (token) {
      // Verify token
      api.get('/api/auth/me').then(res => {
        if (res.data.role !== 'super_admin') {
          handleLogout()
          toast.error('Accès réservé aux Super Admins')
        } else {
          setUser(res.data)
        }
      }).catch(() => handleLogout())
    }
  }, [token])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLogging(true)
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, loginForm)
      if (res.data.user.role !== 'super_admin') {
        toast.error('Accès réservé aux Super Admins')
        return
      }
      localStorage.setItem('sa_token', res.data.token)
      setToken(res.data.token)
      setUser(res.data.user)
      toast.success('Connexion réussie')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur de connexion')
    } finally {
      setLogging(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('sa_token')
    setToken(null)
    setUser(null)
  }

  if (!token || !user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-violet-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Flowtym Super Admin</h1>
            <p className="text-slate-500">Connectez-vous pour accéder au back-office</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input 
                type="email" 
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Mot de passe</label>
              <Input 
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700" disabled={logging}>
              {logging ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  const navItems = [
    { path: '/superadmin', label: 'Dashboard', icon: BarChart3 },
    { path: '/superadmin/hotels', label: 'Hôtels', icon: Building2 },
    { path: '/superadmin/catalog', label: 'Catalogue', icon: Package },
    { path: '/superadmin/subscriptions', label: 'Abonnements', icon: CreditCard },
    { path: '/superadmin/users', label: 'Utilisateurs', icon: Users },
    { path: '/superadmin/invoices', label: 'Facturation', icon: FileText },
    { path: '/superadmin/support', label: 'Support IA', icon: Sparkles },
    { path: '/superadmin/logs', label: 'Logs', icon: Clock },
  ]

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar - Dark background for readability */}
      <aside 
        data-admin-sidebar="true"
        className="w-64 flex flex-col"
        style={{ backgroundColor: '#0f172a' }}
      >
        <div className="p-4" style={{ borderBottom: '1px solid #334155' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: '#ffffff' }}>Flowtym</h2>
              <p className="text-xs" style={{ color: '#a78bfa' }}>Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path || 
                           (item.path !== '/superadmin' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ 
                  backgroundColor: isActive ? '#7c3aed' : 'transparent',
                  color: isActive ? '#ffffff' : '#d1d5db'
                }}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid #334155' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-sm font-medium text-white">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#ffffff' }}>{user?.first_name} {user?.last_name}</p>
              <p className="text-xs truncate" style={{ color: '#9ca3af' }}>{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="w-full mt-3"
            style={{ color: '#d1d5db' }}
          >
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<SADashboard api={api} />} />
          <Route path="/hotels" element={<SAHotels api={api} />} />
          <Route path="/hotels/new" element={<SAHotelForm api={api} />} />
          <Route path="/hotels/:hotelId" element={<SAHotelManagement api={api} />} />
          <Route path="/catalog" element={<SACatalogPage api={api} />} />
          <Route path="/subscriptions" element={<SASubscriptionsLifecyclePage api={api} />} />
          <Route path="/users" element={<SAUsersPage api={api} />} />
          <Route path="/invoices" element={<SAInvoicesPage api={api} />} />
          <Route path="/support" element={<SASupportDashboard api={api} />} />
          <Route path="/logs" element={<SALogs api={api} />} />
        </Routes>
      </main>
    </div>
  )
}

// Import extended pages from SAPages
import { SASubscriptions as SASubscriptionsPage, SAUsers as SAUsersPage, SAInvoices as SAInvoicesPage, SAHotelDetail } from './SAPages'
// Import new catalog and lifecycle pages
import { SACatalog as SACatalogPage } from './SACatalog'
import { SASubscriptionsLifecycle as SASubscriptionsLifecyclePage } from './SASubscriptionsLifecycle'
// Import hotel management page
import { SAHotelManagement } from './SAHotelManagement'
// Import Support Dashboard
import SupportDashboard from '@/pages/support/SupportDashboard'

// Wrapper for Support Dashboard in Super Admin context
const SASupportDashboard = ({ api }) => {
  return <SupportDashboard apiOverride={api} />
}

const SALogs = ({ api }) => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/superadmin/logs?limit=100')
      .then(res => setLogs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [api])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Logs d'activité</h1>
      <p className="text-slate-500 mb-6">Historique des actions administratives</p>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Date</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Action</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Entité</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Par</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="p-4 text-sm text-slate-600">
                  {new Date(log.created_at).toLocaleString('fr-FR')}
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 text-xs font-medium bg-violet-100 text-violet-700 rounded">
                    {log.action}
                  </span>
                </td>
                <td className="p-4">
                  <p className="text-sm font-medium">{log.entity_name}</p>
                  <p className="text-xs text-slate-500">{log.entity_type}</p>
                </td>
                <td className="p-4 text-sm text-slate-600">{log.actor_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default SuperAdminApp
