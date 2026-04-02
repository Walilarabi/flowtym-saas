import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, Search, UserPlus, Mail, Phone, Building2, Calendar, MoreHorizontal, 
  Edit, Trash2, FileText, List, LayoutGrid, X, User, Clock, 
  CreditCard, MapPin, AlertCircle, Download, Copy, BarChart3, Palmtree
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AddEmployeeWizard } from '@/components/staff/AddEmployeeWizard'

const POSITIONS = [
  { value: 'receptionist', label: 'Receptionniste' },
  { value: 'housekeeper', label: 'Femme de chambre' },
  { value: 'maintenance', label: 'Technicien maintenance' },
  { value: 'manager', label: 'Manager' },
  { value: 'chef', label: 'Chef cuisinier' },
  { value: 'waiter', label: 'Serveur' },
  { value: 'concierge', label: 'Concierge' },
  { value: 'night_auditor', label: 'Night auditor' },
]

const DEPARTMENTS = [
  { value: 'front_office', label: 'Reception' },
  { value: 'housekeeping', label: 'Hebergement' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'food_beverage', label: 'Restauration' },
  { value: 'administration', label: 'Administration' },
]

const CONTRACT_TYPES = [
  { value: 'cdi', label: 'CDI', color: 'badge-cdi' },
  { value: 'cdd', label: 'CDD', color: 'badge-cdd' },
  { value: 'extra', label: 'Extra', color: 'badge-extra' },
  { value: 'interim', label: 'Interim', color: 'badge-interim' },
  { value: 'stage', label: 'Stage', color: 'badge-stage' },
  { value: 'apprentissage', label: 'Apprentissage', color: 'badge-apprentissage' },
]

// Employee Detail Modal Component
const EmployeeDetailModal = ({ employee, onClose, onEdit, leaveBalance }) => {
  if (!employee) return null

  const contractType = CONTRACT_TYPES.find(c => c.value === employee.contract_type)
  const position = POSITIONS.find(p => p.value === employee.position)
  const department = DEPARTMENTS.find(d => d.value === employee.department)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header relative">
          <button onClick={onClose} className="absolute right-4 top-4 p-1 hover:bg-white/20 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {employee.first_name?.charAt(0)}{employee.last_name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold">{employee.first_name} {employee.last_name}</h2>
              <p className="text-violet-200">{position?.label || employee.position}</p>
              <p className="text-violet-200/80 text-sm">{department?.label || employee.department}</p>
            </div>
          </div>
          <div className="mt-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${employee.is_active ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${employee.is_active ? 'bg-white' : 'bg-slate-200'}`} />
              {employee.is_active ? 'Actif' : 'Inactif'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Contact Section */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Contact</h3>
            <div className="space-y-2">
              {employee.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{employee.phone}</span>
                </div>
              )}
              {employee.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{employee.email}</span>
                </div>
              )}
              {employee.address && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{employee.address}, {employee.postal_code} {employee.city}</span>
                </div>
              )}
            </div>
          </div>

          {/* HR Info Section */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Informations RH</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Contrat</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${contractType?.color || 'badge-cdi'}`}>
                  {contractType?.label || employee.contract_type}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500">Heures/semaine</p>
                <p className="text-sm font-medium">{employee.weekly_hours}h</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Date embauche</p>
                <p className="text-sm font-medium">{format(new Date(employee.hire_date), 'dd/MM/yyyy')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Taux horaire</p>
                <p className="text-sm font-medium">{employee.hourly_rate?.toFixed(2)} EUR</p>
              </div>
              {leaveBalance && (
                <>
                  <div>
                    <p className="text-xs text-slate-500">CP disponibles</p>
                    <p className="text-sm font-medium text-emerald-600">{leaveBalance.cp_total_disponible?.toFixed(1)} jours</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">CP pris</p>
                    <p className="text-sm font-medium">{leaveBalance.cp_pris?.toFixed(1)} jours</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Documents Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Documents</h3>
              <Button variant="ghost" size="sm" className="text-xs text-violet-600 h-7">
                <Plus className="w-3 h-3 mr-1" /> Ajouter
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">Carte Nationale d'Identite</span>
                </div>
                <span className="text-xs text-emerald-600 font-medium">OK</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">Carte Vitale</span>
                </div>
                <span className="text-xs text-emerald-600 font-medium">OK</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">RIB</span>
                </div>
                <span className="text-xs text-amber-600 font-medium">Manquant</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-200 p-4 flex gap-2">
          <Button variant="outline" className="flex-1 text-sm" onClick={() => onEdit(employee)}>
            <Edit className="w-4 h-4 mr-2" /> Modifier
          </Button>
          <Button variant="outline" className="flex-1 text-sm">
            <FileText className="w-4 h-4 mr-2" /> Contrat
          </Button>
          <Button variant="outline" className="flex-1 text-sm">
            <BarChart3 className="w-4 h-4 mr-2" /> Statistiques
          </Button>
          <Button variant="outline" size="icon" className="text-sm">
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Employee Card Component (Trombinoscope view)
const EmployeeCard = ({ employee, onClick }) => {
  const contractType = CONTRACT_TYPES.find(c => c.value === employee.contract_type)
  const position = POSITIONS.find(p => p.value === employee.position)
  const department = DEPARTMENTS.find(d => d.value === employee.department)

  return (
    <div 
      className="employee-card"
      onClick={() => onClick(employee)}
      data-testid={`employee-card-${employee.id}`}
    >
      <div className="flex flex-col items-center text-center">
        <div className="employee-avatar mb-3">
          {employee.first_name?.charAt(0)}{employee.last_name?.charAt(0)}
        </div>
        <h3 className="font-semibold text-slate-800">{employee.first_name} {employee.last_name}</h3>
        <p className="text-sm text-slate-500 mt-0.5">{position?.label || employee.position}</p>
        <p className="text-xs text-slate-400 mt-0.5">{department?.label || employee.department}</p>
        <div className="flex items-center gap-2 mt-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${contractType?.color || 'badge-cdi'}`}>
            {contractType?.label || employee.contract_type}
          </span>
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${employee.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${employee.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            {employee.is_active ? 'Actif' : 'Inactif'}
          </span>
        </div>
      </div>
    </div>
  )
}

