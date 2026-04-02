/**
 * Super Admin - Subscription Lifecycle Management
 * Manage hotel subscriptions: pause, reactivate, upgrade, downgrade
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { 
  CreditCard, Building2, Users, Search, Filter, Eye,
  Pause, Play, ArrowUp, ArrowDown, AlertTriangle, 
  CheckCircle, XCircle, Clock, Euro, Calendar, MoreHorizontal,
  RefreshCw, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Status badge styles
const STATUS_STYLES = {
  active: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Actif', icon: CheckCircle },
  trial: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Essai', icon: Clock },
  paused: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En pause', icon: Pause },
  expired: { bg: 'bg-red-100', text: 'text-red-700', label: 'Expiré', icon: XCircle },
  cancelled: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Annulé', icon: XCircle }
}

// ==================== SUBSCRIPTIONS LIFECYCLE PAGE ====================
export const SASubscriptionsLifecycle = ({ api }) => {
  const navigate = useNavigate()
  const [subscriptions, setSubscriptions] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [search, setSearch] = useState('')
  
  // Modal states
  const [pauseModal, setPauseModal] = useState({ open: false, sub: null })
  const [reactivateModal, setReactivateModal] = useState({ open: false, sub: null })
  const [upgradeModal, setUpgradeModal] = useState({ open: false, sub: null })
  const [downgradeModal, setDowngradeModal] = useState({ open: false, sub: null })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [subsRes, plansRes] = await Promise.all([
        api.get('/api/superadmin/subscriptions/list'),
        api.get('/api/superadmin/catalog/plans?include_inactive=false')
      ])
      setSubscriptions(subsRes.data)
      setPlans(plansRes.data)
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      // Try legacy endpoint if new one fails
      try {
        const hotelsRes = await api.get('/api/superadmin/hotels')
        const subs = hotelsRes.data
          .filter(h => h.subscription_plan)
          .map(h => ({
            id: h.id,
            hotel_id: h.id,
            hotel_name: h.name,
            plan_name: h.subscription_plan,
            plan_code: h.subscription_plan,
            status: h.subscription_status || 'active',
            max_users: h.max_users,
            current_users: h.users_count,
            end_date: h.subscription_end_date
          }))
        setSubscriptions(subs)
      } catch (e) {
        toast.error('Erreur de chargement')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [api])

  // Filter subscriptions
  const filteredSubs = subscriptions.filter(sub => {
    if (filterStatus && sub.status !== filterStatus) return false
    if (filterPlan && sub.plan_id !== filterPlan && sub.plan_code !== filterPlan) return false
    if (search) {
      const searchLower = search.toLowerCase()
      if (!sub.hotel_name?.toLowerCase().includes(searchLower)) return false
    }
    return true
  })

  // Stats
  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    trial: subscriptions.filter(s => s.status === 'trial').length,
    paused: subscriptions.filter(s => s.status === 'paused').length,
    mrr: subscriptions.reduce((sum, s) => sum + (s.status === 'active' ? (s.price_effective || 0) : 0), 0)
  }

  const getStatusBadge = (status) => {
    const style = STATUS_STYLES[status] || STATUS_STYLES.active
    const Icon = style.icon
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {style.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Abonnements</h1>
          <p className="text-slate-500">Cycle de vie et actions rapides</p>
        </div>
        <Button onClick={fetchData} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4">
          <p className="text-sm text-emerald-600">Actifs</p>
          <p className="text-2xl font-bold text-emerald-700">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <p className="text-sm text-blue-600">En essai</p>
          <p className="text-2xl font-bold text-blue-700">{stats.trial}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <p className="text-sm text-amber-600">En pause</p>
          <p className="text-2xl font-bold text-amber-700">{stats.paused}</p>
        </div>
        <div className="bg-white rounded-xl border border-violet-200 p-4">
          <p className="text-sm text-violet-600">MRR</p>
          <p className="text-2xl font-bold text-violet-700">{stats.mrr.toFixed(0)}€</p>
        </div>
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
        <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="trial">En essai</SelectItem>
            <SelectItem value="paused">En pause</SelectItem>
            <SelectItem value="expired">Expiré</SelectItem>
          </SelectContent>
        </Select>
        {plans.length > 0 && (
          <Select value={filterPlan || "all"} onValueChange={(v) => setFilterPlan(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tous les plans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les plans</SelectItem>
              {plans.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Prix</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-500 uppercase">Échéance</th>
              <th className="w-40 text-center p-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSubs.map(sub => (
              <tr key={sub.id} className="hover:bg-slate-50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{sub.hotel_name}</p>
                      <p className="text-xs text-slate-500">ID: {sub.hotel_id?.slice(0, 8)}...</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="px-2.5 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                    {sub.plan_name || sub.plan_code?.toUpperCase()}
                  </span>
                </td>
                <td className="p-4">{getStatusBadge(sub.status)}</td>
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-sm">{sub.current_users || 0} / {sub.max_users === -1 ? '∞' : sub.max_users}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="font-medium">{sub.price_effective || sub.price_monthly || '-'}€</span>
                  <span className="text-slate-500 text-xs">/mois</span>
                </td>
                <td className="p-4 text-sm text-slate-600">
                  {sub.end_date ? new Date(sub.end_date).toLocaleDateString('fr-FR') : '-'}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-1">
                    {/* Quick Action Buttons */}
                    {sub.status === 'active' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={() => setPauseModal({ open: true, sub })}
                        title="Mettre en pause"
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    )}
                    {sub.status === 'paused' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={() => setReactivateModal({ open: true, sub })}
                        title="Réactiver"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {/* More Actions Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/superadmin/hotels/${sub.hotel_id}`)}>
                          <Eye className="w-4 h-4 mr-2" /> Voir détails
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {sub.status !== 'paused' && sub.status !== 'cancelled' && (
                          <>
                            <DropdownMenuItem onClick={() => setUpgradeModal({ open: true, sub })}>
                              <ArrowUp className="w-4 h-4 mr-2 text-emerald-600" /> Upgrader
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDowngradeModal({ open: true, sub })}>
                              <ArrowDown className="w-4 h-4 mr-2 text-amber-600" /> Downgrader
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredSubs.length === 0 && (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aucun abonnement trouvé</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <PauseModal 
        open={pauseModal.open} 
        onOpenChange={(open) => setPauseModal({ ...pauseModal, open })}
        subscription={pauseModal.sub}
        api={api}
        onSuccess={fetchData}
      />
      <ReactivateModal 
        open={reactivateModal.open} 
        onOpenChange={(open) => setReactivateModal({ ...reactivateModal, open })}
        subscription={reactivateModal.sub}
        api={api}
        onSuccess={fetchData}
      />
      <UpgradeModal 
        open={upgradeModal.open} 
        onOpenChange={(open) => setUpgradeModal({ ...upgradeModal, open })}
        subscription={upgradeModal.sub}
        plans={plans}
        api={api}
        onSuccess={fetchData}
      />
      <DowngradeModal 
        open={downgradeModal.open} 
        onOpenChange={(open) => setDowngradeModal({ ...downgradeModal, open })}
        subscription={downgradeModal.sub}
        plans={plans}
        api={api}
        onSuccess={fetchData}
      />
    </div>
  )
}

// ==================== PAUSE MODAL ====================
const PauseModal = ({ open, onOpenChange, subscription, api, onSuccess }) => {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePause = async () => {
    if (!subscription) return
    setLoading(true)
    try {
      await api.post(`/api/superadmin/subscriptions/${subscription.id}/pause`, { reason })
      toast.success('Abonnement mis en pause')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause className="w-5 h-5 text-amber-600" />
            Mettre en pause l'abonnement
          </DialogTitle>
          <DialogDescription>
            L'accès sera suspendu mais les données seront conservées. La facturation sera interrompue.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-800">
              <strong>{subscription?.hotel_name}</strong> - Plan {subscription?.plan_name || subscription?.plan_code}
            </p>
          </div>
          
          <div>
            <Label>Raison de la pause (optionnel)</Label>
            <Input 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              placeholder="Ex: Fermeture temporaire, impayé..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handlePause} className="bg-amber-600 hover:bg-amber-700" disabled={loading}>
            {loading ? 'Mise en pause...' : 'Confirmer la pause'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ==================== REACTIVATE MODAL ====================
const ReactivateModal = ({ open, onOpenChange, subscription, api, onSuccess }) => {
  const [resumeBilling, setResumeBilling] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleReactivate = async () => {
    if (!subscription) return
    setLoading(true)
    try {
      await api.post(`/api/superadmin/subscriptions/${subscription.id}/reactivate`, { resume_billing: resumeBilling })
      toast.success('Abonnement réactivé')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-emerald-600" />
            Réactiver l'abonnement
          </DialogTitle>
          <DialogDescription>
            Restaurer l'accès et reprendre la facturation
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-emerald-800">
              <strong>{subscription?.hotel_name}</strong> - Plan {subscription?.plan_name || subscription?.plan_code}
            </p>
            {subscription?.paused_reason && (
              <p className="text-xs text-emerald-600 mt-1">Raison pause: {subscription.paused_reason}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Switch checked={resumeBilling} onCheckedChange={setResumeBilling} />
            <Label className="cursor-pointer">Reprendre la facturation</Label>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Si activé, la période d'abonnement sera prolongée de la durée de la pause.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleReactivate} className="bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
            {loading ? 'Réactivation...' : 'Réactiver'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ==================== UPGRADE MODAL ====================
const UpgradeModal = ({ open, onOpenChange, subscription, plans, api, onSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState('')
  const [applyImmediately, setApplyImmediately] = useState(true)
  const [checkResult, setCheckResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)

  // Filter plans for upgrade (higher price)
  const availablePlans = plans.filter(p => {
    const currentPrice = subscription?.price_effective || subscription?.price_monthly || 0
    return p.price_monthly > currentPrice
  })

  const handleCheck = async () => {
    if (!selectedPlan || !subscription) return
    setChecking(true)
    try {
      const res = await api.post(`/api/superadmin/subscriptions/${subscription.id}/upgrade/check`, {
        new_plan_id: selectedPlan,
        apply_immediately: applyImmediately,
        prorate: true
      })
      setCheckResult(res.data)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur vérification')
    } finally {
      setChecking(false)
    }
  }

  const handleUpgrade = async () => {
    if (!selectedPlan || !subscription) return
    setLoading(true)
    try {
      await api.post(`/api/superadmin/subscriptions/${subscription.id}/upgrade`, {
        new_plan_id: selectedPlan,
        apply_immediately: applyImmediately,
        prorate: true
      })
      toast.success(applyImmediately ? 'Abonnement upgradé' : 'Upgrade programmé')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedPlan) handleCheck()
  }, [selectedPlan, applyImmediately])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUp className="w-5 h-5 text-emerald-600" />
            Upgrader l'abonnement
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm"><strong>{subscription?.hotel_name}</strong></p>
            <p className="text-xs text-slate-500">
              Plan actuel: {subscription?.plan_name || subscription?.plan_code} ({subscription?.price_effective || subscription?.price_monthly}€/mois)
            </p>
          </div>
          
          <div>
            <Label>Nouveau plan</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un plan" /></SelectTrigger>
              <SelectContent>
                {availablePlans.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} - {p.price_monthly}€/mois
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={applyImmediately} onCheckedChange={setApplyImmediately} />
            <Label className="cursor-pointer">Appliquer immédiatement</Label>
          </div>

          {checkResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-emerald-800">Résumé de l'upgrade</p>
              <div className="text-sm text-emerald-700 space-y-1">
                <p>Nouveau prix: {checkResult.new_price}€/mois (+{checkResult.price_difference}€)</p>
                {checkResult.prorate_amount > 0 && (
                  <p>Prorata à facturer: {checkResult.prorate_amount}€</p>
                )}
                {checkResult.added_modules?.length > 0 && (
                  <p>Modules ajoutés: {checkResult.added_modules.join(', ')}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button 
            onClick={handleUpgrade} 
            className="bg-emerald-600 hover:bg-emerald-700" 
            disabled={loading || !selectedPlan}
          >
            {loading ? 'Upgrade...' : 'Confirmer l\'upgrade'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ==================== DOWNGRADE MODAL ====================
const DowngradeModal = ({ open, onOpenChange, subscription, plans, api, onSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState('')
  const [applyImmediately, setApplyImmediately] = useState(false)
  const [action, setAction] = useState('block')
  const [checkResult, setCheckResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)

  // Filter plans for downgrade (lower price)
  const availablePlans = plans.filter(p => {
    const currentPrice = subscription?.price_effective || subscription?.price_monthly || 0
    return p.price_monthly < currentPrice
  })

  const handleCheck = async () => {
    if (!selectedPlan || !subscription) return
    setChecking(true)
    try {
      const res = await api.post(`/api/superadmin/subscriptions/${subscription.id}/downgrade/check`, {
        new_plan_id: selectedPlan,
        action_on_excess_users: action,
        apply_immediately: applyImmediately
      })
      setCheckResult(res.data)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur vérification')
    } finally {
      setChecking(false)
    }
  }

  const handleDowngrade = async () => {
    if (!selectedPlan || !subscription) return
    if (checkResult && !checkResult.is_compatible) {
      toast.error('Downgrade non compatible')
      return
    }
    setLoading(true)
    try {
      await api.post(`/api/superadmin/subscriptions/${subscription.id}/downgrade`, {
        new_plan_id: selectedPlan,
        action_on_excess_users: action,
        apply_immediately: applyImmediately
      })
      toast.success(applyImmediately ? 'Abonnement downgradé' : 'Downgrade programmé')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedPlan) handleCheck()
  }, [selectedPlan, applyImmediately, action])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDown className="w-5 h-5 text-amber-600" />
            Downgrader l'abonnement
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm"><strong>{subscription?.hotel_name}</strong></p>
            <p className="text-xs text-slate-500">
              Plan actuel: {subscription?.plan_name || subscription?.plan_code} ({subscription?.price_effective || subscription?.price_monthly}€/mois)
            </p>
            <p className="text-xs text-slate-500">
              Utilisateurs: {subscription?.current_users} / {subscription?.max_users === -1 ? '∞' : subscription?.max_users}
            </p>
          </div>
          
          <div>
            <Label>Nouveau plan</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un plan" /></SelectTrigger>
              <SelectContent>
                {availablePlans.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} - {p.price_monthly}€/mois ({p.max_users === -1 ? '∞' : p.max_users} users)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>En cas de dépassement utilisateurs</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="block">Bloquer le downgrade</SelectItem>
                <SelectItem value="disable_excess">Désactiver les utilisateurs excédentaires</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={applyImmediately} onCheckedChange={setApplyImmediately} />
            <Label className="cursor-pointer">Appliquer immédiatement (sinon à la prochaine échéance)</Label>
          </div>

          {checkResult && (
            <div className={`border rounded-lg p-4 space-y-2 ${checkResult.is_compatible ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-sm font-medium ${checkResult.is_compatible ? 'text-emerald-800' : 'text-red-800'}`}>
                {checkResult.is_compatible ? 'Downgrade possible' : 'Downgrade bloqué'}
              </p>
              <p className={`text-sm ${checkResult.is_compatible ? 'text-emerald-700' : 'text-red-700'}`}>
                {checkResult.message}
              </p>
              {checkResult.excess_users > 0 && (
                <p className="text-sm text-amber-700">
                  {checkResult.excess_users} utilisateur(s) en excès: {checkResult.excess_user_emails?.join(', ')}
                </p>
              )}
              {checkResult.removed_modules?.length > 0 && (
                <p className="text-sm text-amber-700">
                  Modules retirés: {checkResult.removed_modules.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button 
            onClick={handleDowngrade} 
            className="bg-amber-600 hover:bg-amber-700" 
            disabled={loading || !selectedPlan || (checkResult && !checkResult.is_compatible)}
          >
            {loading ? 'Downgrade...' : 'Confirmer le downgrade'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SASubscriptionsLifecycle
