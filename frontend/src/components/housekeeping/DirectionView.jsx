/**
 * DirectionView - Vue Direction Desktop
 * Basée sur le design Rorck (direction/index.tsx)
 * Dashboard global avec KPIs, plan des chambres, équipe active
 */

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  TrendingUp, AlertTriangle, CheckCircle, Clock, Wrench, Coffee,
  BedDouble, Users, ArrowRight, Sparkles, History, MapPin, Zap,
  LayoutGrid, BarChart3, FileText, ChevronRight, Package
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
  infoSoft: '#DBEAFE',
  teal: '#14B8A6',
  orange: '#F97316',
}

const ROOM_STATUS_CONFIG = {
  libre: { label: 'Libre', color: '#22C55E', bg: '#DCFCE7' },
  occupe: { label: 'Occupée', color: '#3B82F6', bg: '#DBEAFE' },
  depart: { label: 'Départ', color: '#EF4444', bg: '#FEE2E2' },
  recouche: { label: 'Recouche', color: '#F97316', bg: '#FFEDD5' },
  hors_service: { label: 'H.S.', color: '#6B7280', bg: '#F3F4F6' },
}

// Composant RoomChip pour le plan des chambres
const DeskRoomChip = ({ roomNumber, status, cleaningStatus, clientBadge, onClick }) => {
  const statusConfig = ROOM_STATUS_CONFIG[status] || ROOM_STATUS_CONFIG.libre
  
  const getBorderColor = () => {
    if (cleaningStatus === 'validee') return '#22C55E'
    if (cleaningStatus === 'en_cours') return '#F59E0B'
    if (cleaningStatus === 'refusee') return '#EF4444'
    return 'transparent'
  }
  
  return (
    <button
      onClick={onClick}
      className="w-14 h-14 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-2"
      style={{ 
        backgroundColor: statusConfig.bg, 
        borderColor: getBorderColor(),
      }}
      data-testid={`room-chip-${roomNumber}`}
    >
      <span className="font-bold text-lg" style={{ color: statusConfig.color }}>
        {roomNumber}
      </span>
      {clientBadge === 'vip' && (
        <span className="text-[8px] text-amber-600">⭐</span>
      )}
    </button>
  )
}

// Composant KPI
const KPICard = ({ value, label, icon: Icon, color, colorSoft, highlight = false }) => (
  <div 
    className={`bg-white rounded-xl p-4 border ${highlight ? 'border-violet-300 border-2' : 'border-slate-200'} flex-1`}
  >
    <div 
      className="w-9 h-9 rounded-lg flex items-center justify-center mb-2"
      style={{ backgroundColor: colorSoft }}
    >
      <Icon size={18} style={{ color }} />
    </div>
    <div className="text-3xl font-extrabold text-slate-900">{value}</div>
    <div className="text-xs text-slate-500 font-medium">{label}</div>
  </div>
)

// Barre de progression avec pourcentage
const ProgressBar = ({ percent, color }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    </div>
    <span className="text-sm font-semibold" style={{ color }}>{percent}%</span>
  </div>
)

