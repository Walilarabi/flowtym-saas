/**
 * Flowtym — Groups & Séminaires
 * Gestion des allotements groupes et rooming lists
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Users, Plus, Search, Building2, Calendar, MoreHorizontal,
  ChevronRight, Download, Upload, Trash2, Edit, CheckCircle2,
  Clock, XCircle, TrendingUp, Bed, Euro, FileText
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  tentative:  { label: 'Tentative',  color: 'bg-amber-100 text-amber-700',  icon: Clock },
  confirmed:  { label: 'Confirmé',   color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  cancelled:  { label: 'Annulé',    color: 'bg-red-100 text-red-700',      icon: XCircle },
}

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.tentative
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  )
}

const fmtDate = (d) => {
  try { return format(new Date(d), 'dd MMM yyyy', { locale: fr }) }
  catch { return d }
}

// ── Formulaire création groupe ────────────────────────────────────────────────
const GroupForm = ({ onSave, onCancel, initial = {} }) => {
  const [form, setForm] = useState({
    group_name: '', contact_name: '', contact_email: '', contact_phone: '',
    block_start: '', block_end: '', rooms_blocked: 1,
    rate_per_room: '', notes: '', status: 'tentative',
    ...initial,
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Nom du groupe *</label>
          <Input value={form.group_name} onChange={e => set('group_name', e.target.value)}
            placeholder="Ex: Séminaire Accenture" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Contact *</label>
          <Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
            placeholder="Nom du contact" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Email</label>
          <Input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
            placeholder="contact@entreprise.com" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Téléphone</label>
          <Input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
            placeholder="+33 6 xx xx xx xx" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Statut</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
            value={form.status} onChange={e => set('status', e.target.value)}
          >
            <option value="tentative">Tentative</option>
            <option value="confirmed">Confirmé</option>
            <option value="cancelled">Annulé</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Arrivée *</label>
          <Input type="date" value={form.block_start} onChange={e => set('block_start', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Départ *</label>
          <Input type="date" value={form.block_end} onChange={e => set('block_end', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Chambres bloquées *</label>
          <Input type="number" min={1} value={form.rooms_blocked}
            onChange={e => set('rooms_blocked', parseInt(e.target.value) || 1)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Tarif / chambre / nuit (€)</label>
          <Input type="number" min={0} value={form.rate_per_room}
            onChange={e => set('rate_per_room', e.target.value)} placeholder="150" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Notes</label>
          <textarea
            rows={3}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 resize-none"
            value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Informations complémentaires..."
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={() => onSave(form)}
          disabled={!form.group_name || !form.contact_name || !form.block_start || !form.block_end}
          style={{ background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)' }} className="text-white">
          {initial.id ? 'Mettre à jour' : 'Créer le groupe'}
        </Button>
      </DialogFooter>
    </div>
  )
}

// ── Formulaire rooming ────────────────────────────────────────────────────────
const RoomingForm = ({ group, onSave, onCancel }) => {
  const [form, setForm] = useState({
    guest_name: '', room_number: '', check_in: group?.block_start || '',
    check_out: group?.block_end || '', adults: 1, children: 0, notes: '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Nom du voyageur *</label>
          <Input value={form.guest_name} onChange={e => set('guest_name', e.target.value)} placeholder="Nom Prénom" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">N° chambre</label>
          <Input value={form.room_number} onChange={e => set('room_number', e.target.value)} placeholder="101" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Adultes</label>
          <Input type="number" min={1} value={form.adults} onChange={e => set('adults', parseInt(e.target.value) || 1)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Arrivée</label>
          <Input type="date" value={form.check_in} onChange={e => set('check_in', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Départ</label>
          <Input type="date" value={form.check_out} onChange={e => set('check_out', e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={() => onSave(form)} disabled={!form.guest_name}
          style={{ background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)' }} className="text-white">
          Ajouter
        </Button>
      </DialogFooter>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export function GroupsPage() {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  const { t } = useI18n()
  const hotelId = currentHotel?.id

  const [groups, setGroups] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRoomingModal, setShowRoomingModal] = useState(false)
  const [rooming, setRooming] = useState([])

  const fetchGroups = useCallback(async () => {
    if (!hotelId) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const [grRes, stRes] = await Promise.all([
        api.get(`/hotels/${hotelId}/groups?${params}`),
        api.get(`/hotels/${hotelId}/groups/stats`),
      ])
      setGroups(grRes.data?.groups || [])
      setStats(stRes.data)
    } catch {
      toast.error('Erreur chargement groupes')
    } finally { setLoading(false) }
  }, [hotelId, statusFilter, api])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const fetchRooming = async (groupId) => {
    const res = await api.get(`/hotels/${hotelId}/groups/${groupId}/rooming-list`)
    setRooming(res.data?.entries || [])
  }

  const handleCreate = async (form) => {
    try {
      await api.post(`/hotels/${hotelId}/groups`, form)
      toast.success('Groupe créé')
      setShowCreateModal(false)
      fetchGroups()
    } catch { toast.error('Erreur création groupe') }
  }

  const handleUpdate = async (form) => {
    try {
      await api.put(`/hotels/${hotelId}/groups/${selectedGroup.id}`, form)
      toast.success('Groupe mis à jour')
      setShowEditModal(false)
      setSelectedGroup(null)
      fetchGroups()
    } catch { toast.error('Erreur mise à jour') }
  }

  const handleDelete = async (groupId) => {
    if (!confirm('Supprimer ce groupe et sa rooming list ?')) return
    try {
      await api.delete(`/hotels/${hotelId}/groups/${groupId}`)
      toast.success('Groupe supprimé')
      fetchGroups()
    } catch { toast.error('Erreur suppression') }
  }

  const handleAddRooming = async (entry) => {
    try {
      await api.post(`/hotels/${hotelId}/groups/${selectedGroup.id}/rooming-list`, entry)
      toast.success('Voyageur ajouté')
      setShowRoomingModal(false)
      fetchRooming(selectedGroup.id)
    } catch { toast.error('Erreur ajout voyageur') }
  }

  const handleDeleteRooming = async (entryId) => {
    try {
      await api.delete(`/hotels/${hotelId}/groups/${selectedGroup.id}/rooming-list/${entryId}`)
      toast.success('Entrée supprimée')
      fetchRooming(selectedGroup.id)
    } catch { toast.error('Erreur suppression') }
  }

  const openGroup = async (group) => {
    setSelectedGroup(group)
    await fetchRooming(group.id)
  }

  const filtered = groups.filter(g =>
    !search || g.group_name?.toLowerCase().includes(search.toLowerCase()) ||
    g.contact_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-violet-600" /> Groups & Séminaires
          </h1>
          <p className="text-slate-500 text-sm mt-1">Allotements groupes et rooming lists</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}
          style={{ background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)' }} className="text-white gap-2">
          <Plus size={16} /> Nouveau groupe
        </Button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total groupes', value: stats.total_groups, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Confirmés', value: stats.confirmed?.count ?? 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Tentatives', value: stats.tentative?.count ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Taux confirmation', value: `${stats.confirmation_rate ?? 0}%`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
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
          <Input className="pl-9" placeholder="Rechercher un groupe..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="tentative">Tentative</option>
          <option value="confirmed">Confirmé</option>
          <option value="cancelled">Annulé</option>
        </select>
      </div>

      {/* Liste groupes */}
      {selectedGroup ? (
        /* Vue détail groupe */
        <div className="space-y-4">
          <button onClick={() => setSelectedGroup(null)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            ← Retour à la liste
          </button>
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{selectedGroup.group_name}</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">{selectedGroup.contact_name} · {selectedGroup.contact_email}</p>
                </div>
                <StatusBadge status={selectedGroup.status} />
              </div>
              <div className="flex gap-6 mt-3 text-sm">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Calendar size={14} /> {fmtDate(selectedGroup.block_start)} → {fmtDate(selectedGroup.block_end)}
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Bed size={14} /> {selectedGroup.rooms_blocked} chambres
                </span>
                {selectedGroup.rate_per_room && (
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Euro size={14} /> {selectedGroup.rate_per_room}€/nuit
                  </span>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Rooming list */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Rooming list ({rooming.length} voyageurs)</h3>
            <Button size="sm" onClick={() => setShowRoomingModal(true)} variant="outline" className="gap-2">
              <Plus size={14} /> Ajouter un voyageur
            </Button>
          </div>
          <Card className="border-slate-200">
            {rooming.length === 0 ? (
              <CardContent className="py-12 text-center text-slate-400">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun voyageur encore. Ajoutez-en depuis le bouton ci-dessus.</p>
              </CardContent>
            ) : (
              <div className="divide-y divide-slate-100">
                {rooming.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-bold">
                        {entry.guest_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{entry.guest_name}</p>
                        <p className="text-xs text-slate-500">
                          {entry.room_number ? `Chambre ${entry.room_number} · ` : ''}
                          {fmtDate(entry.check_in)} → {fmtDate(entry.check_out)} · {entry.nights} nuit(s)
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteRooming(entry.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* Liste des groupes */
        <Card className="border-slate-200">
          {loading ? (
            <CardContent className="py-12 text-center text-slate-400">Chargement...</CardContent>
          ) : filtered.length === 0 ? (
            <CardContent className="py-12 text-center">
              <Users size={40} className="mx-auto mb-3 text-slate-200" />
              <p className="text-slate-500">Aucun groupe trouvé. Créez votre premier allotement.</p>
            </CardContent>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(group => (
                <div key={group.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => openGroup(group)}
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm flex-shrink-0">
                    {group.group_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{group.group_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {group.contact_name} · {fmtDate(group.block_start)} → {fmtDate(group.block_end)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-center hidden sm:block">
                      <p className="text-sm font-bold text-slate-900">{group.rooms_blocked}</p>
                      <p className="text-xs text-slate-400">chambres</p>
                    </div>
                    <StatusBadge status={group.status} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <button className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors">
                          <MoreHorizontal size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); setSelectedGroup(group); setShowEditModal(true) }}>
                          <Edit className="mr-2 h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600"
                          onClick={e => { e.stopPropagation(); handleDelete(group.id) }}>
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Modal création */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouveau groupe</DialogTitle></DialogHeader>
          <GroupForm onSave={handleCreate} onCancel={() => setShowCreateModal(false)} />
        </DialogContent>
      </Dialog>

      {/* Modal édition */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Modifier le groupe</DialogTitle></DialogHeader>
          {selectedGroup && (
            <GroupForm initial={selectedGroup} onSave={handleUpdate} onCancel={() => { setShowEditModal(false) }} />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal rooming */}
      <Dialog open={showRoomingModal} onOpenChange={setShowRoomingModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ajouter un voyageur</DialogTitle></DialogHeader>
          {selectedGroup && (
            <RoomingForm group={selectedGroup} onSave={handleAddRooming}
              onCancel={() => setShowRoomingModal(false)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default GroupsPage
