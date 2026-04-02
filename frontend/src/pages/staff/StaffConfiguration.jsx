import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { 
  Building2, Clock, FileText, Users, FolderOpen, Settings, Plus, 
  Trash2, Edit, Check, X, Save, Upload, Mail, Bell, Briefcase
} from 'lucide-react'

const SECTIONS = [
  { id: 'departments', label: 'Services & Postes', icon: Building2 },
  { id: 'shifts', label: 'Horaires & Shifts', icon: Clock },
  { id: 'contracts', label: 'Contrats (Modeles)', icon: FileText },
  { id: 'roles', label: 'Utilisateurs & Roles', icon: Users },
  { id: 'documents', label: 'Documents RH', icon: FolderOpen },
  { id: 'settings', label: 'Parametres Staff', icon: Settings },
]

const PERMISSION_LABELS = {
  voir_planning: 'Voir planning',
  modifier_planning: 'Modifier planning',
  voir_personnel: 'Voir personnel',
  modifier_personnel: 'Modifier personnel',
  generer_contrats: 'Generer contrats',
  exporter_donnees: 'Exporter donnees',
  gerer_recrutement: 'Gerer recrutement',
  configuration: 'Configuration',
}

const CONTRACT_TYPES = [
  { value: 'cdi', label: 'CDI - Contrat à Durée Indéterminée' },
  { value: 'cdd', label: 'CDD - Contrat à Durée Déterminée' },
  { value: 'extra', label: 'Extra - Contrat Journalier' },
  { value: 'stage', label: 'Stage / Alternance' },
  { value: 'interim', label: 'Intérim' },
]

const CONTRACT_VARIABLES = [
  '{{NOM_EMPLOYE}}', '{{PRENOM_EMPLOYE}}', '{{DATE_NAISSANCE}}', '{{ADRESSE}}',
  '{{POSTE}}', '{{SERVICE}}', '{{DATE_DEBUT}}', '{{DATE_FIN}}', 
  '{{SALAIRE_BRUT}}', '{{HORAIRE_HEBDO}}', '{{NOM_HOTEL}}', '{{DATE_SIGNATURE}}'
]

