/**
 * Super Admin Extended Pages
 * Subscriptions, Users, Invoices management
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { 
  CreditCard, Users, FileText, Building2, Mail, Phone, Calendar,
  CheckCircle, XCircle, AlertTriangle, TrendingUp, Download, Send,
  Plus, Edit, Trash2, Eye, ChevronUp, ChevronDown, Filter, Search,
  PenTool, Clock, Euro, Percent, Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const PLANS = {
  basic: { name: 'Basic', price: 99, color: 'slate', users: 5, modules: ['PMS'] },
  pro: { name: 'Pro', price: 199, color: 'violet', users: 15, modules: ['PMS', 'Staff', 'CRM'] },
  premium: { name: 'Premium', price: 349, color: 'amber', users: 30, modules: ['PMS', 'Staff', 'CRM', 'RMS', 'Finance'] },
  enterprise: { name: 'Enterprise', price: 599, color: 'emerald', users: -1, modules: ['Tous + API'] }
}

const ROLES = [
  { value: 'direction', label: 'Direction' },
  { value: 'rh', label: 'RH' },
  { value: 'reception', label: 'Réception' },
  { value: 'housekeeping', label: 'Hébergement' },
  { value: 'restaurant', label: 'Restauration' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'comptabilite', label: 'Comptabilité' },
]

// ==================== SUBSCRIPTIONS PAGE ====================
export const SASubscriptions = ({ api }) => {
  const navigate = useNavigate()
  const [subscriptions, setSubscriptions] = useState([])
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedSub, setSelectedSub] = useState(null)
  const [form, setForm] = useState({
    hotel_id: '', plan: 'pro', payment_frequency: 'monthly',
    trial_type: 'free_15_days', custom_max_users: '', custom_price_monthly: '', notes: ''
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const hotelsRes = await api.get('/api/superadmin/hotels')
      setHotels(hotelsRes.data)
      
      // Extract subscriptions from hotels
      const subs = hotelsRes.data
        .filter(h => h.subscription_plan)
        .map(h => ({
          hotel_id: h.id,
          hotel_name: h.name,
          plan: h.subscription_plan,
          status: h.subscription_status || 'active',
          end_date: h.subscription_end_date,
          users_count: h.users_count,
          max_users: h.max_users
        }))
      setSubscriptions(subs)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [api])

  const handleCreate = async () => {
    try {
      const payload = {
        ...form,
        custom_max_users: form.custom_max_users ? parseInt(form.custom_max_users) : null,
        custom_price_monthly: form.custom_price_monthly ? parseFloat(form.custom_price_monthly) : null
      }
      await api.post('/api/superadmin/subscriptions', payload)
      toast.success('Abonnement créé')
      setShowModal(false)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur')
    }
  }

  const handleCancel = async (subscriptionId) => {
    if (!confirm('Annuler cet abonnement ?')) return
    try {
      await api.patch(`/api/superadmin/subscriptions/${subscriptionId}/cancel`)
      toast.success('Abonnement annulé')
      fetchData()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-emerald-100 text-emerald-700',
      trial: 'bg-blue-100 text-blue-700',
      suspended: 'bg-red-100 text-red-700',
      expired: 'bg-amber-100 text-amber-700',
      cancelled: 'bg-slate-100 text-slate-500'
    }
    const labels = { active: 'Actif', trial: 'Essai', suspended: 'Suspendu', expired: 'Expiré', cancelled: 'Annulé' }
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.active}`}>{labels[status] || status}</span>
  }

  const getPlanBadge = (plan) => {
    const p = PLANS[plan] || PLANS.basic
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${p.color}-100 text-${p.color}-700`}>
        {p.name.toUpperCase()}
      </span>
    )
  }

  if (loading) {
    return <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Abonnements</h1>
          <p className="text-slate-500">Gestion des plans et souscriptions</p>
        </div>
        <Button onClick={() => { setForm({ hotel_id: '', plan: 'pro', payment_frequency: 'monthly', trial_type: 'free_15_days', custom_max_users: '', custom_price_monthly: '', notes: '' }); setShowModal(true) }} className="bg-violet-600 hover:bg-violet-700 gap-2">
          <Plus className="w-4 h-4" />
          Nouvel abonnement
        </Button>
      </div>

      {/* Plans Overview */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(PLANS).map(([key, plan]) => (
          <div key={key} className={`bg-white rounded-xl border-2 ${key === 'pro' ? 'border-violet-300' : 'border-slate-200'} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">{plan.name}</h3>
              {key === 'pro' && <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded">Populaire</span>}
            </div>
            <p className="text-3xl font-bold text-slate-900">{plan.price}€<span className="text-sm font-normal text-slate-500">/mois</span></p>
            <p className="text-sm text-slate-500 mt-2">{plan.users === -1 ? 'Utilisateurs illimités' : `${plan.users} utilisateurs`}</p>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-slate-600">{plan.modules.join(', ')}</p>
            </div>
            <p className="text-xs text-slate-400 mt-2">{subscriptions.filter(s => s.plan === key).length} clients</p>
          </div>
        ))}
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Hôtel</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Plan</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Statut</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Utilisateurs</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Échéance</th>
              <th className="w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subscriptions.map((sub, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-900">{sub.hotel_name}</td>
                <td className="p-4">{getPlanBadge(sub.plan)}</td>
                <td className="p-4">{getStatusBadge(sub.status)}</td>
                <td className="p-4 text-sm">{sub.users_count} / {sub.max_users === -1 ? '∞' : sub.max_users}</td>
                <td className="p-4 text-sm text-slate-600">{sub.end_date ? new Date(sub.end_date).toLocaleDateString('fr-FR') : '-'}</td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/superadmin/hotels/${sub.hotel_id}`)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {sub.status === 'active' && (
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleCancel(sub.hotel_id)}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {subscriptions.length === 0 && (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aucun abonnement</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvel Abonnement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Hôtel *</Label>
              <Select value={form.hotel_id} onValueChange={(v) => setForm({...form, hotel_id: v})}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un hôtel" /></SelectTrigger>
                <SelectContent>
                  {hotels.filter(h => !h.subscription_plan).map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Plan *</Label>
                <Select value={form.plan} onValueChange={(v) => setForm({...form, plan: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLANS).map(([k, p]) => (
                      <SelectItem key={k} value={k}>{p.name} - {p.price}€/mois</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fréquence</Label>
                <Select value={form.payment_frequency} onValueChange={(v) => setForm({...form, payment_frequency: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="annual">Annuel (-5%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Période d'essai</Label>
              <Select value={form.trial_type} onValueChange={(v) => setForm({...form, trial_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free_15_days">15 jours gratuits</SelectItem>
                  <SelectItem value="half_price_first_month">-50% premier mois</SelectItem>
                  <SelectItem value="none">Aucune</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Utilisateurs max (optionnel)</Label>
                <Input type="number" value={form.custom_max_users} onChange={(e) => setForm({...form, custom_max_users: e.target.value})} placeholder="Défaut du plan" />
              </div>
              <div>
                <Label>Prix mensuel (optionnel)</Label>
                <Input type="number" value={form.custom_price_monthly} onChange={(e) => setForm({...form, custom_price_monthly: e.target.value})} placeholder="Défaut du plan" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
              <Button onClick={handleCreate} className="bg-violet-600 hover:bg-violet-700">Créer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== USERS PAGE ====================
export const SAUsers = ({ api }) => {
  const [hotels, setHotels] = useState([])
  const [selectedHotel, setSelectedHotel] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ first_name: '', last_name: '', email: '', role: 'reception' })

  const fetchHotels = async () => {
    try {
      const res = await api.get('/api/superadmin/hotels')
      setHotels(res.data)
      if (res.data.length > 0 && !selectedHotel) {
        setSelectedHotel(res.data[0])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async (hotelId) => {
    if (!hotelId) return
    try {
      const res = await api.get(`/api/superadmin/hotels/${hotelId}/users`)
      setUsers(res.data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => { fetchHotels() }, [api])
  useEffect(() => { if (selectedHotel) fetchUsers(selectedHotel.id) }, [selectedHotel])

  const handleInvite = async () => {
    if (!selectedHotel) return
    try {
      await api.post(`/api/superadmin/hotels/${selectedHotel.id}/users/invite`, {
        ...inviteForm,
        hotel_id: selectedHotel.id
      })
      toast.success('Invitation envoyée')
      setShowInviteModal(false)
      setInviteForm({ first_name: '', last_name: '', email: '', role: 'reception' })
      fetchUsers(selectedHotel.id)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur')
    }
  }

  const handleRemoveUser = async (userId) => {
    if (!confirm('Supprimer cet utilisateur ?')) return
    try {
      await api.delete(`/api/superadmin/users/${userId}`)
      toast.success('Utilisateur supprimé')
      fetchUsers(selectedHotel.id)
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const getStatusBadge = (status) => {
    const styles = { invited: 'bg-amber-100 text-amber-700', active: 'bg-emerald-100 text-emerald-700', suspended: 'bg-red-100 text-red-700' }
    const labels = { invited: 'Invité', active: 'Actif', suspended: 'Suspendu' }
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.active}`}>{labels[status] || status}</span>
  }

  if (loading) {
    return <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Utilisateurs</h1>
          <p className="text-slate-500">Gestion des utilisateurs par hôtel</p>
        </div>
        {selectedHotel && (
          <Button onClick={() => setShowInviteModal(true)} className="bg-violet-600 hover:bg-violet-700 gap-2">
            <Mail className="w-4 h-4" />
            Inviter un utilisateur
          </Button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Hotels List */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800 mb-4">Hôtels</h3>
          <div className="space-y-2">
            {hotels.map(hotel => (
              <button
                key={hotel.id}
                onClick={() => setSelectedHotel(hotel)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedHotel?.id === hotel.id ? 'bg-violet-100 text-violet-900' : 'hover:bg-slate-50'
                }`}
              >
                <p className="font-medium text-sm">{hotel.name}</p>
                <p className="text-xs text-slate-500">{hotel.users_count} / {hotel.max_users === -1 ? '∞' : hotel.max_users} utilisateurs</p>
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
          {selectedHotel ? (
            <>
              <div className="p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800">{selectedHotel.name}</h3>
                <p className="text-sm text-slate-500">
                  {users.length} utilisateur(s) - Limite: {selectedHotel.max_users === -1 ? 'Illimité' : selectedHotel.max_users}
                </p>
              </div>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Utilisateur</th>
                    <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Rôle</th>
                    <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Statut</th>
                    <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Ajouté le</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-medium text-slate-900">{user.first_name} {user.last_name}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </td>
                      <td className="p-4 capitalize text-sm">{ROLES.find(r => r.value === user.role)?.label || user.role}</td>
                      <td className="p-4">{getStatusBadge(user.status)}</td>
                      <td className="p-4 text-sm text-slate-600">{new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
                      <td className="p-4">
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleRemoveUser(user.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Aucun utilisateur</p>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Sélectionnez un hôtel</p>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Inviter un utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prénom *</Label>
                <Input value={inviteForm.first_name} onChange={(e) => setInviteForm({...inviteForm, first_name: e.target.value})} />
              </div>
              <div>
                <Label>Nom *</Label>
                <Input value={inviteForm.last_name} onChange={(e) => setInviteForm({...inviteForm, last_name: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})} />
            </div>
            <div>
              <Label>Rôle *</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({...inviteForm, role: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowInviteModal(false)}>Annuler</Button>
              <Button onClick={handleInvite} className="bg-violet-600 hover:bg-violet-700">Envoyer l'invitation</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== INVOICES PAGE ====================
export const SAInvoices = ({ api }) => {
  const [invoices, setInvoices] = useState([])
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterHotel, setFilterHotel] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedHotelId, setSelectedHotelId] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [invoicesRes, hotelsRes] = await Promise.all([
        api.get('/api/superadmin/invoices'),
        api.get('/api/superadmin/hotels')
      ])
      setInvoices(invoicesRes.data)
      setHotels(hotelsRes.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [api])

  const handleGenerate = async () => {
    if (!selectedHotelId) {
      toast.error('Sélectionnez un hôtel')
      return
    }
    try {
      await api.post(`/api/superadmin/invoices/generate?hotel_id=${selectedHotelId}`)
      toast.success('Facture générée')
      setShowGenerateModal(false)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur')
    }
  }

  const handleDownloadPdf = async (invoiceId, invoiceNumber) => {
    try {
      const res = await api.get(`/api/superadmin/invoices/${invoiceId}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${invoiceNumber}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      toast.error('Erreur téléchargement')
    }
  }

  const filteredInvoices = invoices.filter(inv => {
    if (filterHotel && inv.hotel_id !== filterHotel) return false
    if (filterStatus && inv.status !== filterStatus) return false
    return true
  })

  const getStatusBadge = (status) => {
    const styles = { draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700', paid: 'bg-emerald-100 text-emerald-700', overdue: 'bg-red-100 text-red-700' }
    const labels = { draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée', overdue: 'En retard' }
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.draft}`}>{labels[status] || status}</span>
  }

  // Calculate totals
  const totalHT = invoices.reduce((sum, inv) => sum + (inv.status === 'paid' ? inv.amount_ht : 0), 0)
  const totalTTC = invoices.reduce((sum, inv) => sum + (inv.status === 'paid' ? inv.amount_ttc : 0), 0)
  const pendingAmount = invoices.reduce((sum, inv) => sum + (['sent', 'overdue'].includes(inv.status) ? inv.amount_ttc : 0), 0)

  if (loading) {
    return <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Facturation</h1>
          <p className="text-slate-500">Factures et paiements</p>
        </div>
        <Button onClick={() => setShowGenerateModal(true)} className="bg-violet-600 hover:bg-violet-700 gap-2">
          <Plus className="w-4 h-4" />
          Générer une facture
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Total Facturé (HT)</p>
          <p className="text-2xl font-bold text-slate-900">{totalHT.toFixed(2)} €</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Total Encaissé (TTC)</p>
          <p className="text-2xl font-bold text-emerald-600">{totalTTC.toFixed(2)} €</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">En attente</p>
          <p className="text-2xl font-bold text-amber-600">{pendingAmount.toFixed(2)} €</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Factures ce mois</p>
          <p className="text-2xl font-bold text-slate-900">{invoices.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={filterHotel || "all"} onValueChange={(v) => setFilterHotel(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tous les hôtels" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les hôtels</SelectItem>
            {hotels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="sent">Envoyée</SelectItem>
            <SelectItem value="paid">Payée</SelectItem>
            <SelectItem value="overdue">En retard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">N° Facture</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Client</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Période</th>
              <th className="text-right p-4 text-xs font-semibold text-slate-500 uppercase">Montant TTC</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Statut</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Échéance</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInvoices.map(inv => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-900">{inv.number}</td>
                <td className="p-4 text-sm">{inv.hotel_name}</td>
                <td className="p-4 text-sm text-slate-600">{inv.period_start} - {inv.period_end}</td>
                <td className="p-4 text-right font-medium">{inv.amount_ttc.toFixed(2)} €</td>
                <td className="p-4">{getStatusBadge(inv.status)}</td>
                <td className="p-4 text-sm text-slate-600">{inv.due_date}</td>
                <td className="p-4">
                  <Button variant="ghost" size="sm" onClick={() => handleDownloadPdf(inv.id, inv.number)}>
                    <Download className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredInvoices.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aucune facture</p>
          </div>
        )}
      </div>

      {/* Generate Modal */}
      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Générer une facture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Hôtel *</Label>
              <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un hôtel" /></SelectTrigger>
                <SelectContent>
                  {hotels.filter(h => h.subscription_plan).map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-slate-500">
              La facture sera générée pour la période en cours selon l'abonnement actif.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowGenerateModal(false)}>Annuler</Button>
              <Button onClick={handleGenerate} className="bg-violet-600 hover:bg-violet-700">Générer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== HOTEL DETAIL PAGE ====================
export const SAHotelDetail = ({ api }) => {
  const { hotelId } = useParams()
  const navigate = useNavigate()
  const [hotel, setHotel] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [users, setUsers] = useState([])
  const [signatureRequests, setSignatureRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSignModal, setShowSignModal] = useState(false)
  const [signForm, setSignForm] = useState({ document_type: 'contract', signer_email: '', signer_name: '', test_mode: true })

  const fetchData = async () => {
    try {
      const [hotelRes, usersRes, sigRes] = await Promise.all([
        api.get(`/api/superadmin/hotels/${hotelId}`),
        api.get(`/api/superadmin/hotels/${hotelId}/users`),
        api.get(`/api/superadmin/signature/requests/${hotelId}`)
      ])
      setHotel(hotelRes.data)
      setUsers(usersRes.data)
      setSignatureRequests(sigRes.data)
      
      if (hotelRes.data.subscription_plan) {
        const subRes = await api.get(`/api/superadmin/subscriptions/${hotelId}`)
        setSubscription(subRes.data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [hotelId])

  const handleSendForSignature = async () => {
    try {
      await api.post('/api/superadmin/signature/send', { hotel_id: hotelId, ...signForm })
      toast.success('Document envoyé pour signature')
      setShowSignModal(false)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur')
    }
  }

  const handleDownloadContract = async () => {
    try {
      const res = await api.get(`/api/superadmin/hotels/${hotelId}/contract/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `contrat-${hotel?.name?.replace(/\s+/g, '-')}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handleDownloadSepa = async () => {
    try {
      const res = await api.get(`/api/superadmin/hotels/${hotelId}/sepa-mandate/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `sepa-${hotel?.name?.replace(/\s+/g, '-')}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  if (loading) {
    return <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (!hotel) {
    return <div className="p-6">Hôtel non trouvé</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/superadmin/hotels')} className="text-sm text-slate-500 hover:text-slate-700 mb-2">&larr; Retour aux hôtels</button>
          <h1 className="text-2xl font-bold text-slate-900">{hotel.name}</h1>
          <p className="text-slate-500">{hotel.city}, {hotel.country}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadContract} className="gap-2">
            <Download className="w-4 h-4" />
            Contrat PDF
          </Button>
          <Button variant="outline" onClick={handleDownloadSepa} className="gap-2">
            <Download className="w-4 h-4" />
            Mandat SEPA
          </Button>
          <Button onClick={() => { setSignForm({ document_type: 'contract', signer_email: hotel.contact_email, signer_name: hotel.contact_name, test_mode: true }); setShowSignModal(true) }} className="bg-violet-600 hover:bg-violet-700 gap-2">
            <PenTool className="w-4 h-4" />
            Signature électronique
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Hotel Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Informations</h3>
          <div className="space-y-3 text-sm">
            <div><span className="text-slate-500">Raison sociale:</span> <span className="font-medium">{hotel.legal_name}</span></div>
            <div><span className="text-slate-500">Adresse:</span> <span className="font-medium">{hotel.address}</span></div>
            <div><span className="text-slate-500">SIRET:</span> <span className="font-medium">{hotel.siret}</span></div>
            <div><span className="text-slate-500">Contact:</span> <span className="font-medium">{hotel.contact_name}</span></div>
            <div><span className="text-slate-500">Email:</span> <span className="font-medium">{hotel.contact_email}</span></div>
            <div><span className="text-slate-500">Téléphone:</span> <span className="font-medium">{hotel.contact_phone}</span></div>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Abonnement</h3>
          {subscription ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full bg-violet-100 text-violet-700`}>
                  {subscription.plan_name}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${subscription.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {subscription.status === 'active' ? 'Actif' : subscription.status}
                </span>
              </div>
              <div><span className="text-slate-500">Prix:</span> <span className="font-medium">{subscription.price_effective}€/{subscription.payment_frequency === 'monthly' ? 'mois' : 'an'}</span></div>
              <div><span className="text-slate-500">Utilisateurs:</span> <span className="font-medium">{users.length} / {subscription.max_users === -1 ? '∞' : subscription.max_users}</span></div>
              <div><span className="text-slate-500">Modules:</span> <span className="font-medium">{subscription.modules?.join(', ').toUpperCase()}</span></div>
              <div><span className="text-slate-500">Fin:</span> <span className="font-medium">{new Date(subscription.end_date).toLocaleDateString('fr-FR')}</span></div>
            </div>
          ) : (
            <p className="text-slate-500">Aucun abonnement actif</p>
          )}
        </div>

        {/* Signature Requests */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Signatures Électroniques</h3>
          {signatureRequests.length > 0 ? (
            <div className="space-y-2">
              {signatureRequests.slice(0, 5).map(req => (
                <div key={req.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div>
                    <p className="text-sm font-medium capitalize">{req.document_type.replace('_', ' ')}</p>
                    <p className="text-xs text-slate-500">{req.signer_name}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    req.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    req.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {req.status === 'completed' ? 'Signé' : req.status === 'sent' ? 'En attente' : req.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Aucune demande</p>
          )}
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Utilisateurs ({users.length})</h3>
        {users.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {users.map(user => (
              <div key={user.id} className="p-3 border border-slate-200 rounded-lg">
                <p className="font-medium">{user.first_name} {user.last_name}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
                <p className="text-xs text-slate-400 capitalize">{ROLES.find(r => r.value === user.role)?.label || user.role}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">Aucun utilisateur</p>
        )}
      </div>

      {/* Signature Modal */}
      <Dialog open={showSignModal} onOpenChange={setShowSignModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer pour signature électronique</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Type de document</Label>
              <Select value={signForm.document_type} onValueChange={(v) => setSignForm({...signForm, document_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Contrat d'abonnement</SelectItem>
                  <SelectItem value="sepa_mandate">Mandat SEPA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email du signataire *</Label>
              <Input value={signForm.signer_email} onChange={(e) => setSignForm({...signForm, signer_email: e.target.value})} />
            </div>
            <div>
              <Label>Nom du signataire *</Label>
              <Input value={signForm.signer_name} onChange={(e) => setSignForm({...signForm, signer_name: e.target.value})} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={signForm.test_mode} onChange={(e) => setSignForm({...signForm, test_mode: e.target.checked})} className="rounded" />
              <Label className="cursor-pointer">Mode test (signatures non juridiquement valides)</Label>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowSignModal(false)}>Annuler</Button>
              <Button onClick={handleSendForSignature} className="bg-violet-600 hover:bg-violet-700 gap-2">
                <Send className="w-4 h-4" />
                Envoyer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
