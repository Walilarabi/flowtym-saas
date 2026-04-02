/**
 * MobileMaintenanceView - Vue Mobile Maintenance
 * Basée sur le design Rorck (maintenance/index.tsx)
 * Tickets par priorité et statut avec actions
 */

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Search, AlertTriangle, Clock, CheckCircle, ChevronDown, BarChart3, Wrench
} from 'lucide-react'

// Configuration des priorités
const PRIORITY_CONFIG = {
  haute: { label: 'Haute', color: '#EF4444' },
  moyenne: { label: 'Moyenne', color: '#F59E0B' },
  basse: { label: 'Basse', color: '#3B82F6' },
}

// Configuration des statuts
const STATUS_CONFIG = {
  en_attente: { label: 'En attente', color: '#F59E0B' },
  en_cours: { label: 'En cours', color: '#0D9488' },
  resolu: { label: 'Résolu', color: '#22C55E' },
}

export default function MobileMaintenanceView({ data, actions }) {
  const { maintenance } = data
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)

  // Filtrer les tickets
  const filteredTasks = useMemo(() => {
    let result = statusFilter === 'all' ? maintenance : maintenance.filter(t => t.status === statusFilter)
    if (searchText) {
      const s = searchText.toLowerCase()
      result = result.filter(t =>
        t.room_number?.includes(s) || 
        t.title?.toLowerCase().includes(s) || 
        t.description?.toLowerCase().includes(s)
      )
    }
    return result.sort((a, b) => {
      const statusOrder = { en_attente: 0, en_cours: 1, resolu: 2 }
      const priorityOrder = { haute: 0, moyenne: 1, basse: 2 }
      if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status]
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
    })
  }, [maintenance, statusFilter, searchText])

  // Stats
  const stats = useMemo(() => ({
    total: maintenance.length,
    pending: maintenance.filter(t => t.status === 'en_attente').length,
    inProgress: maintenance.filter(t => t.status === 'en_cours').length,
    resolved: maintenance.filter(t => t.status === 'resolu').length,
  }), [maintenance])

  // Actions
  const handleStartTicket = useCallback((ticket) => {
    actions.updateMaintenance?.(ticket.id, { status: 'en_cours' })
    toast.success(`Intervention démarrée - Chambre ${ticket.room_number}`)
  }, [actions])

  const handleResolveTicket = useCallback((ticket) => {
    actions.updateMaintenance?.(ticket.id, { status: 'resolu' })
    toast.success(`Ticket résolu - Chambre ${ticket.room_number}`)
  }, [actions])

  return (
    <div className="flex flex-col h-full bg-slate-100" data-testid="mobile-maintenance-view">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 pt-12 pb-4 px-4">
        <div className="flex items-center gap-3 mb-4">
          <Wrench size={24} className="text-amber-400" />
          <h1 className="text-xl font-bold text-white">Maintenance</h1>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
          <Search size={16} className="text-white/50" />
          <input 
            type="text"
            placeholder="Rechercher..."
            className="flex-1 bg-transparent text-white placeholder-white/40 text-sm outline-none"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex bg-white border-b border-slate-200 py-3 px-4">
        <div className="flex-1 text-center">
          <div className="text-xl font-extrabold text-amber-500">{stats.pending}</div>
          <div className="text-[11px] text-slate-500 font-medium">En attente</div>
        </div>
        <div className="w-px bg-slate-200" />
        <div className="flex-1 text-center">
          <div className="text-xl font-extrabold text-teal-500">{stats.inProgress}</div>
          <div className="text-[11px] text-slate-500 font-medium">En cours</div>
        </div>
        <div className="w-px bg-slate-200" />
        <div className="flex-1 text-center">
          <div className="text-xl font-extrabold text-green-500">{stats.resolved}</div>
          <div className="text-[11px] text-slate-500 font-medium">Résolu</div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 bg-white border-b border-slate-200 py-2 px-4">
        <div className="relative">
          <button 
            className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-medium text-slate-600"
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            {statusFilter === 'all' ? 'Tous statuts' : STATUS_CONFIG[statusFilter]?.label}
            <ChevronDown size={12} />
          </button>
          {showStatusDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg z-50 min-w-[140px]">
              {[
                { value: 'all', label: 'Tous statuts' },
                { value: 'en_attente', label: 'En attente' },
                { value: 'en_cours', label: 'En cours' },
                { value: 'resolu', label: 'Résolu' },
              ].map(opt => (
                <button 
                  key={opt.value}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-50 ${statusFilter === opt.value ? 'bg-teal-50' : ''}`}
                  onClick={() => { setStatusFilter(opt.value); setShowStatusDropdown(false) }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button size="sm" className="ml-auto bg-teal-600 hover:bg-teal-700 h-8">
          <BarChart3 size={14} className="mr-1" /> Suivi
        </Button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {filteredTasks.length > 0 ? filteredTasks.map(ticket => {
          const priorityConfig = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.basse
          const taskStatusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.en_attente

          return (
            <div 
              key={ticket.id}
              className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden"
              data-testid={`maintenance-ticket-${ticket.room_number}`}
            >
              {/* Priority stripe */}
              <div className="w-1 self-stretch" style={{ backgroundColor: priorityConfig.color }} />
              
              <div className="flex-1 p-3">
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-teal-800">Ch. {ticket.room_number}</span>
                  <div 
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: taskStatusConfig.color + '15', color: taskStatusConfig.color }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: taskStatusConfig.color }} />
                    {taskStatusConfig.label}
                  </div>
                </div>

                {/* Title */}
                <p className="font-medium text-sm text-slate-900 truncate">{ticket.title}</p>
                
                {/* Meta */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>Signalé par {ticket.reported_by}</span>
                  <span>
                    {new Date(ticket.reported_at || Date.now()).toLocaleString('fr-FR', { 
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                    })}
                  </span>
                </div>

                {/* Assigned */}
                {ticket.assigned_to_name && (
                  <p className="text-[11px] text-teal-600 font-medium mt-1">👤 {ticket.assigned_to_name}</p>
                )}

                {/* Priority Badge */}
                <div 
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold mt-1.5"
                  style={{ backgroundColor: priorityConfig.color + '12', color: priorityConfig.color }}
                >
                  <AlertTriangle size={10} />
                  {priorityConfig.label}
                </div>

                {/* Actions */}
                {ticket.status !== 'resolu' && (
                  <div className="flex gap-2 mt-2">
                    {ticket.status === 'en_attente' && (
                      <Button 
                        size="sm" 
                        className="bg-teal-600 hover:bg-teal-700 h-7 text-xs"
                        onClick={() => handleStartTicket(ticket)}
                      >
                        <Clock size={12} className="mr-1" /> Commencer
                      </Button>
                    )}
                    {ticket.status === 'en_cours' && (
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                        onClick={() => handleResolveTicket(ticket)}
                      >
                        <CheckCircle size={12} className="mr-1" /> Résoudre
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <span className="text-xl text-slate-300 pr-3">›</span>
            </div>
          )
        }) : (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="text-5xl mb-3">🔧</span>
            <span className="font-semibold text-slate-900">Aucune intervention</span>
            <span className="text-sm text-slate-500">Tout est en ordre</span>
          </div>
        )}
      </div>
    </div>
  )
}
