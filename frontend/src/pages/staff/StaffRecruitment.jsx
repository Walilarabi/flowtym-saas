import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Briefcase, Users, UserPlus, FileText, Star, Phone, Mail, Calendar,
  MoreHorizontal, ChevronRight, Sparkles, X, Plus, Eye, Trash2, Clock,
  Building2, MapPin, Euro, Filter, Search, Send, Check
} from 'lucide-react'

const PIPELINE_STAGES = [
  { id: 'new', label: 'Nouveaux', color: 'bg-slate-100 text-slate-700' },
  { id: 'screening', label: 'Presélection', color: 'bg-blue-100 text-blue-700' },
  { id: 'interview', label: 'Entretien', color: 'bg-amber-100 text-amber-700' },
  { id: 'offer', label: 'Offre', color: 'bg-violet-100 text-violet-700' },
  { id: 'hired', label: 'Embauché', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'rejected', label: 'Refusé', color: 'bg-red-100 text-red-700' },
]

const CONTRACT_TYPES = [
  { value: 'CDI', label: 'CDI', color: 'bg-violet-100 text-violet-700' },
  { value: 'CDD', label: 'CDD', color: 'bg-amber-100 text-amber-700' },
  { value: 'Extra', label: 'Extra', color: 'bg-blue-100 text-blue-700' },
  { value: 'Interim', label: 'Intérim', color: 'bg-orange-100 text-orange-700' },
]

const DEPARTMENTS = [
  { value: 'front_office', label: 'Réception' },
  { value: 'housekeeping', label: 'Hébergement' },
  { value: 'food_beverage', label: 'Restauration' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'administration', label: 'Direction' },
]

const SOURCES = [
  { value: 'manual', label: 'Saisie manuelle' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'france_travail', label: 'France Travail' },
  { value: 'spontaneous', label: 'Candidature spontanée' },
]

// Plateformes de diffusion d'offres
const PUBLISHING_PLATFORMS = [
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-blue-600', enabled: true },
  { id: 'indeed', name: 'Indeed', icon: '🔍', color: 'bg-violet-600', enabled: true },
  { id: 'france_travail', name: 'France Travail', icon: '🇫🇷', color: 'bg-blue-500', enabled: true },
  { id: 'welcome_to_jungle', name: 'Welcome to the Jungle', icon: '🌴', color: 'bg-yellow-500', enabled: false },
  { id: 'jobteaser', name: 'JobTeaser', icon: '🎓', color: 'bg-pink-500', enabled: false },
  { id: 'apec', name: 'APEC', icon: '📊', color: 'bg-orange-500', enabled: false },
  { id: 'monster', name: 'Monster', icon: '👾', color: 'bg-purple-600', enabled: false },
  { id: 'hotel_career', name: 'Hosco', icon: '🏨', color: 'bg-teal-500', enabled: true },
]

