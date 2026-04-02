/**
 * Super Admin - Hotel Management Page
 * Complete hotel configuration: info, subscription, modules, rooms, equipment, services
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { 
  Building2, Settings, CreditCard, Package, Bed, Wrench, Coffee,
  Users, ArrowLeft, Save, Plus, Trash2, Edit, ChevronRight, ChevronDown,
  ArrowUp, ArrowDown, Clock, Calendar, Euro, CheckCircle, XCircle,
  Pause, Play, ToggleLeft, ToggleRight, Globe, Phone, Mail, MapPin, Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Module icons
const MODULE_ICONS = {
  pms: Building2,
  staff: Users,
  channel_manager: Globe,
  crm: Users,
  rms: ArrowUp,
  e_reputation: Star,
  operations: Wrench,
  booking_engine: Globe,
  finance: Euro,
  marketing: Globe
}

// ==================== MAIN HOTEL MANAGEMENT PAGE ====================
export const SAHotelManagement = ({ api }) => {
  const { hotelId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Data states
  const [hotel, setHotel] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [roomTypes, setRoomTypes] = useState([])
  const [rooms, setRooms] = useState([])
  const [equipment, setEquipment] = useState([])
  const [services, setServices] = useState([])
  const [plans, setPlans] = useState([])
  const [allModules, setAllModules] = useState([])
  
  // Form states
  const [hotelForm, setHotelForm] = useState({})
  
  // Modal states
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showModulesModal, setShowModulesModal] = useState(false)
  const [showRoomTypeModal, setShowRoomTypeModal] = useState(false)
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [showEquipmentModal, setShowEquipmentModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [showTrialModal, setShowTrialModal] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [configRes, plansRes, modulesRes] = await Promise.all([
        api.get(`/api/superadmin/hotels/${hotelId}/config`),
        api.get('/api/superadmin/catalog/plans'),
        api.get('/api/superadmin/catalog/modules')
      ])
      
      setHotel(configRes.data.hotel)
      setHotelForm(configRes.data.hotel)
      setSubscription(configRes.data.subscription)
      setRoomTypes(configRes.data.room_types || [])
      setRooms(configRes.data.rooms || [])
      setEquipment(configRes.data.equipment || [])
      setServices(configRes.data.services || [])
      setPlans(plansRes.data || [])
      setAllModules(modulesRes.data || [])
    } catch (error) {
      console.error('Error loading hotel:', error)
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [hotelId, api])

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      await api.put(`/api/superadmin/hotels/${hotelId}/config`, hotelForm)
      toast.success('Configuration sauvegardée')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const handlePause = async () => {
    if (!confirm('Mettre en pause cet abonnement ?')) return
    try {
      await api.post(`/api/superadmin/subscriptions/${hotelId}/pause`, { reason: 'Pause manuelle' })
      toast.success('Abonnement mis en pause')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur')
    }
  }

  const handleReactivate = async () => {
    try {
      await api.post(`/api/superadmin/subscriptions/${hotelId}/reactivate`, { resume_billing: true })
      toast.success('Abonnement réactivé')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur')
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!hotel) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Hôtel non trouvé</p>
        <Button onClick={() => navigate('/superadmin/hotels')} className="mt-4">Retour</Button>
      </div>
    )
  }

  const statusBadge = subscription?.status === 'active' 
    ? <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Actif</span>
    : subscription?.status === 'trial'
    ? <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Essai</span>
    : subscription?.status === 'paused'
    ? <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">En pause</span>
    : <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">Inactif</span>

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/superadmin/hotels')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{hotel.name}</h1>
              <p className="text-slate-500">{hotel.city}, {hotel.country || 'France'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {statusBadge}
            {subscription?.plan_name && (
              <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
                {subscription.plan_name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-slate-200 bg-white px-6">
          <TabsList className="bg-transparent h-12 p-0 gap-6">
            <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-violet-600 rounded-none bg-transparent px-0">
              <Building2 className="w-4 h-4 mr-2" /> Informations
            </TabsTrigger>
            <TabsTrigger value="subscription" className="data-[state=active]:border-b-2 data-[state=active]:border-violet-600 rounded-none bg-transparent px-0">
              <CreditCard className="w-4 h-4 mr-2" /> Abonnement
            </TabsTrigger>
            <TabsTrigger value="modules" className="data-[state=active]:border-b-2 data-[state=active]:border-violet-600 rounded-none bg-transparent px-0">
              <Package className="w-4 h-4 mr-2" /> Modules
            </TabsTrigger>
            <TabsTrigger value="rooms" className="data-[state=active]:border-b-2 data-[state=active]:border-violet-600 rounded-none bg-transparent px-0">
              <Bed className="w-4 h-4 mr-2" /> Chambres
            </TabsTrigger>
            <TabsTrigger value="equipment" className="data-[state=active]:border-b-2 data-[state=active]:border-violet-600 rounded-none bg-transparent px-0">
              <Wrench className="w-4 h-4 mr-2" /> Équipements
            </TabsTrigger>
            <TabsTrigger value="services" className="data-[state=active]:border-b-2 data-[state=active]:border-violet-600 rounded-none bg-transparent px-0">
              <Coffee className="w-4 h-4 mr-2" /> Services
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="m-0">
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-slate-900">Informations Générales</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label>Nom de l'hôtel</Label>
                  <Input value={hotelForm.name || ''} onChange={(e) => setHotelForm({...hotelForm, name: e.target.value})} />
                </div>
                <div>
                  <Label>Étoiles</Label>
                  <Select value={String(hotelForm.stars || 3)} onValueChange={(v) => setHotelForm({...hotelForm, stars: parseInt(v)})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5].map(s => <SelectItem key={s} value={String(s)}>{s} étoile{s > 1 ? 's' : ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label>Adresse</Label>
                  <Input value={hotelForm.address || ''} onChange={(e) => setHotelForm({...hotelForm, address: e.target.value})} />
                </div>
                <div>
                  <Label>Ville</Label>
                  <Input value={hotelForm.city || ''} onChange={(e) => setHotelForm({...hotelForm, city: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <Label>Code postal</Label>
                  <Input value={hotelForm.postal_code || ''} onChange={(e) => setHotelForm({...hotelForm, postal_code: e.target.value})} />
                </div>
                <div>
                  <Label>Pays</Label>
                  <Input value={hotelForm.country || 'France'} onChange={(e) => setHotelForm({...hotelForm, country: e.target.value})} />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input value={hotelForm.phone || ''} onChange={(e) => setHotelForm({...hotelForm, phone: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={hotelForm.email || ''} onChange={(e) => setHotelForm({...hotelForm, email: e.target.value})} />
                </div>
                <div>
                  <Label>Site web</Label>
                  <Input value={hotelForm.website || ''} onChange={(e) => setHotelForm({...hotelForm, website: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label>Heure Check-in</Label>
                  <Input value={hotelForm.check_in_time || '15:00'} onChange={(e) => setHotelForm({...hotelForm, check_in_time: e.target.value})} />
                </div>
                <div>
                  <Label>Heure Check-out</Label>
                  <Input value={hotelForm.check_out_time || '11:00'} onChange={(e) => setHotelForm({...hotelForm, check_out_time: e.target.value})} />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea 
                  value={hotelForm.description || ''} 
                  onChange={(e) => setHotelForm({...hotelForm, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveConfig} className="bg-violet-600 hover:bg-violet-700" disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* SUBSCRIPTION TAB */}
          <TabsContent value="subscription" className="m-0 space-y-6">
            {/* Current Subscription */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Abonnement Actuel</h2>
                {statusBadge}
              </div>

              {subscription ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-6">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-500">Plan</p>
                      <p className="text-xl font-bold text-slate-900">{subscription.plan_name || subscription.plan_code?.toUpperCase()}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-500">Prix mensuel</p>
                      <p className="text-xl font-bold text-slate-900">{subscription.price_effective || subscription.price_monthly || 0}€</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-500">Utilisateurs max</p>
                      <p className="text-xl font-bold text-slate-900">{subscription.max_users === -1 ? 'Illimité' : subscription.max_users}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-500">Échéance</p>
                      <p className="text-xl font-bold text-slate-900">
                        {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString('fr-FR') : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                    <Button onClick={() => setShowUpgradeModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                      <ArrowUp className="w-4 h-4 mr-2" /> Upgrade / Downgrade
                    </Button>
                    <Button onClick={() => setShowModulesModal(true)} variant="outline">
                      <Package className="w-4 h-4 mr-2" /> Gérer les Modules
                    </Button>
                    {subscription.status === 'trial' && (
                      <Button onClick={() => setShowTrialModal(true)} variant="outline">
                        <Clock className="w-4 h-4 mr-2" /> Prolonger l'essai
                      </Button>
                    )}
                    {subscription.status === 'active' || subscription.status === 'trial' ? (
                      <Button onClick={handlePause} variant="outline" className="text-amber-600 hover:text-amber-700">
                        <Pause className="w-4 h-4 mr-2" /> Mettre en pause
                      </Button>
                    ) : subscription.status === 'paused' ? (
                      <Button onClick={handleReactivate} variant="outline" className="text-emerald-600 hover:text-emerald-700">
                        <Play className="w-4 h-4 mr-2" /> Réactiver
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-4">Aucun abonnement assigné</p>
                  <Button onClick={() => setShowAssignModal(true)} className="bg-violet-600 hover:bg-violet-700">
                    <Plus className="w-4 h-4 mr-2" /> Assigner un abonnement
                  </Button>
                </div>
              )}
            </div>

            {/* Available Plans for reference */}
            {plans.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Plans Disponibles</h3>
                <div className="grid grid-cols-3 gap-4">
                  {plans.map(plan => (
                    <div key={plan.id} className={`p-4 rounded-lg border-2 ${subscription?.plan_id === plan.id ? 'border-violet-300 bg-violet-50' : 'border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{plan.name}</h4>
                        {plan.is_featured && <span className="text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full">Populaire</span>}
                      </div>
                      <p className="text-2xl font-bold text-slate-900">{plan.price_monthly}€<span className="text-sm font-normal text-slate-500">/mois</span></p>
                      <p className="text-sm text-slate-500 mt-1">{plan.max_users === -1 ? 'Utilisateurs illimités' : `${plan.max_users} utilisateurs max`}</p>
                      <p className="text-sm text-slate-500">{plan.modules?.length || 0} modules inclus</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* MODULES TAB */}
          <TabsContent value="modules" className="m-0">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Modules & Fonctionnalités</h2>
                <Button onClick={() => setShowModulesModal(true)} variant="outline">
                  <Settings className="w-4 h-4 mr-2" /> Configurer
                </Button>
              </div>

              {subscription?.modules && subscription.modules.length > 0 ? (
                <div className="space-y-4">
                  {subscription.modules.map(mod => {
                    const Icon = MODULE_ICONS[mod.code] || Package
                    const enabledFeatures = mod.features?.filter(f => f.enabled !== false) || []
                    
                    return (
                      <div key={mod.code} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-violet-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-slate-900">{mod.name}</h4>
                              <p className="text-sm text-slate-500">{enabledFeatures.length} fonctionnalités actives</p>
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Actif</span>
                        </div>
                        
                        {enabledFeatures.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="flex flex-wrap gap-2">
                              {enabledFeatures.map(f => (
                                <span key={f.code} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                                  {f.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Aucun module configuré</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ROOMS TAB */}
          <TabsContent value="rooms" className="m-0 space-y-6">
            {/* Room Types */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Typologies de Chambres</h2>
                <Button onClick={() => setShowRoomTypeModal(true)} size="sm" className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" /> Ajouter
                </Button>
              </div>
              
              {roomTypes.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {roomTypes.map(rt => (
                    <div key={rt.id} className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{rt.name}</h4>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">{rt.code}</span>
                      </div>
                      <p className="text-sm text-slate-500">Capacité: {rt.base_capacity}-{rt.max_capacity} pers.</p>
                      <p className="text-sm text-slate-500">Prix base: {rt.base_price}€</p>
                      <div className="flex items-center gap-2 mt-3">
                        <Button variant="ghost" size="sm"><Edit className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500"><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4">Aucune typologie définie</p>
              )}
            </div>

            {/* Rooms */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Chambres ({rooms.length})</h2>
                <Button onClick={() => setShowRoomModal(true)} size="sm" className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" /> Ajouter
                </Button>
              </div>
              
              {rooms.length > 0 ? (
                <div className="grid grid-cols-6 gap-3">
                  {rooms.map(room => (
                    <div key={room.id} className={`p-3 border rounded-lg text-center ${
                      room.status === 'available' ? 'border-emerald-200 bg-emerald-50' :
                      room.status === 'occupied' ? 'border-red-200 bg-red-50' :
                      'border-slate-200 bg-slate-50'
                    }`}>
                      <p className="font-bold">{room.number}</p>
                      <p className="text-xs text-slate-500">{room.room_type_name || room.room_type_code}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4">Aucune chambre définie</p>
              )}
            </div>
          </TabsContent>

          {/* EQUIPMENT TAB */}
          <TabsContent value="equipment" className="m-0">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Équipements</h2>
                <Button onClick={() => setShowEquipmentModal(true)} size="sm" className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" /> Ajouter
                </Button>
              </div>
              
              {equipment.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {equipment.map(eq => (
                    <div key={eq.id} className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{eq.name}</h4>
                        <Button variant="ghost" size="sm" className="text-red-500"><Trash2 className="w-3 h-3" /></Button>
                      </div>
                      <p className="text-sm text-slate-500">{eq.category}</p>
                      <p className="text-sm text-slate-500">Qté: {eq.quantity}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4">Aucun équipement défini</p>
              )}
            </div>
          </TabsContent>

          {/* SERVICES TAB */}
          <TabsContent value="services" className="m-0">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Services</h2>
                <Button onClick={() => setShowServiceModal(true)} size="sm" className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" /> Ajouter
                </Button>
              </div>
              
              {services.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {services.map(svc => (
                    <div key={svc.id} className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{svc.name}</h4>
                        <Button variant="ghost" size="sm" className="text-red-500"><Trash2 className="w-3 h-3" /></Button>
                      </div>
                      <p className="text-sm text-slate-500">{svc.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-medium">{svc.price > 0 ? `${svc.price}€` : 'Gratuit'}</span>
                        {svc.is_included && <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">Inclus</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4">Aucun service défini</p>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* MODALS */}
      <AssignSubscriptionModal 
        open={showAssignModal}
        onOpenChange={setShowAssignModal}
        hotelId={hotelId}
        plans={plans}
        api={api}
        onSuccess={fetchData}
      />
      
      <UpgradeDowngradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        hotelId={hotelId}
        currentSubscription={subscription}
        plans={plans}
        api={api}
        onSuccess={fetchData}
      />
      
      <ManageModulesModal
        open={showModulesModal}
        onOpenChange={setShowModulesModal}
        hotelId={hotelId}
        currentModules={subscription?.modules || []}
        allModules={allModules}
        api={api}
        onSuccess={fetchData}
      />
      
      <ExtendTrialModal
        open={showTrialModal}
        onOpenChange={setShowTrialModal}
        hotelId={hotelId}
        api={api}
        onSuccess={fetchData}
      />
      
      <RoomTypeModal
        open={showRoomTypeModal}
        onOpenChange={setShowRoomTypeModal}
        hotelId={hotelId}
        api={api}
        onSuccess={fetchData}
      />
      
      <RoomModal
        open={showRoomModal}
        onOpenChange={setShowRoomModal}
        hotelId={hotelId}
        roomTypes={roomTypes}
        api={api}
        onSuccess={fetchData}
      />
      
      <EquipmentModal
        open={showEquipmentModal}
        onOpenChange={setShowEquipmentModal}
        hotelId={hotelId}
        api={api}
        onSuccess={fetchData}
      />
      
      <ServiceModal
        open={showServiceModal}
        onOpenChange={setShowServiceModal}
        hotelId={hotelId}
        api={api}
        onSuccess={fetchData}
      />
    </div>
  )
}

// ==================== ASSIGN SUBSCRIPTION MODAL ====================
const AssignSubscriptionModal = ({ open, onOpenChange, hotelId, plans, api, onSuccess }) => {
  const [form, setForm] = useState({
    plan_id: '',
    payment_frequency: 'monthly',
    trial_days: 14,
    custom_max_users: '',
    custom_price: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.plan_id) {
      toast.error('Sélectionnez un plan')
      return
    }
    setLoading(true)
    try {
      await api.post(`/api/superadmin/hotels/${hotelId}/subscription/assign`, {
        ...form,
        custom_max_users: form.custom_max_users ? parseInt(form.custom_max_users) : null,
        custom_price: form.custom_price ? parseFloat(form.custom_price) : null
      })
      toast.success('Abonnement assigné')
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assigner un Abonnement</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label>Plan *</Label>
            <Select value={form.plan_id} onValueChange={(v) => setForm({...form, plan_id: v})}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un plan" /></SelectTrigger>
              <SelectContent>
                {plans.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name} - {p.price_monthly}€/mois</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fréquence de paiement</Label>
              <Select value={form.payment_frequency} onValueChange={(v) => setForm({...form, payment_frequency: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="annual">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jours d'essai</Label>
              <Input type="number" value={form.trial_days} onChange={(e) => setForm({...form, trial_days: parseInt(e.target.value) || 0})} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Utilisateurs max (personnalisé)</Label>
              <Input type="number" value={form.custom_max_users} onChange={(e) => setForm({...form, custom_max_users: e.target.value})} placeholder="Par défaut du plan" />
            </div>
            <div>
              <Label>Prix personnalisé (€/mois)</Label>
              <Input type="number" value={form.custom_price} onChange={(e) => setForm({...form, custom_price: e.target.value})} placeholder="Par défaut du plan" />
            </div>
          </div>
          
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} className="bg-violet-600 hover:bg-violet-700" disabled={loading}>
            {loading ? 'Assignation...' : 'Assigner'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ==================== UPGRADE/DOWNGRADE MODAL ====================
const UpgradeDowngradeModal = ({ open, onOpenChange, hotelId, currentSubscription, plans, api, onSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState('')
  const [applyImmediately, setApplyImmediately] = useState(true)
  const [loading, setLoading] = useState(false)

  const currentPrice = currentSubscription?.price_effective || currentSubscription?.price_monthly || 0
  const selectedPlanData = plans.find(p => p.id === selectedPlan)
  const isUpgrade = selectedPlanData && selectedPlanData.price_monthly > currentPrice
  const isDowngrade = selectedPlanData && selectedPlanData.price_monthly < currentPrice

  const handleSubmit = async () => {
    if (!selectedPlan) {
      toast.error('Sélectionnez un plan')
      return
    }
    setLoading(true)
    try {
      await api.post(`/api/superadmin/hotels/${hotelId}/subscription/modify`, {
        new_plan_id: selectedPlan,
        apply_immediately: applyImmediately
      })
      toast.success(isUpgrade ? 'Abonnement upgradé' : 'Abonnement downgradé')
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUpgrade ? <ArrowUp className="w-5 h-5 text-emerald-600" /> : <ArrowDown className="w-5 h-5 text-amber-600" />}
            Upgrade / Downgrade
          </DialogTitle>
          <DialogDescription>
            Plan actuel: {currentSubscription?.plan_name} ({currentPrice}€/mois)
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label>Nouveau plan</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un plan" /></SelectTrigger>
              <SelectContent>
                {plans.filter(p => p.id !== currentSubscription?.plan_id).map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} - {p.price_monthly}€/mois
                    {p.price_monthly > currentPrice ? ' (Upgrade)' : ' (Downgrade)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedPlanData && (
            <div className={`p-4 rounded-lg ${isUpgrade ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
              <p className="font-medium">{isUpgrade ? 'Upgrade vers' : 'Downgrade vers'} {selectedPlanData.name}</p>
              <p className="text-sm">Nouveau prix: {selectedPlanData.price_monthly}€/mois ({isUpgrade ? '+' : ''}{selectedPlanData.price_monthly - currentPrice}€)</p>
              <p className="text-sm">Utilisateurs max: {selectedPlanData.max_users === -1 ? 'Illimité' : selectedPlanData.max_users}</p>
              <p className="text-sm">{selectedPlanData.modules?.length || 0} modules inclus</p>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Switch checked={applyImmediately} onCheckedChange={setApplyImmediately} />
            <Label className="cursor-pointer">Appliquer immédiatement</Label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button 
            onClick={handleSubmit} 
            className={isUpgrade ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'} 
            disabled={loading || !selectedPlan}
          >
            {loading ? 'Traitement...' : (isUpgrade ? 'Upgrader' : 'Downgrader')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ==================== MANAGE MODULES MODAL ====================
const ManageModulesModal = ({ open, onOpenChange, hotelId, currentModules, allModules, api, onSuccess }) => {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      // Initialize with current modules or empty
      const currentCodes = new Set(currentModules.map(m => m.code))
      const initialModules = allModules.map(mod => ({
        code: mod.code,
        name: mod.name,
        enabled: currentCodes.has(mod.code),
        features: Object.entries(mod.features).map(([code, def]) => {
          const currentMod = currentModules.find(m => m.code === mod.code)
          const currentFeat = currentMod?.features?.find(f => f.code === code)
          return {
            code,
            name: def.name,
            enabled: currentFeat ? currentFeat.enabled !== false : currentCodes.has(mod.code)
          }
        })
      }))
      setModules(initialModules)
    }
  }, [open, currentModules, allModules])

  const toggleModule = (moduleCode) => {
    setModules(modules.map(m => {
      if (m.code === moduleCode) {
        return { ...m, enabled: !m.enabled }
      }
      return m
    }))
  }

  const toggleFeature = (moduleCode, featureCode) => {
    setModules(modules.map(m => {
      if (m.code === moduleCode) {
        return {
          ...m,
          features: m.features.map(f => 
            f.code === featureCode ? { ...f, enabled: !f.enabled } : f
          )
        }
      }
      return m
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const enabledModules = modules.filter(m => m.enabled).map(m => m.code)
      const disabledModules = modules.filter(m => !m.enabled).map(m => m.code)
      
      // Build feature toggles
      const moduleFeatures = {}
      modules.filter(m => m.enabled).forEach(m => {
        moduleFeatures[m.code] = m.features.filter(f => f.enabled).map(f => f.code)
      })

      await api.post(`/api/superadmin/hotels/${hotelId}/subscription/modify`, {
        add_modules: enabledModules.filter(c => !currentModules.find(m => m.code === c)),
        remove_modules: disabledModules.filter(c => currentModules.find(m => m.code === c)),
        module_features: moduleFeatures
      })
      toast.success('Modules mis à jour')
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gérer les Modules & Fonctionnalités</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {modules.map(mod => (
            <div key={mod.code} className={`border rounded-lg overflow-hidden ${mod.enabled ? 'border-violet-200' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between p-3 bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{mod.name}</span>
                  <span className="text-xs text-slate-500">({mod.features.length} fonctionnalités)</span>
                </div>
                <Switch checked={mod.enabled} onCheckedChange={() => toggleModule(mod.code)} />
              </div>
              
              {mod.enabled && (
                <div className="p-3 space-y-2">
                  {mod.features.map(feat => (
                    <div key={feat.code} className="flex items-center justify-between py-1">
                      <span className="text-sm text-slate-700">{feat.name}</span>
                      <Switch 
                        checked={feat.enabled} 
                        onCheckedChange={() => toggleFeature(mod.code, feat.code)}
                        className="scale-75"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} className="bg-violet-600 hover:bg-violet-700" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ==================== EXTEND TRIAL MODAL ====================
const ExtendTrialModal = ({ open, onOpenChange, hotelId, api, onSuccess }) => {
  const [days, setDays] = useState(7)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await api.post(`/api/superadmin/hotels/${hotelId}/subscription/extend-trial`, {
        additional_days: days,
        reason
      })
      toast.success(`Essai prolongé de ${days} jours`)
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
          <DialogTitle>Prolonger la Période d'Essai</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label>Jours supplémentaires</Label>
            <Input type="number" value={days} onChange={(e) => setDays(parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <Label>Raison</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Ex: Demande client, évaluation en cours..." />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} className="bg-violet-600 hover:bg-violet-700" disabled={loading}>
            {loading ? 'Extension...' : 'Prolonger'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ==================== ROOM TYPE MODAL ====================
const RoomTypeModal = ({ open, onOpenChange, hotelId, api, onSuccess }) => {
  const [form, setForm] = useState({ code: '', name: '', base_capacity: 2, max_capacity: 4, base_price: 100, amenities: [] })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.code || !form.name) { toast.error('Code et nom requis'); return }
    setLoading(true)
    try {
      await api.post(`/api/superadmin/hotels/${hotelId}/room-types`, form)
      toast.success('Typologie créée')
      onOpenChange(false)
      setForm({ code: '', name: '', base_capacity: 2, max_capacity: 4, base_price: 100, amenities: [] })
      onSuccess()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent><DialogHeader><DialogTitle>Nouvelle Typologie</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="SGL, DBL, TWN..." /></div>
            <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Single, Double..." /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Capacité min</Label><Input type="number" value={form.base_capacity} onChange={(e) => setForm({...form, base_capacity: parseInt(e.target.value) || 1})} /></div>
            <div><Label>Capacité max</Label><Input type="number" value={form.max_capacity} onChange={(e) => setForm({...form, max_capacity: parseInt(e.target.value) || 2})} /></div>
            <div><Label>Prix base (€)</Label><Input type="number" value={form.base_price} onChange={(e) => setForm({...form, base_price: parseFloat(e.target.value) || 0})} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} className="bg-violet-600 hover:bg-violet-700" disabled={loading}>{loading ? 'Création...' : 'Créer'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ==================== ROOM MODAL ====================
const RoomModal = ({ open, onOpenChange, hotelId, roomTypes, api, onSuccess }) => {
  const [form, setForm] = useState({ number: '', room_type_code: '', floor: 0 })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.number || !form.room_type_code) { toast.error('Numéro et type requis'); return }
    setLoading(true)
    try {
      await api.post(`/api/superadmin/hotels/${hotelId}/rooms`, form)
      toast.success('Chambre créée')
      onOpenChange(false)
      setForm({ number: '', room_type_code: '', floor: 0 })
      onSuccess()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent><DialogHeader><DialogTitle>Nouvelle Chambre</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Numéro *</Label><Input value={form.number} onChange={(e) => setForm({...form, number: e.target.value})} placeholder="101, 102..." /></div>
            <div><Label>Étage</Label><Input type="number" value={form.floor} onChange={(e) => setForm({...form, floor: parseInt(e.target.value) || 0})} /></div>
          </div>
          <div>
            <Label>Typologie *</Label>
            <Select value={form.room_type_code} onValueChange={(v) => setForm({...form, room_type_code: v})}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {roomTypes.map(rt => <SelectItem key={rt.code} value={rt.code}>{rt.name} ({rt.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} className="bg-violet-600 hover:bg-violet-700" disabled={loading}>{loading ? 'Création...' : 'Créer'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ==================== EQUIPMENT MODAL ====================
const EquipmentModal = ({ open, onOpenChange, hotelId, api, onSuccess }) => {
  const [form, setForm] = useState({ code: '', name: '', category: 'room', quantity: 1 })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Nom requis'); return }
    setLoading(true)
    try {
      await api.post(`/api/superadmin/hotels/${hotelId}/equipment`, { ...form, code: form.code || form.name.toLowerCase().replace(/\s+/g, '_') })
      toast.success('Équipement ajouté')
      onOpenChange(false)
      setForm({ code: '', name: '', category: 'room', quantity: 1 })
      onSuccess()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent><DialogHeader><DialogTitle>Nouvel Équipement</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="TV, Climatisation..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="room">Chambre</SelectItem>
                  <SelectItem value="common_area">Espace commun</SelectItem>
                  <SelectItem value="spa">Spa</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Quantité</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({...form, quantity: parseInt(e.target.value) || 1})} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} className="bg-violet-600 hover:bg-violet-700" disabled={loading}>{loading ? 'Ajout...' : 'Ajouter'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ==================== SERVICE MODAL ====================
const ServiceModal = ({ open, onOpenChange, hotelId, api, onSuccess }) => {
  const [form, setForm] = useState({ code: '', name: '', description: '', price: 0, is_included: false, category: 'general' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Nom requis'); return }
    setLoading(true)
    try {
      await api.post(`/api/superadmin/hotels/${hotelId}/services`, { ...form, code: form.code || form.name.toLowerCase().replace(/\s+/g, '_') })
      toast.success('Service ajouté')
      onOpenChange(false)
      setForm({ code: '', name: '', description: '', price: 0, is_included: false, category: 'general' })
      onSuccess()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent><DialogHeader><DialogTitle>Nouveau Service</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Petit-déjeuner, Parking..." /></div>
          <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Général</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="spa">Spa & Bien-être</SelectItem>
                  <SelectItem value="activities">Activités</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Prix (€)</Label><Input type="number" value={form.price} onChange={(e) => setForm({...form, price: parseFloat(e.target.value) || 0})} /></div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_included} onCheckedChange={(v) => setForm({...form, is_included: v})} />
            <Label className="cursor-pointer">Inclus dans le séjour</Label>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} className="bg-violet-600 hover:bg-violet-700" disabled={loading}>{loading ? 'Ajout...' : 'Ajouter'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SAHotelManagement
