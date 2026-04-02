import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { 
  Clock, Calendar as CalendarIcon, QrCode, LogIn, LogOut, 
  Check, AlertCircle, X, Timer, BadgeCheck, ChevronDown, 
  Search, Filter, Users, Download, Settings, RefreshCw,
  Play, Square, Pencil, Eye, CheckCircle, AlertTriangle
} from 'lucide-react'
import QRCode from 'react-qr-code'

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const StatusBadge = ({ status }) => {
  const statusConfig = {
    conforme: { label: 'Conforme', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    retard: { label: 'Retard', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
    depassement: { label: 'Dépassement', color: 'bg-orange-100 text-orange-700', icon: Timer },
    en_cours: { label: 'En cours', color: 'bg-blue-100 text-blue-700', icon: Play },
    non_pointe: { label: 'Non pointé', color: 'bg-slate-100 text-slate-600', icon: X },
    anomalie: { label: 'Anomalie', color: 'bg-red-100 text-red-700', icon: AlertCircle }
  }
  
  const config = statusConfig[status] || statusConfig.non_pointe
  const Icon = config.icon
  
  return (
    <Badge className={`${config.color} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const StaffPointage = () => {
  const { api, user } = useAuth()
  const { currentHotel } = useHotel()
  
  // State
  const [loading, setLoading] = useState(true)
  const [pointages, setPointages] = useState([])
  const [employees, setEmployees] = useState([])
  const [stats, setStats] = useState(null)
  const [qrCodeData, setQrCodeData] = useState(null)
  
  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filterEmployee, setFilterEmployee] = useState('all')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Dialogs
  const [showQRDialog, setShowQRDialog] = useState(false)
  const [showManualDialog, setShowManualDialog] = useState(false)
  const [showOvertimeDialog, setShowOvertimeDialog] = useState(false)
  const [selectedPointage, setSelectedPointage] = useState(null)
  
  // Manual pointage form
  const [manualForm, setManualForm] = useState({
    employee_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    check_in_time: '',
    check_out_time: '',
    manual_reason: ''
  })
  
  // Overtime validation form
  const [overtimeRate, setOvertimeRate] = useState('25')
  
  // Check if user can validate overtime (Direction/RH roles)
  const canValidateOvertime = useMemo(() => {
    return ['admin', 'manager', 'super_admin'].includes(user?.role)
  }, [user])
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const fetchData = async () => {
    if (!currentHotel) return
    setLoading(true)
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const [pointagesRes, employeesRes, statsRes] = await Promise.all([
        api.get(`/staff/pointage/hotels/${currentHotel.id}/pointages?date=${dateStr}`),
        api.get(`/hotels/${currentHotel.id}/staff/employees?is_active=true`),
        api.get(`/staff/pointage/hotels/${currentHotel.id}/stats?date=${dateStr}`)
      ])
      setPointages(pointagesRes.data)
      setEmployees(employeesRes.data)
      setStats(statsRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }
  
  const fetchQRCode = async () => {
    if (!currentHotel) return
    try {
      const res = await api.get(`/staff/pointage/hotels/${currentHotel.id}/qr-code`)
      setQrCodeData(res.data)
    } catch (error) {
      console.error('Error fetching QR code:', error)
      toast.error('Impossible de charger le QR code')
    }
  }
  
  useEffect(() => {
    fetchData()
    fetchQRCode()
  }, [currentHotel, selectedDate])
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FILTERING
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const filteredPointages = useMemo(() => {
    return pointages.filter(p => {
      // Employee filter
      if (filterEmployee !== 'all' && p.employee_id !== filterEmployee) return false
      // Department filter
      if (filterDepartment !== 'all' && p.department !== filterDepartment) return false
      // Status filter
      if (filterStatus !== 'all' && p.status !== filterStatus) return false
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!p.employee_name?.toLowerCase().includes(query)) return false
      }
      return true
    })
  }, [pointages, filterEmployee, filterDepartment, filterStatus, searchQuery])
  
  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean))
    return Array.from(depts)
  }, [employees])
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const handleManualPointage = async () => {
    if (!manualForm.employee_id || !manualForm.check_in_time || !manualForm.manual_reason) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    
    try {
      await api.post(`/staff/pointage/hotels/${currentHotel.id}/manual`, manualForm)
      toast.success('Pointage manuel créé')
      setShowManualDialog(false)
      setManualForm({
        employee_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        check_in_time: '',
        check_out_time: '',
        manual_reason: ''
      })
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du pointage')
    }
  }
  
  const handleValidateOvertime = async () => {
    if (!selectedPointage) return
    
    try {
      await api.patch(
        `/staff/pointage/hotels/${currentHotel.id}/pointages/${selectedPointage.id}/validate-overtime`,
        { overtime_rate: overtimeRate }
      )
      toast.success('Heures supplémentaires validées')
      setShowOvertimeDialog(false)
      setSelectedPointage(null)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la validation')
    }
  }
  
  const openOvertimeDialog = (pointage) => {
    setSelectedPointage(pointage)
    setShowOvertimeDialog(true)
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  
  return (
    <div className="h-full flex flex-col gap-4" data-testid="staff-pointage">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pointage</h1>
            <p className="text-sm text-slate-500">
              {format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowQRDialog(true)}
            data-testid="show-qr-btn"
          >
            <QrCode className="w-4 h-4 mr-2" />
            QR Code Hôtel
          </Button>
          <Button 
            onClick={() => setShowManualDialog(true)}
            data-testid="manual-pointage-btn"
          >
            <Pencil className="w-4 h-4 mr-2" />
            Saisie manuelle
          </Button>
        </div>
      </div>
      
      {/* KPI Strip */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">Effectif</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.total_employees}</p>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <LogIn className="w-4 h-4" />
              <span className="text-xs font-medium">Pointés</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.pointes}</p>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Conformes</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.conformes}</p>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">Retards</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.retards}</p>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Timer className="w-4 h-4" />
              <span className="text-xs font-medium">Heures sup</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats.total_overtime_hours.toFixed(1)}h</p>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <BadgeCheck className="w-4 h-4" />
              <span className="text-xs font-medium">H.Sup validées</span>
            </div>
            <p className="text-2xl font-bold text-violet-600">{stats.overtime_validated_hours.toFixed(1)}h</p>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg border border-slate-200 p-3">
        {/* Date picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" data-testid="date-picker-btn">
              <CalendarIcon className="w-4 h-4 mr-2" />
              {format(selectedDate, 'dd MMM yyyy', { locale: fr })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar 
              mode="single" 
              selected={selectedDate} 
              onSelect={d => d && setSelectedDate(d)} 
              locale={fr} 
            />
          </PopoverContent>
        </Popover>
        
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher un collaborateur..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="search-input"
          />
        </div>
        
        {/* Department filter */}
        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
          <SelectTrigger className="w-40" data-testid="department-filter">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les services</SelectItem>
            {departments.map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Status filter */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40" data-testid="status-filter">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="conforme">Conforme</SelectItem>
            <SelectItem value="retard">Retard</SelectItem>
            <SelectItem value="depassement">Dépassement</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="anomalie">Anomalie</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Refresh */}
        <Button variant="outline" size="icon" onClick={fetchData}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Table */}
      <div className="flex-1 bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full" data-testid="pointage-table">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-slate-600">Collaborateur</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-600">Service</th>
                <th className="text-center p-3 text-xs font-semibold text-slate-600">Prévu</th>
                <th className="text-center p-3 text-xs font-semibold text-slate-600">Entrée</th>
                <th className="text-center p-3 text-xs font-semibold text-slate-600">Sortie</th>
                <th className="text-center p-3 text-xs font-semibold text-slate-600">Durée</th>
                <th className="text-center p-3 text-xs font-semibold text-slate-600">Écart</th>
                <th className="text-center p-3 text-xs font-semibold text-slate-600">H.Sup</th>
                <th className="text-center p-3 text-xs font-semibold text-slate-600">Statut</th>
                <th className="text-center p-3 text-xs font-semibold text-slate-600">Source</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center">
                    <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full spinner mx-auto" />
                  </td>
                </tr>
              ) : filteredPointages.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-500">
                    Aucun pointage pour cette date
                  </td>
                </tr>
              ) : filteredPointages.map(pointage => (
                <tr key={pointage.id} className="table-row-hover" data-testid={`pointage-row-${pointage.id}`}>
                  <td className="p-3">
                    <p className="font-medium text-slate-900">{pointage.employee_name}</p>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-slate-500">{pointage.department || '-'}</span>
                  </td>
                  <td className="p-3 text-center">
                    {pointage.planned_start && pointage.planned_end ? (
                      <span className="text-sm font-mono text-slate-600">
                        {pointage.planned_start} - {pointage.planned_end}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-mono text-sm">
                      {pointage.check_in_time 
                        ? format(parseISO(pointage.check_in_time), 'HH:mm')
                        : '-'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-mono text-sm">
                      {pointage.check_out_time 
                        ? format(parseISO(pointage.check_out_time), 'HH:mm')
                        : '-'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-mono text-sm font-medium">
                      {pointage.total_hours ? `${pointage.total_hours.toFixed(1)}h` : '-'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {pointage.ecart_minutes !== null && pointage.ecart_minutes !== undefined ? (
                      <span className={`font-mono text-sm ${
                        pointage.ecart_minutes > 0 ? 'text-orange-600' : 
                        pointage.ecart_minutes < 0 ? 'text-red-600' : 'text-slate-600'
                      }`}>
                        {pointage.ecart_minutes > 0 ? '+' : ''}{pointage.ecart_minutes} min
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {pointage.overtime_hours && pointage.overtime_hours > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-mono text-sm text-orange-600">
                          {pointage.overtime_hours.toFixed(1)}h
                        </span>
                        {pointage.overtime_validated ? (
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                            +{pointage.overtime_rate}%
                          </Badge>
                        ) : canValidateOvertime && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 px-2 text-xs"
                            onClick={() => openOvertimeDialog(pointage)}
                            data-testid={`validate-overtime-${pointage.id}`}
                          >
                            Valider
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <StatusBadge status={pointage.status} />
                  </td>
                  <td className="p-3 text-center">
                    <Badge className={`text-xs ${
                      pointage.source === 'qr' ? 'bg-violet-100 text-violet-700' :
                      pointage.source === 'manuel' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {pointage.source === 'qr' ? 'QR' : 
                       pointage.source === 'manuel' ? 'Manuel' : 'Admin'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Button size="sm" variant="ghost">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* QR CODE DIALOG */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-violet-600" />
              QR Code de Pointage
            </DialogTitle>
            <DialogDescription>
              Affichez ce QR code à l'entrée de l'établissement. Les employés peuvent le scanner pour pointer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeData ? (
              <>
                <div className="bg-white p-4 rounded-lg border-2 border-dashed border-violet-200">
                  <QRCode 
                    value={qrCodeData.qr_code_url} 
                    size={200}
                    data-testid="qr-code-image"
                  />
                </div>
                <p className="text-sm text-slate-500 text-center max-w-xs">
                  {currentHotel?.name}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    navigator.clipboard.writeText(qrCodeData.qr_code_url)
                    toast.success('URL copiée')
                  }}>
                    Copier l'URL
                  </Button>
                  <Button onClick={() => {
                    // Print QR code
                    const printWindow = window.open('', '_blank')
                    printWindow.document.write(`
                      <html>
                        <head><title>QR Code Pointage - ${currentHotel?.name}</title></head>
                        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
                          <h1 style="margin-bottom:20px;">${currentHotel?.name}</h1>
                          <div id="qr"></div>
                          <p style="margin-top:20px;">Scannez pour pointer</p>
                        </body>
                      </html>
                    `)
                    printWindow.document.close()
                    printWindow.print()
                  }}>
                    Imprimer
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-8">
                <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full spinner mx-auto" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* MANUAL POINTAGE DIALOG */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-violet-600" />
              Saisie manuelle
            </DialogTitle>
            <DialogDescription>
              Créer un pointage manuel pour un employé (motif obligatoire).
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Collaborateur *</Label>
              <Select 
                value={manualForm.employee_id} 
                onValueChange={v => setManualForm({...manualForm, employee_id: v})}
              >
                <SelectTrigger data-testid="manual-employee-select">
                  <SelectValue placeholder="Sélectionner un collaborateur" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={manualForm.date}
                onChange={e => setManualForm({...manualForm, date: e.target.value})}
                data-testid="manual-date-input"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Heure d'entrée *</Label>
                <Input
                  type="time"
                  value={manualForm.check_in_time}
                  onChange={e => setManualForm({...manualForm, check_in_time: e.target.value})}
                  data-testid="manual-checkin-input"
                />
              </div>
              <div className="grid gap-2">
                <Label>Heure de sortie</Label>
                <Input
                  type="time"
                  value={manualForm.check_out_time}
                  onChange={e => setManualForm({...manualForm, check_out_time: e.target.value})}
                  data-testid="manual-checkout-input"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label>Motif *</Label>
              <Textarea
                placeholder="Ex: Oubli de badge, problème technique..."
                value={manualForm.manual_reason}
                onChange={e => setManualForm({...manualForm, manual_reason: e.target.value})}
                className="min-h-[80px]"
                data-testid="manual-reason-input"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleManualPointage} data-testid="submit-manual-pointage">
              Créer le pointage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* OVERTIME VALIDATION DIALOG */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showOvertimeDialog} onOpenChange={setShowOvertimeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-violet-600" />
              Valider les heures supplémentaires
            </DialogTitle>
            <DialogDescription>
              {selectedPointage && (
                <>
                  {selectedPointage.employee_name} - {selectedPointage.overtime_hours?.toFixed(1)}h supplémentaires
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Taux de majoration</Label>
              <Select value={overtimeRate} onValueChange={setOvertimeRate}>
                <SelectTrigger data-testid="overtime-rate-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">+25% (8 premières heures)</SelectItem>
                  <SelectItem value="50">+50% (au-delà / nuit / dimanche)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {selectedPointage && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Heures sup</span>
                  <span className="font-medium">{selectedPointage.overtime_hours?.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-slate-500">Majoration</span>
                  <span className="font-medium">+{overtimeRate}%</span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOvertimeDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleValidateOvertime} data-testid="confirm-overtime-btn">
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default StaffPointage