export const StaffEmployees = () => {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  const [employees, setEmployees] = useState([])
  const [leaveBalances, setLeaveBalances] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'trombinoscope'
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [contractFilter, setContractFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', position: 'receptionist',
    department: 'front_office', contract_type: 'cdi', hire_date: format(new Date(), 'yyyy-MM-dd'),
    hourly_rate: 11.65, weekly_hours: 35, address: '', city: '', postal_code: '',
    social_security_number: '', bank_iban: '', emergency_contact: '', emergency_phone: '', notes: ''
  })

  const fetchData = async () => {
    if (!currentHotel) return
    setLoading(true)
    try {
      const [empRes, balanceRes] = await Promise.all([
        api.get(`/hotels/${currentHotel.id}/staff/employees`),
        api.get(`/hotels/${currentHotel.id}/leave/balances`)
      ])
      setEmployees(empRes.data)
      setLeaveBalances(balanceRes.data)
    } catch (error) {
      toast.error('Erreur lors du chargement des employes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [currentHotel])

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchesSearch = search === '' || 
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        e.email?.toLowerCase().includes(search.toLowerCase())
      const matchesDepartment = departmentFilter === 'all' || e.department === departmentFilter
      const matchesContract = contractFilter === 'all' || e.contract_type === contractFilter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && e.is_active) || 
        (statusFilter === 'inactive' && !e.is_active)
      return matchesSearch && matchesDepartment && matchesContract && matchesStatus
    })
  }, [employees, search, departmentFilter, contractFilter, statusFilter])

  const getLeaveBalance = (employeeId) => {
    return leaveBalances.find(b => b.employee_id === employeeId)
  }

  const handleNewEmployee = () => {
    setWizardOpen(true)
  }

  const handleWizardSuccess = (newEmployee) => {
    fetchData()
  }

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(null)
    setEditingEmployee(employee)
    setFormData({
      first_name: employee.first_name, last_name: employee.last_name, email: employee.email || '',
      phone: employee.phone || '', position: employee.position, department: employee.department,
      contract_type: employee.contract_type, hire_date: employee.hire_date,
      hourly_rate: employee.hourly_rate, weekly_hours: employee.weekly_hours,
      address: employee.address || '', city: employee.city || '', postal_code: employee.postal_code || '',
      social_security_number: employee.social_security_number || '', bank_iban: employee.bank_iban || '',
      emergency_contact: employee.emergency_contact || '', emergency_phone: employee.emergency_phone || '',
      notes: employee.notes || ''
    })
    setSheetOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingEmployee) {
        await api.put(`/hotels/${currentHotel.id}/staff/employees/${editingEmployee.id}`, formData)
        toast.success('Employe mis a jour')
      } else {
        await api.post(`/hotels/${currentHotel.id}/staff/employees`, formData)
        toast.success('Employe cree')
      }
      setSheetOpen(false)
      fetchData()
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  const handleDelete = async (employee) => {
    if (!confirm(`Desactiver ${employee.first_name} ${employee.last_name} ?`)) return
    try {
      await api.delete(`/hotels/${currentHotel.id}/staff/employees/${employee.id}`)
      toast.success('Employe desactive')
      fetchData()
    } catch (error) {
      toast.error('Erreur lors de la desactivation')
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left: Title and Count */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Personnel</h1>
              <p className="text-sm text-slate-500">{filteredEmployees.length} collaborateurs</p>
            </div>
          </div>

          {/* Center: View Toggle & Search & Filters */}
          <div className="flex items-center gap-2 flex-1 justify-center max-w-2xl">
            {/* View Toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={`h-8 gap-1.5 ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <List className="w-4 h-4" />
                Liste
              </Button>
              <Button
                variant={viewMode === 'trombinoscope' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('trombinoscope')}
                className={`h-8 gap-1.5 ${viewMode === 'trombinoscope' ? 'bg-white shadow-sm' : ''}`}
              >
                <LayoutGrid className="w-4 h-4" />
                Trombinoscope
              </Button>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Filters */}
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={contractFilter} onValueChange={setContractFilter}>
              <SelectTrigger className="w-28 h-9">
                <SelectValue placeholder="Contrat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {CONTRACT_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28 h-9">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="inactive">Inactif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Right: Add Button */}
          <Button className="bg-violet-600 hover:bg-violet-700" onClick={handleNewEmployee} data-testid="btn-new-employee">
            <UserPlus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full spinner" />
            <span className="text-sm text-slate-500">Chargement...</span>
          </div>
        </div>
      ) : viewMode === 'trombinoscope' ? (
        /* Trombinoscope View */
        <div className="flex-1 overflow-auto">
          {filteredEmployees.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              Aucun collaborateur trouve
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredEmployees.map(employee => (
                <EmployeeCard key={employee.id} employee={employee} onClick={setSelectedEmployee} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto h-full">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Collaborateur</th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Service</th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Poste</th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Contrat</th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Temps</th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Telephone</th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Statut</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">Aucun collaborateur trouve</td>
                  </tr>
                ) : filteredEmployees.map(employee => {
                  const contractType = CONTRACT_TYPES.find(c => c.value === employee.contract_type)
                  const position = POSITIONS.find(p => p.value === employee.position)
                  const department = DEPARTMENTS.find(d => d.value === employee.department)
                  
                  return (
                    <tr 
                      key={employee.id} 
                      className="table-row-hover cursor-pointer"
                      onClick={() => setSelectedEmployee(employee)}
                      data-testid={`employee-row-${employee.id}`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="employee-avatar-sm">
                            {employee.first_name?.charAt(0)}{employee.last_name?.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-800">{employee.first_name} {employee.last_name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-slate-600">{department?.label || employee.department}</td>
                      <td className="p-3 text-sm text-slate-600">{position?.label || employee.position}</td>
                      <td className="p-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${contractType?.color || 'badge-cdi'}`}>
                          {contractType?.label || employee.contract_type}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-slate-600">{employee.weekly_hours}h/sem</td>
                      <td className="p-3 text-sm text-slate-600">{employee.phone || '-'}</td>
                      <td className="p-3 text-sm text-slate-600">{employee.email || '-'}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${employee.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <span className={`w-2 h-2 rounded-full ${employee.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          {employee.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditEmployee(employee); }}>
                              <Edit className="w-4 h-4 mr-2" />Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={e => e.stopPropagation()}>
                              <FileText className="w-4 h-4 mr-2" />Voir contrat
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete(employee); }}>
                              <Trash2 className="w-4 h-4 mr-2" />Desactiver
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
      )}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <EmployeeDetailModal 
          employee={selectedEmployee}
          leaveBalance={getLeaveBalance(selectedEmployee.id)}
          onClose={() => setSelectedEmployee(null)}
          onEdit={handleEditEmployee}
        />
      )}

      {/* Add Employee Wizard */}
      <AddEmployeeWizard 
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={handleWizardSuccess}
      />

      {/* Add/Edit Sheet (for edit only) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          <SheetHeader><SheetTitle>{editingEmployee ? 'Modifier le collaborateur' : 'Ajouter un collaborateur'}</SheetTitle></SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Prenom *</Label><Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required /></div>
              <div className="space-y-2"><Label>Nom *</Label><Input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
              <div className="space-y-2"><Label>Telephone</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Poste *</Label>
                <Select value={formData.position} onValueChange={v => setFormData({...formData, position: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Service *</Label>
                <Select value={formData.department} onValueChange={v => setFormData({...formData, department: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Type contrat *</Label>
                <Select value={formData.contract_type} onValueChange={v => setFormData({...formData, contract_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTRACT_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Date embauche *</Label><Input type="date" value={formData.hire_date} onChange={e => setFormData({...formData, hire_date: e.target.value})} required /></div>
              <div className="space-y-2"><Label>Heures/semaine</Label><Input type="number" value={formData.weekly_hours} onChange={e => setFormData({...formData, weekly_hours: parseFloat(e.target.value)})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Taux horaire (EUR)</Label><Input type="number" step="0.01" value={formData.hourly_rate} onChange={e => setFormData({...formData, hourly_rate: parseFloat(e.target.value)})} /></div>
              <div className="space-y-2"><Label>N Securite sociale</Label><Input value={formData.social_security_number} onChange={e => setFormData({...formData, social_security_number: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Adresse</Label><Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Ville</Label><Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} /></div>
              <div className="space-y-2"><Label>Code postal</Label><Input value={formData.postal_code} onChange={e => setFormData({...formData, postal_code: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>IBAN</Label><Input value={formData.bank_iban} onChange={e => setFormData({...formData, bank_iban: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Contact urgence</Label><Input value={formData.emergency_contact} onChange={e => setFormData({...formData, emergency_contact: e.target.value})} /></div>
              <div className="space-y-2"><Label>Tel. urgence</Label><Input value={formData.emergency_phone} onChange={e => setFormData({...formData, emergency_phone: e.target.value})} /></div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Annuler</Button>
              <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700">{editingEmployee ? 'Mettre a jour' : 'Creer'}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
