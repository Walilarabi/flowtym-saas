import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { 
  Star, Settings, Save, Plus, Trash2, ExternalLink,
  AlertTriangle, CheckCircle, Clock, MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ═══════════════════════════════════════════════════════════════════════════════
// CRITERIA CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CRITERIA = [
  { key: 'cleanliness', label: '🧹 Propreté', weight: 1.0, is_active: true },
  { key: 'comfort', label: '🛏️ Confort', weight: 1.0, is_active: true },
  { key: 'equipment', label: '🧰 Équipements', weight: 1.0, is_active: true },
  { key: 'service', label: '🤝 Service', weight: 1.0, is_active: true }
]

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const SatisfactionConfig = () => {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState(null)
  const [stats, setStats] = useState(null)
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FETCH DATA
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const fetchData = async () => {
    if (!currentHotel) return
    setLoading(true)
    try {
      const [configRes, statsRes] = await Promise.all([
        api.get(`/satisfaction/hotels/${currentHotel.id}/config`),
        api.get(`/satisfaction/hotels/${currentHotel.id}/stats`)
      ])
      setConfig(configRes.data)
      setStats(statsRes.data)
    } catch (err) {
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchData()
  }, [currentHotel])
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/satisfaction/hotels/${currentHotel.id}/config`, config)
      toast.success('Configuration enregistrée')
    } catch (err) {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }
  
  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }
  
  const updateCriterion = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      criteria: prev.criteria.map((c, i) => i === index ? { ...c, [field]: value } : c)
    }))
  }
  
  const addReviewUrl = () => {
    const name = prompt('Nom de la plateforme (ex: Expedia)')
    if (!name) return
    const url = prompt('URL de review')
    if (!url) return
    
    setConfig(prev => ({
      ...prev,
      custom_review_urls: { ...prev.custom_review_urls, [name]: url }
    }))
  }
  
  const removeReviewUrl = (name) => {
    setConfig(prev => {
      const urls = { ...prev.custom_review_urls }
      delete urls[name]
      return { ...prev, custom_review_urls: urls }
    })
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  
  if (loading || !config) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full spinner" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6" data-testid="satisfaction-config">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Star className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Configuration Satisfaction</h2>
            <p className="text-sm text-slate-500">Paramètres du formulaire et des alertes</p>
          </div>
        </div>
        
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs">Réponses (30j)</span>
            </div>
            <p className="text-2xl font-bold">{stats.total_responses}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs">Taux satisfaction</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.satisfaction_rate}%</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Star className="w-4 h-4" />
              <span className="text-xs">Note moyenne</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.average_rating.toFixed(1)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">Tickets en attente</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.pending_escalations}</p>
          </div>
        </div>
      )}
      
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="criteria">Critères</TabsTrigger>
          <TabsTrigger value="reviews">Liens reviews</TabsTrigger>
          <TabsTrigger value="escalation">Escalade</TabsTrigger>
        </TabsList>
        
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* GENERAL TAB */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="general" className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <div>
              <Label className="text-base font-medium">Seuil de satisfaction</Label>
              <p className="text-sm text-slate-500 mb-4">
                Note minimale pour considérer un client satisfait (entre 1 et 5)
              </p>
              <div className="flex items-center gap-4">
                <Slider
                  value={[config.satisfaction_threshold]}
                  onValueChange={([v]) => updateConfig('satisfaction_threshold', v)}
                  min={1}
                  max={5}
                  step={0.5}
                  className="flex-1"
                />
                <div className="flex items-center gap-1 min-w-[60px]">
                  <span className="text-2xl font-bold">{config.satisfaction_threshold}</span>
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Les clients avec une note ≥ {config.satisfaction_threshold} seront invités à laisser un avis positif.
                Les autres déclencheront une alerte.
              </p>
            </div>
          </div>
        </TabsContent>
        
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* CRITERIA TAB */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="criteria" className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <Label className="text-base font-medium mb-4 block">Critères d'évaluation</Label>
            <p className="text-sm text-slate-500 mb-4">
              Activez/désactivez les critères et ajustez leur poids dans le calcul de la note moyenne.
            </p>
            
            <div className="space-y-4">
              {config.criteria.map((criterion, index) => (
                <div key={criterion.key} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                  <Switch
                    checked={criterion.is_active}
                    onCheckedChange={v => updateCriterion(index, 'is_active', v)}
                  />
                  <span className="flex-1 font-medium">
                    {DEFAULT_CRITERIA.find(c => c.key === criterion.key)?.label || criterion.key}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Poids:</span>
                    <Input
                      type="number"
                      min={0.1}
                      max={3}
                      step={0.1}
                      value={criterion.weight}
                      onChange={e => updateCriterion(index, 'weight', parseFloat(e.target.value) || 1)}
                      className="w-20"
                      disabled={!criterion.is_active}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
        
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* REVIEWS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="reviews" className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <div>
              <Label className="text-base font-medium mb-4 block">Liens vers les plateformes d'avis</Label>
              <p className="text-sm text-slate-500 mb-4">
                Les clients satisfaits seront invités à laisser un avis sur ces plateformes.
              </p>
            </div>
            
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Google Review URL</Label>
                <Input
                  value={config.google_review_url || ''}
                  onChange={e => updateConfig('google_review_url', e.target.value)}
                  placeholder="https://g.page/r/..."
                />
              </div>
              
              <div className="grid gap-2">
                <Label>TripAdvisor URL</Label>
                <Input
                  value={config.tripadvisor_url || ''}
                  onChange={e => updateConfig('tripadvisor_url', e.target.value)}
                  placeholder="https://www.tripadvisor.com/..."
                />
              </div>
              
              <div className="grid gap-2">
                <Label>Booking.com Review URL</Label>
                <Input
                  value={config.booking_review_url || ''}
                  onChange={e => updateConfig('booking_review_url', e.target.value)}
                  placeholder="https://www.booking.com/..."
                />
              </div>
            </div>
            
            {/* Custom URLs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Plateformes personnalisées</Label>
                <Button size="sm" variant="outline" onClick={addReviewUrl}>
                  <Plus className="w-3 h-3 mr-1" />
                  Ajouter
                </Button>
              </div>
              
              {Object.entries(config.custom_review_urls || {}).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(config.custom_review_urls).map(([name, url]) => (
                    <div key={name} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                      <span className="font-medium flex-1">{name}</span>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline text-sm truncate max-w-[200px]">
                        {url}
                      </a>
                      <Button size="sm" variant="ghost" onClick={() => removeReviewUrl(name)}>
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Aucune plateforme personnalisée</p>
              )}
            </div>
          </div>
        </TabsContent>
        
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* ESCALATION TAB */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="escalation" className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <div>
              <Label className="text-base font-medium">Système d'escalade automatique</Label>
              <p className="text-sm text-slate-500 mb-4">
                Créer automatiquement un ticket quand un client donne une note inférieure au seuil.
              </p>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.auto_escalation_enabled}
                  onCheckedChange={v => updateConfig('auto_escalation_enabled', v)}
                />
                <span className="text-sm">
                  {config.auto_escalation_enabled ? 'Activé' : 'Désactivé'}
                </span>
              </div>
            </div>
            
            {config.auto_escalation_enabled && (
              <div>
                <Label className="mb-2 block">Emails de notification</Label>
                <p className="text-sm text-slate-500 mb-4">
                  Ces personnes recevront une notification pour chaque nouveau ticket d'escalade.
                </p>
                <div className="space-y-2">
                  {(config.escalation_notification_emails || []).map((email, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={email} readOnly className="flex-1" />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const emails = [...config.escalation_notification_emails]
                          emails.splice(i, 1)
                          updateConfig('escalation_notification_emails', emails)
                        }}
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const email = prompt('Email de notification')
                      if (email && email.includes('@')) {
                        updateConfig('escalation_notification_emails', [
                          ...(config.escalation_notification_emails || []),
                          email
                        ])
                      }
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Ajouter un email
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SatisfactionConfig
