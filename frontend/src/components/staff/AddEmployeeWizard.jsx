import { useState, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  X, User, Briefcase, FileText, Check, ChevronRight, ChevronLeft, 
  Upload, Camera, Trash2, AlertCircle, CheckCircle2
} from 'lucide-react'

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
  { value: 'cdi', label: 'CDI - Contrat a Duree Indeterminee' },
  { value: 'cdd', label: 'CDD - Contrat a Duree Determinee' },
  { value: 'extra', label: 'Extra' },
  { value: 'interim', label: 'Interim' },
  { value: 'stage', label: 'Stage' },
  { value: 'apprentissage', label: 'Apprentissage' },
]

const REQUIRED_DOCUMENTS = [
  { id: 'cni', name: 'Carte Nationale d\'Identite', required: true },
  { id: 'carte_vitale', name: 'Carte Vitale', required: true },
  { id: 'rib', name: 'RIB (Releve d\'Identite Bancaire)', required: true },
  { id: 'photo', name: 'Photo d\'identite', required: false },
  { id: 'diplome', name: 'Diplome(s)', required: false },
  { id: 'attestation_securite_sociale', name: 'Attestation Securite Sociale', required: true },
  { id: 'permis_travail', name: 'Permis de travail (si applicable)', required: false },
]

const STEPS = [
  { id: 1, title: 'Informations personnelles', icon: User },
  { id: 2, title: 'Informations professionnelles', icon: Briefcase },
  { id: 3, title: 'Documents obligatoires', icon: FileText },
]

