import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Ticket, Search, Filter, Clock, CheckCircle, AlertCircle, Loader2, 
  MessageSquare, Sparkles, ChevronRight, Eye, Send, RefreshCw,
  HelpCircle, FileText, BarChart3, Zap, Bot, ArrowRight
} from 'lucide-react'

const STATUS_COLORS = {
  open: 'bg-amber-100 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  ai_processing: 'bg-violet-100 text-violet-700 border-violet-200',
  resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-100 text-slate-500 border-slate-200',
}

const STATUS_LABELS = {
  open: 'Ouvert',
  in_progress: 'En cours',
  ai_processing: 'Analyse IA',
  resolved: 'Résolu',
  closed: 'Fermé',
}

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  critical: 'bg-red-100 text-red-600',
}

const MODULES = {
  pms: { label: 'PMS', icon: '🏨' },
  channel_manager: { label: 'Channel Manager', icon: '🌐' },
  rms: { label: 'RMS', icon: '📊' },
  housekeeping: { label: 'Housekeeping', icon: '🧹' },
  crm: { label: 'CRM', icon: '👥' },
  facturation: { label: 'Facturation', icon: '💰' },
  staff: { label: 'Staff', icon: '👔' },
  configuration: { label: 'Configuration', icon: '⚙️' },
  autre: { label: 'Autre', icon: '❓' },
}

