/**
 * MobileHousekeepingView - Vue Mobile Femme de Chambre
 * Basée sur le design Rorck (housekeeping/index.tsx)
 * Avec scan QR code pour démarrer/terminer une chambre
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Camera, Search, ChevronRight, X, Play, CheckCircle, ScanLine
} from 'lucide-react'

// Couleurs
const COLORS = {
  brand: '#5B4ED1',
  brandSoft: '#E8E5FF',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
}

// Carte de chambre swipeable (version simplifiée web)
const RoomCard = ({ room, onPress, onStart, onComplete, elapsed }) => {
  const isInProgress = room.status === 'in_progress'
  const isRefused = room.cleaning_status === 'refusee'
  const isDone = room.status === 'completed'
  const isDepart = room.task_type === 'checkout'
  const isRecouche = room.task_type === 'stayover'

  const getBadgeConfig = () => {
    if (isRefused) return { label: 'À refaire', color: '#E53935', bg: '#FFEBEE' }
    if (isDone) return { label: 'Terminé', color: '#2E7D32', bg: '#E8F5E9' }
    if (isInProgress) return null
    if (isDepart) return { label: 'Départ', color: '#C62828', bg: '#FFCDD2' }
    if (isRecouche) return { label: 'Recouche', color: '#E65100', bg: '#FFE0B2' }
    return null
  }

  const badge = getBadgeConfig()
  const statusBarColor = isRefused ? '#E53935' : isInProgress ? COLORS.brand : isDone ? '#43A047' : isDepart ? '#E53935' : isRecouche ? '#FB8C00' : '#CFD8DC'

  return (
    <div 
      className="mx-4 my-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"
      data-testid={`room-card-${room.room_number}`}
    >
      <div className="flex items-center p-3">
        {/* Status bar */}
        <div className="w-1 h-10 rounded mr-3" style={{ backgroundColor: statusBarColor }} />
        
        {/* Room info */}
        <div className="min-w-[54px] mr-3">
          <div className="text-2xl font-black text-slate-900">{room.room_number}</div>
          <div className="text-[10px] text-slate-400">{room.room_type || 'Standard'}</div>
        </div>

        {/* Badges & Guest */}
        <div className="flex-1">
          <div className="flex flex-wrap gap-1 mb-1">
            {room.priority === 'urgent' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600">⚡ Prio</span>
            )}
            {room.client_badge === 'vip' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600">⭐ VIP</span>
            )}
            {badge && (
              <span 
                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{ backgroundColor: badge.bg, color: badge.color }}
              >
                {badge.label}
              </span>
            )}
          </div>
          {room.guest_name && (
            <div className="text-xs text-slate-600 font-medium truncate">{room.guest_name}</div>
          )}
          {room.notes && (
            <div className="text-[10px] text-slate-400 italic truncate">{room.notes}</div>
          )}
        </div>

        {/* Timer or Actions */}
        <div className="ml-2 flex items-center gap-2">
          {isInProgress && elapsed ? (
            <div 
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl"
              style={{ backgroundColor: COLORS.brand }}
            >
              <span className="text-sm">🧹</span>
              <span className="text-sm font-bold text-white font-mono">{elapsed}</span>
            </div>
          ) : !isDone ? (
            <div className="flex gap-1">
              {isInProgress ? (
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700 h-8 px-3"
                  onClick={(e) => { e.stopPropagation(); onComplete?.(room) }}
                  data-testid={`complete-btn-${room.room_number}`}
                >
                  <CheckCircle size={14} className="mr-1" /> Terminer
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  className="bg-violet-600 hover:bg-violet-700 h-8 px-3"
                  onClick={(e) => { e.stopPropagation(); onStart?.(room) }}
                  data-testid={`start-btn-${room.room_number}`}
                >
                  <Play size={14} className="mr-1" /> Démarrer
                </Button>
              )}
            </div>
          ) : (
            <CheckCircle size={20} className="text-green-500" />
          )}
        </div>
      </div>
    </div>
  )
}

