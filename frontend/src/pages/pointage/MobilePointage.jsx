import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { 
  Clock, LogIn, LogOut, CheckCircle, User, Calendar,
  AlertCircle, ArrowLeft, Building2
} from 'lucide-react'

export const MobilePointage = () => {
  const { api, user, isAuthenticated } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const hotelId = searchParams.get('hotel_id') || ''
  const token = searchParams.get('token') || ''
  
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  
  // Check authentication and fetch status
  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      const returnUrl = `/pointage/mobile?hotel_id=${hotelId}&token=${token}`
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`)
      return
    }
    
    fetchStatus()
  }, [isAuthenticated, hotelId, user])
  
  const fetchStatus = async () => {
    if (!hotelId || !user?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Get employee status (user should be an employee)
      const res = await api.get(`/staff/pointage/hotels/${hotelId}/employee/${user.id}/status`)
      setStatus(res.data)
    } catch (err) {
      console.error('Error fetching status:', err)
      // Try with a different approach - look up employee by email
      try {
        // Get employees and find by email
        const empRes = await api.get(`/hotels/${hotelId}/staff/employees?is_active=true`)
        const employee = empRes.data.find(e => e.email === user.email)
        
        if (employee) {
          const res = await api.get(`/staff/pointage/hotels/${hotelId}/employee/${employee.id}/status`)
          setStatus(res.data)
        } else {
          setError('Vous n\'êtes pas enregistré comme employé de cet hôtel.')
        }
      } catch (e) {
        setError('Impossible de vérifier votre statut de pointage.')
      }
    } finally {
      setLoading(false)
    }
  }
  
  const handleCheckIn = async () => {
    if (!status?.employee_id) return
    setProcessing(true)
    
    try {
      await api.post(`/staff/pointage/hotels/${hotelId}/check-in`, {
        employee_id: status.employee_id,
        source: 'qr'
      })
      toast.success('Pointage d\'entrée enregistré !')
      fetchStatus()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors du pointage')
    } finally {
      setProcessing(false)
    }
  }
  
  const handleCheckOut = async () => {
    if (!status?.employee_id) return
    setProcessing(true)
    
    try {
      await api.post(`/staff/pointage/hotels/${hotelId}/check-out/employee/${status.employee_id}`, {})
      toast.success('Pointage de sortie enregistré !')
      fetchStatus()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors du pointage')
    } finally {
      setProcessing(false)
    }
  }
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full spinner mx-auto mb-4" />
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    )
  }
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Erreur</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 to-indigo-700 flex flex-col" data-testid="mobile-pointage">
      {/* Header */}
      <div className="p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-5 h-5" />
          <span className="text-sm opacity-80">Pointage</span>
        </div>
        <h1 className="text-2xl font-bold">Bonjour, {status?.employee_name?.split(' ')[0]}</h1>
        <p className="text-violet-200">
          {format(new Date(), 'EEEE dd MMMM yyyy', { locale: fr })}
        </p>
      </div>
      
      {/* Main Card */}
      <div className="flex-1 bg-white rounded-t-3xl p-6 flex flex-col">
        {/* Status Info */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{status?.employee_name}</p>
              <p className="text-sm text-slate-500">
                {status?.has_planning ? (
                  `Prévu : ${status?.planned_start} - ${status?.planned_end}`
                ) : (
                  'Pas de planning prévu aujourd\'hui'
                )}
              </p>
            </div>
          </div>
          
          {status?.has_pointage && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <LogIn className="w-4 h-4 text-emerald-500" />
                <span>
                  Entrée : {status?.check_in_time 
                    ? format(new Date(status.check_in_time), 'HH:mm')
                    : '-'}
                </span>
              </div>
              {status?.check_out_time && (
                <div className="flex items-center gap-1">
                  <LogOut className="w-4 h-4 text-orange-500" />
                  <span>Sortie : {format(new Date(status.check_out_time), 'HH:mm')}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Current Time */}
        <div className="text-center mb-8">
          <div className="text-6xl font-bold text-slate-900 font-mono mb-2">
            {format(new Date(), 'HH:mm')}
          </div>
          <p className="text-slate-500">Heure actuelle</p>
        </div>
        
        {/* Action Button */}
        <div className="flex-1 flex flex-col justify-center">
          {status?.can_check_in && (
            <Button
              onClick={handleCheckIn}
              disabled={processing}
              className="w-full h-20 text-xl bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg"
              data-testid="check-in-btn"
            >
              {processing ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full spinner" />
              ) : (
                <>
                  <LogIn className="w-8 h-8 mr-3" />
                  Pointer mon entrée
                </>
              )}
            </Button>
          )}
          
          {status?.can_check_out && (
            <Button
              onClick={handleCheckOut}
              disabled={processing}
              className="w-full h-20 text-xl bg-orange-600 hover:bg-orange-700 rounded-2xl shadow-lg"
              data-testid="check-out-btn"
            >
              {processing ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full spinner" />
              ) : (
                <>
                  <LogOut className="w-8 h-8 mr-3" />
                  Pointer ma sortie
                </>
              )}
            </Button>
          )}
          
          {!status?.can_check_in && !status?.can_check_out && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-lg font-semibold text-slate-900">Journée terminée</p>
              <p className="text-slate-500">Votre pointage est complet pour aujourd'hui.</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-auto pt-6 text-center">
          <p className="text-xs text-slate-400">
            Pointage via QR Code • Flowtym PMS
          </p>
        </div>
      </div>
    </div>
  )
}

export default MobilePointage
