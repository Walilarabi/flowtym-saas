/**
 * GouvernanteView - Vue Gouvernante Desktop
 * Basée sur le design Rorck (gouvernante/index.tsx)
 * 3 onglets: Validation, Équipe, Stocks
 */

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Search, ChevronDown, CheckCircle, Package, Users, ArrowRight, RefreshCw,
  History, MapPin, Zap, X, Check, AlertTriangle, Clock
} from 'lucide-react'

// Couleurs Flowtym
const FT = {
  brand: '#5B4ED1',
  brandSoft: '#E8E5FF',
  success: '#22C55E',
  successSoft: '#DCFCE7',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  info: '#3B82F6',
  teal: '#14B8A6',
}

const ROOM_STATUS_CONFIG = {
  libre: { label: 'Libre', color: '#22C55E' },
  occupe: { label: 'Occupée', color: '#3B82F6' },
  depart: { label: 'Départ', color: '#EF4444' },
  recouche: { label: 'Recouche', color: '#F97316' },
  hors_service: { label: 'H.S.', color: '#6B7280' },
}

// Mini KPI
const DeskKPI = ({ value, label, color }) => (
  <div className="flex-1 bg-slate-50 rounded-lg p-3 border-l-[3px] text-center" style={{ borderLeftColor: color }}>
    <div className="text-2xl font-extrabold text-slate-900">{value}</div>
    <div className="text-[10px] text-slate-500 font-medium mt-0.5">{label}</div>
  </div>
)

// Room Chip compact
const DeskRoomChip = ({ roomNumber, status, cleaningStatus, onClick }) => {
  const statusConfig = ROOM_STATUS_CONFIG[status] || ROOM_STATUS_CONFIG.libre
  
  const getBgColor = () => {
    if (cleaningStatus === 'validee') return '#DCFCE7'
    if (cleaningStatus === 'en_cours') return '#FEF3C7'
    if (cleaningStatus === 'refusee') return '#FEE2E2'
    return '#F1F5F9'
  }
  
  return (
    <button
      onClick={onClick}
      className="w-12 h-12 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 border"
      style={{ backgroundColor: getBgColor(), borderColor: statusConfig.color + '40' }}
    >
      <span className="font-bold text-sm" style={{ color: statusConfig.color }}>
        {roomNumber}
      </span>
    </button>
  )
}

