/**
 * Flowtym Support Agent Interface
 * Interface dédiée pour les agents de support Flowtym
 * Accessible via /support-agent
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link, Routes, Route, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import {
  Headphones, LayoutDashboard, Ticket, Monitor, Bot, History, 
  FileText, LogOut, Building2, Search, Filter, RefreshCw,
  Clock, AlertTriangle, CheckCircle, XCircle, Play, Eye,
  Send, ChevronRight, Users, TrendingUp, Zap, Shield,
  MessageSquare, Radio, Camera, StopCircle, ExternalLink,
  ArrowUpRight, Loader2, Bell, Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const API_URL = import.meta.env.VITE_BACKEND_URL

// Create axios instance with auth
const createApi = (token) => {
  return axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` }
  })
}

// ==================== DASHBOARD ====================
const SupportDashboard = ({ api }) => {
  const [stats, setStats] = useState(null)
  const [remoteStats, setRemoteStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api) return
    
    const fetchData = async () => {
      try {
        const [supportRes, remoteRes] = await Promise.all([
          api.get('/api/support/stats'),
          api.get('/api/support/remote/stats')
        ])
        setStats(supportRes.data)
        setRemoteStats(remoteRes.data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [api])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    )
  }

  const kpiCards = [
    { label: 'Tickets ouverts', value: stats?.open_tickets || 0, icon: Ticket, color: 'bg-amber-500', trend: '+3 aujourd\'hui' },
    { label: 'En cours de traitement', value: stats?.in_progress_tickets || 0, icon: Clock, color: 'bg-blue-500', trend: 'IA: 5 | Humain: 2' },
    { label: 'Résolus ce mois', value: stats?.resolved_tickets || 0, icon: CheckCircle, color: 'bg-emerald-500', trend: 'Taux: 94%' },
    { label: 'Sessions à distance', value: remoteStats?.active || 0, icon: Monitor, color: 'bg-violet-500', trend: `${remoteStats?.pending || 0} en attente` },
  ]

  const aiMetrics = [
    { label: 'Traités par IA', value: '127', percentage: 68 },
    { label: 'Escaladés humain', value: '59', percentage: 32 },
    { label: 'Temps moyen IA', value: '2.3 min', percentage: 85 },
    { label: 'Satisfaction IA', value: '4.6/5', percentage: 92 },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Support</h1>
          <p className="text-slate-500">Vue d'ensemble du support Flowtym</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{kpi.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{kpi.value}</p>
                <p className="text-xs text-slate-400 mt-1">{kpi.trend}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${kpi.color} flex items-center justify-center`}>
                <kpi.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Performance Section */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-violet-600" />
            <h2 className="text-lg font-semibold">Performance IA</h2>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {aiMetrics.map((metric, i) => (
              <div key={i} className="text-center">
                <div className="relative w-20 h-20 mx-auto">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="35" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                    <circle 
                      cx="40" cy="40" r="35" fill="none" 
                      stroke="#8b5cf6" strokeWidth="6"
                      strokeDasharray={`${metric.percentage * 2.2} 220`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-slate-900">{metric.value}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-2">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold">Alertes critiques</h2>
          </div>
          <div className="space-y-3">
            {stats?.tickets_by_priority?.critical > 0 ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">
                  {stats.tickets_by_priority.critical} ticket(s) critique(s)
                </p>
                <p className="text-xs text-red-600 mt-1">Requiert attention immédiate</p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm font-medium text-emerald-800">Aucune alerte critique</p>
                <p className="text-xs text-emerald-600 mt-1">Tout fonctionne normalement</p>
              </div>
            )}
            {remoteStats?.pending > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800">
                  {remoteStats.pending} demande(s) d'accès en attente
                </p>
                <p className="text-xs text-amber-600 mt-1">En attente d'approbation hôtel</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold">Tickets récents</h2>
          </div>
          <Link to="/support-agent/tickets" className="text-sm text-violet-600 hover:underline flex items-center gap-1">
            Voir tous <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-2">
          {stats?.recent_tickets?.slice(0, 5).map((ticket, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-3">
                <Badge variant={
                  ticket.status === 'open' ? 'destructive' :
                  ticket.status === 'ai_processing' ? 'secondary' :
                  ticket.status === 'escalated_to_human' ? 'warning' :
                  'default'
                }>
                  {ticket.status}
                </Badge>
                <div>
                  <p className="text-sm font-medium text-slate-800">{ticket.title}</p>
                  <p className="text-xs text-slate-500">{ticket.ticket_id} • {ticket.module}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ==================== TICKETS ====================
const SupportTickets = ({ api }) => {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [filter, setFilter] = useState({ status: 'all', module: 'all' })
  const [searchQuery, setSearchQuery] = useState('')

  const fetchTickets = useCallback(async () => {
    if (!api) return
    try {
      const res = await api.get('/api/support/stats')
      setTickets(res.data.recent_tickets || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const statusColors = {
    open: 'bg-amber-100 text-amber-700',
    ai_processing: 'bg-violet-100 text-violet-700',
    escalated_to_human: 'bg-red-100 text-red-700',
    in_progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-slate-100 text-slate-700'
  }

  const statusLabels = {
    open: 'Ouvert',
    ai_processing: 'IA en cours',
    escalated_to_human: 'Escaladé',
    in_progress: 'En cours',
    resolved: 'Résolu',
    closed: 'Fermé'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Tickets</h1>
          <p className="text-slate-500">{tickets.length} ticket(s) au total</p>
        </div>
        <Button variant="outline" onClick={fetchTickets}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Rechercher un ticket..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filter.status} onValueChange={(v) => setFilter({...filter, status: v})}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="open">Ouvert</SelectItem>
            <SelectItem value="ai_processing">IA en cours</SelectItem>
            <SelectItem value="escalated_to_human">Escaladé</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="resolved">Résolu</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filter.module} onValueChange={(v) => setFilter({...filter, module: v})}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les modules</SelectItem>
            <SelectItem value="pms">PMS</SelectItem>
            <SelectItem value="channel_manager">Channel Manager</SelectItem>
            <SelectItem value="housekeeping">Housekeeping</SelectItem>
            <SelectItem value="crm">CRM</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="col-span-2 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucun ticket trouvé</p>
            </div>
          ) : (
            tickets.map((ticket, i) => (
              <div 
                key={i}
                onClick={() => setSelectedTicket(ticket)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedTicket?.ticket_id === ticket.ticket_id ? 'border-violet-500 ring-1 ring-violet-500' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>
                        {statusLabels[ticket.status]}
                      </span>
                      <Badge variant="outline" className="text-xs">{ticket.module}</Badge>
                      {ticket.priority === 'critical' && (
                        <Badge variant="destructive" className="text-xs">CRITIQUE</Badge>
                      )}
                    </div>
                    <h3 className="font-medium text-slate-800">{ticket.title}</h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{ticket.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <span>{ticket.ticket_id}</span>
                      <span>•</span>
                      <span>{ticket.hotel_name || 'Hôtel'}</span>
                      <span>•</span>
                      <span>{new Date(ticket.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Ticket Detail Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 h-fit sticky top-6">
          {selectedTicket ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[selectedTicket.status]}`}>
                  {statusLabels[selectedTicket.status]}
                </span>
                <span className="text-xs text-slate-400">{selectedTicket.ticket_id}</span>
              </div>
              <h3 className="font-semibold text-lg text-slate-800">{selectedTicket.title}</h3>
              <p className="text-sm text-slate-600">{selectedTicket.description}</p>
              
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Module</span>
                  <span className="font-medium">{selectedTicket.module}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Priorité</span>
                  <span className="font-medium capitalize">{selectedTicket.priority}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Créé le</span>
                  <span className="font-medium">{new Date(selectedTicket.created_at).toLocaleString('fr-FR')}</span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <Button className="w-full bg-violet-600 hover:bg-violet-700">
                  <Bot className="w-4 h-4 mr-2" />
                  Analyser avec IA
                </Button>
                <Button variant="outline" className="w-full">
                  <Monitor className="w-4 h-4 mr-2" />
                  Demander accès distant
                </Button>
                <Button variant="outline" className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Répondre au client
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Sélectionnez un ticket</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== REMOTE ACCESS ====================
const RemoteAccess = ({ api }) => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [hotels, setHotels] = useState([])
  const [newRequest, setNewRequest] = useState({
    hotel_id: '',
    module: 'pms',
    target_role: 'admin',
    reason: '',
    requested_duration_minutes: 15
  })
  const [activeSession, setActiveSession] = useState(null)

  useEffect(() => {
    if (!api) return
    fetchRequests()
    fetchHotels()
  }, [api])

  const fetchRequests = async () => {
    if (!api) return
    try {
      const res = await api.get('/api/support/remote/requests')
      setRequests(res.data.requests || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchHotels = async () => {
    if (!api) return
    try {
      const res = await api.get('/api/hotels')
      setHotels(res.data || [])
    } catch (error) {
      console.error('Error fetching hotels:', error)
    }
  }

  const handleCreateRequest = async () => {
    if (!newRequest.hotel_id || !newRequest.reason) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    
    try {
      await api.post('/api/support/remote/request', newRequest)
      toast.success('Demande envoyée à l\'hôtel')
      setShowRequestModal(false)
      fetchRequests()
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de la demande')
    }
  }

  const handleStartSession = async (requestId) => {
    try {
      const res = await api.post(`/api/support/remote/session/start/${requestId}`)
      setActiveSession(res.data)
      toast.success('Session démarrée')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Impossible de démarrer la session')
    }
  }

  const handleEndSession = async (requestId) => {
    try {
      await api.post(`/api/support/remote/session/end/${requestId}`)
      setActiveSession(null)
      toast.success('Session terminée')
      fetchRequests()
    } catch (error) {
      toast.error('Erreur lors de la fermeture de la session')
    }
  }

  const statusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-emerald-100 text-emerald-700',
      active: 'bg-violet-100 text-violet-700',
      completed: 'bg-slate-100 text-slate-700',
      rejected: 'bg-red-100 text-red-700',
      expired: 'bg-gray-100 text-gray-700'
    }
    const labels = {
      pending: 'En attente',
      approved: 'Approuvé',
      active: 'Active',
      completed: 'Terminée',
      rejected: 'Refusée',
      expired: 'Expirée'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accès à distance</h1>
          <p className="text-slate-500">Visualiser les interfaces utilisateurs de manière sécurisée</p>
        </div>
        <Button onClick={() => setShowRequestModal(true)} className="bg-violet-600 hover:bg-violet-700">
          <Monitor className="w-4 h-4 mr-2" />
          Nouvelle demande
        </Button>
      </div>

      {/* Active Session Banner */}
      {activeSession && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-violet-500 rounded-full animate-pulse" />
              <div>
                <p className="font-medium text-violet-900">Session active</p>
                <p className="text-sm text-violet-600">
                  {activeSession.hotel_name || 'Hôtel'} • {activeSession.module} • 
                  Expire: {activeSession.expires_at ? new Date(activeSession.expires_at).toLocaleTimeString('fr-FR') : 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Camera className="w-4 h-4 mr-2" />
                Capture
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleEndSession(activeSession.request_id)}
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Terminer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Requests List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold">Historique des demandes</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto" />
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center">
              <Monitor className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucune demande d'accès</p>
            </div>
          ) : (
            requests.map((req, i) => (
              <div key={i} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {statusBadge(req.status)}
                    <div>
                      <p className="font-medium text-slate-800">{req.hotel_name}</p>
                      <p className="text-sm text-slate-500">
                        {req.module} • {req.target_role} • {new Date(req.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {req.status === 'approved' && (
                      <Button 
                        size="sm" 
                        className="bg-violet-600 hover:bg-violet-700"
                        onClick={() => handleStartSession(req.request_id)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Démarrer
                      </Button>
                    )}
                    {req.status === 'active' && (
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-2" />
                        Voir
                      </Button>
                    )}
                    {req.status === 'completed' && req.screenshots_count > 0 && (
                      <Button size="sm" variant="ghost">
                        <History className="w-4 h-4 mr-2" />
                        Replay
                      </Button>
                    )}
                  </div>
                </div>
                {req.reason && (
                  <p className="text-sm text-slate-500 mt-2 pl-20">{req.reason}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Request Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-violet-600" />
              Demander un accès à distance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Hôtel</label>
              <Select value={newRequest.hotel_id} onValueChange={(v) => setNewRequest({...newRequest, hotel_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un hôtel" />
                </SelectTrigger>
                <SelectContent>
                  {hotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id}>{hotel.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Module</label>
              <Select value={newRequest.module} onValueChange={(v) => setNewRequest({...newRequest, module: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pms">PMS</SelectItem>
                  <SelectItem value="channel_manager">Channel Manager</SelectItem>
                  <SelectItem value="housekeeping">Housekeeping</SelectItem>
                  <SelectItem value="crm">CRM</SelectItem>
                  <SelectItem value="facturation">Facturation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Rôle cible</label>
              <Select value={newRequest.target_role} onValueChange={(v) => setNewRequest({...newRequest, target_role: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="reception">Réception</SelectItem>
                  <SelectItem value="gouvernante">Gouvernante</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Durée (minutes)</label>
              <Select 
                value={String(newRequest.requested_duration_minutes)} 
                onValueChange={(v) => setNewRequest({...newRequest, requested_duration_minutes: parseInt(v)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 heure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Raison de la demande</label>
              <Textarea 
                placeholder="Décrivez pourquoi vous avez besoin d'accéder à l'interface..."
                value={newRequest.reason}
                onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestModal(false)}>Annuler</Button>
            <Button onClick={handleCreateRequest} className="bg-violet-600 hover:bg-violet-700">
              <Send className="w-4 h-4 mr-2" />
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== AI ASSISTANT ====================
const AIAssistant = ({ api }) => {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Bonjour ! Je suis l\'assistant IA Flowtym. Comment puis-je vous aider ?', timestamp: new Date() }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return
    
    const userMessage = { role: 'user', content: input, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Simulate AI response (would call actual AI endpoint)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const aiResponse = {
        role: 'ai',
        content: `J'ai analysé votre demande concernant "${input.substring(0, 50)}..."\n\n**Diagnostic:**\n- Type de problème: Probablement lié à la configuration\n- Probabilité: 78%\n\n**Actions recommandées:**\n1. Vérifier les paramètres du module\n2. Demander un accès distant si nécessaire\n3. Escalader si le problème persiste`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      toast.error('Erreur de communication avec l\'IA')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Assistant IA</h1>
        <p className="text-slate-500">Diagnostic et assistance intelligente</p>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-xl p-4 ${
                msg.role === 'user' 
                  ? 'bg-violet-600 text-white' 
                  : 'bg-slate-100 text-slate-800'
              }`}>
                {msg.role === 'ai' && (
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-violet-600" />
                    <span className="text-xs font-medium text-violet-600">Flowtym IA</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-violet-200' : 'text-slate-400'}`}>
                  {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                  <span className="text-sm text-slate-600">Analyse en cours...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Décrivez le problème ou posez une question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={loading} className="bg-violet-600 hover:bg-violet-700">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== HISTORY ====================
const SupportHistory = ({ api }) => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api) return
    fetchHistory()
  }, [api])

  const fetchHistory = async () => {
    if (!api) return
    try {
      const res = await api.get('/api/support/remote/requests?status=completed')
      setSessions(res.data.requests || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Historique</h1>
        <p className="text-slate-500">Sessions de support terminées</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun historique disponible</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {sessions.map((session, i) => (
              <div key={i} className="p-4 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{session.hotel_name}</p>
                    <p className="text-sm text-slate-500">
                      {session.module} • {new Date(session.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Play className="w-4 h-4 mr-2" />
                    Replay
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== LOGS ====================
const SupportLogs = ({ api }) => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Logs d'activité</h1>
        <p className="text-slate-500">Audit trail des actions support</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="space-y-3">
          {[
            { action: 'Session démarrée', hotel: 'Hôtel Paradis', time: '14:32', type: 'remote' },
            { action: 'Ticket résolu par IA', hotel: 'Grand Hôtel', time: '14:28', type: 'ai' },
            { action: 'Demande d\'accès envoyée', hotel: 'Résidence Élégance', time: '14:15', type: 'remote' },
            { action: 'Ticket escaladé', hotel: 'Hôtel Luxe', time: '13:45', type: 'escalation' },
          ].map((log, i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${
                log.type === 'ai' ? 'bg-violet-500' :
                log.type === 'remote' ? 'bg-blue-500' :
                'bg-amber-500'
              }`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{log.action}</p>
                <p className="text-xs text-slate-500">{log.hotel}</p>
              </div>
              <span className="text-xs text-slate-400">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ==================== MAIN APP ====================
export const SupportAgentApp = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [api, setApi] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('flowtym_token')
    if (!token) {
      navigate('/login')
      return
    }

    const apiInstance = createApi(token)
    setApi(apiInstance)

    // Verify user
    apiInstance.get('/api/auth/me')
      .then(res => {
        if (res.data.role !== 'support' && res.data.role !== 'superadmin' && res.data.role !== 'super_admin') {
          toast.error('Accès non autorisé')
          navigate('/login')
          return
        }
        setUser(res.data)
        setLoading(false)
      })
      .catch(() => {
        localStorage.removeItem('flowtym_token')
        navigate('/login')
      })
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('flowtym_token')
    navigate('/login')
  }

  if (loading || !api) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    )
  }

  const navItems = [
    { path: '/support-agent', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/support-agent/tickets', label: 'Tickets', icon: Ticket },
    { path: '/support-agent/remote', label: 'Accès distant', icon: Monitor },
    { path: '/support-agent/ai', label: 'IA Assistant', icon: Bot },
    { path: '/support-agent/history', label: 'Historique', icon: History },
    { path: '/support-agent/logs', label: 'Logs', icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar - Dark background for readability */}
      <aside 
        data-support-sidebar="true"
        className="w-64 flex flex-col"
        style={{ backgroundColor: '#0f172a' }}
      >
        <div className="p-4" style={{ borderBottom: '1px solid #334155' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: '#ffffff' }}>Flowtym</h2>
              <p className="text-xs" style={{ color: '#a78bfa' }}>Support Center</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path || 
                           (item.path !== '/support-agent' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ 
                  backgroundColor: isActive ? '#7c3aed' : 'transparent',
                  color: isActive ? '#ffffff' : '#d1d5db'
                }}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid #334155' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-sm font-medium text-white">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#ffffff' }}>{user?.first_name} {user?.last_name}</p>
              <p className="text-xs truncate" style={{ color: '#9ca3af' }}>{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="w-full"
            style={{ color: '#d1d5db' }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<SupportDashboard api={api} />} />
          <Route path="/tickets" element={<SupportTickets api={api} />} />
          <Route path="/remote" element={<RemoteAccess api={api} />} />
          <Route path="/ai" element={<AIAssistant api={api} />} />
          <Route path="/history" element={<SupportHistory api={api} />} />
          <Route path="/logs" element={<SupportLogs api={api} />} />
        </Routes>
      </main>
    </div>
  )
}

export default SupportAgentApp
