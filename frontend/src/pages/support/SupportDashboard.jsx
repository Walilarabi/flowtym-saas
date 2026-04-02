import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Ticket, Search, Filter, Clock, CheckCircle, AlertCircle, Loader2, 
  MessageSquare, Sparkles, ChevronRight, Eye, Send, RefreshCw,
  BarChart3, Zap, Bot, Building2, TrendingUp, Users, PieChart,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react'

const STATUS_COLORS = {
  open: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  ai_processing: 'bg-violet-100 text-violet-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-500',
}

const STATUS_LABELS = {
  open: 'Ouvert',
  in_progress: 'En cours',
  ai_processing: 'Analyse IA',
  resolved: 'Résolu',
  closed: 'Fermé',
}

const MODULES = {
  pms: { label: 'PMS', icon: '🏨', color: 'bg-blue-500' },
  channel_manager: { label: 'Channel Manager', icon: '🌐', color: 'bg-green-500' },
  rms: { label: 'RMS', icon: '📊', color: 'bg-purple-500' },
  housekeeping: { label: 'Housekeeping', icon: '🧹', color: 'bg-cyan-500' },
  crm: { label: 'CRM', icon: '👥', color: 'bg-pink-500' },
  facturation: { label: 'Facturation', icon: '💰', color: 'bg-yellow-500' },
  staff: { label: 'Staff', icon: '👔', color: 'bg-orange-500' },
  configuration: { label: 'Configuration', icon: '⚙️', color: 'bg-slate-500' },
  autre: { label: 'Autre', icon: '❓', color: 'bg-gray-500' },
}

export const SupportDashboard = ({ apiOverride = null }) => {
  const auth = useAuth()
  const api = apiOverride || auth?.api
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [analyzingTicket, setAnalyzingTicket] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await api.get('/support/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast.error('Erreur lors du chargement des statistiques')
    } finally {
      setLoading(false)
    }
  }

  const handleAIAnalyze = async (ticket) => {
    setAnalyzingTicket(true)
    try {
      await api.post(`/support/hotels/${ticket.hotel_id}/tickets/${ticket.ticket_id}/ai-analyze`)
      toast.success('Analyse IA lancée')
      fetchStats()
    } catch (error) {
      toast.error('Erreur')
    } finally {
      setAnalyzingTicket(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-violet-600 to-violet-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              Support Dashboard
            </h1>
            <p className="text-slate-400 mt-1">Vue d'ensemble du support Flowtym</p>
          </div>
          
          <Button 
            onClick={fetchStats}
            variant="outline"
            className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
        </div>

        {stats && (
          <>
            {/* Main Stats */}
            <div className="grid grid-cols-5 gap-4 mb-8">
              <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-violet-400" />
                  </div>
                  <Badge className="bg-violet-500/20 text-violet-400 border-0">Total</Badge>
                </div>
                <p className="text-3xl font-bold text-white">{stats.total_tickets}</p>
                <p className="text-sm text-slate-400 mt-1">Tickets créés</p>
              </div>

              <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-400 border-0">En attente</Badge>
                </div>
                <p className="text-3xl font-bold text-white">{stats.open_tickets}</p>
                <p className="text-sm text-slate-400 mt-1">À traiter</p>
              </div>

              <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-400 border-0">En cours</Badge>
                </div>
                <p className="text-3xl font-bold text-white">{stats.in_progress_tickets}</p>
                <p className="text-sm text-slate-400 mt-1">Traitement</p>
              </div>

              <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-0">Résolus</Badge>
                </div>
                <p className="text-3xl font-bold text-white">{stats.resolved_tickets}</p>
                <p className="text-sm text-slate-400 mt-1">Terminés</p>
              </div>

              <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                    <Bot className="w-5 h-5 text-cyan-400" />
                  </div>
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-0">IA</Badge>
                </div>
                <p className="text-3xl font-bold text-white">{stats.ai_resolution_rate}%</p>
                <p className="text-sm text-slate-400 mt-1">Taux IA</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              {/* Tickets by Module */}
              <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-5">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-violet-400" />
                  Tickets par Module
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.tickets_by_module || {}).sort((a, b) => b[1] - a[1]).map(([module, count]) => {
                    const total = Object.values(stats.tickets_by_module || {}).reduce((a, b) => a + b, 0)
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0
                    return (
                      <div key={module} className="flex items-center gap-3">
                        <span className="text-xl">{MODULES[module]?.icon || '❓'}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-slate-300">{MODULES[module]?.label || module}</span>
                            <span className="text-sm text-slate-400">{count} ({percentage}%)</span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${MODULES[module]?.color || 'bg-slate-500'} transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {Object.keys(stats.tickets_by_module || {}).length === 0 && (
                    <p className="text-slate-500 text-center py-4">Aucune donnée</p>
                  )}
                </div>
              </div>

              {/* Tickets by Priority */}
              <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-5">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-violet-400" />
                  Tickets par Priorité
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'critical', label: 'Critique', color: 'bg-red-500', textColor: 'text-red-400' },
                    { key: 'high', label: 'Haute', color: 'bg-orange-500', textColor: 'text-orange-400' },
                    { key: 'medium', label: 'Moyenne', color: 'bg-blue-500', textColor: 'text-blue-400' },
                    { key: 'low', label: 'Basse', color: 'bg-slate-500', textColor: 'text-slate-400' },
                  ].map(p => (
                    <div key={p.key} className="bg-slate-700/30 rounded-xl p-4 text-center">
                      <div className={`w-3 h-3 ${p.color} rounded-full mx-auto mb-2`} />
                      <p className={`text-2xl font-bold ${p.textColor}`}>
                        {stats.tickets_by_priority?.[p.key] || 0}
                      </p>
                      <p className="text-xs text-slate-500">{p.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance */}
              <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-5">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-violet-400" />
                  Performance
                </h3>
                <div className="space-y-4">
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-400">Temps moyen résolution</span>
                      <Clock className="w-4 h-4 text-slate-500" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {stats.avg_resolution_time_hours > 0 
                        ? `${stats.avg_resolution_time_hours}h` 
                        : 'N/A'}
                    </p>
                  </div>
                  
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-400">Résolution IA</span>
                      <Bot className="w-4 h-4 text-violet-400" />
                    </div>
                    <p className="text-2xl font-bold text-violet-400">
                      {stats.ai_resolution_rate}%
                    </p>
                  </div>
                  
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-400">Taux satisfaction</span>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">94%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Tickets */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="p-5 border-b border-slate-700/50">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-violet-400" />
                  Tickets Récents
                </h3>
              </div>
              
              <div className="divide-y divide-slate-700/50">
                {stats.recent_tickets?.map(ticket => (
                  <div 
                    key={ticket.id}
                    className="p-4 hover:bg-slate-700/20 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{MODULES[ticket.module]?.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-slate-500">{ticket.ticket_id}</span>
                          <Badge className={STATUS_COLORS[ticket.status]}>
                            {STATUS_LABELS[ticket.status]}
                          </Badge>
                        </div>
                        <p className="text-white font-medium mt-1">{ticket.title}</p>
                        <p className="text-sm text-slate-400 mt-0.5">
                          Hôtel: {ticket.hotel_id} • {format(new Date(ticket.created_at), 'dd MMM HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {ticket.status === 'open' && (
                        <Button
                          onClick={() => handleAIAnalyze(ticket)}
                          disabled={analyzingTicket}
                          size="sm"
                          className="bg-violet-600 hover:bg-violet-700"
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          Analyser
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-white"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {!stats.recent_tickets?.length && (
                  <div className="p-8 text-center text-slate-500">
                    Aucun ticket récent
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default SupportDashboard
