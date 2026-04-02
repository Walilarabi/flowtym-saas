import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { FileText, Plus, Download, Eye, Printer, MoreHorizontal, CheckCircle, AlertTriangle, ExternalLink, Copy, FileCheck, Building2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

const CONTRACT_TYPES = [
  { value: 'cdi', label: 'CDI', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'cdd', label: 'CDD', color: 'bg-amber-100 text-amber-700' },
  { value: 'interim', label: 'Interim', color: 'bg-blue-100 text-blue-700' },
  { value: 'stage', label: 'Stage', color: 'bg-purple-100 text-purple-700' },
  { value: 'apprentissage', label: 'Apprentissage', color: 'bg-pink-100 text-pink-700' },
]

const DEPARTMENTS = [
  { value: 'front_office', label: 'Reception' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'food_beverage', label: 'Restauration' },
  { value: 'administration', label: 'Administration' },
]

export const StaffContracts = () => {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  const [contracts, setContracts] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('active')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [dpaeModalOpen, setDpaeModalOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState(null)
  const [hotelSettings, setHotelSettings] = useState(null)
  const [formData, setFormData] = useState({
    employee_id: '', contract_type: 'cdi', start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '', position: 'receptionist', department: 'front_office',
    hourly_rate: 11.65, weekly_hours: 35, trial_period_days: 60, notes: ''
  })

  const fetchData = async () => {
    if (!currentHotel) return
    setLoading(true)
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const [contRes, empRes, settingsRes] = await Promise.all([
        api.get(`/hotels/${currentHotel.id}/staff/contracts${params}`),
        api.get(`/hotels/${currentHotel.id}/staff/employees?is_active=true`),
        api.get(`/hotels/${currentHotel.id}/config/settings`).catch(() => ({ data: null }))
      ])
      setContracts(contRes.data)
      setEmployees(empRes.data)
      setHotelSettings(settingsRes.data)
    } catch (error) {
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [currentHotel, statusFilter])

  const handleNewContract = () => {
    setFormData({
      employee_id: '', contract_type: 'cdi', start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '', position: 'receptionist', department: 'front_office',
      hourly_rate: 11.65, weekly_hours: 35, trial_period_days: 60, notes: ''
    })
    setSheetOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/hotels/${currentHotel.id}/staff/contracts`, formData)
      toast.success('Contrat cree')
      setSheetOpen(false)
      fetchData()
    } catch (error) {
      toast.error('Erreur lors de la creation')
    }
  }

  const handleGenerateDocument = (contract) => {
    toast.success('Generation du contrat PDF...')
  }

  const handleOpenDPAE = (contract) => {
    const employee = employees.find(e => e.id === contract.employee_id)
    setSelectedContract({ ...contract, employee })
    setDpaeModalOpen(true)
  }

  const handleCopyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text)
    toast.success(`${fieldName} copié dans le presse-papiers`)
  }

  const handleOpenURSSAF = () => {
    window.open('https://www.due.urssaf.fr/declarant/index.jsf', '_blank')
  }

  const getContractType = (type) => CONTRACT_TYPES.find(c => c.value === type)
  const getDepartment = (dept) => DEPARTMENTS.find(d => d.value === dept)?.label

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Contrats</h1>
            <p className="text-sm text-slate-500">{contracts.length} contrats</p>
          </div>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700" onClick={handleNewContract}>
          <Plus className="w-4 h-4 mr-2" />Nouveau contrat
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="draft">Brouillons</SelectItem>
            <SelectItem value="ended">Termines</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-slate-600">Employe</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-600">Type</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-600">Departement</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-600">Debut</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-600">Fin</th>
                <th className="text-right p-3 text-xs font-semibold text-slate-600">Salaire brut/mois</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-600">Statut</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center"><div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full spinner mx-auto" /></td></tr>
              ) : contracts.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">Aucun contrat</td></tr>
              ) : contracts.map(contract => {
                const type = getContractType(contract.contract_type)
                const isExpiringSoon = contract.end_date && new Date(contract.end_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                return (
                  <tr key={contract.id} className="table-row-hover">
                    <td className="p-3">
                      <p className="font-medium text-slate-900">{contract.employee_name}</p>
                      <p className="text-xs text-slate-500">{contract.position}</p>
                    </td>
                    <td className="p-3"><Badge className={type?.color}>{type?.label}</Badge></td>
                    <td className="p-3 text-sm">{getDepartment(contract.department)}</td>
                    <td className="p-3 text-sm">{format(parseISO(contract.start_date), 'dd/MM/yyyy')}</td>
                    <td className="p-3 text-sm">
                      {contract.end_date ? (
                        <span className={isExpiringSoon ? 'text-amber-600 font-medium' : ''}>
                          {format(parseISO(contract.end_date), 'dd/MM/yyyy')}
                          {isExpiringSoon && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-right font-mono">{contract.monthly_gross.toLocaleString()} EUR</td>
                    <td className="p-3">
                      <Badge className={contract.status === 'active' ? 'bg-emerald-100 text-emerald-700' : contract.status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-700'}>
                        {contract.status === 'active' ? 'Actif' : contract.status === 'draft' ? 'Brouillon' : 'Termine'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleGenerateDocument(contract)}><Download className="w-4 h-4 mr-2" />Telecharger PDF</DropdownMenuItem>
                          <DropdownMenuItem><Printer className="w-4 h-4 mr-2" />Imprimer</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOpenDPAE(contract)} className="text-blue-600">
                            <FileCheck className="w-4 h-4 mr-2" />Declaration DPAE
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <SheetHeader><SheetTitle>Nouveau contrat</SheetTitle></SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Employe *</Label>
              <Select value={formData.employee_id} onValueChange={v => setFormData({...formData, employee_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selectionner" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de contrat *</Label>
                <Select value={formData.contract_type} onValueChange={v => setFormData({...formData, contract_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTRACT_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Departement *</Label>
                <Select value={formData.department} onValueChange={v => setFormData({...formData, department: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date debut *</Label><Input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} required /></div>
              {formData.contract_type !== 'cdi' && (
                <div className="space-y-2"><Label>Date fin</Label><Input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} /></div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Taux horaire</Label><Input type="number" step="0.01" value={formData.hourly_rate} onChange={e => setFormData({...formData, hourly_rate: parseFloat(e.target.value)})} /></div>
              <div className="space-y-2"><Label>Heures/semaine</Label><Input type="number" value={formData.weekly_hours} onChange={e => setFormData({...formData, weekly_hours: parseFloat(e.target.value)})} /></div>
            </div>
            <div className="space-y-2"><Label>Periode d'essai (jours)</Label><Input type="number" value={formData.trial_period_days} onChange={e => setFormData({...formData, trial_period_days: parseInt(e.target.value)})} /></div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Salaire mensuel brut estime:</p>
              <p className="text-xl font-bold">{(formData.hourly_rate * formData.weekly_hours * 4.33).toFixed(2)} EUR</p>
            </div>
            <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700">Creer le contrat</Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* DPAE Modal */}
      <Dialog open={dpaeModalOpen} onOpenChange={setDpaeModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-600" />
              Declaration Prealable a l'Embauche (DPAE)
            </DialogTitle>
            <DialogDescription>
              La DPAE doit etre effectuee au plus tot 8 jours avant l'embauche et au plus tard le jour de l'embauche avant la prise de fonction.
            </DialogDescription>
          </DialogHeader>

          {selectedContract && (
            <div className="space-y-4">
              {/* SIRET Status */}
              <div className={`p-4 rounded-lg border ${hotelSettings?.siret ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className={`w-5 h-5 ${hotelSettings?.siret ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <span className="font-semibold">{hotelSettings?.siret ? 'SIRET configure' : 'SIRET non configure'}</span>
                </div>
                {hotelSettings?.siret ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg">{hotelSettings.siret}</span>
                    <button onClick={() => handleCopyToClipboard(hotelSettings.siret, 'SIRET')} className="p-1 hover:bg-emerald-100 rounded">
                      <Copy className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-amber-700">
                    Configurez votre numero SIRET dans Configuration {'>'} Parametres Staff pour pre-remplir la DPAE.
                  </p>
                )}
              </div>

              {/* Employee Information */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-slate-800 mb-3">Informations du salarie</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Nom</Label>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{selectedContract.employee?.last_name || selectedContract.employee_name?.split(' ')[1] || '-'}</span>
                      <button onClick={() => handleCopyToClipboard(selectedContract.employee?.last_name || '', 'Nom')} className="p-1 hover:bg-slate-200 rounded">
                        <Copy className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Prenom</Label>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{selectedContract.employee?.first_name || selectedContract.employee_name?.split(' ')[0] || '-'}</span>
                      <button onClick={() => handleCopyToClipboard(selectedContract.employee?.first_name || '', 'Prenom')} className="p-1 hover:bg-slate-200 rounded">
                        <Copy className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Date de naissance</Label>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{selectedContract.employee?.date_of_birth ? format(parseISO(selectedContract.employee.date_of_birth), 'dd/MM/yyyy') : '-'}</span>
                      {selectedContract.employee?.date_of_birth && (
                        <button onClick={() => handleCopyToClipboard(format(parseISO(selectedContract.employee.date_of_birth), 'dd/MM/yyyy'), 'Date de naissance')} className="p-1 hover:bg-slate-200 rounded">
                          <Copy className="w-3 h-3 text-slate-400" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">N Securite Sociale</Label>
                    <div className="flex items-center gap-2">
                      <span className="font-medium font-mono">{selectedContract.employee?.social_security_number || '-'}</span>
                      {selectedContract.employee?.social_security_number && (
                        <button onClick={() => handleCopyToClipboard(selectedContract.employee.social_security_number, 'N SS')} className="p-1 hover:bg-slate-200 rounded">
                          <Copy className="w-3 h-3 text-slate-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Nationalite</Label>
                  <span className="font-medium">{selectedContract.employee?.nationality || 'Francaise'}</span>
                </div>
              </div>

              {/* Contract Information */}
              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-slate-800 mb-3">Informations du contrat</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Type de contrat</Label>
                    <div className="flex items-center gap-2">
                      <Badge className={getContractType(selectedContract.contract_type)?.color}>
                        {getContractType(selectedContract.contract_type)?.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Date d'embauche</Label>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{format(parseISO(selectedContract.start_date), 'dd/MM/yyyy')}</span>
                      <button onClick={() => handleCopyToClipboard(format(parseISO(selectedContract.start_date), 'dd/MM/yyyy'), 'Date embauche')} className="p-1 hover:bg-blue-100 rounded">
                        <Copy className="w-3 h-3 text-blue-400" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Heure d'embauche prevue</Label>
                    <span className="font-medium">09:00</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Duree du travail</Label>
                    <span className="font-medium">{selectedContract.weekly_hours || 35}h/semaine</span>
                  </div>
                </div>

                {selectedContract.end_date && (
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Date de fin (CDD)</Label>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{format(parseISO(selectedContract.end_date), 'dd/MM/yyyy')}</span>
                      <button onClick={() => handleCopyToClipboard(format(parseISO(selectedContract.end_date), 'dd/MM/yyyy'), 'Date fin')} className="p-1 hover:bg-blue-100 rounded">
                        <Copy className="w-3 h-3 text-blue-400" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Periode d'essai</Label>
                  <span className="font-medium">{selectedContract.trial_period_days || 60} jours</span>
                </div>
              </div>

              {/* Action Alert */}
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-violet-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-violet-800">Important</p>
                    <p className="text-violet-700 mt-1">
                      Vous devez effectuer la DPAE sur le portail officiel de l'URSSAF. 
                      Utilisez les boutons "Copier" pour transferer facilement les informations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setDpaeModalOpen(false)}>
              Fermer
            </Button>
            <Button onClick={handleOpenURSSAF} className="bg-blue-600 hover:bg-blue-700">
              <ExternalLink className="w-4 h-4 mr-2" />
              Acceder au portail URSSAF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