export default function MobileHousekeepingView({ data, actions }) {
  const { tasks, staff } = data
  const [searchText, setSearchText] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [scanModalVisible, setScanModalVisible] = useState(false)
  const [scanInput, setScanInput] = useState('')
  const [elapsedTimes, setElapsedTimes] = useState({})

  // Utilisateur actuel (mock)
  const currentUser = { firstName: 'Sophie', id: 'current-user' }

  // Tâches assignées à l'utilisateur courant
  const assignedTasks = useMemo(() => {
    return tasks
      .filter(t => t.assigned_to || true) // Pour la démo, afficher toutes les tâches
      .sort((a, b) => {
        const priorityMap = { urgent: 0, high: 1, normal: 2, low: 3 }
        const statusMap = { pending: 0, in_progress: 1, completed: 2 }
        if (statusMap[a.status] !== statusMap[b.status]) return statusMap[a.status] - statusMap[b.status]
        return (priorityMap[a.priority] || 2) - (priorityMap[b.priority] || 2)
      })
  }, [tasks])

  // Filtrer les tâches
  const filteredTasks = useMemo(() => {
    if (!searchText.trim()) return assignedTasks
    const q = searchText.toLowerCase()
    return assignedTasks.filter(t =>
      t.room_number?.toLowerCase().includes(q) ||
      t.room_type?.toLowerCase().includes(q) ||
      t.guest_name?.toLowerCase().includes(q)
    )
  }, [assignedTasks, searchText])

  // Grouper par étage
  const sections = useMemo(() => {
    const floorMap = new Map()
    for (const task of filteredTasks) {
      const floor = parseInt(task.room_number?.[0]) || 1
      const existing = floorMap.get(floor) || []
      existing.push(task)
      floorMap.set(floor, existing)
    }
    return Array.from(floorMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([floor, data]) => ({
        title: `${floor}${floor === 1 ? 'er' : 'e'} étage`,
        data
      }))
  }, [filteredTasks])

  // Stats
  const stats = useMemo(() => {
    const total = assignedTasks.length
    const done = assignedTasks.filter(t => t.status === 'completed').length
    const departs = assignedTasks.filter(t => t.task_type === 'checkout').length
    const recouches = assignedTasks.filter(t => t.task_type === 'stayover').length
    const inProgress = assignedTasks.filter(t => t.status === 'in_progress').length
    return { total, done, departs, recouches, inProgress }
  }, [assignedTasks])

  const progressPercent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

  // Timer pour les chambres en cours
  useEffect(() => {
    const interval = setInterval(() => {
      const newElapsed = {}
      assignedTasks.forEach(task => {
        if (task.status === 'in_progress' && task.started_at) {
          const diff = Date.now() - new Date(task.started_at).getTime()
          const mins = Math.floor(diff / 60000)
          const secs = Math.floor((diff % 60000) / 1000)
          newElapsed[task.id] = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        }
      })
      setElapsedTimes(newElapsed)
    }, 1000)
    return () => clearInterval(interval)
  }, [assignedTasks])

  // Actions
  const handleStart = useCallback((task) => {
    actions.startTask?.(task.id)
    toast.success(`Nettoyage démarré - Chambre ${task.room_number}`)
  }, [actions])

  const handleComplete = useCallback((task) => {
    actions.completeTask?.(task.id)
    toast.success(`Nettoyage terminé - Chambre ${task.room_number}`)
  }, [actions])

  // Scan QR / Sélection chambre
  const handleScanRoom = useCallback((roomNumber) => {
    const task = assignedTasks.find(t => t.room_number === roomNumber.trim())
    if (!task) {
      toast.error(`Chambre ${roomNumber} non trouvée`)
      return
    }
    
    if (task.status === 'in_progress') {
      // Terminer le nettoyage
      if (window.confirm(`Chambre ${task.room_number} — Confirmer la fin du nettoyage ?`)) {
        handleComplete(task)
        setScanModalVisible(false)
        setScanInput('')
      }
    } else if (task.status === 'pending') {
      // Démarrer le nettoyage
      if (window.confirm(`Chambre ${task.room_number} — Démarrer le chrono de nettoyage ?`)) {
        handleStart(task)
        setScanModalVisible(false)
        setScanInput('')
      }
    } else {
      toast.info(`Chambre ${roomNumber} déjà terminée`)
      setScanModalVisible(false)
      setScanInput('')
    }
  }, [assignedTasks, handleStart, handleComplete])

  // Chambres filtrées pour le modal scan
  const scanFilteredRooms = useMemo(() => {
    if (!scanInput.trim()) return assignedTasks
    const q = scanInput.trim().toLowerCase()
    return assignedTasks.filter(t => t.room_number?.toLowerCase().includes(q))
  }, [assignedTasks, scanInput])

  return (
    <div className="flex flex-col h-full bg-slate-100" data-testid="mobile-housekeeping-view">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-violet-600 to-violet-800 pt-12 pb-5 px-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-sm text-violet-200">Bonjour</div>
            <div className="text-2xl font-extrabold text-white">{currentUser.firstName}</div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search size={18} className="text-white" />
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="mb-4">
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
              <Search size={14} className="text-white/50" />
              <input 
                type="text"
                placeholder="Rechercher..."
                className="flex-1 bg-transparent text-white placeholder-white/40 text-sm outline-none"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                autoFocus
                data-testid="search-rooms"
              />
            </div>
          </div>
        )}

        {/* Summary Card */}
        <div className="bg-white/12 rounded-2xl p-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-black text-white">{stats.total}</span>
            <span className="text-sm text-white/70">chambres aujourd'hui</span>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-green-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm font-bold text-green-400">{progressPercent}%</span>
          </div>

          {/* Mini Stats */}
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="text-lg font-extrabold text-white">{stats.done}</div>
              <div className="text-[9px] text-white/60 uppercase tracking-wide">Terminées</div>
            </div>
            <div className="w-px h-6 bg-white/15" />
            <div className="text-center flex-1">
              <div className="text-lg font-extrabold text-white">{stats.departs}</div>
              <div className="text-[9px] text-white/60 uppercase tracking-wide">Départs</div>
            </div>
            <div className="w-px h-6 bg-white/15" />
            <div className="text-center flex-1">
              <div className="text-lg font-extrabold text-white">{stats.recouches}</div>
              <div className="text-[9px] text-white/60 uppercase tracking-wide">Recouches</div>
            </div>
            <div className="w-px h-6 bg-white/15" />
            <div className="text-center flex-1">
              <div className="text-lg font-extrabold text-white">{stats.inProgress}</div>
              <div className="text-[9px] text-white/60 uppercase tracking-wide">En cours</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scanner Button */}
      <button 
        className="mx-4 -mt-3 flex items-center gap-3 bg-white rounded-xl p-3.5 shadow-lg border border-violet-100"
        onClick={() => setScanModalVisible(true)}
        data-testid="scan-qr-btn"
      >
        <div 
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ backgroundColor: COLORS.brandSoft }}
        >
          <Camera size={22} style={{ color: COLORS.brand }} />
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-slate-900">Scanner une chambre</div>
          <div className="text-[11px] text-slate-400">Entrez le numéro ou sélectionnez</div>
        </div>
        <ChevronRight size={18} className="text-slate-300" />
      </button>

      {/* Swipe Hint */}
      <div className="text-center text-[11px] text-slate-400 font-medium py-2">
        💡 Glissez → pour démarrer/terminer • Glissez ← pour signaler
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-auto pb-20">
        {sections.map(section => (
          <div key={section.title}>
            <div className="flex items-center gap-2 px-5 pt-3 pb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span className="text-sm font-semibold text-slate-500">{section.title}</span>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">{section.data.length}</span>
            </div>
            {section.data.map(task => (
              <RoomCard 
                key={task.id}
                room={task}
                elapsed={elapsedTimes[task.id]}
                onStart={handleStart}
                onComplete={handleComplete}
              />
            ))}
          </div>
        ))}
        
        {sections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="text-6xl mb-3">🎉</span>
            <span className="text-lg font-bold text-slate-900">Tout est fait !</span>
            <span className="text-sm text-slate-500">Aucune chambre assignée</span>
          </div>
        )}
      </div>

      {/* Scan Modal */}
      <Dialog open={scanModalVisible} onOpenChange={setScanModalVisible}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine size={20} className="text-violet-600" />
              Scanner / Sélectionner
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex gap-2 mt-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border-2 border-violet-200">
              <Search size={16} className="text-slate-400" />
              <input 
                type="text"
                placeholder="Numéro de chambre (ex: 205)"
                className="flex-1 bg-transparent text-slate-900 font-semibold outline-none"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && scanInput.trim()) handleScanRoom(scanInput)
                }}
                data-testid="scan-room-input"
              />
            </div>
            <Button 
              className="bg-violet-600 hover:bg-violet-700"
              disabled={!scanInput.trim()}
              onClick={() => scanInput.trim() && handleScanRoom(scanInput)}
            >
              OK
            </Button>
          </div>

          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-4 mb-2">
            {scanInput.trim() ? `Résultats (${scanFilteredRooms.length})` : `Mes chambres (${assignedTasks.length})`}
          </div>

          <div className="max-h-[300px] overflow-auto space-y-2">
            {scanFilteredRooms.map(task => {
              const isInProg = task.status === 'in_progress'
              const isDone = task.status === 'completed'
              const actionColor = isInProg ? '#16A34A' : COLORS.brand
              const actionLabel = isInProg ? 'Terminer' : 'Démarrer'
              const statusLabel = isInProg ? '🧹 En cours' : isDone ? '✅ Terminé' : ''

              return (
                <button
                  key={task.id}
                  className="w-full flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200 hover:border-violet-300 transition-colors"
                  onClick={() => handleScanRoom(task.room_number)}
                >
                  <div className="text-left">
                    <div className="text-xl font-black text-slate-900">{task.room_number}</div>
                    <div className="text-[11px] text-slate-500">{task.room_type}</div>
                    {statusLabel && <div className="text-[11px] text-slate-500 mt-0.5">{statusLabel}</div>}
                  </div>
                  {!isDone && (
                    <div 
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-bold"
                      style={{ backgroundColor: actionColor }}
                    >
                      {isInProg ? <CheckCircle size={16} /> : <Play size={16} />}
                      {actionLabel}
                    </div>
                  )}
                  {isDone && (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-200">
                      <CheckCircle size={16} className="text-green-500" />
                    </div>
                  )}
                </button>
              )
            })}
            
            {scanFilteredRooms.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm font-medium">
                Aucune chambre trouvée
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