export const SupportCenter = () => {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  const [activeTab, setActiveTab] = useState('tickets')
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterModule, setFilterModule] = useState('all')
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [analyzingTicket, setAnalyzingTicket] = useState(false)

  useEffect(() => {
    if (currentHotel?.id) {
      fetchTickets()
      fetchStats()
    }
  }, [currentHotel?.id, filterStatus, filterModule])

  const fetchTickets = async () => {
    if (!currentHotel?.id) return
    setLoading(true)
    try {
      let url = `/support/hotels/${currentHotel.id}/tickets?limit=100`
      if (filterStatus !== 'all') url += `&status=${filterStatus}`
      if (filterModule !== 'all') url += `&module=${filterModule}`
      
      const response = await api.get(url)
      setTickets(response.data.tickets || [])
    } catch (error) {
      console.error('Error fetching tickets:', error)
      toast.error('Erreur lors du chargement des tickets')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!currentHotel?.id) return
    try {
      const response = await api.get(`/support/hotels/${currentHotel.id}/stats`)
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchTicketDetails = async (ticketId) => {
    try {
      const response = await api.get(`/support/hotels/${currentHotel.id}/tickets/${ticketId}`)
      setSelectedTicket(response.data.ticket)
    } catch (error) {
      toast.error('Erreur lors du chargement du ticket')
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return
    setSendingMessage(true)
    try {
      await api.post(`/support/hotels/${currentHotel.id}/tickets/${selectedTicket.ticket_id}/messages`, {
        content: newMessage,
        is_internal: false
      })
      setNewMessage('')
      fetchTicketDetails(selectedTicket.ticket_id)
      toast.success('Message envoyé')
    } catch (error) {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setSendingMessage(false)
    }
  }

  const requestAIAnalysis = async () => {
    if (!selectedTicket) return
    setAnalyzingTicket(true)
    try {
      const response = await api.post(`/support/hotels/${currentHotel.id}/tickets/${selectedTicket.ticket_id}/ai-analyze`)
      toast.success('Analyse IA terminée')
      fetchTicketDetails(selectedTicket.ticket_id)
    } catch (error) {
      toast.error('Erreur lors de l\'analyse IA')
    } finally {
      setAnalyzingTicket(false)
    }
  }

  const filteredTickets = tickets.filter(t => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return t.title.toLowerCase().includes(query) || 
             t.ticket_id.toLowerCase().includes(query) ||
             t.description.toLowerCase().includes(query)
    }
    return true
  })

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-violet-600 to-violet-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              AI Support Center
            </h1>
            <p className="text-slate-500 mt-1">Gestion des demandes de support</p>
          </div>
          
          <Button 
            onClick={fetchTickets}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total tickets</p>
                  <p className="text-2xl font-bold text-slate-800">{stats.total_tickets}</p>
                </div>
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-violet-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">En attente</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.open_tickets}</p>
                </div>
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">En cours</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.in_progress_tickets}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Résolus</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.resolved_tickets}</p>
                </div>
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-6">
          {/* Tickets List */}
          <div className="flex-1">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Filters */}
              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un ticket..."
                    className="pl-9"
                  />
                </div>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    <SelectItem value="open">Ouvert</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="ai_processing">Analyse IA</SelectItem>
                    <SelectItem value="resolved">Résolu</SelectItem>
                    <SelectItem value="closed">Fermé</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterModule} onValueChange={setFilterModule}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous modules</SelectItem>
                    {Object.entries(MODULES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.icon} {val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Tickets */}
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <Ticket className="w-12 h-12 mb-3" />
                  <p>Aucun ticket trouvé</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredTickets.map(ticket => (
                    <div
                      key={ticket.id}
                      onClick={() => fetchTicketDetails(ticket.ticket_id)}
                      className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                        selectedTicket?.id === ticket.id ? 'bg-violet-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{MODULES[ticket.module]?.icon}</span>
                            <span className="text-xs text-slate-400 font-mono">{ticket.ticket_id}</span>
                            <Badge className={STATUS_COLORS[ticket.status]}>
                              {STATUS_LABELS[ticket.status]}
                            </Badge>
                            {ticket.ai_diagnosis && (
                              <Badge variant="outline" className="text-violet-600 border-violet-200">
                                <Bot className="w-3 h-3 mr-1" /> IA
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-medium text-slate-800">{ticket.title}</h3>
                          <p className="text-sm text-slate-500 line-clamp-1 mt-1">{ticket.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                            <span>{format(new Date(ticket.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</span>
                            {ticket.messages?.length > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {ticket.messages.length}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ticket Detail Panel */}
          <div className="w-96">
            {selectedTicket ? (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-mono text-slate-500">{selectedTicket.ticket_id}</span>
                    <Badge className={STATUS_COLORS[selectedTicket.status]}>
                      {STATUS_LABELS[selectedTicket.status]}
                    </Badge>
                  </div>
                  <h2 className="font-semibold text-slate-800">{selectedTicket.title}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg">{MODULES[selectedTicket.module]?.icon}</span>
                    <span className="text-sm text-slate-500">{MODULES[selectedTicket.module]?.label}</span>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-4 max-h-[400px] overflow-y-auto">
                  {/* Description */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Description</h4>
                    <p className="text-sm text-slate-700">{selectedTicket.description}</p>
                  </div>
                  
                  {/* Screenshot */}
                  {selectedTicket.screenshot_url && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Capture d'écran</h4>
                      <img 
                        src={selectedTicket.screenshot_url} 
                        alt="Screenshot" 
                        className="w-full rounded-lg border border-slate-200"
                      />
                    </div>
                  )}
                  
                  {/* AI Diagnosis */}
                  {selectedTicket.ai_diagnosis && (
                    <div className="mb-4 p-3 bg-violet-50 rounded-lg border border-violet-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-violet-600" />
                        <h4 className="text-sm font-semibold text-violet-700">Diagnostic IA</h4>
                      </div>
                      <p className="text-sm text-slate-700">{selectedTicket.ai_diagnosis.response}</p>
                    </div>
                  )}
                  
                  {/* Messages */}
                  {selectedTicket.messages?.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Conversation</h4>
                      <div className="space-y-3">
                        {selectedTicket.messages.map(msg => (
                          <div 
                            key={msg.id}
                            className={`p-3 rounded-lg ${
                              msg.is_ai 
                                ? 'bg-violet-50 border border-violet-200' 
                                : 'bg-slate-50 border border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {msg.is_ai ? (
                                <Bot className="w-4 h-4 text-violet-600" />
                              ) : (
                                <MessageSquare className="w-4 h-4 text-slate-500" />
                              )}
                              <span className="text-xs text-slate-500">
                                {msg.is_ai ? 'Flowtym AI' : 'Vous'}
                              </span>
                              <span className="text-xs text-slate-400">
                                {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700">{msg.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Context */}
                  {selectedTicket.context && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Contexte</h4>
                      <div className="text-xs text-slate-500 space-y-1">
                        <p>Page: {selectedTicket.context.current_page}</p>
                        <p>Date: {format(new Date(selectedTicket.context.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="p-4 border-t border-slate-100 space-y-3">
                  {!selectedTicket.ai_diagnosis && selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                    <Button
                      onClick={requestAIAnalysis}
                      disabled={analyzingTicket}
                      className="w-full bg-violet-600 hover:bg-violet-700"
                    >
                      {analyzingTicket ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyse en cours...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Demander l'aide de l'IA
                        </>
                      )}
                    </Button>
                  )}
                  
                  {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Votre message..."
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={sendingMessage || !newMessage.trim()}
                        size="icon"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 h-96 flex flex-col items-center justify-center text-slate-400">
                <Eye className="w-12 h-12 mb-3" />
                <p className="text-center">Sélectionnez un ticket<br />pour voir les détails</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupportCenter
