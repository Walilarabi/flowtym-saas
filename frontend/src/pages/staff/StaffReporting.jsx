import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Users, Clock, TrendingUp, Thermometer, FileText, Download, Mail, 
  Settings, ChevronLeft, ChevronRight, BarChart3, FileSpreadsheet,
  Send, CheckCircle2, AlertCircle, Loader2, Eye, Calendar, X, Plus, Trash2,
  Building2
} from 'lucide-react'
// Phase 14 - Export logiciels de paie
import { PayrollSoftwareExport } from './components/PayrollSoftwareExport'

const MONTHS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Fevrier' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Aout' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Decembre' },
]

const DEPARTMENT_LABELS = {
  'front_office': 'Reception',
  'housekeeping': 'Hebergement',
  'food_beverage': 'Restauration',
  'maintenance': 'Maintenance',
  'administration': 'Direction',
  'kitchen': 'Cuisine',
}

const DEPARTMENT_COLORS = {
  'Reception': '#7c3aed',
  'Hebergement': '#3b82f6',
  'Restauration': '#f59e0b',
  'Maintenance': '#22c55e',
  'Direction': '#8b5cf6',
  'Cuisine': '#ef4444',
  'Autre': '#94a3b8',
}

export const StaffReporting = () => {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  
  // State
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [previewData, setPreviewData] = useState(null)
  const [config, setConfig] = useState(null)
  const [reports, setReports] = useState([])
  const [latestReport, setLatestReport] = useState(null)
  
  // Action states
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [sending, setSending] = useState(false)
  
  // Modal states
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  // Phase 14 - Export logiciels de paie
  const [showSoftwareExportModal, setShowSoftwareExportModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  
  // Config form state
  const [configForm, setConfigForm] = useState({
    accountant_emails: [],
    cc_emails: [],
    email_subject_template: '',
    email_body_template: '',
    auto_send_enabled: false,
    auto_send_day: 5,
    overtime_config: {
      threshold_25_percent: 8,
      threshold_50_percent: 999
    }
  })
  const [newEmail, setNewEmail] = useState('')
  
  // Send form state
  const [sendForm, setSendForm] = useState({
    recipients: [],
    cc: [],
    subject: '',
    body: ''
  })

  // Fetch preview data
  const fetchPreviewData = useCallback(async () => {
    if (!currentHotel) return
    setLoading(true)
    try {
      const res = await api.get(`/hotels/${currentHotel.id}/payroll-reports/preview?month=${month}&year=${year}`)
      setPreviewData(res.data)
    } catch (error) {
      console.error('Error fetching preview:', error)
      // Fallback to old analytics endpoint
      try {
        const res = await api.get(`/hotels/${currentHotel.id}/reporting/staff-analytics?month=${month}&year=${year}`)
        setPreviewData({
          ...res.data,
          employees: res.data.employees?.map(e => ({
            ...e,
            normal_hours: e.total_hours - (e.overtime_hours || 0),
            overtime_25_hours: Math.min(e.overtime_hours || 0, 8),
            overtime_50_hours: Math.max(0, (e.overtime_hours || 0) - 8),
            night_hours: 0,
            unjustified_absences: 0,
            other_absences: e.absences || 0,
            total_absences: (e.cp_days || 0) + (e.sick_days || 0) + (e.absences || 0)
          }))
        })
      } catch (e2) {
        toast.error('Erreur lors du chargement des donnees')
      }
    } finally {
      setLoading(false)
    }
  }, [api, currentHotel, month, year])

  // Fetch config
  const fetchConfig = useCallback(async () => {
    if (!currentHotel) return
    try {
      const res = await api.get(`/hotels/${currentHotel.id}/payroll-reports/config`)
      setConfig(res.data)
      setConfigForm({
        accountant_emails: res.data.accountant_emails || [],
        cc_emails: res.data.cc_emails || [],
        email_subject_template: res.data.email_subject_template || '',
        email_body_template: res.data.email_body_template || '',
        auto_send_enabled: res.data.auto_send_enabled || false,
        auto_send_day: res.data.auto_send_day || 5,
        overtime_config: res.data.overtime_config || { threshold_25_percent: 8, threshold_50_percent: 999 }
      })
    } catch (error) {
      console.error('Error fetching config:', error)
    }
  }, [api, currentHotel])

  // Fetch reports
  const fetchReports = useCallback(async () => {
    if (!currentHotel) return
    try {
      const res = await api.get(`/hotels/${currentHotel.id}/payroll-reports/reports?year=${year}`)
      setReports(res.data || [])
      // Find latest report for current month
      const current = res.data?.find(r => r.month === month && r.year === year)
      setLatestReport(current || null)
    } catch (error) {
      console.error('Error fetching reports:', error)
    }
  }, [api, currentHotel, year, month])

  useEffect(() => {
    fetchPreviewData()
    fetchConfig()
    fetchReports()
  }, [fetchPreviewData, fetchConfig, fetchReports])

  // Navigation
  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  // Generate reports
  const handleGenerateReports = async () => {
    if (!currentHotel) return
    setGenerating(true)
    try {
      const res = await api.post(`/hotels/${currentHotel.id}/payroll-reports/generate`, {
        month,
        year,
        include_individual_pdfs: true,
        include_global_pdf: true,
        include_excel: true
      })
      setLatestReport(res.data)
      toast.success('Rapports generes avec succes')
      fetchReports()
    } catch (error) {
      console.error('Error generating reports:', error)
      toast.error('Erreur lors de la generation des rapports')
    } finally {
      setGenerating(false)
    }
  }

  // Download file
  const handleDownload = async (fileType, fileName) => {
    if (!latestReport) {
      toast.error('Veuillez d\'abord generer les rapports')
      return
    }
    
    setExporting(true)
    try {
      const response = await api.get(
        `/hotels/${currentHotel.id}/payroll-reports/reports/${latestReport.id}/download/${fileType}`,
        { responseType: 'blob' }
      )
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = fileName || `rapport_${fileType}_${month}_${year}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Fichier telecharge')
    } catch (error) {
      console.error('Error downloading:', error)
      toast.error('Erreur lors du telechargement')
    } finally {
      setExporting(false)
    }
  }

  // Export Excel
  const handleExportExcel = () => handleDownload('excel', `variables_paie_${month}_${year}.xlsx`)
  
  // Export CSV
  const handleExportCSV = () => handleDownload('csv', `variables_paie_${month}_${year}.csv`)
  
  // Download global PDF
  const handleDownloadGlobalPDF = () => handleDownload('global_pdf', `recapitulatif_paie_${month}_${year}.pdf`)

  // Open send modal
  const handleOpenSendModal = () => {
    if (!latestReport) {
      toast.error('Veuillez d\'abord generer les rapports')
      return
    }
    setSendForm({
      recipients: config?.accountant_emails || [],
      cc: config?.cc_emails || [],
      subject: (config?.email_subject_template || 'Rapport de paie - {hotel_name} - {month}/{year}')
        .replace('{hotel_name}', currentHotel?.name || '')
        .replace('{month}', String(month).padStart(2, '0'))
        .replace('{year}', year),
      body: (config?.email_body_template || '')
        .replace('{hotel_name}', currentHotel?.name || '')
        .replace('{month}', String(month).padStart(2, '0'))
        .replace('{year}', year)
    })
    setShowSendModal(true)
  }

  // Send email
  const handleSendEmail = async () => {
    if (!latestReport || sendForm.recipients.length === 0) {
      toast.error('Veuillez ajouter au moins un destinataire')
      return
    }
    
    setSending(true)
    try {
      const res = await api.post(`/hotels/${currentHotel.id}/payroll-reports/reports/${latestReport.id}/send`, {
        report_id: latestReport.id,
        recipients: sendForm.recipients,
        cc: sendForm.cc,
        subject: sendForm.subject,
        body: sendForm.body
      })
      
      toast.success(res.data.message || 'Email envoye (simulation)')
      setShowSendModal(false)
      fetchReports()
    } catch (error) {
      console.error('Error sending:', error)
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setSending(false)
    }
  }

  // Save config
  const handleSaveConfig = async () => {
    try {
      await api.put(`/hotels/${currentHotel.id}/payroll-reports/config`, configForm)
      toast.success('Configuration sauvegardee')
      setShowConfigModal(false)
      fetchConfig()
    } catch (error) {
      console.error('Error saving config:', error)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  // Add email to list
  const addEmailToList = (list, setList, email) => {
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (!list.includes(email)) {
        setList([...list, email])
      }
      setNewEmail('')
    } else {
      toast.error('Email invalide')
    }
  }

  // Calculate stats
  const stats = useMemo(() => {
    if (!previewData?.employees) return null
    const employees = previewData.employees
    return {
      activeEmployees: employees.length,
      totalHours: employees.reduce((sum, e) => sum + (e.worked_hours || e.total_hours || 0), 0),
      totalOvertime25: employees.reduce((sum, e) => sum + (e.overtime_25_hours || 0), 0),
      totalOvertime50: employees.reduce((sum, e) => sum + (e.overtime_50_hours || 0), 0),
      totalOvertime: employees.reduce((sum, e) => sum + (e.overtime_25_hours || 0) + (e.overtime_50_hours || 0), 0),
      totalSickDays: employees.reduce((sum, e) => sum + (e.sick_days || 0), 0),
      totalCPDays: employees.reduce((sum, e) => sum + (e.cp_days || 0), 0)
    }
  }, [previewData])

  // Hours by service for chart
  const hoursByService = useMemo(() => {
    if (!previewData?.by_department && !previewData?.hours_by_service) return []
    
    if (previewData.by_department) {
      return Object.entries(previewData.by_department).map(([dept, data]) => ({
        service: DEPARTMENT_LABELS[dept] || dept,
        hours: data.hours || 0
      }))
    }
    
    return previewData.hours_by_service || []
  }, [previewData])

  const maxHours = useMemo(() => {
    if (!hoursByService.length) return 100
    return Math.max(...hoursByService.map(s => s.hours), 100)
  }, [hoursByService])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6 p-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Reporting Comptabilite</h1>
            <p className="text-sm text-slate-500">Variables de paie et rapports mensuels</p>
          </div>
          
          {/* Period Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <Button variant="ghost" size="sm" onClick={handlePrevMonth} className="h-8 w-8 p-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 text-sm font-medium text-slate-700 min-w-[140px] text-center">
                {MONTHS.find(m => m.value === month)?.label} {year}
              </span>
              <Button variant="ghost" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        {latestReport && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Rapports generes</p>
                <p className="text-xs text-emerald-600">
                  {latestReport.generated_at && `Le ${format(new Date(latestReport.generated_at), 'dd/MM/yyyy a HH:mm', { locale: fr })}`}
                  {' - '}{latestReport.individual_pdfs_count} fiches individuelles
                </p>
              </div>
            </div>
            {latestReport.email_status === 'sent' && (
              <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-300">
                <Mail className="w-3 h-3 mr-1" /> Envoye
              </Badge>
            )}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center mb-2">
              <Users className="w-4 h-4 text-violet-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats?.activeEmployees || 0}</p>
            <p className="text-xs text-slate-500">Collaborateurs</p>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats?.totalHours?.toFixed(0) || 0}h</p>
            <p className="text-xs text-slate-500">Heures totales</p>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats?.totalOvertime25?.toFixed(1) || 0}h</p>
            <p className="text-xs text-slate-500">H. Sup 25%</p>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats?.totalOvertime50?.toFixed(1) || 0}h</p>
            <p className="text-xs text-slate-500">H. Sup 50%</p>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats?.totalCPDays?.toFixed(1) || 0}j</p>
            <p className="text-xs text-slate-500">Conges payes</p>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center mb-2">
              <Thermometer className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats?.totalSickDays?.toFixed(1) || 0}j</p>
            <p className="text-xs text-slate-500">Maladie</p>
          </div>
        </div>

        {/* Actions Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Actions</h2>
          <div className="flex flex-wrap items-center gap-3">
            {/* Generate Reports Button */}
            <Button 
              onClick={handleGenerateReports} 
              disabled={generating}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
              data-testid="generate-reports-btn"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Generer les rapports
            </Button>
            
            {/* Download Global PDF */}
            <Button 
              variant="outline" 
              onClick={handleDownloadGlobalPDF}
              disabled={!latestReport || exporting}
              className="gap-2"
              data-testid="download-global-pdf-btn"
            >
              <FileText className="w-4 h-4" />
              PDF Global
            </Button>
            
            {/* Export Excel */}
            <Button 
              variant="outline" 
              onClick={handleExportExcel}
              disabled={!latestReport || exporting}
              className="gap-2"
              data-testid="export-excel-btn"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </Button>
            
            {/* Export CSV */}
            <Button 
              variant="outline" 
              onClick={handleExportCSV}
              disabled={!latestReport || exporting}
              className="gap-2"
              data-testid="export-csv-btn"
            >
              <Download className="w-4 h-4" />
              CSV
            </Button>

            {/* Phase 14 - Export Logiciel de Paie */}
            <Button
              variant="outline"
              onClick={() => setShowSoftwareExportModal(true)}
              className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
              data-testid="export-software-btn"
            >
              <Building2 className="w-4 h-4" />
              Logiciel de paie
            </Button>
            
            <div className="w-px h-8 bg-slate-200 mx-2" />
            
            {/* Send to Accountant */}
            <Button 
              variant="outline" 
              onClick={handleOpenSendModal}
              disabled={!latestReport}
              className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
              data-testid="send-email-btn"
            >
              <Send className="w-4 h-4" />
              Envoyer au comptable
            </Button>
            
            {/* Settings */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowConfigModal(true)}
              className="text-slate-500 ml-auto"
              data-testid="settings-btn"
            >
              <Settings className="w-4 h-4 mr-1" />
              Configuration
            </Button>
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full ${latestReport ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              {latestReport ? 'Rapports prets' : 'Non genere'}
            </div>
            {latestReport?.email_sent_at && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Mail className="w-3 h-3" />
                Dernier envoi: {format(new Date(latestReport.email_sent_at), 'dd/MM/yyyy HH:mm')}
              </div>
            )}
            {config?.auto_send_enabled && (
              <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200">
                Envoi auto actif (J+{config.auto_send_day})
              </Badge>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Employee Table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Detail par collaborateur</h2>
              <span className="text-xs text-slate-500">{previewData?.employees?.length || 0} salaries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Collaborateur</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Service</th>
                    <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">H. Norm.</th>
                    <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">H.Sup 25%</th>
                    <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">H.Sup 50%</th>
                    <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">CP</th>
                    <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Maladie</th>
                    <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(previewData?.employees || []).map(emp => (
                    <tr key={emp.employee_id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className="font-medium text-slate-800">
                          {emp.employee_name || `${emp.first_name} ${emp.last_name}`}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-slate-600">
                        {DEPARTMENT_LABELS[emp.department] || emp.department}
                      </td>
                      <td className="p-3 text-sm text-center font-medium text-slate-800">
                        {(emp.normal_hours || 0).toFixed(1)}h
                      </td>
                      <td className="p-3 text-sm text-center">
                        <span className={(emp.overtime_25_hours || 0) > 0 ? 'text-amber-600 font-medium' : 'text-slate-400'}>
                          {(emp.overtime_25_hours || 0).toFixed(1)}h
                        </span>
                      </td>
                      <td className="p-3 text-sm text-center">
                        <span className={(emp.overtime_50_hours || 0) > 0 ? 'text-orange-600 font-medium' : 'text-slate-400'}>
                          {(emp.overtime_50_hours || 0).toFixed(1)}h
                        </span>
                      </td>
                      <td className="p-3 text-sm text-center">
                        <span className={(emp.cp_days || 0) > 0 ? 'text-emerald-600' : 'text-slate-400'}>
                          {(emp.cp_days || 0).toFixed(1)}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-center">
                        <span className={(emp.sick_days || 0) > 0 ? 'text-red-600' : 'text-slate-400'}>
                          {(emp.sick_days || 0).toFixed(1)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {latestReport && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-violet-600 hover:text-violet-800"
                            onClick={() => handleDownload(`employee_pdf_${emp.employee_id}`, `fiche_${emp.last_name}_${month}_${year}.pdf`)}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold">
                  <tr>
                    <td className="p-3 text-slate-800">TOTAUX</td>
                    <td className="p-3"></td>
                    <td className="p-3 text-center text-slate-800">
                      {(previewData?.employees?.reduce((s, e) => s + (e.normal_hours || 0), 0) || 0).toFixed(1)}h
                    </td>
                    <td className="p-3 text-center text-amber-600">{stats?.totalOvertime25?.toFixed(1) || 0}h</td>
                    <td className="p-3 text-center text-orange-600">{stats?.totalOvertime50?.toFixed(1) || 0}h</td>
                    <td className="p-3 text-center text-emerald-600">{stats?.totalCPDays?.toFixed(1) || 0}</td>
                    <td className="p-3 text-center text-red-600">{stats?.totalSickDays?.toFixed(1) || 0}</td>
                    <td className="p-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Hours by Service Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Heures par service</h2>
            <div className="space-y-3">
              {hoursByService.map(service => (
                <div key={service.service}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">{service.service}</span>
                    <span className="font-medium text-slate-800">{service.hours?.toFixed(0) || 0}h</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(service.hours / maxHours) * 100}%`,
                        backgroundColor: DEPARTMENT_COLORS[service.service] || DEPARTMENT_COLORS['Autre']
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">Legende majoration H.Sup:</p>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-amber-500"></span>
                  <span className="text-slate-600">25% (0-{config?.overtime_config?.threshold_25_percent || 8}h)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-orange-500"></span>
                  <span className="text-slate-600">50% ({'>'}{config?.overtime_config?.threshold_25_percent || 8}h)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Modal */}
        <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Configuration des rapports</DialogTitle>
              <DialogDescription>Parametres pour la generation et l'envoi automatique</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Accountant Emails */}
              <div>
                <Label className="text-sm font-medium">Emails du comptable</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="email"
                    placeholder="email@comptable.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addEmailToList(configForm.accountant_emails, 
                          (list) => setConfigForm({...configForm, accountant_emails: list}), 
                          newEmail)
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => addEmailToList(configForm.accountant_emails, 
                      (list) => setConfigForm({...configForm, accountant_emails: list}), 
                      newEmail)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {configForm.accountant_emails.map((email, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {email}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => setConfigForm({
                          ...configForm, 
                          accountant_emails: configForm.accountant_emails.filter((_, idx) => idx !== i)
                        })}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Overtime Config */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Seuil H.Sup 25%</Label>
                  <Input
                    type="number"
                    value={configForm.overtime_config.threshold_25_percent}
                    onChange={e => setConfigForm({
                      ...configForm,
                      overtime_config: {...configForm.overtime_config, threshold_25_percent: parseFloat(e.target.value)}
                    })}
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">Heures avant passage a 50%</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Jour d'envoi auto</Label>
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={configForm.auto_send_day}
                    onChange={e => setConfigForm({...configForm, auto_send_day: parseInt(e.target.value)})}
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">Du mois suivant</p>
                </div>
              </div>
              
              {/* Auto Send Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-800">Envoi automatique</p>
                  <p className="text-xs text-slate-500">Envoyer les rapports automatiquement</p>
                </div>
                <Switch 
                  checked={configForm.auto_send_enabled}
                  onCheckedChange={checked => setConfigForm({...configForm, auto_send_enabled: checked})}
                />
              </div>
              
              {/* Email Template */}
              <div>
                <Label className="text-sm font-medium">Modele d'email</Label>
                <Input
                  value={configForm.email_subject_template}
                  onChange={e => setConfigForm({...configForm, email_subject_template: e.target.value})}
                  placeholder="Sujet de l'email"
                  className="mt-1"
                />
                <Textarea
                  value={configForm.email_body_template}
                  onChange={e => setConfigForm({...configForm, email_body_template: e.target.value})}
                  placeholder="Corps du message..."
                  className="mt-2"
                  rows={3}
                />
                <p className="text-xs text-slate-500 mt-1">Variables: {'{hotel_name}'}, {'{month}'}, {'{year}'}</p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfigModal(false)}>Annuler</Button>
              <Button onClick={handleSaveConfig} className="bg-violet-600 hover:bg-violet-700">Sauvegarder</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send Email Modal */}
        <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Envoyer au comptable</DialogTitle>
              <DialogDescription>
                <span className="flex items-center gap-2 text-amber-600 bg-amber-50 px-2 py-1 rounded mt-2">
                  <AlertCircle className="w-4 h-4" />
                  Mode simulation - Les emails ne sont pas reellement envoyes
                </span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Recipients */}
              <div>
                <Label className="text-sm font-medium">Destinataires</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="email"
                    placeholder="Ajouter un email"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && e.target.value) {
                        e.preventDefault()
                        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) {
                          setSendForm({...sendForm, recipients: [...sendForm.recipients, e.target.value]})
                          e.target.value = ''
                        }
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sendForm.recipients.map((email, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {email}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => setSendForm({
                          ...sendForm, 
                          recipients: sendForm.recipients.filter((_, idx) => idx !== i)
                        })}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Subject */}
              <div>
                <Label className="text-sm font-medium">Sujet</Label>
                <Input
                  value={sendForm.subject}
                  onChange={e => setSendForm({...sendForm, subject: e.target.value})}
                  className="mt-1"
                />
              </div>
              
              {/* Body */}
              <div>
                <Label className="text-sm font-medium">Message</Label>
                <Textarea
                  value={sendForm.body}
                  onChange={e => setSendForm({...sendForm, body: e.target.value})}
                  className="mt-1"
                  rows={4}
                />
              </div>
              
              {/* Attachments Preview */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-medium text-slate-700 mb-2">Pieces jointes:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    <FileText className="w-3 h-3 mr-1" />
                    recapitulatif_paie_{month}_{year}.pdf
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <FileSpreadsheet className="w-3 h-3 mr-1" />
                    variables_paie_{month}_{year}.xlsx
                  </Badge>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSendModal(false)}>Annuler</Button>
              <Button 
                onClick={handleSendEmail} 
                disabled={sending || sendForm.recipients.length === 0}
                className="bg-violet-600 hover:bg-violet-700 gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Phase 14 - Modal Export Logiciel de Paie */}
        <PayrollSoftwareExport
          open={showSoftwareExportModal}
          onClose={() => setShowSoftwareExportModal(false)}
          month={month}
          year={year}
        />
      </div>
    </div>
  )
}
