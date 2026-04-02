/**
 * Flowtym Operations Hub - Cahier de Consignes Intelligent
 * Module complet de gestion des consignes opérationnelles
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ClipboardList, Plus, Search, Filter, RefreshCw, Calendar as CalendarIcon,
  Clock, AlertTriangle, CheckCircle, XCircle, User, Building2, ChevronRight,
  ChevronLeft, Loader2, MoreVertical, Edit, Trash2, Eye, Upload, Image,
  FileText, Bot, Sparkles, TrendingUp, TrendingDown, Minus, Bell, Users,
  Home, Utensils, Wrench, Shield, Briefcase, HelpCircle, Tag, Paperclip,
  PlayCircle, PauseCircle, CheckCircle2, Archive, Send, Zap, BarChart3,
  PieChart, Activity, Target, Award
} from 'lucide-react'

// ==================== CONSTANTS ====================
const STATUS_CONFIG = {
  nouvelle: { label: 'Nouvelle', color: 'bg-blue-100 text-blue-700', icon: Bell },
  a_faire: { label: 'À faire', color: 'bg-amber-100 text-amber-700', icon: Clock },
  en_cours: { label: 'En cours', color: 'bg-violet-100 text-violet-700', icon: PlayCircle },
  fait: { label: 'Fait', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  fermee: { label: 'Fermée', color: 'bg-slate-100 text-slate-700', icon: Archive }
}

const PRIORITY_CONFIG = {
  basse: { label: 'Basse', color: 'bg-slate-100 text-slate-600' },
  normale: { label: 'Normale', color: 'bg-blue-100 text-blue-600' },
  haute: { label: 'Haute', color: 'bg-amber-100 text-amber-700' },
  urgente: { label: 'Urgente', color: 'bg-red-100 text-red-700' }
}

const SERVICE_CONFIG = {
  reception: { label: 'Réception', icon: Building2, color: 'text-blue-600' },
  housekeeping: { label: 'Housekeeping', icon: Home, color: 'text-emerald-600' },
  maintenance: { label: 'Maintenance', icon: Wrench, color: 'text-amber-600' },
  restauration: { label: 'Restauration', icon: Utensils, color: 'text-red-600' },
  direction: { label: 'Direction', icon: Briefcase, color: 'text-violet-600' },
  conciergerie: { label: 'Conciergerie', icon: Users, color: 'text-pink-600' },
  securite: { label: 'Sécurité', icon: Shield, color: 'text-slate-600' },
  autre: { label: 'Autre', icon: HelpCircle, color: 'text-gray-600' }
}

// ==================== DASHBOARD COMPONENT ====================
const ConsignesDashboard = ({ stats, loading, onRefresh, onNavigate }) => {
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const { api } = useAuth()
  const { currentHotel } = useHotel()

  const runAiAnalysis = async () => {
    if (!currentHotel?.id) return
    setAnalyzing(true)
    try {
      const res = await api.post(`/consignes/hotels/${currentHotel.id}/ai/analyze`)
      setAiAnalysis(res.data.analysis)
    } catch (error) {
      toast.error('Erreur lors de l\'analyse IA')
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    )
  }

  const kpiCards = [
    { 
      label: 'Consignes du jour', 
      value: stats?.today || 0, 
      icon: CalendarIcon, 
      color: 'bg-blue-500',
      onClick: () => onNavigate('list', { date: format(new Date(), 'yyyy-MM-dd') })
    },
    { 
      label: 'Urgentes', 
      value: stats?.urgent || 0, 
      icon: AlertTriangle, 
      color: 'bg-red-500',
      onClick: () => onNavigate('list', { priority: 'urgente' })
    },
    { 
      label: 'En retard', 
      value: stats?.overdue || 0, 
      icon: Clock, 
      color: 'bg-amber-500',
      onClick: () => onNavigate('list', { status: 'overdue' })
    },
    { 
      label: 'Taux complétion', 
      value: `${stats?.completion_rate || 0}%`, 
      icon: Target, 
      color: 'bg-emerald-500'
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <div 
            key={i} 
            onClick={kpi.onClick}
            className={`bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all ${kpi.onClick ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{kpi.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{kpi.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${kpi.color} flex items-center justify-center`}>
                <kpi.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Par Service */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-violet-600" />
            Par service
          </h3>
          <div className="space-y-3">
            {Object.entries(stats?.by_service || {}).map(([service, count]) => {
              const config = SERVICE_CONFIG[service] || SERVICE_CONFIG.autre
              return (
                <div key={service} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <config.icon className={`w-4 h-4 ${config.color}`} />
                    <span className="text-sm text-slate-600">{config.label}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              )
            })}
            {Object.keys(stats?.by_service || {}).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Aucune donnée</p>
            )}
          </div>
        </div>

        {/* Par Statut */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-600" />
            Par statut
          </h3>
          <div className="space-y-3">
            {Object.entries(stats?.by_status || {}).map(([status, count]) => {
              const config = STATUS_CONFIG[status] || { label: status, color: 'bg-slate-100 text-slate-600' }
              return (
                <div key={status} className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                    {config.label}
                  </span>
                  <span className="font-semibold text-slate-800">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI Analysis */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-600" />
              Analyse IA
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={runAiAnalysis}
              disabled={analyzing}
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
          
          {aiAnalysis ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Score global</span>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${
                    aiAnalysis.score_global >= 80 ? 'text-emerald-600' :
                    aiAnalysis.score_global >= 50 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {aiAnalysis.score_global}
                  </span>
                  <span className="text-slate-400">/100</span>
                </div>
              </div>
              
              {aiAnalysis.alertes?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 mb-1">Alertes</p>
                  {aiAnalysis.alertes.map((a, i) => (
                    <p key={i} className="text-sm text-amber-800">{a}</p>
                  ))}
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Tendance:</span>
                {aiAnalysis.tendance === 'positive' && <TrendingUp className="w-4 h-4 text-emerald-600" />}
                {aiAnalysis.tendance === 'negative' && <TrendingDown className="w-4 h-4 text-red-600" />}
                {aiAnalysis.tendance === 'stable' && <Minus className="w-4 h-4 text-slate-600" />}
                <span className="text-sm capitalize">{aiAnalysis.tendance}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Bot className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Cliquez pour analyser</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Consignes */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-600" />
            Consignes récentes
          </h3>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('list')}>
            Voir tout <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="space-y-2">
          {stats?.recent?.slice(0, 5).map((consigne, i) => {
            const statusConfig = STATUS_CONFIG[consigne.status] || STATUS_CONFIG.nouvelle
            const priorityConfig = PRIORITY_CONFIG[consigne.priority] || PRIORITY_CONFIG.normale
            return (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{consigne.title}</p>
                    <p className="text-xs text-slate-500">
                      {consigne.room_number && `Ch. ${consigne.room_number} • `}
                      {SERVICE_CONFIG[consigne.service]?.label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${priorityConfig.color}`}>
                    {priorityConfig.label}
                  </span>
                </div>
              </div>
            )
          })}
          {(!stats?.recent || stats.recent.length === 0) && (
            <p className="text-center text-slate-400 py-8">Aucune consigne récente</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== LIST COMPONENT ====================
const ConsignesList = ({ onEdit, onView, filters, setFilters }) => {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  const [consignes, setConsignes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConsignes, setSelectedConsignes] = useState([])

  const fetchConsignes = useCallback(async () => {
    if (!currentHotel?.id) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status && filters.status !== 'all') params.append('status', filters.status)
      if (filters.service && filters.service !== 'all') params.append('service', filters.service)
      if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority)
      if (searchQuery) params.append('search', searchQuery)
      
      const res = await api.get(`/consignes/hotels/${currentHotel.id}/consignes?${params}`)
      setConsignes(res.data.consignes || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [api, currentHotel?.id, filters, searchQuery])

  useEffect(() => {
    fetchConsignes()
  }, [fetchConsignes])

  const handleStatusChange = async (consigneId, newStatus) => {
    try {
      await api.put(`/consignes/hotels/${currentHotel.id}/consignes/${consigneId}`, {
        status: newStatus
      })
      toast.success('Statut mis à jour')
      fetchConsignes()
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDelete = async (consigneId) => {
    if (!confirm('Supprimer cette consigne ?')) return
    try {
      await api.delete(`/consignes/hotels/${currentHotel.id}/consignes/${consigneId}`)
      toast.success('Consigne supprimée')
      fetchConsignes()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Rechercher..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filters.status || 'all'} onValueChange={(v) => setFilters({...filters, status: v})}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.service || 'all'} onValueChange={(v) => setFilters({...filters, service: v})}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {Object.entries(SERVICE_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.priority || 'all'} onValueChange={(v) => setFilters({...filters, priority: v})}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchConsignes}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Consignes Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : consignes.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune consigne trouvée</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Consigne</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Chambre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Priorité</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assigné</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Échéance</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {consignes.map((consigne) => {
                const statusConfig = STATUS_CONFIG[consigne.status] || STATUS_CONFIG.nouvelle
                const priorityConfig = PRIORITY_CONFIG[consigne.priority] || PRIORITY_CONFIG.normale
                const serviceConfig = SERVICE_CONFIG[consigne.service] || SERVICE_CONFIG.autre
                const StatusIcon = statusConfig.icon
                const ServiceIcon = serviceConfig.icon
                
                return (
                  <tr key={consigne.consigne_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-800">{consigne.title}</p>
                        <p className="text-xs text-slate-500 truncate max-w-xs">{consigne.description}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {consigne.room_number ? (
                        <Badge variant="outline">{consigne.room_number}</Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ServiceIcon className={`w-4 h-4 ${serviceConfig.color}`} />
                        <span className="text-sm">{serviceConfig.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${priorityConfig.color}`}>
                        {priorityConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Select 
                        value={consigne.status} 
                        onValueChange={(v) => handleStatusChange(consigne.consigne_id, v)}
                      >
                        <SelectTrigger className={`w-[130px] h-8 text-xs ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key}>{config.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {consigne.assigned_to_name || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {consigne.due_date || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onView(consigne)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onEdit(consigne)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(consigne.consigne_id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ==================== CALENDAR COMPONENT ====================
const ConsignesCalendar = ({ onDayClick }) => {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedConsignes, setSelectedConsignes] = useState([])

  useEffect(() => {
    fetchCalendarData()
  }, [currentDate, currentHotel?.id])

  const fetchCalendarData = async () => {
    if (!currentHotel?.id) return
    setLoading(true)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      const res = await api.get(`/consignes/hotels/${currentHotel.id}/calendar?year=${year}&month=${month}`)
      setCalendarData(res.data.calendar || {})
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateClick = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    setSelectedDate(dateStr)
    setSelectedConsignes(calendarData[dateStr] || [])
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad days to start from Monday
  const startDay = monthStart.getDay()
  const paddingDays = startDay === 0 ? 6 : startDay - 1

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h3 className="text-lg font-semibold text-slate-800">
            {format(currentDate, 'MMMM yyyy', { locale: fr })}
          </h3>
          <Button variant="ghost" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Padding */}
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} className="h-20" />
          ))}
          
          {/* Days */}
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayConsignes = calendarData[dateStr] || []
            const hasUrgent = dayConsignes.some(c => c.priority === 'urgente')
            const hasOverdue = dayConsignes.some(c => c.status !== 'fait' && c.status !== 'fermee')
            
            return (
              <div
                key={dateStr}
                onClick={() => handleDateClick(day)}
                className={`h-20 p-2 border rounded-lg cursor-pointer transition-colors ${
                  selectedDate === dateStr ? 'border-violet-500 bg-violet-50' :
                  isToday(day) ? 'border-blue-500 bg-blue-50' :
                  'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className={`text-sm font-medium ${
                    isToday(day) ? 'text-blue-600' : 'text-slate-800'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {dayConsignes.length > 0 && (
                    <div className="flex items-center gap-1">
                      {hasUrgent && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                      {!hasUrgent && hasOverdue && <span className="w-2 h-2 bg-amber-500 rounded-full" />}
                      {!hasUrgent && !hasOverdue && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
                    </div>
                  )}
                </div>
                {dayConsignes.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    {dayConsignes.length} consigne{dayConsignes.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">
          {selectedDate ? format(parseISO(selectedDate), 'd MMMM yyyy', { locale: fr }) : 'Sélectionnez une date'}
        </h3>
        
        {selectedDate && selectedConsignes.length > 0 ? (
          <div className="space-y-3">
            {selectedConsignes.map((consigne, i) => {
              const statusConfig = STATUS_CONFIG[consigne.status]
              const priorityConfig = PRIORITY_CONFIG[consigne.priority]
              return (
                <div key={i} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig?.color}`}>
                      {statusConfig?.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${priorityConfig?.color}`}>
                      {priorityConfig?.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">{consigne.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {consigne.room_number && `Ch. ${consigne.room_number} • `}
                    {SERVICE_CONFIG[consigne.service]?.label}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              {selectedDate ? 'Aucune consigne ce jour' : 'Cliquez sur une date'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== CREATE/EDIT MODAL ====================
const ConsigneModal = ({ isOpen, onClose, consigne, onSave }) => {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    room_number: '',
    client_name: '',
    service: 'reception',
    assigned_to_name: '',
    priority: 'normale',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    due_time: '',
    recurrence: 'none',
    requires_proof: false,
    tags: []
  })

  useEffect(() => {
    if (consigne) {
      setFormData({
        title: consigne.title || '',
        description: consigne.description || '',
        room_number: consigne.room_number || '',
        client_name: consigne.client_name || '',
        service: consigne.service || 'reception',
        assigned_to_name: consigne.assigned_to_name || '',
        priority: consigne.priority || 'normale',
        due_date: consigne.due_date || format(new Date(), 'yyyy-MM-dd'),
        due_time: consigne.due_time || '',
        recurrence: consigne.recurrence || 'none',
        requires_proof: consigne.requires_proof || false,
        tags: consigne.tags || []
      })
    } else {
      setFormData({
        title: '',
        description: '',
        room_number: '',
        client_name: '',
        service: 'reception',
        assigned_to_name: '',
        priority: 'normale',
        due_date: format(new Date(), 'yyyy-MM-dd'),
        due_time: '',
        recurrence: 'none',
        requires_proof: false,
        tags: []
      })
    }
  }, [consigne])

  const handleSubmit = async () => {
    if (!formData.title || !formData.description) {
      toast.error('Veuillez remplir le titre et la description')
      return
    }
    
    setLoading(true)
    try {
      if (consigne) {
        await api.put(`/consignes/hotels/${currentHotel.id}/consignes/${consigne.consigne_id}`, formData)
        toast.success('Consigne mise à jour')
      } else {
        await api.post(`/consignes/hotels/${currentHotel.id}/consignes`, formData)
        toast.success('Consigne créée')
      }
      onSave()
      onClose()
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-violet-600" />
            {consigne ? 'Modifier la consigne' : 'Nouvelle consigne'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700 mb-1 block">Titre *</label>
              <Input 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Ex: Préparer accueil VIP"
              />
            </div>
            
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700 mb-1 block">Description *</label>
              <Textarea 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Décrivez la consigne en détail..."
                rows={3}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Chambre</label>
              <Input 
                value={formData.room_number}
                onChange={(e) => setFormData({...formData, room_number: e.target.value})}
                placeholder="Ex: 101"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Client</label>
              <Input 
                value={formData.client_name}
                onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                placeholder="Nom du client"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Service</label>
              <Select value={formData.service} onValueChange={(v) => setFormData({...formData, service: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className={`w-4 h-4 ${config.color}`} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Assigné à</label>
              <Input 
                value={formData.assigned_to_name}
                onChange={(e) => setFormData({...formData, assigned_to_name: e.target.value})}
                placeholder="Nom de la personne"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Priorité</label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Date d'échéance</label>
              <Input 
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Heure</label>
              <Input 
                type="time"
                value={formData.due_time}
                onChange={(e) => setFormData({...formData, due_time: e.target.value})}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Récurrence</label>
              <Select value={formData.recurrence} onValueChange={(v) => setFormData({...formData, recurrence: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  <SelectItem value="quotidienne">Quotidienne</SelectItem>
                  <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                  <SelectItem value="mensuelle">Mensuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={formData.requires_proof}
                onCheckedChange={(v) => setFormData({...formData, requires_proof: v})}
              />
              <label className="text-sm text-slate-700">Justificatif obligatoire</label>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-violet-600 hover:bg-violet-700">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {consigne ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== MAIN MODULE ====================
export const ConsignesModule = () => {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: 'all', service: 'all', priority: 'all' })
  const [showModal, setShowModal] = useState(false)
  const [editingConsigne, setEditingConsigne] = useState(null)
  const [viewingConsigne, setViewingConsigne] = useState(null)

  const fetchStats = useCallback(async () => {
    if (!currentHotel?.id) return
    setLoading(true)
    try {
      const res = await api.get(`/consignes/hotels/${currentHotel.id}/stats`)
      setStats(res.data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [api, currentHotel?.id])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleNavigate = (tab, newFilters = {}) => {
    setFilters({ ...filters, ...newFilters })
    setActiveTab(tab)
  }

  const handleEdit = (consigne) => {
    setEditingConsigne(consigne)
    setShowModal(true)
  }

  const handleView = (consigne) => {
    setViewingConsigne(consigne)
  }

  const handleCreate = () => {
    setEditingConsigne(null)
    setShowModal(true)
  }

  const handleSave = () => {
    fetchStats()
  }

  return (
    <div className="p-6 space-y-6" data-testid="consignes-module">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            Consignes
          </h1>
          <p className="text-slate-500 mt-1">Cahier de consignes intelligent</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchStats}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={handleCreate} className="bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle consigne
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700">
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="list" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700">
            <ClipboardList className="w-4 h-4 mr-2" />
            Liste
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Calendrier
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <ConsignesDashboard 
            stats={stats} 
            loading={loading} 
            onRefresh={fetchStats}
            onNavigate={handleNavigate}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <ConsignesList 
            onEdit={handleEdit}
            onView={handleView}
            filters={filters}
            setFilters={setFilters}
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <ConsignesCalendar onDayClick={(date) => handleNavigate('list', { date })} />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <ConsigneModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        consigne={editingConsigne}
        onSave={handleSave}
      />

      {/* View Modal */}
      <Dialog open={!!viewingConsigne} onOpenChange={() => setViewingConsigne(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Détail de la consigne</DialogTitle>
          </DialogHeader>
          {viewingConsigne && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[viewingConsigne.status]?.color}`}>
                  {STATUS_CONFIG[viewingConsigne.status]?.label}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${PRIORITY_CONFIG[viewingConsigne.priority]?.color}`}>
                  {PRIORITY_CONFIG[viewingConsigne.priority]?.label}
                </span>
              </div>
              <h3 className="text-lg font-semibold">{viewingConsigne.title}</h3>
              <p className="text-slate-600">{viewingConsigne.description}</p>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-slate-500">Chambre</p>
                  <p className="font-medium">{viewingConsigne.room_number || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Client</p>
                  <p className="font-medium">{viewingConsigne.client_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Service</p>
                  <p className="font-medium">{SERVICE_CONFIG[viewingConsigne.service]?.label}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Assigné à</p>
                  <p className="font-medium">{viewingConsigne.assigned_to_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Créé par</p>
                  <p className="font-medium">{viewingConsigne.created_by_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Créé le</p>
                  <p className="font-medium">{viewingConsigne.created_at?.split('T')[0]}</p>
                </div>
              </div>
              
              {viewingConsigne.history?.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Historique</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {viewingConsigne.history.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="w-2 h-2 bg-violet-500 rounded-full" />
                        <span>{h.details}</span>
                        <span className="ml-auto">{h.by}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ConsignesModule