export const StaffConfiguration = () => {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  const [activeSection, setActiveSection] = useState('departments')
  const [loading, setLoading] = useState(true)
  
  // Data states
  const [departments, setDepartments] = useState([])
  const [shiftTemplates, setShiftTemplates] = useState([])
  const [contractTemplates, setContractTemplates] = useState([])
  const [roles, setRoles] = useState([])
  const [hrDocuments, setHrDocuments] = useState([])
  const [settings, setSettings] = useState(null)
  
  // Modal states
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [showContractModal, setShowContractModal] = useState(false)
  const [selectedContract, setSelectedContract] = useState(null)
  const [deptForm, setDeptForm] = useState({ name: '', description: '', type: 'service', color: '#7c3aed', positions: [] })
  const [contractForm, setContractForm] = useState({ 
    name: '', description: '', contract_type: 'cdi', content: '', 
    variables: [], status: 'draft' 
  })
  const [newPositionInput, setNewPositionInput] = useState('')
  
  // Edit states
  const [editingDept, setEditingDept] = useState(null)
  const [editingShift, setEditingShift] = useState(null)
  const [editingContract, setEditingContract] = useState(null)
  const [newDeptName, setNewDeptName] = useState('')
  const [newPositionName, setNewPositionName] = useState('')
  const [addingPositionToDept, setAddingPositionToDept] = useState(null)
  const [newShift, setNewShift] = useState({ name: '', code: '', start_time: '09:00', end_time: '17:00', duration_hours: 8, overtime_rate: 0, color: '#3b82f6' })
  const [newDocName, setNewDocName] = useState('')
  const [newDocMandatory, setNewDocMandatory] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const fetchData = async () => {
    if (!currentHotel) return
    setLoading(true)
    try {
      const [deptRes, shiftRes, contractRes, roleRes, docRes, settingsRes] = await Promise.all([
        api.get(`/hotels/${currentHotel.id}/config/departments`),
        api.get(`/hotels/${currentHotel.id}/config/shifts`),
        api.get(`/hotels/${currentHotel.id}/config/contract-templates`),
        api.get(`/hotels/${currentHotel.id}/config/roles`),
        api.get(`/hotels/${currentHotel.id}/config/hr-documents`),
        api.get(`/hotels/${currentHotel.id}/config/settings`),
      ])
      setDepartments(deptRes.data)
      setShiftTemplates(shiftRes.data)
      setContractTemplates(contractRes.data)
      setRoles(roleRes.data)
      setHrDocuments(docRes.data)
      setSettings(settingsRes.data)
    } catch (error) {
      console.error('Error fetching config:', error)
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [currentHotel])

  // Department handlers
  const handleAddDepartment = async () => {
    if (!newDeptName.trim()) return
    try {
      await api.post(`/hotels/${currentHotel.id}/config/departments`, {
        name: newDeptName,
        code: newDeptName.substring(0, 4).toUpperCase(),
        color: '#7c3aed',
        positions: []
      })
      setNewDeptName('')
      fetchData()
      toast.success('Service ajoute')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  // Open modal to create new department with full form
  const handleOpenDeptModal = () => {
    setDeptForm({ name: '', description: '', type: 'service', color: '#7c3aed', positions: [] })
    setNewPositionInput('')
    setShowDeptModal(true)
  }

  const handleSaveDepartmentFull = async () => {
    if (!deptForm.name.trim()) {
      toast.error('Le nom du service est requis')
      return
    }
    try {
      await api.post(`/hotels/${currentHotel.id}/config/departments`, {
        name: deptForm.name,
        description: deptForm.description,
        code: deptForm.name.substring(0, 4).toUpperCase(),
        color: deptForm.color,
        type: deptForm.type,
        positions: deptForm.positions
      })
      setShowDeptModal(false)
      fetchData()
      toast.success('Service cree avec succes')
    } catch (error) {
      toast.error('Erreur lors de la creation')
    }
  }

  const handleAddPositionToForm = () => {
    if (!newPositionInput.trim()) return
    setDeptForm(prev => ({ ...prev, positions: [...prev.positions, newPositionInput] }))
    setNewPositionInput('')
  }

  const handleRemovePositionFromForm = (index) => {
    setDeptForm(prev => ({ ...prev, positions: prev.positions.filter((_, i) => i !== index) }))
  }

  // Contract Modal handlers
  const handleOpenContractModal = (contract = null) => {
    if (contract) {
      setSelectedContract(contract)
      setContractForm({
        name: contract.name,
        description: contract.description || '',
        contract_type: contract.contract_type,
        content: contract.content || '',
        variables: contract.variables || [],
        status: contract.status
      })
    } else {
      setSelectedContract(null)
      setContractForm({ 
        name: '', description: '', contract_type: 'cdi', content: '', 
        variables: [], status: 'draft' 
      })
    }
    setShowContractModal(true)
  }

  const handleSaveContractFull = async () => {
    if (!contractForm.name.trim()) {
      toast.error('Le nom du modele est requis')
      return
    }
    try {
      if (selectedContract) {
        await api.put(`/hotels/${currentHotel.id}/config/contract-templates/${selectedContract.id}`, contractForm)
        toast.success('Modele mis a jour')
      } else {
        await api.post(`/hotels/${currentHotel.id}/config/contract-templates`, contractForm)
        toast.success('Modele cree avec succes')
      }
      setShowContractModal(false)
      fetchData()
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const insertVariable = (variable) => {
    setContractForm(prev => ({ ...prev, content: prev.content + ' ' + variable }))
  }

  const handleDeleteDepartment = async (id) => {
    if (!confirm('Supprimer ce service ?')) return
    try {
      await api.delete(`/hotels/${currentHotel.id}/config/departments/${id}`)
      fetchData()
      toast.success('Service supprime')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  // Add position to department
  const handleAddPosition = async (deptId) => {
    if (!newPositionName.trim()) return
    try {
      const dept = departments.find(d => d.id === deptId)
      await api.put(`/hotels/${currentHotel.id}/config/departments/${deptId}`, {
        ...dept,
        positions: [...(dept.positions || []), newPositionName]
      })
      setNewPositionName('')
      setAddingPositionToDept(null)
      fetchData()
      toast.success('Poste ajoute')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  // Delete position from department
  const handleDeletePosition = async (deptId, positionIndex) => {
    try {
      const dept = departments.find(d => d.id === deptId)
      const newPositions = dept.positions.filter((_, i) => i !== positionIndex)
      await api.put(`/hotels/${currentHotel.id}/config/departments/${deptId}`, {
        ...dept,
        positions: newPositions
      })
      fetchData()
      toast.success('Poste supprime')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  // Shift handlers
  const handleAddShift = async () => {
    if (!newShift.name || !newShift.code) return
    try {
      await api.post(`/hotels/${currentHotel.id}/config/shifts`, newShift)
      setNewShift({ name: '', code: '', start_time: '09:00', end_time: '17:00', duration_hours: 8, overtime_rate: 0, color: '#3b82f6' })
      fetchData()
      toast.success('Shift ajoute')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handleDeleteShift = async (id) => {
    if (!confirm('Supprimer ce shift ?')) return
    try {
      await api.delete(`/hotels/${currentHotel.id}/config/shifts/${id}`)
      fetchData()
      toast.success('Shift supprime')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  // Contract template handlers
  const handleToggleContractStatus = async (template) => {
    try {
      await api.put(`/hotels/${currentHotel.id}/config/contract-templates/${template.id}`, {
        ...template,
        status: template.status === 'active' ? 'draft' : 'active'
      })
      fetchData()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handleEditContract = (template) => {
    setEditingContract(template)
    toast.info(`Edition du modele "${template.name}" - Fonctionnalite en cours de developpement`)
  }

  const handleSaveContract = async () => {
    if (!editingContract) return
    try {
      await api.put(`/hotels/${currentHotel.id}/config/contract-templates/${editingContract.id}`, editingContract)
      setEditingContract(null)
      fetchData()
      toast.success('Modele sauvegarde')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  // Logo upload handler
  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez selectionner une image')
      return
    }
    
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await api.post(`/hotels/${currentHotel.id}/config/upload-logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setSettings(prev => ({ ...prev, logo_url: response.data.url }))
      toast.success('Logo mis a jour')
    } catch (error) {
      // Fallback: utiliser un URL local temporaire
      const reader = new FileReader()
      reader.onload = (e) => {
        setSettings(prev => ({ ...prev, logo_url: e.target.result }))
        toast.success('Logo mis a jour (local)')
      }
      reader.readAsDataURL(file)
    } finally {
      setUploadingLogo(false)
    }
  }

  // Role permission handlers
  const handleTogglePermission = async (role, permission) => {
    if (role.is_system && role.name === 'Administrateur') return
    try {
      const newPermissions = { ...role.permissions, [permission]: !role.permissions[permission] }
      await api.put(`/hotels/${currentHotel.id}/config/roles/${role.id}`, {
        name: role.name,
        permissions: newPermissions
      })
      fetchData()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  // HR Document handlers
  const handleAddDocument = async () => {
    if (!newDocName.trim()) return
    try {
      await api.post(`/hotels/${currentHotel.id}/config/hr-documents`, {
        name: newDocName,
        is_mandatory: newDocMandatory,
        requires_ocr: false
      })
      setNewDocName('')
      setNewDocMandatory(true)
      fetchData()
      toast.success('Document ajoute')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handleDeleteDocument = async (id) => {
    try {
      await api.delete(`/hotels/${currentHotel.id}/config/hr-documents/${id}`)
      fetchData()
      toast.success('Document supprime')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  // Settings handlers
  const handleAddEmail = () => {
    if (!newEmail.trim() || !newEmail.includes('@')) return
    setSettings(prev => ({
      ...prev,
      reporting_emails: [...(prev.reporting_emails || []), newEmail]
    }))
    setNewEmail('')
  }

  const handleRemoveEmail = (email) => {
    setSettings(prev => ({
      ...prev,
      reporting_emails: prev.reporting_emails.filter(e => e !== email)
    }))
  }

  const handleSaveSettings = async () => {
    try {
      await api.put(`/hotels/${currentHotel.id}/config/settings`, settings)
      toast.success('Parametres sauvegardes')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full spinner" />
      </div>
    )
  }

  return (
    <div className="h-full flex gap-4">
      {/* Sidebar */}
      <div className="w-64 bg-white rounded-xl border border-slate-200 p-4 shrink-0">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Sections</h2>
        <nav className="space-y-1">
          {SECTIONS.map(section => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-violet-50 text-violet-700' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {section.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 p-6 overflow-auto">
        {/* Services & Postes */}
        {activeSection === 'departments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Services & Postes</h2>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Nouveau service..."
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-48"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()}
                />
                <Button onClick={handleAddDepartment} variant="outline" className="gap-1">
                  <Plus className="w-4 h-4" /> Rapide
                </Button>
                <Button onClick={handleOpenDeptModal} className="bg-violet-600 hover:bg-violet-700 gap-1">
                  <Plus className="w-4 h-4" /> Ajouter
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map(dept => (
                <div key={dept.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                      <h3 className="font-semibold text-slate-800">{dept.name}</h3>
                    </div>
                    <button onClick={() => handleDeleteDepartment(dept.id)} className="p-1 hover:bg-red-50 rounded text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {dept.positions.map((pos, i) => (
                      <div key={i} className="flex items-center justify-between text-sm text-slate-600 pl-2 border-l-2 border-slate-200 group">
                        <span>{pos}</span>
                        <button 
                          onClick={() => handleDeletePosition(dept.id, i)}
                          className="p-0.5 hover:bg-red-50 rounded text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {addingPositionToDept === dept.id ? (
                      <div className="flex items-center gap-1 mt-2">
                        <Input
                          value={newPositionName}
                          onChange={(e) => setNewPositionName(e.target.value)}
                          placeholder="Nom du poste..."
                          className="h-7 text-xs"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleAddPosition(dept.id)}
                        />
                        <button onClick={() => handleAddPosition(dept.id)} className="p-1 hover:bg-emerald-50 rounded text-emerald-600">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setAddingPositionToDept(null); setNewPositionName('') }} className="p-1 hover:bg-red-50 rounded text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setAddingPositionToDept(dept.id)}
                        className="text-xs text-violet-600 hover:underline mt-2"
                      >
                        + Ajouter poste
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Horaires & Shifts */}
        {activeSection === 'shifts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Horaires & Shifts</h2>
              <Button onClick={() => setEditingShift({})} className="bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4 mr-1" /> Nouveau shift
              </Button>
            </div>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Shift</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Code</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Debut</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Fin</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Duree</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Majoration</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Couleur</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shiftTemplates.map(shift => (
                    <tr key={shift.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{shift.name}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-mono">{shift.code}</span>
                      </td>
                      <td className="p-3 text-slate-600">{shift.start_time}</td>
                      <td className="p-3 text-slate-600">{shift.end_time}</td>
                      <td className="p-3 text-slate-600">{shift.duration_hours}h</td>
                      <td className="p-3">
                        <span className={`text-sm ${shift.overtime_rate > 0 ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                          {shift.overtime_rate > 0 ? `+${shift.overtime_rate}%` : '-'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="w-6 h-6 rounded" style={{ backgroundColor: shift.color }} />
                      </td>
                      <td className="p-3">
                        <button onClick={() => handleDeleteShift(shift.id)} className="p-1 hover:bg-red-50 rounded text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Shift Form */}
            {editingShift !== null && (
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <h3 className="font-semibold text-slate-800 mb-4">Nouveau shift</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs">Nom</Label>
                    <Input value={newShift.name} onChange={e => setNewShift({...newShift, name: e.target.value})} />
                  </div>
                  <div>
                    <Label className="text-xs">Code</Label>
                    <Input value={newShift.code} onChange={e => setNewShift({...newShift, code: e.target.value})} maxLength={3} />
                  </div>
                  <div>
                    <Label className="text-xs">Debut</Label>
                    <Input type="time" value={newShift.start_time} onChange={e => setNewShift({...newShift, start_time: e.target.value})} />
                  </div>
                  <div>
                    <Label className="text-xs">Fin</Label>
                    <Input type="time" value={newShift.end_time} onChange={e => setNewShift({...newShift, end_time: e.target.value})} />
                  </div>
                  <div>
                    <Label className="text-xs">Duree (h)</Label>
                    <Input type="number" value={newShift.duration_hours} onChange={e => setNewShift({...newShift, duration_hours: parseFloat(e.target.value)})} />
                  </div>
                  <div>
                    <Label className="text-xs">Majoration %</Label>
                    <Input type="number" value={newShift.overtime_rate} onChange={e => setNewShift({...newShift, overtime_rate: parseFloat(e.target.value)})} />
                  </div>
                  <div>
                    <Label className="text-xs">Couleur</Label>
                    <Input type="color" value={newShift.color} onChange={e => setNewShift({...newShift, color: e.target.value})} className="h-9" />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button onClick={handleAddShift} className="bg-violet-600 hover:bg-violet-700">Ajouter</Button>
                    <Button variant="outline" onClick={() => setEditingShift(null)}>Annuler</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contrats (Modeles) */}
        {activeSection === 'contracts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Modeles de Contrats</h2>
                <p className="text-sm text-slate-500">Editeur de blocs pour personnaliser vos modeles</p>
              </div>
              <Button onClick={() => handleOpenContractModal()} className="bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4 mr-1" /> Nouveau modele
              </Button>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {contractTemplates.map(template => (
                <div key={template.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-800">{template.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{template.description}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      template.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {template.status === 'active' ? 'Actif' : 'Brouillon'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded badge-${template.contract_type}`}>
                      {template.contract_type.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleOpenContractModal(template)}
                        className="p-1.5 hover:bg-violet-50 rounded text-violet-600"
                        title="Modifier le modele"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleToggleContractStatus(template)}
                        className={`p-1.5 rounded ${template.status === 'active' ? 'hover:bg-amber-50 text-amber-500' : 'hover:bg-emerald-50 text-emerald-500'}`}
                        title={template.status === 'active' ? 'Desactiver' : 'Activer'}
                      >
                        {template.status === 'active' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Utilisateurs & Roles */}
        {activeSection === 'roles' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">Utilisateurs & Roles</h2>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase w-40">Permission</th>
                    {roles.map(role => (
                      <th key={role.id} className="p-3 text-xs font-semibold text-slate-600 text-center" style={{ width: `${100 / (roles.length + 1)}%` }}>
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.keys(PERMISSION_LABELS).map(perm => (
                    <tr key={perm} className="hover:bg-slate-50">
                      <td className="p-3 text-sm text-slate-700">{PERMISSION_LABELS[perm]}</td>
                      {roles.map(role => (
                        <td key={role.id} className="p-3">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleTogglePermission(role, perm)}
                              disabled={role.name === 'Administrateur'}
                              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                                role.permissions[perm]
                                  ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                                  : 'border-slate-300 hover:border-violet-400 bg-white'
                              } ${role.name === 'Administrateur' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {role.permissions[perm] && <Check className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Documents RH */}
        {activeSection === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Documents RH</h2>
            </div>
            
            <div className="space-y-2">
              {hrDocuments.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{doc.name}</span>
                    {doc.is_mandatory && (
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">Obligatoire</span>
                    )}
                    {doc.requires_ocr && (
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">OCR</span>
                    )}
                  </div>
                  <button onClick={() => handleDeleteDocument(doc.id)} className="p-1 hover:bg-red-50 rounded text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 p-4 border border-dashed border-slate-300 rounded-lg bg-slate-50">
              <Input
                placeholder="Nom du document..."
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                className="flex-1"
              />
              <div className="flex items-center gap-2">
                <Switch checked={newDocMandatory} onCheckedChange={setNewDocMandatory} />
                <span className="text-sm text-slate-600">Obligatoire</span>
              </div>
              <Button onClick={handleAddDocument} variant="outline">
                <Plus className="w-4 h-4 mr-1" /> Ajouter
              </Button>
            </div>
          </div>
        )}

        {/* Parametres Staff */}
        {activeSection === 'settings' && settings && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">Parametres Staff</h2>
            
            {/* Logo */}
            <div className="border border-slate-200 rounded-xl p-4">
              <h3 className="font-medium text-slate-800 mb-3">Logo de l'etablissement</h3>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                  {settings.logo_url ? (
                    <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Upload className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('logo-upload').click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <>
                        <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mr-2" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Changer le logo
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG ou SVG (max 2MB)</p>
                </div>
              </div>
            </div>

            {/* Reporting Emails */}
            <div className="border border-slate-200 rounded-xl p-4">
              <h3 className="font-medium text-slate-800 mb-3">Destinataires des rapports</h3>
              <div className="space-y-2 mb-3">
                {(settings.reporting_emails || []).map((email, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{email}</span>
                    </div>
                    <button onClick={() => handleRemoveEmail(email)} className="p-1 hover:bg-red-50 rounded text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="email@exemple.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleAddEmail}>
                  <Plus className="w-4 h-4 mr-1" /> Ajouter
                </Button>
              </div>
            </div>

            {/* Options generales */}
            <div className="border border-slate-200 rounded-xl p-4">
              <h3 className="font-medium text-slate-800 mb-4">Options generales</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Notifications push planning</p>
                      <p className="text-xs text-slate-500">Alertes lors des modifications du planning</p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.notifications_enabled} 
                    onCheckedChange={(v) => setSettings({...settings, notifications_enabled: v})} 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Envoi automatique reporting</p>
                      <p className="text-xs text-slate-500">Rapport mensuel envoye le 1er du mois</p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.auto_reporting_enabled} 
                    onCheckedChange={(v) => setSettings({...settings, auto_reporting_enabled: v})} 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Signature electronique DocuSign</p>
                      <p className="text-xs text-slate-500">Signature des contrats en ligne</p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.docusign_enabled} 
                    onCheckedChange={(v) => setSettings({...settings, docusign_enabled: v})} 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Export automatique paie</p>
                      <p className="text-xs text-slate-500">Integration logiciel de paie</p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings.auto_payroll_export} 
                    onCheckedChange={(v) => setSettings({...settings, auto_payroll_export: v})} 
                  />
                </div>
              </div>
            </div>

            {/* CP Settings */}
            <div className="border border-slate-200 rounded-xl p-4">
              <h3 className="font-medium text-slate-800 mb-4">Parametres Conges Payes</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Date de bascule CP (N vers N-1)</Label>
                  <Input 
                    value={settings.cp_rollover_date} 
                    onChange={(e) => setSettings({...settings, cp_rollover_date: e.target.value})}
                    placeholder="06-01"
                  />
                  <p className="text-xs text-slate-500 mt-1">Format: MM-JJ (ex: 06-01 pour 1er juin)</p>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch 
                    checked={settings.cp_allow_early_use} 
                    onCheckedChange={(v) => setSettings({...settings, cp_allow_early_use: v})} 
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Utilisation anticipee CP</p>
                    <p className="text-xs text-slate-500">Autoriser l'utilisation des CP avant bascule</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} className="bg-violet-600 hover:bg-violet-700">
                <Save className="w-4 h-4 mr-2" /> Sauvegarder les parametres
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Nouveau Service/Poste */}
      <Dialog open={showDeptModal} onOpenChange={setShowDeptModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-violet-600" />
              Nouveau Service
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nom du service *</Label>
              <Input 
                value={deptForm.name} 
                onChange={e => setDeptForm({...deptForm, name: e.target.value})}
                placeholder="Ex: Réception, Cuisine, Étages..."
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea 
                value={deptForm.description} 
                onChange={e => setDeptForm({...deptForm, description: e.target.value})}
                placeholder="Description du service..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={deptForm.type} onValueChange={v => setDeptForm({...deptForm, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="department">Département</SelectItem>
                    <SelectItem value="unit">Unité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Couleur</Label>
                <Input 
                  type="color" 
                  value={deptForm.color} 
                  onChange={e => setDeptForm({...deptForm, color: e.target.value})}
                  className="h-10"
                />
              </div>
            </div>
            <div>
              <Label>Postes</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {deptForm.positions.map((pos, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-700 rounded text-xs">
                    {pos}
                    <button onClick={() => handleRemovePositionFromForm(i)} className="hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  value={newPositionInput} 
                  onChange={e => setNewPositionInput(e.target.value)}
                  placeholder="Nom du poste..."
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddPositionToForm())}
                />
                <Button type="button" variant="outline" onClick={handleAddPositionToForm}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeptModal(false)}>Annuler</Button>
            <Button onClick={handleSaveDepartmentFull} className="bg-violet-600 hover:bg-violet-700">
              Créer le service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Nouveau/Modifier Modèle de Contrat */}
      <Dialog open={showContractModal} onOpenChange={setShowContractModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-600" />
              {selectedContract ? 'Modifier le modèle' : 'Nouveau modèle de contrat'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom du modèle *</Label>
                <Input 
                  value={contractForm.name} 
                  onChange={e => setContractForm({...contractForm, name: e.target.value})}
                  placeholder="Ex: CDI - Temps plein"
                />
              </div>
              <div>
                <Label>Type de contrat</Label>
                <Select value={contractForm.contract_type} onValueChange={v => setContractForm({...contractForm, contract_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map(ct => (
                      <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input 
                value={contractForm.description} 
                onChange={e => setContractForm({...contractForm, description: e.target.value})}
                placeholder="Description courte du modèle..."
              />
            </div>
            <div>
              <Label>Variables dynamiques</Label>
              <div className="flex flex-wrap gap-1 p-2 bg-slate-50 rounded-lg border">
                {CONTRACT_VARIABLES.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="px-2 py-1 text-xs bg-violet-100 text-violet-700 rounded hover:bg-violet-200 transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">Cliquez sur une variable pour l'insérer dans le contenu</p>
            </div>
            <div>
              <Label>Contenu du contrat</Label>
              <Textarea 
                value={contractForm.content} 
                onChange={e => setContractForm({...contractForm, content: e.target.value})}
                placeholder="Entre les soussignés:&#10;&#10;La société {{NOM_HOTEL}}, représentée par...&#10;&#10;Et&#10;&#10;{{PRENOM_EMPLOYE}} {{NOM_EMPLOYE}}, né(e) le {{DATE_NAISSANCE}}..."
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={contractForm.status} onValueChange={v => setContractForm({...contractForm, status: v})}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContractModal(false)}>Annuler</Button>
            <Button onClick={handleSaveContractFull} className="bg-violet-600 hover:bg-violet-700">
              {selectedContract ? 'Mettre à jour' : 'Créer le modèle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
