/**
 * Flowtym — Maintenance
 * Module standalone de gestion des tickets de maintenance.
 * Utilise les endpoints housekeeping/maintenance existants.
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { useI18n } from '@/context/I18nContext'
import { toast } from 'sonner'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Wrench, Plus, Search, AlertTriangle, CheckCircle2, Clock,
  Play, MoreHorizontal, Euro, User, Calendar, TrendingDown,
  Zap, Filter, RefreshCw, ChevronDown
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

// ── Constantes ────────────────────────────────────────────────────────────────
const PRIORITY = {
  urgente: { label: 'Urgente',  color: 'bg-red-100 text-red-700 border-red-200',    dot: 'bg-red-500',    order: 0 },
  haute:   { label: 'Haute',    color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500', order: 1 },
  moyenne: { label: 'Moyenne',  color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400',  order: 2 },
  basse:   { label: 'Basse',    color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400',  order: 3 },
}

const STATUS = {
  en_attente: { label: 'En attente', color: 'bg-slate-100 text-slate-600', icon: Clock },
  en_cours:   { label: 'En cours',   color: 'bg-blue-100 text-blue-700',   icon: Play },
  resolu:     { label: 'Résolu',     color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
}

const CATEGORIES = [
  'plomberie', 'electricite', 'climatisation', 'mobilier',
  'peinture', 'serrurerie', 'informatique', 'autre'
]

const PriorityBadge = ({ priority }) => {
  const cfg = PRIORITY[priority] || PRIORITY.moyenne
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

const StatusBadge = ({ status }) => {
  const cfg = STATUS[status] || STATUS.en_attente
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  )
}

const fmtAgo = (iso) => {
  try { return formatDistanceToNow(parseISO(iso), { locale: fr, addSuffix: true }) }
  catch { return '—' }
}

const fmtDate = (iso) => {
  try { return format(parseISO(iso), 'dd/MM/yyyy HH:mm', { locale: fr }) }
  catch { return '—' }
}

// ── Formulaire création ticket ─────────────────────────────────────────────────
const TicketForm = ({ onSave, onCancel, initial = {} }) => {
  const [form, setForm] = useState({
    room_number: '', room_id: '', title: '', description: '',
    category: 'autre', priority: 'moyenne', photos: [],
    ...initial,
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Chambre *</label>
          <Input value={form.room_number} onChange={e => set('room_number', e.target.value)} placeholder="Ex: 204" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Priorité *</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
            value={form.priority} onChange={e => set('priority', e.target.value)}
          >
            {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Titre *</label>
          <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: Robinet qui fuit — salle de bain" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Catégorie</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm capitalize focus:ring-2 focus:ring-violet-500"
            value={form.category} onChange={e => set('category', e.target.value)}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Coût estimé (€)</label>
          <Input type="number" min={0} value={form.estimated_cost || ''} onChange={e => set('estimated_cost', parseFloat(e.target.value) || null)} placeholder="Optionnel" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
          <textarea
            rows={3}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 resize-none"
            value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Décrivez le problème en détail..."
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Intervenant assigné</label>
          <Input value={form.assigned_to_name || ''} onChange={e => set('assigned_to_name', e.target.value)} placeholder="Nom du technicien (optionnel)" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button
          onClick={() => onSave({ ...form, room_id: form.room_id || form.room_number })}
          disabled={!form.room_number || !form.title}
          style={{ background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)' }} className="text-white"
        >
          {initial.id ? 'Mettre à jour' : 'Créer le ticket'}
        </Button>
      </DialogFooter>
    </div>
  )
}

// ── Formulaire résolution ──────────────────────────────────────────────────────
const ResolveForm = ({ ticket, onSave, onCancel }) => {
  const [notes, setNotes] = useState('')
  const [cost, setCost] = useState('')
  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-xl p-3 text-sm">
        <p className="font-semibold text-slate-800">{ticket.title}</p>
        <p className="text-slate-500 mt-0.5">Chambre {ticket.room_number} · {ticket.category}</p>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">Notes d'intervention *</label>
        <textarea
          rows={4}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 resize-none"
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Décrivez ce qui a été fait..."
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">Coût réel (€)</label>
        <Input type="number" min={0} value={cost} onChange={e => setCost(e.target.value)} placeholder="Montant de l'intervention" />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button
          onClick={() => onSave({ status: 'resolu', resolution_notes: notes, actual_cost: parseFloat(cost) || null })}
          disabled={!notes}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <CheckCircle2 size={14} className="mr-1.5" /> Marquer comme résolu
        </Button>
      </DialogFooter>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────
export function MaintenancePage() {
  const { token } = useAuth()
  const { currentHotel } = useHotel()
  const hotelId = currentHotel?.id

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showResolve, setShowResolve] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  const headers = { Authorization: `Bearer ${token}` }

  const fetchTickets = useCallback(async () => {
    if (!hotelId) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (priorityFilter) params.set('priority', priorityFilter)
      const res = await fetch(`${API_URL}/api/housekeeping/hotels/${hotelId}/maintenance?${params}`, { headers })
      const data = await res.json()
      setTickets(Array.isArray(data) ? data : [])
    } catch { toast.error('Erreur chargement tickets') }
    finally { setLoading(false) }
  }, [hotelId, statusFilter, priorityFilter, token])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const handleCreate = async (form) => {
    try {
      const res = await fetch(`${API_URL}/api/housekeeping/hotels/${hotelId}/maintenance`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success('Ticket créé')
      setShowCreate(false)
      fetchTickets()
    } catch { toast.error('Erreur création ticket') }
  }

  const handleStatusChange = async (ticketId, updates) => {
    try {
      await fetch(`${API_URL}/api/housekeeping/hotels/${hotelId}/maintenance/${ticketId}`, {
        method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      toast.success('Ticket mis à jour')
      setShowResolve(false)
      setSelectedTicket(null)
      fetchTickets()
    } catch { toast.error('Erreur mise à jour') }
  }

  // KPIs
  const stats = {
    total: tickets.length,
    en_attente: tickets.filter(t => t.status === 'en_attente').length,
    en_cours: tickets.filter(t => t.status === 'en_cours').length,
    urgentes: tickets.filter(t => t.priority === 'urgente' && t.status !== 'resolu').length,
    resolus: tickets.filter(t => t.status === 'resolu').length,
    cout_total: tickets.reduce((s, t) => s + (t.actual_cost || 0), 0),
  }

  const filtered = tickets.filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return t.title?.toLowerCase().includes(q) || t.room_number?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q) || t.assigned_to_name?.toLowerCase().includes(q)
  })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="h-6 w-6 text-violet-600" /> Maintenance
          </h1>
          <p className="text-slate-500 text-sm mt-1">Tickets, interventions et suivi des coûts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTickets} className="gap-2">
            <RefreshCw size={14} /> Actualiser
          </Button>
          <Button onClick={() => setShowCreate(true)}
            style={{ background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)' }} className="text-white gap-2">
            <Plus size={16} /> Nouveau ticket
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'En attente', value: stats.en_attente, icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50', border: stats.en_attente > 0 ? 'border-slate-300' : '' },
          { label: 'En cours', value: stats.en_cours, icon: Play, color: 'text-blue-600', bg: 'bg-blue-50', border: '' },
          { label: 'Urgents', value: stats.urgentes, icon: Zap, color: 'text-red-600', bg: 'bg-red-50', border: stats.urgentes > 0 ? 'border-red-300' : '' },
          { label: 'Résolus', value: stats.resolus, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: '' },
          { label: 'Coûts totaux', value: `${stats.cout_total.toLocaleString('fr-FR')} €`, icon: Euro, color: 'text-violet-600', bg: 'bg-violet-50', border: '' },
        ].map((kpi, i) => (
          <Card key={i} className={`border-slate-200 ${kpi.border}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-xl ${kpi.bg}`}><kpi.icon className={`h-4 w-4 ${kpi.color}`} /></div>
              <div>
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className="text-xl font-bold text-slate-900">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Chambre, titre, catégorie..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
          value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
          <option value="">Toutes les priorités</option>
          {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Tableau tickets */}
      <Card className="border-slate-200">
        {loading ? (
          <CardContent className="py-12 text-center text-slate-400">Chargement...</CardContent>
        ) : filtered.length === 0 ? (
          <CardContent className="py-12 text-center">
            <Wrench size={40} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500">Aucun ticket trouvé. L'hôtel tourne sans problème !</p>
          </CardContent>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(ticket => (
              <div key={ticket.id}
                className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => { setSelectedTicket(ticket); setShowDetail(true) }}
              >
                {/* Priorité indicator */}
                <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${PRIORITY[ticket.priority]?.dot || 'bg-slate-300'}`} />

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900 leading-tight">{ticket.title}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <PriorityBadge priority={ticket.priority} />
                      <StatusBadge status={ticket.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-slate-700">Ch. {ticket.room_number}</span>
                    </span>
                    <span className="capitalize">{ticket.category}</span>
                    {ticket.assigned_to_name && (
                      <span className="flex items-center gap-1"><User size={11} /> {ticket.assigned_to_name}</span>
                    )}
                    <span className="flex items-center gap-1"><Clock size={11} /> {fmtAgo(ticket.reported_at)}</span>
                    {ticket.actual_cost && (
                      <span className="flex items-center gap-1 text-violet-600 font-medium">
                        <Euro size={11} /> {ticket.actual_cost}€
                      </span>
                    )}
                  </div>
                  {ticket.description && (
                    <p className="text-xs text-slate-400 truncate">{ticket.description}</p>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                    <button className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 flex-shrink-0 mt-0.5">
                      <MoreHorizontal size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {ticket.status === 'en_attente' && (
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); handleStatusChange(ticket.id, { status: 'en_cours' }) }}>
                        <Play className="mr-2 h-4 w-4 text-blue-500" /> Prendre en charge
                      </DropdownMenuItem>
                    )}
                    {ticket.status !== 'resolu' && (
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); setSelectedTicket(ticket); setShowResolve(true) }}>
                        <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" /> Marquer résolu
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {['urgente', 'haute', 'moyenne', 'basse'].map(p => (
                      p !== ticket.priority && (
                        <DropdownMenuItem key={p} onClick={e => { e.stopPropagation(); handleStatusChange(ticket.id, { priority: p }) }}>
                          <span className={`w-2 h-2 rounded-full mr-2 ${PRIORITY[p].dot}`} />
                          Priorité {PRIORITY[p].label}
                        </DropdownMenuItem>
                      )
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal création */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouveau ticket de maintenance</DialogTitle></DialogHeader>
          <TicketForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      {/* Modal résolution */}
      <Dialog open={showResolve} onOpenChange={setShowResolve}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Clore l'intervention</DialogTitle></DialogHeader>
          {selectedTicket && (
            <ResolveForm
              ticket={selectedTicket}
              onSave={updates => handleStatusChange(selectedTicket.id, updates)}
              onCancel={() => { setShowResolve(false); setSelectedTicket(null) }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal détail */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench size={18} /> Détail du ticket
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">{selectedTicket.title}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Chambre {selectedTicket.room_number} · {selectedTicket.category}</p>
                </div>
                <div className="flex gap-2">
                  <PriorityBadge priority={selectedTicket.priority} />
                  <StatusBadge status={selectedTicket.status} />
                </div>
              </div>
              {selectedTicket.description && (
                <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-700">{selectedTicket.description}</div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-500">Signalé</p><p className="font-medium">{fmtDate(selectedTicket.reported_at)}</p></div>
                {selectedTicket.assigned_to_name && <div><p className="text-xs text-slate-500">Assigné à</p><p className="font-medium">{selectedTicket.assigned_to_name}</p></div>}
                {selectedTicket.started_at && <div><p className="text-xs text-slate-500">Démarré</p><p className="font-medium">{fmtDate(selectedTicket.started_at)}</p></div>}
                {selectedTicket.resolved_at && <div><p className="text-xs text-slate-500">Résolu</p><p className="font-medium">{fmtDate(selectedTicket.resolved_at)}</p></div>}
                {selectedTicket.actual_cost && <div><p className="text-xs text-slate-500">Coût réel</p><p className="font-medium text-violet-700">{selectedTicket.actual_cost} €</p></div>}
              </div>
              {selectedTicket.resolution_notes && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Notes d'intervention</p>
                  <div className="bg-emerald-50 rounded-xl p-3 text-sm text-emerald-800">{selectedTicket.resolution_notes}</div>
                </div>
              )}
              {selectedTicket.status !== 'resolu' && (
                <DialogFooter>
                  {selectedTicket.status === 'en_attente' && (
                    <Button variant="outline" onClick={() => { handleStatusChange(selectedTicket.id, { status: 'en_cours' }); setShowDetail(false) }}>
                      <Play size={14} className="mr-1.5" /> Prendre en charge
                    </Button>
                  )}
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => { setShowDetail(false); setShowResolve(true) }}>
                    <CheckCircle2 size={14} className="mr-1.5" /> Résoudre
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MaintenancePage