export default function DirectionView({ data, actions, onNavigate }) {
  const { tasks, staff, maintenance, breakfast, inspections } = data
  
  // Génération des chambres pour la démo
  const rooms = useMemo(() => [
    { id: '101', roomNumber: '101', floor: 1, status: 'occupe', cleaningStatus: 'none', clientBadge: 'vip', roomType: 'Suite' },
    { id: '102', roomNumber: '102', floor: 1, status: 'depart', cleaningStatus: 'en_cours', clientBadge: null, roomType: 'Double' },
    { id: '103', roomNumber: '103', floor: 1, status: 'libre', cleaningStatus: 'validee', clientBadge: null, roomType: 'Simple' },
    { id: '104', roomNumber: '104', floor: 1, status: 'recouche', cleaningStatus: 'none', clientBadge: 'prioritaire', roomType: 'Double' },
    { id: '105', roomNumber: '105', floor: 1, status: 'hors_service', cleaningStatus: 'none', clientBadge: null, roomType: 'Simple' },
    { id: '201', roomNumber: '201', floor: 2, status: 'occupe', cleaningStatus: 'none', clientBadge: null, roomType: 'Deluxe' },
    { id: '202', roomNumber: '202', floor: 2, status: 'depart', cleaningStatus: 'none', clientBadge: 'vip', roomType: 'Suite' },
    { id: '203', roomNumber: '203', floor: 2, status: 'libre', cleaningStatus: 'validee', clientBadge: null, roomType: 'Double' },
    { id: '204', roomNumber: '204', floor: 2, status: 'recouche', cleaningStatus: 'en_cours', clientBadge: null, roomType: 'Simple' },
    { id: '205', roomNumber: '205', floor: 2, status: 'libre', cleaningStatus: 'validee', clientBadge: null, roomType: 'Deluxe' },
    { id: '301', roomNumber: '301', floor: 3, status: 'occupe', cleaningStatus: 'none', clientBadge: null, roomType: 'Suite' },
    { id: '302', roomNumber: '302', floor: 3, status: 'depart', cleaningStatus: 'refusee', clientBadge: null, roomType: 'Double' },
    { id: '303', roomNumber: '303', floor: 3, status: 'libre', cleaningStatus: 'nettoyee', clientBadge: null, roomType: 'Simple' },
    { id: '304', roomNumber: '304', floor: 3, status: 'occupe', cleaningStatus: 'none', clientBadge: 'vip', roomType: 'Familiale' },
    { id: '305', roomNumber: '305', floor: 3, status: 'hors_service', cleaningStatus: 'none', clientBadge: null, roomType: 'Simple' },
  ], [])

  // Calcul des stats
  const roomStats = useMemo(() => {
    const total = rooms.length
    const occupe = rooms.filter(r => r.status === 'occupe').length
    const libre = rooms.filter(r => r.status === 'libre').length
    const depart = rooms.filter(r => r.status === 'depart').length
    const recouche = rooms.filter(r => r.status === 'recouche').length
    const horsService = rooms.filter(r => r.status === 'hors_service').length
    const occupancyRate = total > 0 ? Math.round(((occupe + depart + recouche) / total) * 100) : 0
    const cleaningDone = rooms.filter(r => r.cleaningStatus === 'validee' || r.cleaningStatus === 'nettoyee').length
    const cleaningRate = total > 0 ? Math.round((cleaningDone / total) * 100) : 0
    return { total, occupe, libre, depart, recouche, horsService, occupancyRate, cleaningDone, cleaningRate }
  }, [rooms])

  // Grouper par étage
  const groupedByFloor = useMemo(() => {
    const floorSet = [...new Set(rooms.map(r => r.floor))].sort((a, b) => b - a)
    return floorSet.map(floor => ({
      floor,
      rooms: rooms.filter(r => r.floor === floor).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
    }))
  }, [rooms])

  // Femmes de chambre actives
  const activeHousekeepers = useMemo(() => 
    staff.filter(s => s.role === 'femme_de_chambre' && (s.status === 'actif' || s.status === 'en_pause')),
    [staff]
  )

  // Stats maintenance et petit-déj
  const maintenanceStats = useMemo(() => ({
    pending: maintenance.filter(t => t.status === 'en_attente').length,
    inProgress: maintenance.filter(t => t.status === 'en_cours').length,
    urgent: maintenance.filter(t => t.priority === 'haute' && t.status !== 'resolu').length,
  }), [maintenance])

  const breakfastStats = useMemo(() => ({
    toPrepare: breakfast.filter(o => o.status === 'a_preparer').length,
    served: breakfast.filter(o => o.status === 'servi').length,
    paid: breakfast.filter(o => !o.included && o.status === 'servi').length,
  }), [breakfast])

  const pendingInspections = inspections.filter(i => i.status === 'en_attente')

  // Date du jour
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  // Navigation items
  const navItems = [
    { label: 'Centre de contrôle', icon: LayoutGrid, color: FT.brand, view: 'control' },
    { label: 'Plan Chambres', icon: MapPin, color: FT.info, view: 'plan' },
    { label: 'Répartition', icon: Zap, color: FT.success, view: 'repartition' },
    { label: 'Historique', icon: History, color: FT.orange, view: 'history' },
    { label: 'Maintenance', icon: Wrench, color: FT.warning, view: 'maintenance' },
    { label: 'Statistiques', icon: BarChart3, color: FT.teal, view: 'stats' },
    { label: 'Rapports', icon: FileText, color: '#1E1B4B', view: 'reports' },
  ]

  return (
    <div className="p-5 space-y-5 bg-slate-50 min-h-full" data-testid="direction-view">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Bonjour, Direction</h1>
        <p className="text-sm text-slate-500 capitalize">{today}</p>
      </div>

      {/* Navigation Strip */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {navItems.map(item => (
          <button
            key={item.label}
            onClick={() => onNavigate?.(item.view)}
            className="flex flex-col items-center gap-2 min-w-[80px]"
          >
            <div 
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: item.color + '15' }}
            >
              <item.icon size={18} style={{ color: item.color }} />
            </div>
            <span className="text-[10px] font-semibold text-slate-500 text-center">{item.label}</span>
          </button>
        ))}
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard 
          value={`${roomStats.occupancyRate}%`} 
          label="Occupation" 
          icon={TrendingUp} 
          color={FT.brand} 
          colorSoft={FT.brandSoft}
          highlight
        />
        <KPICard 
          value={roomStats.depart} 
          label="Départs" 
          icon={BedDouble} 
          color={FT.danger} 
          colorSoft={FT.dangerSoft}
        />
        <KPICard 
          value={`${roomStats.cleaningRate}%`} 
          label="Propreté" 
          icon={Sparkles} 
          color={FT.success} 
          colorSoft={FT.successSoft}
        />
        <KPICard 
          value={maintenanceStats.pending + maintenanceStats.inProgress} 
          label="Maintenance" 
          icon={Wrench} 
          color={FT.warning} 
          colorSoft={FT.warningSoft}
        />
      </div>

      {/* Alerts Card */}
      {(maintenanceStats.urgent > 0 || pendingInspections.length > 0 || breakfastStats.toPrepare > 0) && (
        <div className="bg-white rounded-xl p-4 border border-amber-200 space-y-3">
          <h3 className="font-bold text-slate-900">⚠️ Alertes du jour</h3>
          {maintenanceStats.urgent > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <AlertTriangle size={14} className="text-red-500" />
              <span className="text-sm font-medium text-slate-700">{maintenanceStats.urgent} interventions urgentes</span>
            </div>
          )}
          {pendingInspections.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <Clock size={14} className="text-amber-500" />
              <span className="text-sm font-medium text-slate-700">{pendingInspections.length} chambres à valider</span>
            </div>
          )}
          {breakfastStats.toPrepare > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <Coffee size={14} className="text-blue-500" />
              <span className="text-sm font-medium text-slate-700">{breakfastStats.toPrepare} petit-déj à préparer</span>
            </div>
          )}
        </div>
      )}

      {/* Room Status Summary */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Statuts des chambres</CardTitle>
            <span className="text-xs text-slate-400">{roomStats.total} chambres</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ROOM_STATUS_CONFIG).map(([status, config]) => {
              const count = rooms.filter(r => r.status === status).length
              return (
                <div 
                  key={status}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                  <span className="font-bold text-slate-900">{count}</span>
                  <span className="text-xs text-slate-500">{config.label}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Floor Plan */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Plan des chambres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupedByFloor.map(({ floor, rooms: floorRooms }) => (
            <div key={floor}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded">
                  É{floor}
                </span>
                <span className="text-xs font-semibold text-slate-500">Étage {floor}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {floorRooms.map(room => (
                  <DeskRoomChip 
                    key={room.id}
                    roomNumber={room.roomNumber}
                    status={room.status}
                    cleaningStatus={room.cleaningStatus}
                    clientBadge={room.clientBadge}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* PDJ Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Petit-déjeuner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Coffee size={14} className="text-amber-500" />
              <span className="font-bold text-slate-900">{breakfastStats.toPrepare}</span>
              <span className="text-xs text-slate-500">À préparer</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle size={14} className="text-green-500" />
              <span className="font-bold text-slate-900">{breakfastStats.served}</span>
              <span className="text-xs text-slate-500">Servis</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm">💰</span>
              <span className="font-bold text-slate-900">{breakfastStats.paid}</span>
              <span className="text-xs text-slate-500">Payants</span>
            </div>
          </CardContent>
        </Card>

        {/* Economat */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Économat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900">125€</div>
            <div className="text-xs text-slate-500">Consommations du jour</div>
            <Button variant="link" size="sm" className="text-violet-600 p-0 mt-2">
              Voir détails <ArrowRight size={12} className="ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Team Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Équipe du jour</CardTitle>
            <Button variant="link" size="sm" className="text-violet-600 p-0">
              Voir tout <ArrowRight size={12} className="ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeHousekeepers.length > 0 ? activeHousekeepers.map(hk => {
            const loadPercent = hk.max_rooms_per_day > 0 ? Math.round((hk.workload / hk.max_rooms_per_day) * 100) : 0
            const loadColor = loadPercent > 80 ? FT.danger : loadPercent > 50 ? FT.warning : FT.success
            return (
              <div key={hk.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: FT.brandSoft, color: FT.brand }}
                >
                  {hk.first_name?.[0]}{hk.last_name?.[0]}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-slate-900">{hk.first_name} {hk.last_name}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full"
                        style={{ width: `${loadPercent}%`, backgroundColor: loadColor }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">{hk.workload}/{hk.max_rooms_per_day}</span>
                  </div>
                </div>
                <div 
                  className="px-2 py-1 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: loadColor + '15', color: loadColor }}
                >
                  {tasks.filter(t => t.assigned_to === hk.id).length} ch.
                </div>
              </div>
            )
          }) : (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
              <Users size={20} />
              <span className="text-sm">Aucune femme de chambre active</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
