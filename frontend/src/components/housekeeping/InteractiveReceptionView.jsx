/**
 * InteractiveReceptionView - Vue Réception avec tableau interactif
 * Basée sur les captures Rorck fournies par l'utilisateur
 * INTERACTIVITÉ: Checkboxes fonctionnels + Assignation en masse
 */

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Search, Filter, ChevronDown, Eye, FileText, Star, Plus, RefreshCw,
  Grid3X3, List, Check, X, AlertTriangle, MapPin, Zap, Clock, CheckCircle,
  ArrowRight, Coffee, AlertCircle, Bed, Users
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_COLORS = {
  propre: { bg: '#DCFCE7', text: '#16A34A', dot: '#22C55E' },
  sale: { bg: '#FEE2E2', text: '#DC2626', dot: '#EF4444' },
  inspectee: { bg: '#DBEAFE', text: '#2563EB', dot: '#3B82F6' },
  en_nettoyage: { bg: '#FEF3C7', text: '#D97706', dot: '#F59E0B' },
  libre: { bg: '#E8E5FF', text: '#5B4ED1', dot: '#5B4ED1' },
  occupee: { bg: '#DBEAFE', text: '#2563EB', dot: '#3B82F6' },
  hs: { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
}

const SOURCE_ICONS = {
  booking: { bg: '#003580', text: 'B', name: 'Booking' },
  direct: { bg: '#5B4ED1', text: 'D', name: 'Direct' },
  expedia: { bg: '#FBBF24', text: 'E', name: 'Expedia' },
  airbnb: { bg: '#FF5A5F', text: 'A', name: 'Airbnb' },
  agoda: { bg: '#5B9BD5', text: 'Ag', name: 'Agoda' },
  hrs: { bg: '#E11D48', text: 'H', name: 'HRS' },
  tel: { bg: '#6B7280', text: 'T', name: 'Tél.' },
  autre: { bg: '#9CA3AF', text: '?', name: 'Autre' },
}

const ROOM_COLORS = {
  101: '#5B4ED1', 102: '#22C55E', 103: '#A855F7', 104: '#F59E0B', 105: '#EF4444',
  201: '#3B82F6', 202: '#EC4899', 203: '#14B8A6', 204: '#F97316', 205: '#6366F1',
  301: '#8B5CF6', 302: '#06B6D4', 303: '#EF4444', 304: '#22C55E', 305: '#F59E0B',
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// Room number with colored background
const RoomNumber = ({ number, type }) => {
  const bgColor = ROOM_COLORS[number] || '#5B4ED1'
  
  return (
    <div className="flex items-center gap-2.5">
      <div 
        className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-[15px] text-white"
        style={{ background: bgColor }}
      >
        {number}
      </div>
      <div className="flex flex-col">
        <span className="font-semibold text-[13px] text-slate-900">{type}</span>
        <span className="text-[11px] text-slate-400">Classique · 16m²</span>
      </div>
    </div>
  )
}

// Status badge
const StatusBadge = ({ status }) => {
  const config = STATUS_COLORS[status] || STATUS_COLORS.propre
  const labels = {
    propre: 'Propre', sale: 'Sale', inspectee: 'Inspectée', 
    en_nettoyage: 'En nettoyage', libre: 'Libre', occupee: 'Occupée', hs: 'H.S.'
  }
  
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium"
      style={{ background: config.bg, color: config.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
      {labels[status] || status}
    </span>
  )
}

// Source icon
const SourceIcon = ({ source }) => {
  const config = SOURCE_ICONS[source?.toLowerCase()] || SOURCE_ICONS.autre
  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[11px] font-bold"
        style={{ background: config.bg }}
      >
        {config.text}
      </div>
      <div className="text-xs">
        <div className="font-medium text-slate-700">{config.name}</div>
        <div className="text-slate-400">OTA</div>
      </div>
    </div>
  )
}

// Staff avatar
const StaffAvatar = ({ name, color }) => {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'
  return (
    <div 
      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
      style={{ background: color || '#E8E5FF', color: '#5B4ED1' }}
    >
      {initials}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function InteractiveReceptionView({ data, actions }) {
  const { tasks, staff } = data
  const [viewMode, setViewMode] = useState('table')
  const [searchText, setSearchText] = useState('')
  const [selectedRooms, setSelectedRooms] = useState(new Set())
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState('')

  // Generate room data for display
  const roomsData = useMemo(() => [
    { number: '101', type: 'Simple', floor: 1, size: 16, status: 'propre', client: 'Jean-Pierre Dubois', vip: true, pax: 2, arrival: '28 fév.', departure: '3 mars', eta: null, source: 'booking', hkStatus: null, gouvStatus: null, assignee: null, view: 'Rue', sdb: 'Douche', pdj: true },
    { number: '102', type: 'Double', floor: 1, size: 30, status: 'inspectee', client: null, vip: false, pax: null, arrival: null, departure: null, eta: '15:00', source: 'direct', hkStatus: 'Validé', gouvStatus: 'Validé', assignee: null, view: 'Cour', sdb: 'Baignoire', pdj: false },
    { number: '103', type: 'Suite', floor: 1, size: 33, status: 'propre', client: 'Claire Martin', vip: false, pax: 1, arrival: '27 fév.', departure: '2 mars', eta: null, source: 'expedia', hkStatus: null, gouvStatus: null, assignee: null, view: 'Jardin', sdb: 'Douche+Baignoire', pdj: false },
    { number: '104', type: 'Simple', floor: 1, size: 16, status: 'sale', client: 'Marc Lefevre', vip: false, pax: 1, arrival: '26 fév.', departure: '1 mars', eta: '14:00', source: 'tel', hkStatus: 'Départ', gouvStatus: null, assignee: null, view: 'Rue', sdb: 'Douche', pdj: false },
    { number: '105', type: 'Double', floor: 1, size: 22, status: 'en_nettoyage', client: 'David Leblanc', vip: false, pax: 1, arrival: '28 fév.', departure: '3 mars', eta: null, source: 'airbnb', hkStatus: 'Recouche', gouvStatus: null, assignee: 'Sophie M.', view: 'Cour', sdb: 'Baignoire', pdj: false, time: '35:24' },
    { number: '201', type: 'Deluxe', floor: 2, size: 40, status: 'propre', client: 'Antoine & Sophie B...', vip: true, pax: 2, arrival: '28 fév.', departure: '5 mars', eta: null, source: 'direct', hkStatus: null, gouvStatus: null, assignee: null, view: 'Mer', sdb: 'Douche+Baignoire', pdj: false },
    { number: '202', type: 'Double', floor: 2, size: 20, status: 'sale', client: 'Émilie Garnier', vip: false, pax: 2, arrival: '27 fév.', departure: '1 mars', eta: '16:30', source: 'booking', hkStatus: 'Départ', gouvStatus: null, assignee: null, view: 'Rue', sdb: 'Douche', pdj: false },
    { number: '203', type: 'Simple', floor: 2, size: 18, status: 'en_nettoyage', client: 'Thomas Petit', vip: false, pax: 1, arrival: '25 fév.', departure: '4 mars', eta: null, source: 'agoda', hkStatus: 'Recouche', gouvStatus: null, assignee: 'Marie D.', view: 'Cour', sdb: 'Baignoire', pdj: false, time: '35:24' },
    { number: '204', type: 'Double', floor: 2, size: 20, status: 'propre', client: 'David Leblanc', vip: false, pax: 1, arrival: '27 fév.', departure: '1 mars', eta: null, source: 'expedia', hkStatus: 'Départ', gouvStatus: 'À valider', assignee: 'Sophie M.', view: 'Rue', sdb: 'Douche', pdj: false, time: '35:08' },
    { number: '205', type: 'Deluxe', floor: 2, size: 30, status: 'inspectee', client: null, vip: false, pax: null, arrival: null, departure: null, eta: '20:30', source: 'booking', hkStatus: 'Validé', gouvStatus: 'Validé', assignee: null, view: 'Cour', sdb: 'Baignoire', pdj: false },
    { number: '301', type: 'Suite', floor: 3, size: 45, status: 'inspectee', client: null, vip: false, pax: null, arrival: null, departure: null, eta: 'Late check-in', source: 'direct', hkStatus: 'Validé', gouvStatus: 'Validé', assignee: null, view: 'Jardin', sdb: 'Douche+Baignoire', pdj: false },
    { number: '302', type: 'Deluxe', floor: 3, size: 38, status: 'propre', client: 'Emma Wilson', vip: false, pax: 1, arrival: '1 mars', departure: '4 mars', eta: null, source: 'airbnb', hkStatus: null, gouvStatus: null, assignee: null, view: 'Cour', sdb: 'Baignoire', pdj: false },
    { number: '303', type: 'Double', floor: 3, size: 20, status: 'sale', client: 'Robert Petit', vip: true, pax: 1, arrival: '24 fév.', departure: '2 mars', eta: null, source: 'hrs', hkStatus: 'Recouche', gouvStatus: 'Refusé', assignee: 'Sophie M.', view: 'Rue', sdb: 'Douche', pdj: false },
    { number: '304', type: 'Familiale', floor: 3, size: 38, status: 'propre', client: 'Famille Moreau', vip: false, pax: 4, arrival: '25 fév.', departure: '4 mars', eta: null, source: 'tel', hkStatus: null, gouvStatus: null, assignee: null, view: 'Jardin', sdb: 'Douche+Baignoire', pdj: false },
    { number: '305', type: 'Simple', floor: 3, size: 16, status: 'hs', client: null, vip: false, pax: null, arrival: null, departure: null, eta: null, source: 'autre', hkStatus: 'Bloquée', gouvStatus: null, assignee: null, view: 'Rue', sdb: 'Douche', pdj: false },
  ], [])

  // Filter rooms
  const filteredRooms = useMemo(() => {
    return roomsData.filter(room => {
      if (searchText && !room.number.includes(searchText) && !room.client?.toLowerCase().includes(searchText.toLowerCase())) return false
      return true
    })
  }, [roomsData, searchText])

  // Calculate KPIs
  const kpis = useMemo(() => ({
    total: roomsData.length,
    departures: roomsData.filter(r => r.hkStatus === 'Départ').length,
    recouches: roomsData.filter(r => r.hkStatus === 'Recouche').length,
    enCours: roomsData.filter(r => r.status === 'en_nettoyage').length,
    terminees: roomsData.filter(r => r.status === 'propre' || r.status === 'inspectee').length,
    aValider: roomsData.filter(r => r.gouvStatus === 'À valider').length,
    pdj: roomsData.filter(r => r.pdj).length,
    etaUrgent: roomsData.filter(r => r.eta && r.eta !== 'Late check-in').length
  }), [roomsData])

  // Femmes de chambre disponibles
  const housekeepers = useMemo(() => 
    staff.filter(s => s.role === 'femme_de_chambre'),
    [staff]
  )

  // Toggle room selection
  const toggleRoomSelection = useCallback((roomNumber) => {
    setSelectedRooms(prev => {
      const newSet = new Set(prev)
      if (newSet.has(roomNumber)) {
        newSet.delete(roomNumber)
      } else {
        newSet.add(roomNumber)
      }
      return newSet
    })
  }, [])

  // Toggle all rooms
  const toggleAllRooms = useCallback(() => {
    if (selectedRooms.size === filteredRooms.length) {
      setSelectedRooms(new Set())
    } else {
      setSelectedRooms(new Set(filteredRooms.map(r => r.number)))
    }
  }, [filteredRooms, selectedRooms.size])

  // Assignation en masse
  const handleBulkAssign = useCallback(() => {
    if (!selectedStaff || selectedRooms.size === 0) return
    
    const staffMember = housekeepers.find(h => h.id === selectedStaff)
    if (staffMember) {
      toast.success(`${selectedRooms.size} chambre(s) assignée(s) à ${staffMember.first_name} ${staffMember.last_name}`)
      setSelectedRooms(new Set())
      setAssignDialogOpen(false)
      setSelectedStaff('')
    }
  }, [selectedStaff, selectedRooms, housekeepers])

  return (
    <div className="flex flex-col h-full bg-slate-50" data-testid="reception-view">
      {/* Alerts Banner */}
      <div className="flex items-center gap-2 px-5 py-2 bg-amber-50 border-b border-amber-100">
        <AlertTriangle size={16} className="text-amber-600" />
        <span className="text-[13px] text-amber-800 font-medium">⚠️ Alertes du jour: {kpis.etaUrgent} arrivées anticipées</span>
      </div>

      {/* Sub-tabs */}
      <div className="px-5 py-3 bg-white border-b border-slate-200">
        <div className="inline-flex bg-slate-100 p-1 rounded-xl gap-1">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-lg shadow-sm text-sm font-medium text-slate-900">
            <MapPin size={16} /> Plan Chambres
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">
            <Zap size={16} /> Répartition
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="flex gap-6 px-5 py-4 bg-white border-b border-slate-200 overflow-x-auto">
        {[
          { icon: Bed, value: kpis.total, label: 'Chambres', color: '#5B4ED1', bg: '#E8E5FF' },
          { icon: ArrowRight, value: kpis.departures, label: 'Départs', color: '#EF4444', bg: '#FEE2E2' },
          { icon: RefreshCw, value: kpis.recouches, label: 'Recouches', color: '#F97316', bg: '#FFEDD5' },
          { icon: Clock, value: kpis.enCours, label: 'En cours', color: '#F59E0B', bg: '#FEF3C7' },
          { icon: CheckCircle, value: kpis.terminees, label: 'Terminées', color: '#22C55E', bg: '#DCFCE7' },
          { icon: AlertTriangle, value: kpis.aValider, label: 'À valider', color: '#F59E0B', bg: '#FEF3C7' },
          { icon: Coffee, value: kpis.pdj, label: 'PDJ inclus', color: '#3B82F6', bg: '#DBEAFE' },
          { icon: AlertCircle, value: kpis.etaUrgent, label: 'ETA urgents', color: '#EF4444', bg: '#FEE2E2' },
        ].map((kpi, idx) => (
          <div key={idx} className="flex items-center gap-2.5 whitespace-nowrap">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: kpi.bg }}>
              <kpi.icon size={16} style={{ color: kpi.color }} />
            </div>
            <div>
              <div className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-[12px] text-slate-500">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200">
        <div className="flex-1 max-w-[250px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input 
            placeholder="Chambre, client..." 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 h-9 bg-slate-50 border-slate-200"
          />
        </div>
        
        {['Étage', 'Statut', 'Badge', 'Assignée', 'Source'].map(filter => (
          <button 
            key={filter}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100"
          >
            {filter} <ChevronDown size={14} />
          </button>
        ))}
        
        <div className="ml-auto flex items-center gap-3">
          {/* Bouton d'assignation en masse - INTERACTIF */}
          {selectedRooms.size > 0 && (
            <Button 
              onClick={() => setAssignDialogOpen(true)}
              className="bg-violet-600 hover:bg-violet-700"
              data-testid="bulk-assign-btn"
            >
              <Users size={14} className="mr-1.5" />
              Assigner {selectedRooms.size} chambre(s)
            </Button>
          )}
          
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button 
              className={`w-8 h-8 rounded-md flex items-center justify-center ${viewMode === 'grid' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400'}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 size={16} />
            </button>
            <button 
              className={`w-8 h-8 rounded-md flex items-center justify-center ${viewMode === 'table' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400'}`}
              onClick={() => setViewMode('table')}
            >
              <List size={16} />
            </button>
          </div>
          <span className="text-[12px] text-slate-400">{filteredRooms.length}/{roomsData.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto mx-5 my-5 bg-white rounded-xl border border-slate-200">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="py-3 px-3 text-left w-10">
                <Checkbox 
                  checked={selectedRooms.size === filteredRooms.length && filteredRooms.length > 0}
                  onCheckedChange={toggleAllRooms}
                  data-testid="select-all-checkbox"
                />
              </th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wide">Chambre</th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wide">Statut</th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wide">Client</th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wide">PAX</th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wide">Arrivée</th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wide">Départ</th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wide">ETA</th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wide">Source</th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wide">Housekeeping</th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wide">Gouvernante</th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wide">Assignée</th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wide">Vue / SDB</th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wide">PDJ</th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wide">Temps</th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRooms.map((room) => (
              <tr 
                key={room.number} 
                className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedRooms.has(room.number) ? 'bg-violet-50' : ''}`}
                data-testid={`room-row-${room.number}`}
              >
                <td className="py-2.5 px-3">
                  <Checkbox 
                    checked={selectedRooms.has(room.number)}
                    onCheckedChange={() => toggleRoomSelection(room.number)}
                    data-testid={`checkbox-${room.number}`}
                  />
                </td>
                <td className="py-2.5 px-3"><RoomNumber number={room.number} type={room.type} /></td>
                <td className="py-2.5 px-3"><StatusBadge status={room.status} /></td>
                <td className="py-2.5 px-3">
                  {room.client ? (
                    <div className="flex items-center gap-2">
                      {room.vip && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">VIP</span>}
                      <span className="font-medium text-[13px] text-slate-900">{room.client}</span>
                    </div>
                  ) : (
                    <button className="flex items-center gap-1 text-violet-600 text-[12px] font-medium hover:bg-violet-50 px-2 py-1 rounded">
                      <span>★ Libre</span> <Plus size={12} /> Ajouter
                    </button>
                  )}
                </td>
                <td className="py-2.5 px-3 text-[13px]" style={{ color: room.pax ? '#1E1B4B' : '#CBD5E1' }}>
                  {room.pax ? <><span className="mr-1">✏️</span>{room.pax}</> : '—'}
                </td>
                <td className="py-2.5 px-3 text-[13px]" style={{ color: room.arrival ? '#5B4ED1' : '#CBD5E1' }}>{room.arrival || '—'}</td>
                <td className="py-2.5 px-3 text-[13px]" style={{ color: room.departure ? '#EF4444' : '#CBD5E1' }}>{room.departure || '—'}</td>
                <td className="py-2.5 px-3 text-[13px]" style={{ color: room.eta ? '#F59E0B' : '#CBD5E1', fontWeight: room.eta ? 600 : 400 }}>
                  {room.eta || '⊕ + ETA'}
                </td>
                <td className="py-2.5 px-3">{room.source && <SourceIcon source={room.source} />}</td>
                <td className="py-2.5 px-3">
                  {room.hkStatus ? (
                    <Badge style={{ 
                      background: room.hkStatus === 'Validé' ? '#DCFCE7' : room.hkStatus === 'Départ' ? '#FEE2E2' : '#FEF3C7',
                      color: room.hkStatus === 'Validé' ? '#16A34A' : room.hkStatus === 'Départ' ? '#DC2626' : '#D97706',
                      border: 'none'
                    }}>
                      ● {room.hkStatus}
                    </Badge>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-2.5 px-3">
                  {room.gouvStatus ? (
                    <Badge style={{ 
                      background: room.gouvStatus === 'Validé' ? '#DCFCE7' : room.gouvStatus === 'Refusé' ? '#FEE2E2' : '#FEF3C7',
                      color: room.gouvStatus === 'Validé' ? '#16A34A' : room.gouvStatus === 'Refusé' ? '#DC2626' : '#D97706',
                      border: 'none'
                    }}>
                      {room.gouvStatus}
                    </Badge>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-2.5 px-3">
                  {room.assignee ? (
                    <div className="flex items-center gap-2">
                      <StaffAvatar name={room.assignee} />
                      <span className="text-[12px] text-slate-600">{room.assignee}</span>
                    </div>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-2.5 px-3">
                  <div className="text-[12px]">
                    <div className="font-medium text-slate-900">{room.view}</div>
                    <div className="text-slate-400">{room.sdb}</div>
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  {room.pdj ? (
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                      <Check size={14} className="text-red-500" />
                    </div>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-2.5 px-3 text-[12px] font-medium" style={{ color: room.time ? '#22C55E' : '#CBD5E1' }}>
                  {room.time || '—'}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex gap-1">
                    <button className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                      <Eye size={14} />
                    </button>
                    <button className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                      <FileText size={14} />
                    </button>
                    <button className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                      <Star size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog d'assignation en masse */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner {selectedRooms.size} chambre(s)</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-slate-600 mb-4">
              Chambres sélectionnées: <strong>{Array.from(selectedRooms).join(', ')}</strong>
            </p>
            
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Assigner à:
            </label>
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger data-testid="staff-select">
                <SelectValue placeholder="Sélectionner une femme de chambre" />
              </SelectTrigger>
              <SelectContent>
                {housekeepers.map(hk => (
                  <SelectItem key={hk.id} value={hk.id}>
                    {hk.first_name} {hk.last_name} ({hk.workload}/{hk.max_rooms_per_day} ch.)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleBulkAssign}
              disabled={!selectedStaff}
              className="bg-violet-600 hover:bg-violet-700"
              data-testid="confirm-assign-btn"
            >
              Confirmer l'assignation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