export const AddEmployeeWizard = ({ isOpen, onClose, onSuccess }) => {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [currentDocId, setCurrentDocId] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  // Form data for all steps
  const [formData, setFormData] = useState({
    // Step 1: Personal Info
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    date_of_birth: '',
    nationality: 'Francaise',
    social_security_number: '',
    emergency_contact: '',
    emergency_phone: '',
    
    // Step 2: Professional Info
    position: 'receptionist',
    department: 'front_office',
    contract_type: 'cdi',
    hire_date: format(new Date(), 'yyyy-MM-dd'),
    contract_end_date: '',
    weekly_hours: 35,
    hourly_rate: 11.65,
    monthly_salary: 0,
    bank_iban: '',
    bank_bic: '',
    
    // Step 3: Documents
    documents: {}
  })

  const [errors, setErrors] = useState({})

  // Calculate monthly salary when hourly rate or weekly hours change
  const calculateMonthlySalary = () => {
    const hourly = formData.hourly_rate || 0
    const weekly = formData.weekly_hours || 0
    return ((hourly * weekly * 52) / 12).toFixed(2)
  }

  // Validate current step
  const validateStep = (step) => {
    const newErrors = {}
    
    if (step === 1) {
      if (!formData.first_name.trim()) newErrors.first_name = 'Prenom requis'
      if (!formData.last_name.trim()) newErrors.last_name = 'Nom requis'
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email invalide'
      }
    }
    
    if (step === 2) {
      if (!formData.hire_date) newErrors.hire_date = 'Date d\'embauche requise'
      if (formData.contract_type === 'cdd' && !formData.contract_end_date) {
        newErrors.contract_end_date = 'Date de fin requise pour un CDD'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Navigation
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  // Document upload handlers
  const handleFileSelect = (docId) => {
    setCurrentDocId(docId)
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file && currentDocId) {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [currentDocId]: { file, previewUrl, name: file.name }
        }
      }))
    }
    e.target.value = '' // Reset input
  }

  const handleCameraCapture = async (docId) => {
    setCurrentDocId(docId)
    setShowCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      toast.error('Impossible d\'acceder a la camera')
      setShowCamera(false)
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')?.drawImage(video, 0, 0)
      
      canvas.toBlob((blob) => {
        if (blob && currentDocId) {
          const file = new File([blob], `${currentDocId}_scan.jpg`, { type: 'image/jpeg' })
          const previewUrl = URL.createObjectURL(blob)
          setFormData(prev => ({
            ...prev,
            documents: {
              ...prev.documents,
              [currentDocId]: { file, previewUrl, name: file.name }
            }
          }))
        }
      }, 'image/jpeg', 0.9)
      
      stopCamera()
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
    }
    setShowCamera(false)
    setCurrentDocId(null)
  }

  const removeDocument = (docId) => {
    const newDocs = { ...formData.documents }
    if (newDocs[docId]?.previewUrl) {
      URL.revokeObjectURL(newDocs[docId].previewUrl)
    }
    delete newDocs[docId]
    setFormData(prev => ({ ...prev, documents: newDocs }))
  }

  // Submit handler
  const handleSubmit = async () => {
    if (!validateStep(3)) return
    
    setIsSubmitting(true)
    try {
      // Create employee
      const employeeData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        postal_code: formData.postal_code || null,
        position: formData.position,
        department: formData.department,
        contract_type: formData.contract_type,
        hire_date: formData.hire_date,
        weekly_hours: formData.weekly_hours,
        hourly_rate: formData.hourly_rate,
        social_security_number: formData.social_security_number || null,
        bank_iban: formData.bank_iban || null,
        emergency_contact: formData.emergency_contact || null,
        emergency_phone: formData.emergency_phone || null,
      }

      const response = await api.post(`/hotels/${currentHotel.id}/staff/employees`, employeeData)
      
      // TODO: Upload documents to storage when backend supports it
      // For now, documents are stored in form state but not uploaded
      
      toast.success('Collaborateur cree avec succes!')
      onSuccess?.(response.data)
      onClose()
    } catch (error) {
      console.error('Error creating employee:', error)
      toast.error('Erreur lors de la creation du collaborateur')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-violet-700 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ajouter un collaborateur</h2>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center mt-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isCompleted = currentStep > step.id
              const isActive = currentStep === step.id
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`wizard-step ${isCompleted ? 'wizard-step-completed' : isActive ? 'wizard-step-active' : 'bg-white/30 text-white/70'}`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs mt-1 ${isActive ? 'text-white' : 'text-white/70'}`}>{step.title}</span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`wizard-connector ${isCompleted ? 'bg-white' : 'bg-white/30'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Prenom *</Label>
                  <Input 
                    value={formData.first_name}
                    onChange={e => setFormData({...formData, first_name: e.target.value})}
                    placeholder="Jean"
                    className={errors.first_name ? 'border-red-500' : ''}
                  />
                  {errors.first_name && <p className="text-xs text-red-500">{errors.first_name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Nom *</Label>
                  <Input 
                    value={formData.last_name}
                    onChange={e => setFormData({...formData, last_name: e.target.value})}
                    placeholder="Dupont"
                    className={errors.last_name ? 'border-red-500' : ''}
                  />
                  {errors.last_name && <p className="text-xs text-red-500">{errors.last_name}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Email</Label>
                  <Input 
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="jean.dupont@email.com"
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Telephone</Label>
                  <Input 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Adresse</Label>
                <Input 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="123 Rue de la Paix"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Ville</Label>
                  <Input 
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    placeholder="Paris"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Code postal</Label>
                  <Input 
                    value={formData.postal_code}
                    onChange={e => setFormData({...formData, postal_code: e.target.value})}
                    placeholder="75001"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Date de naissance</Label>
                  <Input 
                    type="date"
                    value={formData.date_of_birth}
                    onChange={e => setFormData({...formData, date_of_birth: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">N Securite sociale</Label>
                  <Input 
                    value={formData.social_security_number}
                    onChange={e => setFormData({...formData, social_security_number: e.target.value})}
                    placeholder="1 XX XX XX XXX XXX XX"
                  />
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-700 mb-3">Contact d'urgence</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Nom du contact</Label>
                    <Input 
                      value={formData.emergency_contact}
                      onChange={e => setFormData({...formData, emergency_contact: e.target.value})}
                      placeholder="Marie Dupont"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Telephone d'urgence</Label>
                    <Input 
                      value={formData.emergency_phone}
                      onChange={e => setFormData({...formData, emergency_phone: e.target.value})}
                      placeholder="06 XX XX XX XX"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Professional Information */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Service *</Label>
                  <Select value={formData.department} onValueChange={v => setFormData({...formData, department: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Poste *</Label>
                  <Select value={formData.position} onValueChange={v => setFormData({...formData, position: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Type de contrat *</Label>
                <Select value={formData.contract_type} onValueChange={v => setFormData({...formData, contract_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Date d'embauche *</Label>
                  <Input 
                    type="date"
                    value={formData.hire_date}
                    onChange={e => setFormData({...formData, hire_date: e.target.value})}
                    className={errors.hire_date ? 'border-red-500' : ''}
                  />
                  {errors.hire_date && <p className="text-xs text-red-500">{errors.hire_date}</p>}
                </div>
                {formData.contract_type === 'cdd' && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Date de fin *</Label>
                    <Input 
                      type="date"
                      value={formData.contract_end_date}
                      onChange={e => setFormData({...formData, contract_end_date: e.target.value})}
                      className={errors.contract_end_date ? 'border-red-500' : ''}
                    />
                    {errors.contract_end_date && <p className="text-xs text-red-500">{errors.contract_end_date}</p>}
                  </div>
                )}
              </div>
              
              <div className="pt-2 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-700 mb-3">Remuneration</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Heures/semaine</Label>
                    <Input 
                      type="number"
                      value={formData.weekly_hours}
                      onChange={e => setFormData({...formData, weekly_hours: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Taux horaire (EUR)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={e => setFormData({...formData, hourly_rate: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Salaire mensuel brut</Label>
                    <div className="h-9 px-3 py-2 bg-slate-100 rounded-md text-sm font-medium text-slate-700">
                      {calculateMonthlySalary()} EUR
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-700 mb-3">Coordonnees bancaires</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">IBAN</Label>
                    <Input 
                      value={formData.bank_iban}
                      onChange={e => setFormData({...formData, bank_iban: e.target.value})}
                      placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">BIC</Label>
                    <Input 
                      value={formData.bank_bic}
                      onChange={e => setFormData({...formData, bank_bic: e.target.value})}
                      placeholder="BNPAFRPP"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Documents obligatoires</p>
                  <p className="text-xs text-amber-600 mt-0.5">Les documents marques d'un * sont requis pour la validation du dossier.</p>
                </div>
              </div>

              <div className="space-y-3">
                {REQUIRED_DOCUMENTS.map(doc => {
                  const uploadedDoc = formData.documents[doc.id]
                  
                  return (
                    <div 
                      key={doc.id}
                      className={`border rounded-lg p-4 transition-colors ${uploadedDoc ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {uploadedDoc ? (
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {doc.name} {doc.required && <span className="text-red-500">*</span>}
                            </p>
                            {uploadedDoc && (
                              <p className="text-xs text-emerald-600 mt-0.5">{uploadedDoc.name}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {uploadedDoc ? (
                            <>
                              {uploadedDoc.previewUrl && (
                                <a 
                                  href={uploadedDoc.previewUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-violet-600 hover:underline"
                                >
                                  Voir
                                </a>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => removeDocument(doc.id)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleFileSelect(doc.id)}
                                className="h-8 text-xs gap-1.5"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                Importer
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleCameraCapture(doc.id)}
                                className="h-8 text-xs gap-1.5"
                              >
                                <Camera className="w-3.5 h-3.5" />
                                Scanner
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}
        </div>

        {/* Footer with navigation */}
        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={currentStep === 1 ? onClose : handlePrevious}
            className="gap-1.5"
          >
            {currentStep === 1 ? 'Annuler' : <><ChevronLeft className="w-4 h-4" /> Retour</>}
          </Button>
          
          {currentStep < 3 ? (
            <Button onClick={handleNext} className="bg-violet-600 hover:bg-violet-700 gap-1.5">
              Suivant <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="bg-violet-600 hover:bg-violet-700 gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" />
                  Creation...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Creer le collaborateur
                </>
              )}
            </Button>
          )}
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
            <div className="relative">
              <video ref={videoRef} className="max-w-full max-h-[60vh] rounded-lg" autoPlay playsInline />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex items-center gap-4 mt-6">
              <Button variant="outline" onClick={stopCamera} className="bg-white">
                Annuler
              </Button>
              <Button onClick={capturePhoto} className="bg-violet-600 hover:bg-violet-700 gap-2">
                <Camera className="w-4 h-4" />
                Capturer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
