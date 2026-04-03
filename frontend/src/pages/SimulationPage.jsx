/**
 * Flowtym — Simulation & Offres (Devis / Proforma)
 * Création de devis, conversion en réservation, suivi taux conversion
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { useI18n } from '@/context/I18nContext'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  FileText, Plus, Search, Send, RefreshCw, Copy, TrendingUp,
  Euro, Clock, CheckCircle2, XCircle, ArrowRight, MoreHorizontal,
  Trash2, Edit, Eye, Calculator
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

// ── Status ────────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:     { label: 'Brouillon',  color: 'bg-slate-100 text-slate-600',    icon: FileText },
  sent:      { label: 'Envoyé',     color: 'bg-blue-100 text-blue-700',      icon: Send },
  converted: { label: 'Converti',   color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  expired:   { label: 'Expiré',     color: 'bg-amber-100 text-amber-700',    icon: Clock },
  cancelled: { label: 'Annulé',     color: 'bg-red-100 text-red-700',        icon: XCircle },
}

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  )
}

const fmtDate = (d) => {
  try { return format(new Date(d), 'dd MMM yyyy', { locale: fr }) } catch { return d || '—' }
}
const fmtMoney = (n) => `${(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`

// ── Formulaire devis ──────────────────────────────────────────────────────────
const QuoteForm = ({ onSave, onCancel, initial = {}, roomTypes = [] }) => {
  const [form, setForm] = useState({
    client_name: '', client_email: '', client_phone: '', client_company: '',
    room_type_code: roomTypes[0]?.code || '', check_in: '', check_out: '',
    adults: 2, children: 0, rate_plan_code: 'BAR',
    discount_pct: 0, notes: '', valid_until: '',
    extras: [],
    ...initial,
  })
  const [newExtra, setNewExtra] = useState({ name: '', unit_price: '', qty: 1 })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const addExtra = () => {
    if (!newExtra.name || !newExtra.unit_price) return
    set('extras', [...(form.extras || []), { ...newExtra, unit_price: parseFloat(newExtra.unit_price) }])
    setNewExtra({ name: '', unit_price: '', qty: 1 })
  }

  const removeExtra = (i) => set('extras', form.extras.filter((_, idx) => idx !== i))

  // Calcul preview
  const nights = (() => {
    try {
      const d = (new Date(form.check_out) - new Date(form.check_in)) / 86400000
      return Math.max(0, d)
    } catch { return 0 }
  })()
  const extrasTotal = (form.extras || []).reduce((s, e) => s + (parseFloat(e.unit_price) || 0) * (parseInt(e.qty) || 1), 0)

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Client *</label>
          <Input value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Nom du client" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Email</label>
          <Input type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} placeholder="email@example.com" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Téléphone</label>
          <Input value={form.client_phone} onChange={e => set('client_phone', e.target.value)} placeholder="+33..." />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Entreprise</label>
          <Input value={form.client_company} onChange={e => set('client_company', e.target.value)} placeholder="Nom de l'entreprise (optionnel)" />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Type de chambre *</label>
          <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            value={form.room_type_code} onChange={e => set('room_type_code', e.target.value)}>
            {roomTypes.length > 0
              ? roomTypes.map(rt => <option key={rt.code} value={rt.code}>{rt.name} ({rt.code})</option>)
              : <option value="">Saisir manuellement...</option>
            }
          </select>
          {roomTypes.length === 0 && (
            <Input className="mt-1" value={form.room_type_code} onChange={e => set('room_type_code', e.target.value)} placeholder="Code type chambre" />
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Plan tarifaire</label>
          <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            value={form.rate_plan_code} onChange={e => set('rate_plan_code', e.target.value)}>
            <option value="BAR">BAR (Best Available Rate)</option>
            <option value="NRF">Non Remboursable</option>
            <option value="PKG">Package</option>
            <option value="CORP">Corporate</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Arrivée *</label>
          <Input type="date" value={form.check_in} onChange={e => set('check_in', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Départ *</label>
          <Input type="date" value={form.check_out} onChange={e => set('check_out', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Adultes</label>
          <Input type="number" min={1} value={form.adults} onChange={e => set('adults', parseInt(e.target.value) || 1)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Remise (%)</label>
          <Input type="number" min={0} max={100} value={form.discount_pct} onChange={e => set('discount_pct', parseFloat(e.target.value) || 0)} />
        </div>

        {/* Extras */}
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Prestations supplémentaires</label>
          <div className="space-y-2">
            {(form.extras || []).map((ex, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg text-sm">
                <span className="flex-1">{ex.name}</span>
                <span className="text-slate-500">{ex.qty} × {ex.unit_price}€</span>
                <button onClick={() => removeExtra(i)} className="text-red-400 hover:text-red-600"><XCircle size={14} /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input className="flex-1" placeholder="Nom (ex: Petit-déjeuner)" value={newExtra.name}
                onChange={e => setNewExtra(p => ({ ...p, name: e.target.value }))} />
              <Input className="w-24" type="number" placeholder="Prix" value={newExtra.unit_price}
                onChange={e => setNewExtra(p => ({ ...p, unit_price: e.target.value }))} />
              <Input className="w-16" type="number" min={1} value={newExtra.qty}
                onChange={e => setNewExtra(p => ({ ...p, qty: parseInt(e.target.value) || 1 }))} />
              <Button size="sm" variant="outline" onClick={addExtra}><Plus size={14} /></Button>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Valide jusqu'au</label>
          <Input type="date" value={form.valid_until} onChange={e => set('valid_until', e.target.value)} />
        </div>

        {/* Résumé */}
        {nights > 0 && (
          <div className="col-span-2 bg-violet-50 rounded-xl p-3 text-sm space-y-1 border border-violet-100">
            <div className="flex justify-between text-slate-600">
              <span>{nights} nuit(s) + extras</span>
              <span>{fmtMoney(extrasTotal)}</span>
            </div>
            {form.discount_pct > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Remise {form.discount_pct}%</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-900 border-t border-violet-200 pt-1 mt-1">
              <span>Total estimé</span>
              <span className="text-violet-700">(calculé automatiquement)</span>
            </div>
          </div>
        )}

        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Notes</label>
          <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none"
            value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Informations complémentaires..." />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={() => onSave(form)}
          disabled={!form.client_name || !form.room_type_code || !form.check_in || !form.check_out}
          style={{ background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)' }} className="text-white">
          {initial.id ? 'Mettre à jour' : 'Créer le devis'}
        </Button>
      </DialogFooter>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export function SimulationPage() {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  const hotelId = currentHotel?.id

  const [quotes, setQuotes] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roomTypes, setRoomTypes] = useState([])
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const fetchQuotes = useCallback(async () => {
    if (!hotelId) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (search) params.set('client_name', search)
      const [qRes, sRes] = await Promise.all([
        api.get(`/hotels/${hotelId}/quotes?${params}`),
        api.get(`/hotels/${hotelId}/quotes/stats`),
      ])
      setQuotes(qRes.data?.quotes || [])
      setStats(sRes.data)
    } catch { toast.error('Erreur chargement devis') }
    finally { setLoading(false) }
  }, [hotelId, statusFilter, search, api])

  const fetchRoomTypes = useCallback(async () => {
    try {
      const res = await api.get(`/hotels/${hotelId}/channel/room-types-from-config`)
      setRoomTypes(res.data?.room_types || [])
    } catch {
      try {
        const res = await api.get(`/config/hotels/${hotelId}/room-types`)
        setRoomTypes(res.data?.room_types || [])
      } catch { setRoomTypes([]) }
    }
  }, [hotelId, api])

  useEffect(() => { fetchQuotes(); fetchRoomTypes() }, [fetchQuotes, fetchRoomTypes])

  const handleCreate = async (form) => {
    try {
      await api.post(`/hotels/${hotelId}/quotes`, form)
      toast.success('Devis créé')
      setShowCreateModal(false)
      fetchQuotes()
    } catch { toast.error('Erreur création devis') }
  }

  const handleSend = async (quoteId) => {
    try {
      await api.post(`/hotels/${hotelId}/quotes/${quoteId}/send`)
      toast.success('Devis marqué comme envoyé')
      fetchQuotes()
    } catch { toast.error('Erreur envoi') }
  }

  const handleConvert = async (quoteId) => {
    if (!confirm('Convertir ce devis en réservation ?')) return
    try {
      const res = await api.post(`/hotels/${hotelId}/quotes/${quoteId}/convert`)
      toast.success(`Réservation créée : ${res.data?.reservation?.id?.slice(0, 8)}...`)
      fetchQuotes()
    } catch { toast.error('Erreur conversion') }
  }

  const handleDuplicate = async (quoteId) => {
    try {
      await api.post(`/hotels/${hotelId}/quotes/${quoteId}/duplicate`)
      toast.success('Devis dupliqué')
      fetchQuotes()
    } catch { toast.error('Erreur duplication') }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="h-6 w-6 text-violet-600" /> Simulation & Offres
          </h1>
          <p className="text-slate-500 text-sm mt-1">Devis, proformas et conversion en réservations</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}
          style={{ background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)' }} className="text-white gap-2">
          <Plus size={16} /> Nouveau devis
        </Button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total devis', value: stats.total_quotes, icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Taux conversion', value: `${stats.conversion_rate ?? 0}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'CA potentiel', value: fmtMoney(stats.potential_revenue), icon: Euro, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Convertis', value: stats.by_status?.converted?.count ?? 0, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map((kpi, i) => (
            <Card key={i} className="border-slate-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-xl ${kpi.bg}`}><kpi.icon className={`h-5 w-5 ${kpi.color}`} /></div>
                <div><p className="text-xs text-slate-500">{kpi.label}</p>
                  <p className="text-xl font-bold text-slate-900">{kpi.value}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Rechercher un client..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Liste */}
      <Card className="border-slate-200">
        {loading ? (
          <CardContent className="py-12 text-center text-slate-400">Chargement...</CardContent>
        ) : quotes.length === 0 ? (
          <CardContent className="py-12 text-center">
            <Calculator size={40} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500">Aucun devis. Créez votre première offre.</p>
          </CardContent>
        ) : (
          <div className="divide-y divide-slate-100">
            {quotes.map(quote => (
              <div key={quote.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xs flex-shrink-0">
                  {quote.quote_number?.split('-').pop()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 truncate">{quote.client_name}</p>
                    <span className="text-xs text-slate-400 font-mono">{quote.quote_number}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {quote.room_type_code} · {fmtDate(quote.check_in)} → {fmtDate(quote.check_out)} · {quote.nights} nuit(s)
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-slate-900">{fmtMoney(quote.total_amount)}</p>
                    {quote.discount_pct > 0 && (
                      <p className="text-xs text-amber-600">-{quote.discount_pct}%</p>
                    )}
                  </div>
                  <StatusBadge status={quote.status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors">
                        <MoreHorizontal size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {quote.status === 'draft' && (
                        <DropdownMenuItem onClick={() => handleSend(quote.id)}>
                          <Send className="mr-2 h-4 w-4" /> Marquer comme envoyé
                        </DropdownMenuItem>
                      )}
                      {['draft', 'sent'].includes(quote.status) && (
                        <DropdownMenuItem onClick={() => handleConvert(quote.id)} className="text-emerald-600">
                          <ArrowRight className="mr-2 h-4 w-4" /> Convertir en réservation
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleDuplicate(quote.id)}>
                        <Copy className="mr-2 h-4 w-4" /> Dupliquer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal création */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nouveau devis</DialogTitle></DialogHeader>
          <QuoteForm roomTypes={roomTypes} onSave={handleCreate} onCancel={() => setShowCreateModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SimulationPage
