import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import html2canvas from 'html2canvas'
import { 
  MessageCircle, X, ChevronRight, ChevronLeft, Upload, Camera, Sparkles,
  CheckCircle, AlertCircle, Clock, Send, Loader2, HelpCircle, Zap,
  Monitor, FileText, Image as ImageIcon, ArrowRight, Bell, BellRing,
  Bot, RefreshCw, CheckCheck, Trash2, ExternalLink
} from 'lucide-react'

const MODULES = [
  { value: 'pms', label: 'PMS', icon: '🏨', description: 'Planning, réservations, chambres' },
  { value: 'channel_manager', label: 'Channel Manager', icon: '🌐', description: 'Distribution, OTAs, synchronisation' },
  { value: 'rms', label: 'RMS', icon: '📊', description: 'Revenue Management, tarification' },
  { value: 'housekeeping', label: 'Housekeeping', icon: '🧹', description: 'Gestion des chambres, ménage' },
  { value: 'crm', label: 'CRM', icon: '👥', description: 'Clients, fidélisation' },
  { value: 'facturation', label: 'Facturation', icon: '💰', description: 'Factures, paiements' },
  { value: 'staff', label: 'Staff', icon: '👔', description: 'Employés, planning RH' },
  { value: 'configuration', label: 'Configuration', icon: '⚙️', description: 'Paramètres, intégrations' },
  { value: 'autre', label: 'Autre', icon: '❓', description: 'Autre problème' },
]

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