// Carte équipe
const DeskTeamCard = ({ name, details, loadPercent, loadCurrent, loadMax, assignedRooms, onRoomClick }) => {
  const loadColor = loadPercent > 80 ? FT.danger : loadPercent > 50 ? FT.warning : FT.success
  
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
          style={{ backgroundColor: FT.brandSoft, color: FT.brand }}
        >
          {name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm text-slate-900">{name}</div>
          <div className="text-xs text-slate-500">{details}</div>
        </div>
        <div className="text-lg font-bold text-violet-600">{assignedRooms?.length || 0}</div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all"
            style={{ width: `${loadPercent}%`, backgroundColor: loadColor }}
          />
        </div>
        <span className="text-xs text-slate-400 font-medium">{loadCurrent}/{loadMax}</span>
      </div>
      
      {assignedRooms && assignedRooms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {assignedRooms.map(room => (
            <DeskRoomChip 
              key={room.id}
              roomNumber={room.room_number}
              status={room.status || 'libre'}
              cleaningStatus={room.cleaning_status}
              onClick={() => onRoomClick?.(room)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function GouvernanteView({ data, actions }) {
  const { inspections, tasks, staff, inventory } = data
  const [searchText, setSearchText] = useState('')
  const [floorFilter, setFloorFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFloorDropdown, setShowFloorDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState('validation')

  // Générer les chambres (fusionnées avec les tâches)
  const rooms = useMemo(() => {
    return tasks.map(task => ({
      id: task.id,
      room_number: task.room_number,
      floor: parseInt(task.room_number?.[0]) || 1,
      status: task.task_type === 'checkout' ? 'depart' : task.task_type === 'stayover' ? 'recouche' : 'libre',
      cleaning_status: task.status === 'completed' ? 'nettoyee' : task.status === 'in_progress' ? 'en_cours' : 'none',
      assigned_to: task.assigned_to,
    }))
  }, [tasks])

  // Étages disponibles
  const floors = useMemo(() => 
    [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b),
    [rooms]
  )

  // Filtrer les inspections
  const filteredInspections = useMemo(() => {
    let result = inspections
    if (statusFilter !== 'all') result = result.filter(i => i.status === statusFilter)
    if (floorFilter !== 'all') result = result.filter(i => {
      const floor = parseInt(i.room_number?.[0]) || 1
      return floor === parseInt(floorFilter)
    })
    if (searchText) {
      const s = searchText.toLowerCase()
      result = result.filter(i => 
        i.room_number?.includes(s) || 
        i.cleaned_by_name?.toLowerCase().includes(s)
      )
    }
    return result.sort((a, b) => {
      if (a.status === 'en_attente' && b.status !== 'en_attente') return -1
      if (a.status !== 'en_attente' && b.status === 'en_attente') return 1
      return 0
    })
  }, [inspections, statusFilter, floorFilter, searchText])

  // Femmes de chambre
  const housekeepers = useMemo(() =>
    staff.filter(s => s.role === 'femme_de_chambre'),
    [staff]
  )

  // Stats inspections
  const inspectionStats = useMemo(() => ({
    pending: inspections.filter(i => i.status === 'en_attente').length,
    validated: inspections.filter(i => i.status === 'validee').length,
    refused: inspections.filter(i => i.status === 'refusee').length,
  }), [inspections])

  // Chambres par étage
  const roomsByFloor = useMemo(() => {
    const grouped = {}
    rooms.forEach(r => {
      if (!grouped[r.floor]) grouped[r.floor] = []
      grouped[r.floor].push(r)
    })
    return Object.entries(grouped)
      .map(([f, rms]) => ({ floor: parseInt(f), rooms: rms.sort((a, b) => a.room_number.localeCompare(b.room_number)) }))
      .sort((a, b) => a.floor - b.floor)
  }, [rooms])

  // Chambres à faire
  const todoRooms = useMemo(() =>
    rooms.filter(r => r.cleaning_status === 'none' && (r.status === 'depart' || r.status === 'recouche')),
    [rooms]
  )

  // Items en stock bas (mock)
  const lowStockItems = inventory.filter(i => i.currentStock <= i.minimumThreshold)

  // Actions
  const handleValidate = useCallback((inspectionId) => {
    actions.validateInspection?.(inspectionId, true, 5, '', '')
    toast.success('Chambre validée')
  }, [actions])

  const handleRefuse = useCallback((inspectionId) => {
    actions.validateInspection?.(inspectionId, false, 0, '', 'À refaire')
    toast.info('Chambre refusée - À refaire')
  }, [actions])

  // Tab Validation
  const renderValidationTab = () => (
    <>
      {/* Filtres */}
      <div className="flex gap-2 p-3 bg-white border-b border-slate-200 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input 
            placeholder="Rechercher..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="relative">
          <button 
            className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 flex items-center gap-2"
            onClick={() => { setShowFloorDropdown(!showFloorDropdown); setShowStatusDropdown(false) }}
          >
            {floorFilter === 'all' ? 'Étage' : `Étage ${floorFilter}`}
            <ChevronDown size={12} />
          </button>
          {showFloorDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg z-50 min-w-[120px]">
              <button 
                className="w-full px-3 py-2 text-sm text-left hover:bg-slate-50"
                onClick={() => { setFloorFilter('all'); setShowFloorDropdown(false) }}
              >
                Tous les étages
              </button>
              {floors.map(f => (
                <button 
                  key={f}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-slate-50"
                  onClick={() => { setFloorFilter(f); setShowFloorDropdown(false) }}
                >
                  Étage {f}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <button 
            className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 flex items-center gap-2"
            onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowFloorDropdown(false) }}
          >
            {statusFilter === 'all' ? 'Statut' : statusFilter === 'en_attente' ? 'À valider' : statusFilter === 'validee' ? 'Validées' : 'Refusées'}
            <ChevronDown size={12} />
          </button>
          {showStatusDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg z-50 min-w-[140px]">
              {[
                { value: 'all', label: 'Tous statuts' },
                { value: 'en_attente', label: 'À valider' },
                { value: 'validee', label: 'Validées' },
                { value: 'refusee', label: 'Refusées' },
              ].map(opt => (
                <button 
                  key={opt.value}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-slate-50"
                  onClick={() => { setStatusFilter(opt.value); setShowStatusDropdown(false) }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="flex gap-2 p-3 bg-white border-b border-slate-200">
        <DeskKPI value={inspectionStats.pending} label="À valider" color={FT.warning} />
        <DeskKPI value={inspectionStats.validated} label="Validées" color={FT.success} />
        <DeskKPI value={inspectionStats.refused} label="Refusées" color={FT.danger} />
      </div>

      {/* Liste des inspections */}
      <div className="p-4 space-y-2 overflow-auto flex-1">
        {filteredInspections.length > 0 ? filteredInspections.map(insp => {
          const statusColor = insp.status === 'en_attente' ? FT.warning : 
                              insp.status === 'validee' ? FT.success : FT.danger
          const statusLabel = insp.status === 'en_attente' ? 'À valider' :
                              insp.status === 'validee' ? 'Validée' : 'Refusée'
          
          return (
            <div 
              key={insp.id}
              className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden"
              data-testid={`inspection-card-${insp.room_number}`}
            >
              <div className="w-1 self-stretch" style={{ backgroundColor: statusColor }} />
              <div className="flex-1 p-4">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xl font-extrabold text-slate-900">{insp.room_number}</span>
                  <span className="text-xs text-slate-500">{insp.room_type}</span>
                  <div 
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: statusColor + '15', color: statusColor }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                    {statusLabel}
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {insp.cleaned_by_name} • {new Date(insp.completed_at || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              
              {insp.status === 'en_attente' && (
                <div className="flex gap-2 pr-4">
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700 h-8"
                    onClick={() => handleValidate(insp.id)}
                    data-testid={`validate-btn-${insp.room_number}`}
                  >
                    <Check size={14} className="mr-1" /> Valider
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    className="h-8"
                    onClick={() => handleRefuse(insp.id)}
                    data-testid={`refuse-btn-${insp.room_number}`}
                  >
                    <X size={14} className="mr-1" /> Refuser
                  </Button>
                </div>
              )}
              
              <span className="text-xl text-slate-300 pr-4">›</span>
            </div>
          )
        }) : (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <span className="text-5xl mb-3">✅</span>
            <span className="font-semibold">Aucune inspection en attente</span>
          </div>
        )}
      </div>
    </>
  )

  // Tab Équipe
  const renderEquipeTab = () => (
    <div className="p-4 space-y-4 overflow-auto flex-1">
      {/* Navigation rapide */}
      <div className="flex gap-2">
        <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <MapPin size={14} className="text-blue-500" />
          </div>
          Plan Chambres
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Zap size={14} className="text-green-500" />
          </div>
          Répartition
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Colonne équipe */}
        <div className="md:col-span-2 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Supervision équipe</CardTitle>
                <span className="text-xs text-violet-600 font-medium">{housekeepers.length} membres actifs</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {housekeepers.map(hk => {
                const assignedRooms = rooms.filter(r => r.assigned_to === hk.id)
                const loadPercent = hk.max_rooms_per_day > 0 ? Math.round((hk.workload / hk.max_rooms_per_day) * 100) : 0
                
                return (
                  <DeskTeamCard
                    key={hk.id}
                    name={`${hk.first_name} ${hk.last_name}`}
                    details={`${assignedRooms.length} chambres`}
                    loadPercent={loadPercent}
                    loadCurrent={hk.workload}
                    loadMax={hk.max_rooms_per_day}
                    assignedRooms={assignedRooms}
                  />
                )
              })}
              
              {housekeepers.length === 0 && (
                <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
                  <Users size={20} />
                  <span className="text-sm">Aucune femme de chambre active</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chambres à faire */}
          {todoRooms.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Chambres à faire</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {todoRooms.slice(0, 12).map(r => (
                    <DeskRoomChip 
                      key={r.id}
                      roomNumber={r.room_number}
                      status={r.status}
                      cleaningStatus={r.cleaning_status}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Colonne KPIs et Actions */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">KPIs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <DeskKPI value={inspectionStats.pending} label="À valider" color={FT.warning} />
              <DeskKPI value={inspectionStats.refused} label="À refaire" color={FT.danger} />
              <DeskKPI value={inspectionStats.validated} label="Validées" color={FT.success} />
              <DeskKPI value={rooms.filter(r => r.cleaning_status === 'none' && r.assigned_to).length} label="Assignées" color={FT.info} />
              <DeskKPI value={rooms.filter(r => r.status === 'recouche').length} label="Recouches" color={FT.teal} />
            </CardContent>
          </Card>

          <Button className="w-full bg-violet-600 hover:bg-violet-700">
            <RefreshCw size={14} className="mr-2" /> Réassigner
          </Button>
          <Button variant="outline" className="w-full border-violet-200 text-violet-600 hover:bg-violet-50">
            <CheckCircle size={14} className="mr-2" /> Valider chambres
          </Button>
          <Button variant="outline" className="w-full">
            <Users size={14} className="mr-2" /> Assigner
          </Button>
          <Button variant="outline" className="w-full">
            <History size={14} className="mr-2" /> Historique
          </Button>
        </div>
      </div>
    </div>
  )

  // Tab Stocks
  const renderStocksTab = () => (
    <div className="p-4 space-y-4 overflow-auto flex-1">
      {/* Lien Économat */}
      <button className="w-full flex items-center gap-3 px-4 py-3 bg-violet-50 rounded-xl border border-violet-200">
        <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
          <Package size={18} className="text-violet-600" />
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-violet-600 text-sm">Économat complet</div>
          <div className="text-xs text-slate-500">Gestion stocks, commandes, fournisseurs</div>
        </div>
        <ArrowRight size={16} className="text-violet-600" />
      </button>

      {/* Alerte stock bas */}
      {lowStockItems.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 rounded-xl border border-amber-200">
          <AlertTriangle size={14} className="text-amber-600" />
          <span className="text-sm font-semibold text-amber-700">{lowStockItems.length} article(s) en stock bas</span>
        </div>
      )}

      {/* Liste inventaire */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Inventaire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {inventory.length > 0 ? inventory.map(item => {
            const isLow = item.currentStock <= item.minimumThreshold
            const percent = item.minimumThreshold > 0 ? Math.min(100, (item.currentStock / (item.minimumThreshold * 3)) * 100) : 100
            const barColor = isLow ? FT.danger : percent < 50 ? FT.warning : FT.success
            
            return (
              <div key={item.id} className="space-y-1 py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-slate-900">{item.itemName}</span>
                  <span className={`font-bold text-sm ${isLow ? 'text-red-500' : 'text-slate-900'}`}>
                    {item.currentStock} {item.unit}
                  </span>
                </div>
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ width: `${percent}%`, backgroundColor: barColor }}
                  />
                </div>
                <div className="text-[10px] text-slate-400">
                  {item.location} • Seuil: {item.minimumThreshold}
                </div>
              </div>
            )
          }) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              Aucun article dans l'inventaire
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-slate-50" data-testid="gouvernante-view">
      {/* Navigation rapide header */}
      <div className="bg-white border-b border-slate-200 p-3">
        <h2 className="text-lg font-extrabold text-slate-900">Supervision Gouvernante</h2>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-slate-200">
        {[
          { key: 'validation', label: 'Validation', icon: CheckCircle },
          { key: 'equipe', label: 'Équipe', icon: Users },
          { key: 'stocks', label: 'Stocks', icon: Package },
        ].map(tab => (
          <button
            key={tab.key}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 transition-colors ${
              activeTab === tab.key 
                ? 'border-violet-600 text-violet-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab(tab.key)}
            data-testid={`tab-${tab.key}`}
          >
            <tab.icon size={14} />
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'validation' && renderValidationTab()}
        {activeTab === 'equipe' && renderEquipeTab()}
        {activeTab === 'stocks' && renderStocksTab()}
      </div>
    </div>
  )
}
