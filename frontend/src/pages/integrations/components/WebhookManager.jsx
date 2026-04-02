/**
 * Flowtym - Gestionnaire de Webhooks Sortants (Phase 15)
 * Interface complète de gestion des webhooks : création, test, logs de livraison
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import {
  Zap, Plus, Trash2, Edit, Play, ToggleLeft, ToggleRight,
  CheckCircle2, XCircle, Clock, RefreshCw, Eye, Copy,
  AlertCircle, ChevronDown, ChevronRight, Loader2, Shield,
  Activity, BarChart3, ExternalLink, Info
} from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────
const EVENT_LABELS = {
  'reservation.created':   { label: 'Réservation créée',      color: 'bg-emerald-100 text-emerald-700' },
  'reservation.updated':   { label: 'Réservation modifiée',   color: 'bg-blue-100 text-blue-700' },
  'reservation.cancelled': { label: 'Réservation annulée',    color: 'bg-red-100 text-red-700' },
  'reservation.checked_in':  { label: 'Check-in',             color: 'bg-violet-100 text-violet-700' },
  'reservation.checked_out': { label: 'Check-out',            color: 'bg-slate-100 text-slate-700' },
  'reservation.no_show':   { label: 'No-show',                color: 'bg-amber-100 text-amber-700' },
  'guest.created':         { label: 'Client créé',            color: 'bg-blue-100 text-blue-600' },
  'guest.updated':         { label: 'Client modifié',         color: 'bg-blue-50 text-blue-500' },
  'room.status_changed':   { label: 'Statut chambre changé',  color: 'bg-orange-100 text-orange-700' },
  'payment.received':      { label: 'Paiement reçu',          color: 'bg-emerald-100 text-emerald-600' },
  'invoice.created':       { label: 'Facture créée',          color: 'bg-green-100 text-green-700' },
  'night_audit.completed': { label: 'Clôture journalière',    color: 'bg-indigo-100 text-indigo-700' },
  'webhook.test':          { label: 'Test',                   color: 'bg-slate-100 text-slate-600' },
}

const statusBadge = (status) => {
  if (status === 'delivered') return <Badge className="bg-emerald-100 text-emerald-700 border-0"><CheckCircle2 className="w-3 h-3 mr-1" />Livré</Badge>
  if (status === 'failed')    return <Badge className="bg-red-100 text-red-700 border-0"><XCircle className="w-3 h-3 mr-1" />Échec</Badge>
  return <Badge className="bg-amber-100 text-amber-700 border-0"><Clock className="w-3 h-3 mr-1" />En attente</Badge>
}

const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

const EMPTY_FORM = {
  name: '',
  target_url: '',
  event_types: [],
  secret_key: '',
  retry_count: 3,
  description: '',
}

// ── Composant principal ──────────────────────────────────────────────────────
export const WebhookManager = () => {
  const { api } = useAuth()
  const { currentHotel } = useHotel()

  const [webhooks, setWebhooks] = useState([])
  const [stats, setStats] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Modal create/edit
  const [showForm, setShowForm] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Panel livraisons
  const [selectedWebhook, setSelectedWebhook] = useState(null)
  const [deliveries, setDeliveries] = useState([])
  const [loadingDeliveries, setLoadingDeliveries] = useState(false)

  // Fetch data
  const fetchAll = useCallback(async (quiet = false) => {
    if (!currentHotel) return
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    try {
      const [whRes, statsRes, eventsRes] = await Promise.all([
        api.get(`/integrations/hotels/${currentHotel.id}/webhooks`),
        api.get(`/integrations/hotels/${currentHotel.id}/webhooks-stats`),
        api.get(`/integrations/hotels/${currentHotel.id}/webhooks/events`),
      ])
      setWebhooks(whRes.data.webhooks || [])
      setStats(statsRes.data)
      setEvents(eventsRes.data.events || [])
    } catch {
      if (!quiet) toast.error('Erreur lors du chargement des webhooks')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [currentHotel, api])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Fetch deliveries for selected webhook
  const fetchDeliveries = async (webhookId) => {
    setLoadingDeliveries(true)
    try {
      const res = await api.get(
        `/integrations/hotels/${currentHotel.id}/webhooks/${webhookId}/deliveries`,
        { params: { limit: 30 } }
      )
      setDeliveries(res.data.deliveries || [])
    } catch {
      toast.error('Erreur chargement des livraisons')
    } finally {
      setLoadingDeliveries(false)
    }
  }

  const handleSelectWebhook = (wh) => {
    if (selectedWebhook?.id === wh.id) {
      setSelectedWebhook(null)
      return
    }
    setSelectedWebhook(wh)
    fetchDeliveries(wh.id)
  }

  // Ouvrir le form
  const handleOpenCreate = () => {
    setEditingWebhook(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const handleOpenEdit = (wh) => {
    setEditingWebhook(wh)
    setForm({
      name: wh.name,
      target_url: wh.target_url,
      event_types: wh.event_types || [],
      secret_key: wh.secret_key || '',
      retry_count: wh.retry_count || 3,
      description: wh.description || '',
    })
    setShowForm(true)
  }

  // Sauvegarder
  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Le nom est requis')
    if (!form.target_url.trim()) return toast.error("L'URL cible est requise")
    if (!form.target_url.startsWith('http')) return toast.error("L'URL doit commencer par http(s)://")
    if (form.event_types.length === 0) return toast.error('Sélectionnez au moins un événement')

    setSaving(true)
    try {
      if (editingWebhook) {
        await api.put(
          `/integrations/hotels/${currentHotel.id}/webhooks/${editingWebhook.id}`,
          form
        )
        toast.success('Webhook mis à jour')
      } else {
        await api.post(`/integrations/hotels/${currentHotel.id}/webhooks`, form)
        toast.success('Webhook créé')
      }
      setShowForm(false)
      fetchAll(true)
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // Toggle actif/inactif
  const handleToggle = async (wh) => {
    try {
      const res = await api.post(
        `/integrations/hotels/${currentHotel.id}/webhooks/${wh.id}/toggle`
      )
      toast.success(res.data.message)
      fetchAll(true)
    } catch {
      toast.error('Erreur lors du changement de statut')
    }
  }

  // Envoyer un test
  const handleTest = async (wh) => {
    try {
      await api.post(
        `/integrations/hotels/${currentHotel.id}/webhooks/${wh.id}/test`
      )
      toast.success('Webhook de test envoyé', {
        description: `→ ${wh.target_url}`
      })
      setTimeout(() => {
        if (selectedWebhook?.id === wh.id) fetchDeliveries(wh.id)
      }, 2000)
    } catch {
      toast.error("Erreur lors de l'envoi du test")
    }
  }

  // Supprimer
  const handleDelete = async (wh) => {
    if (!window.confirm(`Supprimer le webhook "${wh.name}" et tous ses logs ?`)) return
    try {
      await api.delete(`/integrations/hotels/${currentHotel.id}/webhooks/${wh.id}`)
      toast.success('Webhook supprimé')
      if (selectedWebhook?.id === wh.id) setSelectedWebhook(null)
      fetchAll(true)
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  // Copier le secret
  const handleCopySecret = (secret) => {
    navigator.clipboard.writeText(secret)
    toast.success('Secret copié dans le presse-papier')
  }

  // Toggler un event_type dans le form
  const toggleEventType = (eventType) => {
    setForm(prev => ({
      ...prev,
      event_types: prev.event_types.includes(eventType)
        ? prev.event_types.filter(e => e !== eventType)
        : [...prev.event_types, eventType]
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Chargement des webhooks...
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="webhook-manager">

      {/* ── Header + KPIs ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-600" />
            Webhooks sortants
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Envoyez les événements Flowtym vers vos systèmes externes en temps réel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => fetchAll(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white"
            onClick={handleOpenCreate}
            data-testid="create-webhook-btn"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nouveau webhook
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Endpoints actifs', value: `${stats.active_endpoints}/${stats.total_endpoints}`, icon: ToggleRight, color: 'text-emerald-600' },
            { label: 'Livraisons totales', value: stats.total_deliveries, icon: Activity, color: 'text-blue-600' },
            { label: 'Taux de succès', value: `${stats.success_rate}%`, icon: CheckCircle2, color: 'text-emerald-600' },
            { label: 'Dernières 24h', value: stats.deliveries_last_24h, icon: Clock, color: 'text-violet-600' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <kpi.icon className={`w-5 h-5 ${kpi.color} flex-shrink-0`} />
              <div>
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className="text-lg font-bold text-slate-900">{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Liste des webhooks ── */}
      {webhooks.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <Zap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-slate-700">Aucun webhook configuré</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Connectez vos systèmes externes pour recevoir les événements en temps réel
          </p>
          <Button
            className="bg-violet-600 hover:bg-violet-700 text-white"
            onClick={handleOpenCreate}
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer mon premier webhook
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(wh => (
            <div
              key={wh.id}
              className={`bg-white rounded-xl border transition-all ${
                selectedWebhook?.id === wh.id
                  ? 'border-violet-400 shadow-md'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Ligne principale */}
              <div className="flex items-center gap-4 p-4">
                {/* Indicateur actif */}
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  wh.is_active ? 'bg-emerald-400' : 'bg-slate-300'
                }`} />

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{wh.name}</span>
                    {!wh.is_active && (
                      <Badge variant="outline" className="text-xs text-slate-500">Inactif</Badge>
                    )}
                    {wh.last_status === 'success' && (
                      <Badge className="text-xs bg-emerald-50 text-emerald-700 border-0">
                        <CheckCircle2 className="w-3 h-3 mr-1" />OK
                      </Badge>
                    )}
                    {wh.last_status === 'failed' && (
                      <Badge className="text-xs bg-red-50 text-red-700 border-0">
                        <XCircle className="w-3 h-3 mr-1" />Échec
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {wh.target_url}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {(wh.event_types || []).slice(0, 4).map(et => {
                      const ev = EVENT_LABELS[et]
                      return ev ? (
                        <span key={et} className={`text-xs px-1.5 py-0.5 rounded-md ${ev.color}`}>
                          {ev.label}
                        </span>
                      ) : null
                    })}
                    {(wh.event_types || []).length > 4 && (
                      <span className="text-xs text-slate-400">
                        +{wh.event_types.length - 4} autres
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden md:flex items-center gap-4 text-xs text-slate-500">
                  <div className="text-center">
                    <p className="font-semibold text-slate-900">{wh.total_deliveries ?? 0}</p>
                    <p>livraisons</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-emerald-600">{wh.successful_deliveries ?? 0}</p>
                    <p>succès</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400">{fmtDate(wh.last_triggered_at)}</p>
                    <p>dernier envoi</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => handleTest(wh)}
                    title="Envoyer un test"
                    data-testid={`test-webhook-${wh.id}`}
                  >
                    <Play className="w-4 h-4 text-violet-600" />
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => handleToggle(wh)}
                    title={wh.is_active ? 'Désactiver' : 'Activer'}
                  >
                    {wh.is_active
                      ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                      : <ToggleLeft className="w-4 h-4 text-slate-400" />
                    }
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => handleOpenEdit(wh)}
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4 text-slate-500" />
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => handleDelete(wh)}
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => handleSelectWebhook(wh)}
                    title="Voir les livraisons"
                    data-testid={`deliveries-webhook-${wh.id}`}
                  >
                    {selectedWebhook?.id === wh.id
                      ? <ChevronDown className="w-4 h-4 text-violet-600" />
                      : <ChevronRight className="w-4 h-4 text-slate-400" />
                    }
                  </Button>
                </div>
              </div>

              {/* Panel Livraisons (expandable) */}
              {selectedWebhook?.id === wh.id && (
                <div className="border-t border-slate-100 bg-slate-50 rounded-b-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Historique des livraisons
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Shield className="w-3 h-3" />
                        <span className="font-mono truncate max-w-32">{wh.secret_key}</span>
                        <Button
                          variant="ghost" size="sm" className="h-5 w-5 p-0"
                          onClick={() => handleCopySecret(wh.secret_key)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => fetchDeliveries(wh.id)}
                        disabled={loadingDeliveries}
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingDeliveries ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  {loadingDeliveries ? (
                    <div className="flex items-center justify-center py-6 text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />Chargement...
                    </div>
                  ) : deliveries.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">
                      Aucune livraison enregistrée. Envoyez un test !
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {deliveries.map(d => {
                        const ev = EVENT_LABELS[d.event_type]
                        return (
                          <div
                            key={d.id}
                            className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-3 text-xs"
                          >
                            <div className="flex-shrink-0">{statusBadge(d.status)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-xs ${ev?.color || 'bg-slate-100 text-slate-600'}`}>
                                  {ev?.label || d.event_type}
                                </span>
                                {d.response_code && (
                                  <span className={`font-mono font-semibold ${
                                    d.response_code >= 200 && d.response_code < 300
                                      ? 'text-emerald-600' : 'text-red-600'
                                  }`}>
                                    HTTP {d.response_code}
                                  </span>
                                )}
                                {d.attempt_number > 1 && (
                                  <span className="text-amber-600">tentative #{d.attempt_number}</span>
                                )}
                              </div>
                              {d.error_message && (
                                <p className="text-red-500 truncate mt-0.5">{d.error_message}</p>
                              )}
                            </div>
                            <span className="text-slate-400 flex-shrink-0">{fmtDate(d.created_at)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Info signature ── */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-blue-800">Vérification de signature</p>
          <p className="text-blue-700 mt-0.5">
            Chaque requête webhook est signée avec HMAC-SHA256 via l'en-tête{' '}
            <code className="bg-blue-100 px-1 rounded font-mono text-xs">X-Flowtym-Signature-256</code>.
            Vérifiez cette signature côté serveur pour sécuriser vos endpoints.
          </p>
        </div>
      </div>

      {/* ── Modal Création / Édition ── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl" data-testid="webhook-form-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-violet-600" />
              {editingWebhook ? 'Modifier le webhook' : 'Nouveau webhook'}
            </DialogTitle>
            <DialogDescription>
              Configurez l'URL cible et les événements à notifier
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nom */}
            <div className="space-y-1">
              <Label htmlFor="wh-name">Nom <span className="text-red-500">*</span></Label>
              <Input
                id="wh-name"
                placeholder="Ex: Sync PMS interne, Alerte Slack réservations..."
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                data-testid="webhook-name-input"
              />
            </div>

            {/* URL cible */}
            <div className="space-y-1">
              <Label htmlFor="wh-url">URL cible <span className="text-red-500">*</span></Label>
              <Input
                id="wh-url"
                type="url"
                placeholder="https://mon-systeme.com/webhooks/flowtym"
                value={form.target_url}
                onChange={e => setForm(p => ({ ...p, target_url: e.target.value }))}
                data-testid="webhook-url-input"
              />
              <p className="text-xs text-slate-400">Doit être accessible depuis Internet (pas localhost)</p>
            </div>

            {/* Secret */}
            <div className="space-y-1">
              <Label htmlFor="wh-secret">Clé secrète</Label>
              <Input
                id="wh-secret"
                placeholder="Laissez vide pour générer automatiquement"
                value={form.secret_key}
                onChange={e => setForm(p => ({ ...p, secret_key: e.target.value }))}
              />
              <p className="text-xs text-slate-400">
                Utilisée pour la signature HMAC-SHA256 des requêtes
              </p>
            </div>

            {/* Événements */}
            <div className="space-y-2">
              <Label>Événements <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {events.map(ev => {
                  const meta = EVENT_LABELS[ev.type]
                  const checked = form.event_types.includes(ev.type)
                  return (
                    <label
                      key={ev.type}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm
                        ${checked ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleEventType(ev.type)}
                      />
                      <span className={`text-xs px-1.5 py-0.5 rounded ${meta?.color || 'bg-slate-100 text-slate-600'}`}>
                        {meta?.label || ev.label}
                      </span>
                    </label>
                  )
                })}
              </div>
              {form.event_types.length > 0 && (
                <p className="text-xs text-violet-600 font-medium">
                  {form.event_types.length} événement{form.event_types.length > 1 ? 's' : ''} sélectionné{form.event_types.length > 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Retry */}
            <div className="space-y-1">
              <Label>Nombre de tentatives automatiques</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, retry_count: n }))}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors
                      ${form.retry_count === n
                        ? 'border-violet-500 bg-violet-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                  >
                    {n}×
                  </button>
                ))}
              </div>
            </div>

            {/* Description optionnelle */}
            <div className="space-y-1">
              <Label>Description (optionnel)</Label>
              <Input
                placeholder="Système de destination, usage..."
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Annuler
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={handleSave}
              disabled={saving}
              data-testid="save-webhook-btn"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              {editingWebhook ? 'Mettre à jour' : 'Créer le webhook'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default WebhookManager