export const SupportFloatingButton = () => {
  const { api, user } = useAuth()
  const { currentHotel } = useHotel()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1) // 1: module, 2: description, 3: screenshot, 4: review
  const [loading, setLoading] = useState(false)
  const [diagnosing, setDiagnosing] = useState(false)
  const [capturing, setCapturing] = useState(false)
  
  // Form state
  const [selectedModule, setSelectedModule] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState('')
  
  // Diagnosis state
  const [diagnosis, setDiagnosis] = useState(null)
  const [showDiagnosis, setShowDiagnosis] = useState(false)
  
  // Tickets state
  const [recentTickets, setRecentTickets] = useState([])
  const [showTickets, setShowTickets] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  
  // Notifications state
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [previousNotificationIds, setPreviousNotificationIds] = useState(new Set())
  
  const fileInputRef = useRef(null)
  const pollingRef = useRef(null)

  // Polling pour les notifications en temps réel (30 secondes)
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    
    pollingRef.current = setInterval(() => {
      if (currentHotel?.id) {
        fetchNotificationsQuiet()
      }
    }, 30000) // 30 secondes
  }, [currentHotel?.id])

  useEffect(() => {
    if (currentHotel?.id) {
      fetchNotifications()
      startPolling()
    }
    
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [currentHotel?.id, startPolling])

  useEffect(() => {
    if (isOpen && currentHotel?.id) {
      fetchRecentTickets()
      fetchNotifications()
    }
  }, [isOpen, currentHotel?.id])

  const fetchRecentTickets = async () => {
    if (!currentHotel?.id) return
    try {
      const response = await api.get(`/support/hotels/${currentHotel.id}/tickets?limit=5`)
      setRecentTickets(response.data.tickets || [])
    } catch (error) {
      console.error('Error fetching tickets:', error)
    }
  }

  const fetchNotifications = async () => {
    if (!currentHotel?.id) return
    setLoadingNotifications(true)
    try {
      const response = await api.get(`/support/hotels/${currentHotel.id}/notifications`)
      const newNotifications = response.data.notifications || []
      setNotifications(newNotifications)
      const unreadNotifs = newNotifications.filter(n => !n.read)
      setUnreadCount(unreadNotifs.length)
      
      // Store current IDs for comparison
      setPreviousNotificationIds(new Set(newNotifications.map(n => n.id)))
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoadingNotifications(false)
    }
  }

  // Quiet fetch for polling - shows toast for new notifications
  const fetchNotificationsQuiet = async () => {
    if (!currentHotel?.id) return
    try {
      const response = await api.get(`/support/hotels/${currentHotel.id}/notifications`)
      const newNotifications = response.data.notifications || []
      
      // Check for new notifications
      const newIds = newNotifications.map(n => n.id)
      const brandNew = newNotifications.filter(n => 
        !previousNotificationIds.has(n.id) && !n.read
      )
      
      // Show toast for each new notification
      brandNew.forEach(notif => {
        const icon = notif.notification_type === 'ai_response' ? '🤖' : 
                     notif.notification_type === 'status_change' ? '📋' : '🔔'
        toast(notif.title, {
          description: notif.message,
          icon: icon,
          duration: 8000,
          action: {
            label: 'Voir',
            onClick: () => {
              setShowNotifications(true)
              setIsOpen(true)
            }
          }
        })
      })
      
      setNotifications(newNotifications)
      const unreadNotifs = newNotifications.filter(n => !n.read)
      setUnreadCount(unreadNotifs.length)
      setPreviousNotificationIds(new Set(newIds))
    } catch (error) {
      console.error('Error polling notifications:', error)
    }
  }

  const markNotificationAsRead = async (notificationId) => {
    if (!currentHotel?.id) return
    try {
      await api.post(`/support/hotels/${currentHotel.id}/notifications/${notificationId}/read`)
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!currentHotel?.id) return
    try {
      await api.post(`/support/hotels/${currentHotel.id}/notifications/read-all`)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
      toast.success('Toutes les notifications sont marquées comme lues')
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const resetForm = () => {
    setStep(1)
    setSelectedModule('')
    setTitle('')
    setDescription('')
    setScreenshot(null)
    setScreenshotPreview('')
    setDiagnosis(null)
    setShowDiagnosis(false)
  }

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(resetForm, 300)
  }

  // Screenshot capture
  const captureScreen = async () => {
    setCapturing(true)
    setIsOpen(false) // Hide the dialog temporarily
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300)) // Wait for dialog to close
      
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: 0.5, // Reduce size
        logging: false
      })
      
      canvas.toBlob((blob) => {
        if (blob) {
          setScreenshot(blob)
          setScreenshotPreview(URL.createObjectURL(blob))
        }
        setIsOpen(true)
        setCapturing(false)
      }, 'image/jpeg', 0.7)
    } catch (error) {
      console.error('Screen capture failed:', error)
      toast.error('Capture d\'écran échouée')
      setIsOpen(true)
      setCapturing(false)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image trop volumineuse (max 5MB)')
        return
      }
      setScreenshot(file)
      setScreenshotPreview(URL.createObjectURL(file))
    }
  }

  // AI Diagnosis
  const runDiagnosis = async () => {
    if (!selectedModule || !description) return
    
    setDiagnosing(true)
    try {
      const response = await api.post(`/support/hotels/${currentHotel.id}/diagnose`, {
        module: selectedModule,
        description: description,
        context: {
          current_page: window.location.pathname,
          browser: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      })
      
      setDiagnosis(response.data.diagnosis)
      setShowDiagnosis(true)
    } catch (error) {
      console.error('Diagnosis failed:', error)
      // Continue without diagnosis
      setStep(4)
    } finally {
      setDiagnosing(false)
    }
  }

  // Submit ticket
  const submitTicket = async () => {
    if (!selectedModule || !title || !description) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    
    setLoading(true)
    try {
      // Upload screenshot if exists
      let screenshotUrl = null
      if (screenshot) {
        const formData = new FormData()
        formData.append('file', screenshot)
        try {
          const uploadRes = await api.post('/uploads/image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          screenshotUrl = uploadRes.data.url
        } catch (e) {
          console.error('Screenshot upload failed:', e)
        }
      }
      
      const response = await api.post(`/support/hotels/${currentHotel.id}/tickets`, {
        module: selectedModule,
        title: title,
        description: description,
        screenshot_url: screenshotUrl,
        context: {
          user_id: user?.id,
          user_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
          user_email: user?.email,
          current_page: window.location.pathname,
          browser: navigator.userAgent,
          timestamp: new Date().toISOString(),
          action_in_progress: title
        }
      })
      
      toast.success(`Ticket créé: ${response.data.ticket.ticket_id}`)
      handleClose()
      fetchRecentTickets()
      
    } catch (error) {
      console.error('Ticket creation failed:', error)
      toast.error('Erreur lors de la création du ticket')
    } finally {
      setLoading(false)
    }
  }

  // Render step content
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <HelpCircle className="w-8 h-8 text-violet-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Comment pouvons-nous vous aider ?</h3>
              <p className="text-sm text-slate-500 mt-1">Sélectionnez le module concerné</p>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {MODULES.map(mod => (
                <button
                  key={mod.value}
                  onClick={() => {
                    setSelectedModule(mod.value)
                    setStep(2)
                  }}
                  className={`p-3 rounded-xl border-2 transition-all hover:border-violet-300 hover:bg-violet-50 ${
                    selectedModule === mod.value ? 'border-violet-500 bg-violet-50' : 'border-slate-200'
                  }`}
                >
                  <span className="text-2xl">{mod.icon}</span>
                  <p className="text-xs font-medium text-slate-700 mt-1">{mod.label}</p>
                </button>
              ))}
            </div>
            
            {recentTickets.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowTickets(!showTickets)}
                  className="w-full flex items-center justify-between text-sm text-slate-600 hover:text-violet-600"
                >
                  <span>Vos tickets récents ({recentTickets.length})</span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${showTickets ? 'rotate-90' : ''}`} />
                </button>
                
                {showTickets && (
                  <div className="mt-3 space-y-2">
                    {recentTickets.slice(0, 3).map(ticket => (
                      <div key={ticket.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-700 truncate" style={{maxWidth: '180px'}}>{ticket.title}</p>
                          <p className="text-xs text-slate-500">{ticket.ticket_id}</p>
                        </div>
                        <Badge className={STATUS_COLORS[ticket.status]}>
                          {STATUS_LABELS[ticket.status]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      
      case 2:
        return (
          <div className="space-y-4">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-violet-600">
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>
            
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{MODULES.find(m => m.value === selectedModule)?.icon}</span>
              <span className="font-medium text-slate-700">{MODULES.find(m => m.value === selectedModule)?.label}</span>
            </div>
            
            <div>
              <Label>Titre du problème *</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Impossible de créer une réservation"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Description détaillée *</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Décrivez votre problème en détail. Que faisiez-vous ? Quel message d'erreur avez-vous vu ?"
                rows={4}
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => setStep(3)} 
                className="flex-1 bg-violet-600 hover:bg-violet-700"
                disabled={!title || !description}
              >
                Continuer <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )
      
      case 3:
        return (
          <div className="space-y-4">
            <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-violet-600">
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>
            
            <div className="text-center mb-4">
              <h3 className="font-semibold text-slate-800">Capture d'écran (optionnel)</h3>
              <p className="text-sm text-slate-500">Une image vaut mille mots</p>
            </div>
            
            {screenshotPreview ? (
              <div className="relative">
                <img 
                  src={screenshotPreview} 
                  alt="Screenshot" 
                  className="w-full rounded-lg border border-slate-200"
                />
                <button
                  onClick={() => { setScreenshot(null); setScreenshotPreview('') }}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={captureScreen}
                  disabled={capturing}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-violet-300 hover:bg-violet-50 transition-all"
                >
                  {capturing ? (
                    <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8 text-violet-500" />
                  )}
                  <span className="text-sm font-medium text-slate-600">Capture auto</span>
                </button>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-violet-300 hover:bg-violet-50 transition-all"
                >
                  <Upload className="w-8 h-8 text-violet-500" />
                  <span className="text-sm font-medium text-slate-600">Importer</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setStep(4)}
                className="flex-1"
              >
                Passer
              </Button>
              <Button 
                onClick={runDiagnosis}
                disabled={diagnosing}
                className="flex-1 bg-violet-600 hover:bg-violet-700"
              >
                {diagnosing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyse IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyser
                  </>
                )}
              </Button>
            </div>
          </div>
        )
      
      case 4:
        return (
          <div className="space-y-4">
            <button onClick={() => setStep(3)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-violet-600">
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>
            
            {/* AI Diagnosis Result */}
            {diagnosis && showDiagnosis && (
              <div className={`p-4 rounded-xl border-2 ${
                diagnosis.is_known_issue ? 'bg-amber-50 border-amber-200' : 'bg-violet-50 border-violet-200'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${diagnosis.is_known_issue ? 'bg-amber-100' : 'bg-violet-100'}`}>
                    <Zap className={`w-5 h-5 ${diagnosis.is_known_issue ? 'text-amber-600' : 'text-violet-600'}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800">
                      {diagnosis.is_known_issue ? 'Problème identifié !' : 'Analyse IA'}
                    </h4>
                    <p className="text-sm text-slate-600 mt-1">{diagnosis.recommendation}</p>
                    
                    {diagnosis.suggested_solution && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
                        <p className="text-sm font-medium text-slate-700">Solution suggérée :</p>
                        <p className="text-sm text-slate-600 mt-1">{diagnosis.suggested_solution}</p>
                      </div>
                    )}
                    
                    {diagnosis.is_known_issue && diagnosis.suggested_solution && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={handleClose}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Problème résolu
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Ticket Summary */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="font-semibold text-slate-800 mb-3">Récapitulatif du ticket</h4>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{MODULES.find(m => m.value === selectedModule)?.icon}</span>
                  <span className="font-medium text-slate-700">{MODULES.find(m => m.value === selectedModule)?.label}</span>
                </div>
                
                <div>
                  <p className="text-xs text-slate-500">Titre</p>
                  <p className="text-sm font-medium text-slate-700">{title}</p>
                </div>
                
                <div>
                  <p className="text-xs text-slate-500">Description</p>
                  <p className="text-sm text-slate-600 line-clamp-3">{description}</p>
                </div>
                
                {screenshotPreview && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Capture d'écran</p>
                    <img src={screenshotPreview} alt="Screenshot" className="w-20 h-14 object-cover rounded border" />
                  </div>
                )}
                
                <div className="pt-2 border-t border-slate-200 mt-2">
                  <p className="text-xs text-slate-500">Contexte automatique</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">
                      <Monitor className="w-3 h-3 mr-1" />
                      {window.location.pathname}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={submitTicket}
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Créer le ticket
                </>
              )}
            </Button>
          </div>
        )
      
      default:
        return null
    }
  }

  // Render notification center
  const renderNotificationCenter = () => (
    <div className="space-y-3">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellRing className="w-5 h-5 text-violet-600" />
          <span className="font-medium text-slate-800">Notifications</span>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white text-xs">{unreadCount}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchNotifications}
            disabled={loadingNotifications}
            className="h-8 px-2"
          >
            <RefreshCw className={`w-4 h-4 ${loadingNotifications ? 'animate-spin' : ''}`} />
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-8 text-xs text-violet-600 hover:text-violet-700"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Tout lire
            </Button>
          )}
        </div>
      </div>

      {/* Notifications list */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune notification</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => !notif.read && markNotificationAsRead(notif.id)}
              className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${
                notif.read 
                  ? 'bg-slate-50 border-slate-200' 
                  : 'bg-violet-50 border-violet-200 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  notif.notification_type === 'ai_response' 
                    ? 'bg-violet-100 text-violet-600'
                    : notif.notification_type === 'status_change'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {notif.notification_type === 'ai_response' ? (
                    <Bot className="w-4 h-4" />
                  ) : notif.notification_type === 'status_change' ? (
                    <RefreshCw className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${notif.read ? 'text-slate-600' : 'text-slate-800'}`}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="w-2 h-2 bg-violet-500 rounded-full shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">
                      {new Date(notif.created_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {notif.ticket_id && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {notif.ticket_id}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Back button */}
      <Button
        variant="outline"
        onClick={() => setShowNotifications(false)}
        className="w-full"
      >
        <ChevronLeft className="w-4 h-4 mr-2" />
        Retour
      </Button>
    </div>
  )

  return (
    <>
      {/* Floating Button with notification badge */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-full shadow-lg shadow-violet-500/30 flex items-center justify-center hover:scale-105 transition-transform"
        data-testid="support-floating-btn"
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {/* Support Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-violet-600 to-violet-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-lg">Flowtym AI Support</span>
                  <p className="text-xs font-normal text-slate-500">Support intelligent et instantané</p>
                </div>
              </div>
              {/* Notification bell icon */}
              {!showNotifications && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(true)}
                  className="relative h-9 w-9 p-0"
                >
                  <Bell className="w-5 h-5 text-slate-500" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {showNotifications ? (
            renderNotificationCenter()
          ) : (
            <>
              {/* Progress indicator */}
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4].map(s => (
                  <div
                    key={s}
                    className={`flex-1 h-1 rounded-full transition-colors ${
                      s <= step ? 'bg-violet-500' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
              
              {renderStep()}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default SupportFloatingButton
