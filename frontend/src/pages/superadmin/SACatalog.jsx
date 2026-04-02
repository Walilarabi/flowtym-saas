/**
 * Super Admin - Subscription Catalog Management
 * Create, edit, and manage subscription plans with modules and features
 */
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { 
  Package, Plus, Edit, Trash2, Eye, Check, X, Settings, 
  Users, Euro, Calendar, Star, Building2, Globe, Heart, 
  TrendingUp, Megaphone, ShoppingCart, Wrench, CreditCard,
  ChevronDown, ChevronRight, ToggleLeft, ToggleRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Module icons mapping
const MODULE_ICONS = {
  pms: Building2,
  staff: Users,
  channel_manager: Globe,
  crm: Heart,
  rms: TrendingUp,
  e_reputation: Star,
  operations: Wrench,
  booking_engine: ShoppingCart,
  finance: Euro,
  marketing: Megaphone
}

// ==================== CATALOG PAGE ====================
export const SACatalog = ({ api }) => {
  const [plans, setPlans] = useState([])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [expandedModules, setExpandedModules] = useState({})

  const fetchData = async () => {
    setLoading(true)
    try {
      const [plansRes, modulesRes] = await Promise.all([
        api.get('/api/superadmin/catalog/plans?include_inactive=true'),
        api.get('/api/superadmin/catalog/modules')
      ])
      setPlans(plansRes.data)
      setModules(modulesRes.data)
    } catch (error) {
      console.error('Error fetching catalog:', error)
      toast.error('Erreur de chargement du catalogue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [api])

  const handleDelete = async (planId) => {
    if (!confirm('Supprimer ce plan ?')) return
    try {
      const res = await api.delete(`/api/superadmin/catalog/plans/${planId}`)
      toast.success(res.data.message)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur')
    }
  }

  const handleEdit = (plan) => {
    setEditingPlan(plan)
    setShowModal(true)
  }

  const handleCreate = () => {
    setEditingPlan(null)
    setShowModal(true)
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
          <h1 className="text-2xl font-bold text-slate-900">Catalogue d'Abonnements</h1>
          <p className="text-slate-500">Créez et gérez vos plans d'abonnement</p>
        </div>
        <Button onClick={handleCreate} className="bg-violet-600 hover:bg-violet-700 gap-2">
          <Plus className="w-4 h-4" />
          Nouveau Plan
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {plans.map(plan => {
          const ModuleIcon = MODULE_ICONS[plan.modules?.[0]?.code] || Package
          return (
            <div 
              key={plan.id} 
              className={`bg-white rounded-xl border-2 ${plan.is_featured ? 'border-violet-300 shadow-lg' : 'border-slate-200'} overflow-hidden`}
            >
              {/* Header */}
              <div className={`p-5 ${plan.is_featured ? 'bg-violet-50' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${plan.is_featured ? 'bg-violet-100' : 'bg-slate-100'} flex items-center justify-center`}>
                      <Package className={`w-5 h-5 ${plan.is_featured ? 'text-violet-600' : 'text-slate-600'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                      <p className="text-xs text-slate-500">{plan.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.is_featured && (
                      <span className="px-2 py-0.5 text-xs bg-violet-100 text-violet-700 rounded-full">Populaire</span>
                    )}
                    {!plan.is_active && (
                      <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-500 rounded-full">Inactif</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{plan.description || 'Aucune description'}</p>
              </div>

              {/* Pricing */}
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900">{plan.price_monthly}€</span>
                  <span className="text-slate-500">/mois</span>
                </div>
                {plan.price_annual > 0 && (
                  <p className="text-sm text-slate-500 mt-1">
                    {plan.price_annual}€/an 
                    {plan.annual_discount_percent > 0 && (
                      <span className="text-emerald-600 ml-1">(-{plan.annual_discount_percent}%)</span>
                    )}
                  </p>
                )}
              </div>

              {/* Specs */}
              <div className="p-5 space-y-3 border-b border-slate-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Utilisateurs max</span>
                  <span className="font-medium">{plan.max_users === -1 ? 'Illimité' : plan.max_users}</span>
                </div>
                {plan.trial_days > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Période d'essai</span>
                    <span className="font-medium">{plan.trial_days} jours</span>
                  </div>
                )}
                {plan.commitment_months > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Engagement</span>
                    <span className="font-medium">{plan.commitment_months} mois</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Abonnés actifs</span>
                  <span className="font-semibold text-violet-600">{plan.subscribers_count || 0}</span>
                </div>
              </div>

              {/* Modules */}
              <div className="p-5 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Modules inclus</p>
                <div className="flex flex-wrap gap-2">
                  {plan.modules?.filter(m => m.enabled !== false).map(mod => {
                    const Icon = MODULE_ICONS[mod.code] || Package
                    return (
                      <span key={mod.code} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-700">
                        <Icon className="w-3 h-3" />
                        {mod.name}
                      </span>
                    )
                  })}
                  {(!plan.modules || plan.modules.length === 0) && (
                    <span className="text-sm text-slate-400">Aucun module</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(plan)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(plan.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )
        })}

        {plans.length === 0 && (
          <div className="col-span-full p-12 text-center bg-white rounded-xl border-2 border-dashed border-slate-200">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aucun plan créé</p>
            <Button onClick={handleCreate} variant="outline" className="mt-4">
              Créer le premier plan
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <PlanFormModal 
        open={showModal} 
        onOpenChange={setShowModal}
        plan={editingPlan}
        modules={modules}
        api={api}
        onSuccess={() => { setShowModal(false); fetchData(); }}
      />
    </div>
  )
}

// ==================== PLAN FORM MODAL ====================
const PlanFormModal = ({ open, onOpenChange, plan, modules, api, onSuccess }) => {
  const isEditing = !!plan
  
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    price_monthly: 99,
    price_annual: 1188,
    annual_discount_percent: 0,
    max_users: 5,
    trial_days: 14,
    commitment_months: 0,
    is_active: true,
    is_featured: false,
    sort_order: 0,
    modules: []
  })
  
  const [expandedModules, setExpandedModules] = useState({})
  const [saving, setSaving] = useState(false)

  // Initialize form when plan changes
  useEffect(() => {
    if (plan) {
      setForm({
        name: plan.name || '',
        code: plan.code || '',
        description: plan.description || '',
        price_monthly: plan.price_monthly || 99,
        price_annual: plan.price_annual || 1188,
        annual_discount_percent: plan.annual_discount_percent || 0,
        max_users: plan.max_users || 5,
        trial_days: plan.trial_days || 0,
        commitment_months: plan.commitment_months || 0,
        is_active: plan.is_active !== false,
        is_featured: plan.is_featured || false,
        sort_order: plan.sort_order || 0,
        modules: plan.modules || []
      })
    } else {
      // Reset for new plan
      setForm({
        name: '',
        code: '',
        description: '',
        price_monthly: 99,
        price_annual: 1188,
        annual_discount_percent: 0,
        max_users: 5,
        trial_days: 14,
        commitment_months: 0,
        is_active: true,
        is_featured: false,
        sort_order: 0,
        modules: []
      })
    }
  }, [plan, open])

  const toggleModule = (moduleCode) => {
    const existing = form.modules.find(m => m.code === moduleCode)
    if (existing) {
      // Remove module
      setForm({...form, modules: form.modules.filter(m => m.code !== moduleCode)})
    } else {
      // Add module with all features enabled
      const moduleDef = modules.find(m => m.code === moduleCode)
      if (moduleDef) {
        const features = Object.entries(moduleDef.features).map(([code, def]) => ({
          code,
          name: def.name,
          enabled: true
        }))
        setForm({
          ...form, 
          modules: [...form.modules, { code: moduleCode, name: moduleDef.name, enabled: true, features }]
        })
      }
    }
  }

  const toggleFeature = (moduleCode, featureCode) => {
    const moduleIndex = form.modules.findIndex(m => m.code === moduleCode)
    if (moduleIndex === -1) return
    
    const updatedModules = [...form.modules]
    const featureIndex = updatedModules[moduleIndex].features.findIndex(f => f.code === featureCode)
    
    if (featureIndex !== -1) {
      updatedModules[moduleIndex].features[featureIndex].enabled = !updatedModules[moduleIndex].features[featureIndex].enabled
    }
    
    setForm({...form, modules: updatedModules})
  }

  const isModuleEnabled = (moduleCode) => {
    return form.modules.some(m => m.code === moduleCode)
  }

  const isFeatureEnabled = (moduleCode, featureCode) => {
    const mod = form.modules.find(m => m.code === moduleCode)
    if (!mod) return false
    const feat = mod.features?.find(f => f.code === featureCode)
    return feat?.enabled || false
  }

  const handleSubmit = async () => {
    if (!form.name || !form.code) {
      toast.error('Nom et code requis')
      return
    }

    setSaving(true)
    try {
      // Convert modules to API format
      const apiModules = form.modules.map(m => ({
        code: m.code,
        enabled: true,
        features: m.features?.map(f => ({ code: f.code, enabled: f.enabled })) || []
      }))

      const payload = {
        ...form,
        modules: apiModules
      }

      if (isEditing) {
        await api.put(`/api/superadmin/catalog/plans/${plan.id}`, payload)
        toast.success('Plan mis à jour')
      } else {
        await api.post('/api/superadmin/catalog/plans', payload)
        toast.success('Plan créé')
      }
      onSuccess()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier le Plan' : 'Nouveau Plan d\'Abonnement'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 pt-4">
          {/* Left Column - Basic Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom du plan *</Label>
                <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Ex: Starter" />
              </div>
              <div>
                <Label>Code unique *</Label>
                <Input 
                  value={form.code} 
                  onChange={(e) => setForm({...form, code: e.target.value.toLowerCase().replace(/\s+/g, '_')})} 
                  placeholder="Ex: starter"
                  disabled={isEditing}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Description du plan" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prix mensuel (€)</Label>
                <Input type="number" value={form.price_monthly} onChange={(e) => setForm({...form, price_monthly: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Prix annuel (€)</Label>
                <Input type="number" value={form.price_annual} onChange={(e) => setForm({...form, price_annual: parseFloat(e.target.value) || 0})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Remise annuelle (%)</Label>
                <Input type="number" value={form.annual_discount_percent} onChange={(e) => setForm({...form, annual_discount_percent: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Utilisateurs max (-1 = illimité)</Label>
                <Input type="number" value={form.max_users} onChange={(e) => setForm({...form, max_users: parseInt(e.target.value) || 0})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Jours d'essai (0 = aucun)</Label>
                <Input type="number" value={form.trial_days} onChange={(e) => setForm({...form, trial_days: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Engagement (mois, 0 = aucun)</Label>
                <Input type="number" value={form.commitment_months} onChange={(e) => setForm({...form, commitment_months: parseInt(e.target.value) || 0})} />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({...form, is_active: v})} />
                <Label className="cursor-pointer">Actif</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({...form, is_featured: v})} />
                <Label className="cursor-pointer">Populaire</Label>
              </div>
            </div>
          </div>

          {/* Right Column - Modules & Features */}
          <div className="border-l border-slate-200 pl-6">
            <p className="font-semibold text-slate-800 mb-4">Modules & Fonctionnalités</p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {modules.map(mod => {
                const Icon = MODULE_ICONS[mod.code] || Package
                const isEnabled = isModuleEnabled(mod.code)
                const isExpanded = expandedModules[mod.code]
                
                return (
                  <div key={mod.code} className={`border rounded-lg overflow-hidden ${isEnabled ? 'border-violet-200 bg-violet-50/50' : 'border-slate-200'}`}>
                    {/* Module Header */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setExpandedModules({...expandedModules, [mod.code]: !isExpanded})}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <div className={`w-8 h-8 rounded-lg ${isEnabled ? 'bg-violet-100' : 'bg-slate-100'} flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 ${isEnabled ? 'text-violet-600' : 'text-slate-500'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{mod.name}</p>
                          <p className="text-xs text-slate-500">{Object.keys(mod.features).length} fonctionnalités</p>
                        </div>
                      </div>
                      <Switch checked={isEnabled} onCheckedChange={() => toggleModule(mod.code)} />
                    </div>

                    {/* Features List */}
                    {isExpanded && isEnabled && (
                      <div className="border-t border-slate-200 bg-white p-3 space-y-2">
                        {Object.entries(mod.features).map(([featCode, featDef]) => (
                          <div key={featCode} className="flex items-center justify-between py-1 pl-11">
                            <span className="text-sm text-slate-700">{featDef.name}</span>
                            <Switch 
                              checked={isFeatureEnabled(mod.code, featCode)} 
                              onCheckedChange={() => toggleFeature(mod.code, featCode)}
                              className="scale-75"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} className="bg-violet-600 hover:bg-violet-700" disabled={saving}>
            {saving ? 'Enregistrement...' : (isEditing ? 'Mettre à jour' : 'Créer le plan')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SACatalog