export const StaffRecruitment = () => {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  const [activeTab, setActiveTab] = useState('pipeline') // pipeline, offers, candidates
  const [loading, setLoading] = useState(true)
  
  // Data
  const [candidates, setCandidates] = useState([])
  const [jobOffers, setJobOffers] = useState([])
  const [pipelineStats, setPipelineStats] = useState(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterOffer, setFilterOffer] = useState('')
  
  // Modals
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [showCandidateModal, setShowCandidateModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState([])
  const [publishingStatus, setPublishingStatus] = useState({})
  
  // Forms
  const [offerForm, setOfferForm] = useState({
    title: '', department: '', contract_type: 'CDI', location: '',
    description: '', requirements: [], salary_min: '', salary_max: '',
    experience_years: 0, status: 'draft', published_platforms: []
  })
  const [candidateForm, setCandidateForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    job_offer_id: '', source: 'manual', cover_letter: '', notes: ''
  })
  const [aiForm, setAIForm] = useState({
    title: '', department: '', contract_type: 'CDI', keywords: ''
  })
  const [aiGenerating, setAIGenerating] = useState(false)
  const [newRequirement, setNewRequirement] = useState('')

  const fetchData = async () => {
    if (!currentHotel) return
    setLoading(true)
    try {
      const [offersRes, candidatesRes, statsRes] = await Promise.all([
        api.get(`/hotels/${currentHotel.id}/recruitment/job-offers`),
        api.get(`/hotels/${currentHotel.id}/recruitment/candidates`),
        api.get(`/hotels/${currentHotel.id}/recruitment/pipeline-stats`)
      ])
      setJobOffers(offersRes.data)
      setCandidates(candidatesRes.data)
      setPipelineStats(statsRes.data)
    } catch (error) {
      console.error('Error fetching recruitment data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [currentHotel])

  // Job Offer handlers
  const handleSaveOffer = async () => {
    try {
      const payload = {
        ...offerForm,
        salary_min: offerForm.salary_min ? parseFloat(offerForm.salary_min) : null,
        salary_max: offerForm.salary_max ? parseFloat(offerForm.salary_max) : null
      }
      
      if (selectedOffer) {
        await api.put(`/hotels/${currentHotel.id}/recruitment/job-offers/${selectedOffer.id}`, payload)
        toast.success('Offre mise à jour')
      } else {
        await api.post(`/hotels/${currentHotel.id}/recruitment/job-offers`, payload)
        toast.success('Offre créée')
      }
      
      setShowOfferModal(false)
      resetOfferForm()
      fetchData()
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleDeleteOffer = async (id) => {
    if (!confirm('Supprimer cette offre ?')) return
    try {
      await api.delete(`/hotels/${currentHotel.id}/recruitment/job-offers/${id}`)
      toast.success('Offre supprimée')
      fetchData()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handlePublishOffer = async (offer) => {
    try {
      await api.put(`/hotels/${currentHotel.id}/recruitment/job-offers/${offer.id}`, {
        ...offer,
        status: offer.status === 'published' ? 'draft' : 'published'
      })
      toast.success(offer.status === 'published' ? 'Offre dépubliée' : 'Offre publiée')
      fetchData()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  // Multi-platform publishing
  const openPublishModal = (offer) => {
    setSelectedOffer(offer)
    setSelectedPlatforms(offer.published_platforms || [])
    setPublishingStatus({})
    setShowPublishModal(true)
  }

  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    )
  }

  const handleMultiPublish = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Sélectionnez au moins une plateforme')
      return
    }

    setPublishingStatus({})
    
    // Simulate publishing to each platform
    for (const platformId of selectedPlatforms) {
      setPublishingStatus(prev => ({ ...prev, [platformId]: 'publishing' }))
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500))
      
      // Simulate success (in real implementation, call actual APIs)
      setPublishingStatus(prev => ({ ...prev, [platformId]: 'success' }))
    }

    // Update offer with published platforms
    try {
      await api.put(`/hotels/${currentHotel.id}/recruitment/job-offers/${selectedOffer.id}`, {
        ...selectedOffer,
        status: 'published',
        published_platforms: selectedPlatforms,
        published_at: new Date().toISOString()
      })
      
      toast.success(`Offre publiée sur ${selectedPlatforms.length} plateforme(s)`)
      fetchData()
      
      // Keep modal open briefly to show results, then close
      setTimeout(() => setShowPublishModal(false), 1500)
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleQuickPublish = async (offer, platformId) => {
    const platforms = [...(offer.published_platforms || []), platformId]
    try {
      await api.put(`/hotels/${currentHotel.id}/recruitment/job-offers/${offer.id}`, {
        ...offer,
        status: 'published',
        published_platforms: platforms
      })
      toast.success(`Publié sur ${PUBLISHING_PLATFORMS.find(p => p.id === platformId)?.name}`)
      fetchData()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  // AI Generation
  const handleGenerateAI = async () => {
    if (!aiForm.title || !aiForm.department) {
      toast.error('Titre et département requis')
      return
    }
    
    setAIGenerating(true)
    try {
      const res = await api.post(`/hotels/${currentHotel.id}/recruitment/job-offers/generate-ai`, {
        ...aiForm,
        keywords: aiForm.keywords ? aiForm.keywords.split(',').map(k => k.trim()) : []
      })
      
      setOfferForm({
        ...offerForm,
        title: res.data.title,
        department: aiForm.department,
        contract_type: aiForm.contract_type,
        description: res.data.description,
        requirements: res.data.requirements,
        salary_min: res.data.salary_min,
        salary_max: res.data.salary_max
      })
      
      setShowAIModal(false)
      setShowOfferModal(true)
      toast.success('Contenu généré ! Personnalisez selon vos besoins.')
    } catch (error) {
      toast.error('Erreur de génération')
    } finally {
      setAIGenerating(false)
    }
  }

  // Candidate handlers
  const handleSaveCandidate = async () => {
    try {
      if (selectedCandidate) {
        await api.put(`/hotels/${currentHotel.id}/recruitment/candidates/${selectedCandidate.id}`, candidateForm)
        toast.success('Candidat mis à jour')
      } else {
        await api.post(`/hotels/${currentHotel.id}/recruitment/candidates`, candidateForm)
        toast.success('Candidat ajouté')
      }
      
      setShowCandidateModal(false)
      resetCandidateForm()
      fetchData()
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleUpdateCandidateStatus = async (candidateId, newStatus) => {
    try {
      await api.patch(`/hotels/${currentHotel.id}/recruitment/candidates/${candidateId}/status?status=${newStatus}`)
      fetchData()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handleUpdateRating = async (candidateId, rating) => {
    try {
      await api.patch(`/hotels/${currentHotel.id}/recruitment/candidates/${candidateId}/rating?rating=${rating}`)
      fetchData()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handleDeleteCandidate = async (id) => {
    if (!confirm('Supprimer ce candidat ?')) return
    try {
      await api.delete(`/hotels/${currentHotel.id}/recruitment/candidates/${id}`)
      toast.success('Candidat supprimé')
      fetchData()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  // Form resets
  const resetOfferForm = () => {
    setOfferForm({
      title: '', department: '', contract_type: 'CDI', location: '',
      description: '', requirements: [], salary_min: '', salary_max: '',
      experience_years: 0, status: 'draft'
    })
    setSelectedOffer(null)
  }

  const resetCandidateForm = () => {
    setCandidateForm({
      first_name: '', last_name: '', email: '', phone: '',
      job_offer_id: '', source: 'manual', cover_letter: '', notes: ''
    })
    setSelectedCandidate(null)
  }

  const openEditOffer = (offer) => {
    setSelectedOffer(offer)
    setOfferForm({
      title: offer.title,
      department: offer.department,
      contract_type: offer.contract_type,
      location: offer.location || '',
      description: offer.description || '',
      requirements: offer.requirements || [],
      salary_min: offer.salary_min || '',
      salary_max: offer.salary_max || '',
      experience_years: offer.experience_years || 0,
      status: offer.status
    })
    setShowOfferModal(true)
  }

  const openEditCandidate = (candidate) => {
    setSelectedCandidate(candidate)
    setCandidateForm({
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email,
      phone: candidate.phone || '',
      job_offer_id: candidate.job_offer_id || '',
      source: candidate.source,
      cover_letter: candidate.cover_letter || '',
      notes: candidate.notes || ''
    })
    setShowCandidateModal(true)
  }

  // Filters
  const filteredCandidates = candidates.filter(c => {
    const matchSearch = !searchTerm || 
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = !filterStatus || c.status === filterStatus
    const matchOffer = !filterOffer || c.job_offer_id === filterOffer
    return matchSearch && matchStatus && matchOffer
  })

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full spinner" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" data-testid="recruitment-page">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Recrutement</h1>
          <p className="text-sm text-slate-500">Gérez vos offres d'emploi et candidatures</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Tab Buttons */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            {[
              { id: 'pipeline', label: 'Pipeline', icon: Users },
              { id: 'offers', label: 'Offres', icon: Briefcase },
              { id: 'candidates', label: 'Candidats', icon: FileText }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-white text-violet-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-800'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
          
          <Button 
            onClick={() => setShowAIModal(true)} 
            variant="outline"
            className="gap-2"
            data-testid="btn-ai-generate"
          >
            <Sparkles className="w-4 h-4 text-violet-500" />
            Générer avec IA
          </Button>
          
          <Button 
            onClick={() => { resetOfferForm(); setShowOfferModal(true) }}
            className="bg-violet-600 hover:bg-violet-700 gap-2"
            data-testid="btn-new-offer"
          >
            <Plus className="w-4 h-4" />
            Nouvelle offre
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Pipeline View */}
        {activeTab === 'pipeline' && (
          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{pipelineStats?.active_job_offers || 0}</p>
                    <p className="text-sm text-slate-500">Offres actives</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{pipelineStats?.total_candidates || 0}</p>
                    <p className="text-sm text-slate-500">Candidats total</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{pipelineStats?.pipeline?.interview || 0}</p>
                    <p className="text-sm text-slate-500">En entretien</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{pipelineStats?.pipeline?.hired || 0}</p>
                    <p className="text-sm text-slate-500">Embauchés</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline Kanban */}
            <div className="grid grid-cols-6 gap-3">
              {PIPELINE_STAGES.slice(0, 5).map(stage => {
                const stageCandidates = candidates.filter(c => c.status === stage.id)
                return (
                  <div key={stage.id} className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${stage.color}`}>
                        {stage.label}
                      </span>
                      <span className="text-sm font-medium text-slate-500">{stageCandidates.length}</span>
                    </div>
                    
                    <div className="space-y-2">
                      {stageCandidates.map(candidate => (
                        <div 
                          key={candidate.id}
                          className="bg-white rounded-lg p-3 border border-slate-200 hover:shadow-sm cursor-pointer"
                          onClick={() => openEditCandidate(candidate)}
                          data-testid={`candidate-card-${candidate.id}`}
                        >
                          <p className="font-medium text-slate-800 text-sm">
                            {candidate.first_name} {candidate.last_name}
                          </p>
                          {candidate.job_title && (
                            <p className="text-xs text-slate-500 mt-1">{candidate.job_title}</p>
                          )}
                          <div className="flex items-center gap-1 mt-2">
                            {[1,2,3,4,5].map(star => (
                              <Star 
                                key={star}
                                className={`w-3 h-3 cursor-pointer ${
                                  star <= (candidate.rating || 0) 
                                    ? 'text-amber-400 fill-amber-400' 
                                    : 'text-slate-300'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUpdateRating(candidate.id, star)
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      {stageCandidates.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4">Aucun candidat</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Job Offers View */}
        {activeTab === 'offers' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {jobOffers.map(offer => (
              <div 
                key={offer.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow"
                data-testid={`offer-card-${offer.id}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">{offer.title}</h3>
                    <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {DEPARTMENTS.find(d => d.value === offer.department)?.label || offer.department}
                      </span>
                      {offer.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {offer.location}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      CONTRACT_TYPES.find(c => c.value === offer.contract_type)?.color || 'bg-slate-100 text-slate-700'
                    }`}>
                      {offer.contract_type}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      offer.status === 'published' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {offer.status === 'published' ? 'Publiée' : 'Brouillon'}
                    </span>
                  </div>
                </div>
                
                {offer.description && (
                  <p className="text-sm text-slate-600 mt-3 line-clamp-2">{offer.description}</p>
                )}

                {/* Plateformes de diffusion */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">Diffusion</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openPublishModal(offer)}
                      className="text-violet-600 hover:text-violet-700 h-6 text-xs px-2"
                    >
                      Multi-plateforme
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {PUBLISHING_PLATFORMS.filter(p => p.enabled).slice(0, 4).map(platform => {
                      const isPublished = (offer.published_platforms || []).includes(platform.id)
                      return (
                        <button
                          key={platform.id}
                          onClick={() => !isPublished && handleQuickPublish(offer, platform.id)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                            isPublished 
                              ? 'bg-emerald-100 text-emerald-700 cursor-default'
                              : 'bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-700'
                          }`}
                          title={isPublished ? `Publiée sur ${platform.name}` : `Publier sur ${platform.name}`}
                        >
                          <span>{platform.icon}</span>
                          <span>{platform.name}</span>
                          {isPublished && <Check className="w-3 h-3" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-4 text-sm">
                    {(offer.salary_min || offer.salary_max) && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <Euro className="w-3.5 h-3.5" />
                        {offer.salary_min && offer.salary_max 
                          ? `${offer.salary_min} - ${offer.salary_max}`
                          : offer.salary_min || offer.salary_max
                        }
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-slate-500">
                      <Users className="w-3.5 h-3.5" />
                      {offer.applications_count} candidat(s)
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handlePublishOffer(offer)}
                      className="text-slate-500"
                    >
                      {offer.status === 'published' ? 'Dépublier' : 'Publier'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openEditOffer(offer)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteOffer(offer.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {jobOffers.length === 0 && (
              <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucune offre d'emploi</p>
                <Button 
                  onClick={() => setShowOfferModal(true)}
                  className="mt-4 bg-violet-600 hover:bg-violet-700"
                >
                  Créer une offre
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Candidates List View */}
        {activeTab === 'candidates' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Rechercher un candidat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {PIPELINE_STAGES.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterOffer || "all"} onValueChange={(v) => setFilterOffer(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Toutes les offres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les offres</SelectItem>
                  {jobOffers.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                onClick={() => { resetCandidateForm(); setShowCandidateModal(true) }}
                className="bg-violet-600 hover:bg-violet-700 gap-2"
                data-testid="btn-new-candidate"
              >
                <UserPlus className="w-4 h-4" />
                Ajouter
              </Button>
            </div>

            {/* Candidates Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Candidat</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Poste</th>
                    <th className="text-left p-3 text-xs font-semibold text-slate-500 uppercase">Source</th>
                    <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Statut</th>
                    <th className="text-center p-3 text-xs font-semibold text-slate-500 uppercase">Note</th>
                    <th className="w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCandidates.map(candidate => {
                    const stageInfo = PIPELINE_STAGES.find(s => s.id === candidate.status)
                    return (
                      <tr key={candidate.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-slate-800">{candidate.first_name} {candidate.last_name}</p>
                            <p className="text-sm text-slate-500">{candidate.email}</p>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-slate-600">
                          {candidate.job_title || '-'}
                        </td>
                        <td className="p-3 text-sm text-slate-600">
                          {SOURCES.find(s => s.value === candidate.source)?.label || candidate.source}
                        </td>
                        <td className="p-3 text-center">
                          <Select 
                            value={candidate.status}
                            onValueChange={(v) => handleUpdateCandidateStatus(candidate.id, v)}
                          >
                            <SelectTrigger className="w-[140px] mx-auto">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${stageInfo?.color}`}>
                                {stageInfo?.label}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              {PIPELINE_STAGES.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-0.5">
                            {[1,2,3,4,5].map(star => (
                              <Star 
                                key={star}
                                className={`w-4 h-4 cursor-pointer transition-colors ${
                                  star <= (candidate.rating || 0) 
                                    ? 'text-amber-400 fill-amber-400' 
                                    : 'text-slate-300 hover:text-amber-300'
                                }`}
                                onClick={() => handleUpdateRating(candidate.id, star)}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openEditCandidate(candidate)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteCandidate(candidate.id)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              
              {filteredCandidates.length === 0 && (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Aucun candidat trouvé</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Job Offer Modal */}
      <Dialog open={showOfferModal} onOpenChange={setShowOfferModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedOffer ? 'Modifier l\'offre' : 'Nouvelle offre d\'emploi'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Titre du poste *</Label>
                <Input 
                  value={offerForm.title}
                  onChange={(e) => setOfferForm({...offerForm, title: e.target.value})}
                  placeholder="Ex: Réceptionniste"
                />
              </div>
              <div>
                <Label>Département *</Label>
                <Select value={offerForm.department} onValueChange={(v) => setOfferForm({...offerForm, department: v})}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type de contrat</Label>
                <Select value={offerForm.contract_type} onValueChange={(v) => setOfferForm({...offerForm, contract_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Localisation</Label>
                <Input 
                  value={offerForm.location}
                  onChange={(e) => setOfferForm({...offerForm, location: e.target.value})}
                  placeholder="Ex: Paris 8ème"
                />
              </div>
              <div>
                <Label>Salaire min (€)</Label>
                <Input 
                  type="number"
                  value={offerForm.salary_min}
                  onChange={(e) => setOfferForm({...offerForm, salary_min: e.target.value})}
                />
              </div>
              <div>
                <Label>Salaire max (€)</Label>
                <Input 
                  type="number"
                  value={offerForm.salary_max}
                  onChange={(e) => setOfferForm({...offerForm, salary_max: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea 
                value={offerForm.description}
                onChange={(e) => setOfferForm({...offerForm, description: e.target.value})}
                rows={6}
                placeholder="Décrivez le poste et les missions..."
              />
            </div>
            
            <div>
              <Label>Prérequis</Label>
              <div className="space-y-2">
                {offerForm.requirements.map((req, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex-1 text-sm bg-slate-50 px-3 py-2 rounded-lg">{req}</span>
                    <button 
                      onClick={() => setOfferForm({
                        ...offerForm, 
                        requirements: offerForm.requirements.filter((_, idx) => idx !== i)
                      })}
                      className="p-1 hover:bg-red-50 rounded text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input 
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    placeholder="Ajouter un prérequis..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newRequirement.trim()) {
                        setOfferForm({
                          ...offerForm,
                          requirements: [...offerForm.requirements, newRequirement.trim()]
                        })
                        setNewRequirement('')
                      }
                    }}
                  />
                  <Button 
                    variant="outline"
                    onClick={() => {
                      if (newRequirement.trim()) {
                        setOfferForm({
                          ...offerForm,
                          requirements: [...offerForm.requirements, newRequirement.trim()]
                        })
                        setNewRequirement('')
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowOfferModal(false)}>Annuler</Button>
              <Button onClick={handleSaveOffer} className="bg-violet-600 hover:bg-violet-700">
                {selectedOffer ? 'Mettre à jour' : 'Créer l\'offre'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Candidate Modal */}
      <Dialog open={showCandidateModal} onOpenChange={setShowCandidateModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedCandidate ? 'Modifier le candidat' : 'Nouveau candidat'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prénom *</Label>
                <Input 
                  value={candidateForm.first_name}
                  onChange={(e) => setCandidateForm({...candidateForm, first_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Nom *</Label>
                <Input 
                  value={candidateForm.last_name}
                  onChange={(e) => setCandidateForm({...candidateForm, last_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input 
                  type="email"
                  value={candidateForm.email}
                  onChange={(e) => setCandidateForm({...candidateForm, email: e.target.value})}
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input 
                  value={candidateForm.phone}
                  onChange={(e) => setCandidateForm({...candidateForm, phone: e.target.value})}
                />
              </div>
              <div>
                <Label>Offre d'emploi</Label>
                <Select value={candidateForm.job_offer_id || "spontaneous"} onValueChange={(v) => setCandidateForm({...candidateForm, job_offer_id: v === "spontaneous" ? "" : v})}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner une offre" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spontaneous">Candidature spontanée</SelectItem>
                    {jobOffers.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Source</Label>
                <Select value={candidateForm.source} onValueChange={(v) => setCandidateForm({...candidateForm, source: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Lettre de motivation</Label>
              <Textarea 
                value={candidateForm.cover_letter}
                onChange={(e) => setCandidateForm({...candidateForm, cover_letter: e.target.value})}
                rows={4}
              />
            </div>
            
            <div>
              <Label>Notes internes</Label>
              <Textarea 
                value={candidateForm.notes}
                onChange={(e) => setCandidateForm({...candidateForm, notes: e.target.value})}
                rows={2}
                placeholder="Notes visibles uniquement par l'équipe RH..."
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCandidateModal(false)}>Annuler</Button>
              <Button onClick={handleSaveCandidate} className="bg-violet-600 hover:bg-violet-700">
                {selectedCandidate ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generation Modal */}
      <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              Générer une offre avec l'IA
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <p className="text-sm text-slate-600 bg-violet-50 border border-violet-200 rounded-lg p-3">
              <strong>IA GPT-4o :</strong> Génération intelligente d'offres d'emploi professionnelles adaptées au secteur hôtelier français.
              Le contenu est personnalisé selon le poste et peut être modifié après génération.
            </p>
            
            <div>
              <Label>Titre du poste *</Label>
              <Input 
                value={aiForm.title}
                onChange={(e) => setAIForm({...aiForm, title: e.target.value})}
                placeholder="Ex: Chef de réception"
              />
            </div>
            
            <div>
              <Label>Département *</Label>
              <Select value={aiForm.department} onValueChange={(v) => setAIForm({...aiForm, department: v})}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Type de contrat</Label>
              <Select value={aiForm.contract_type} onValueChange={(v) => setAIForm({...aiForm, contract_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Mots-clés (optionnel)</Label>
              <Input 
                value={aiForm.keywords}
                onChange={(e) => setAIForm({...aiForm, keywords: e.target.value})}
                placeholder="Ex: bilingue, management, PMS Opera"
              />
              <p className="text-xs text-slate-500 mt-1">Séparez les mots-clés par des virgules</p>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAIModal(false)}>Annuler</Button>
              <Button 
                onClick={handleGenerateAI} 
                className="bg-violet-600 hover:bg-violet-700 gap-2"
                disabled={aiGenerating}
              >
                {aiGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Générer
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Publication Multi-Plateforme */}
      <Dialog open={showPublishModal} onOpenChange={setShowPublishModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-violet-600" />
              Publier sur plusieurs plateformes
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedOffer && (
              <div className="bg-slate-50 rounded-lg p-3 mb-4">
                <p className="font-medium text-slate-800">{selectedOffer.title}</p>
                <p className="text-sm text-slate-500">{selectedOffer.department} • {selectedOffer.contract_type}</p>
              </div>
            )}
            
            <p className="text-sm text-slate-600 mb-4">
              Sélectionnez les plateformes où diffuser votre offre :
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {PUBLISHING_PLATFORMS.map(platform => {
                const isSelected = selectedPlatforms.includes(platform.id)
                const status = publishingStatus[platform.id]
                const isAlreadyPublished = selectedOffer?.published_platforms?.includes(platform.id)
                
                return (
                  <button
                    key={platform.id}
                    onClick={() => !isAlreadyPublished && !status && togglePlatform(platform.id)}
                    disabled={!platform.enabled || isAlreadyPublished || status}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      isAlreadyPublished 
                        ? 'border-emerald-200 bg-emerald-50 cursor-default'
                        : status === 'publishing'
                        ? 'border-violet-300 bg-violet-50 cursor-wait'
                        : status === 'success'
                        ? 'border-emerald-300 bg-emerald-50'
                        : isSelected
                        ? 'border-violet-500 bg-violet-50'
                        : platform.enabled
                        ? 'border-slate-200 hover:border-violet-300 cursor-pointer'
                        : 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-2xl">{platform.icon}</span>
                    <div className="flex-1 text-left">
                      <p className={`font-medium ${platform.enabled ? 'text-slate-800' : 'text-slate-400'}`}>
                        {platform.name}
                      </p>
                      {!platform.enabled && (
                        <p className="text-xs text-slate-400">Bientôt disponible</p>
                      )}
                      {isAlreadyPublished && (
                        <p className="text-xs text-emerald-600">Déjà publiée</p>
                      )}
                    </div>
                    {status === 'publishing' && (
                      <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                    )}
                    {(status === 'success' || isAlreadyPublished) && (
                      <Check className="w-5 h-5 text-emerald-600" />
                    )}
                    {!status && !isAlreadyPublished && isSelected && (
                      <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            
            <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note :</strong> La publication automatique nécessite une configuration des API.
                Contactez votre administrateur pour activer les intégrations.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPublishModal(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleMultiPublish}
              className="bg-violet-600 hover:bg-violet-700 gap-2"
              disabled={selectedPlatforms.length === 0 || Object.values(publishingStatus).some(s => s === 'publishing')}
            >
              <Send className="w-4 h-4" />
              Publier ({selectedPlatforms.length} plateforme{selectedPlatforms.length > 1 ? 's' : ''})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
