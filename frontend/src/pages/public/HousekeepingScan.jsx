import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { 
  Play, Square, Clock, CheckCircle, User, Loader2, 
  AlertCircle, DoorOpen, ArrowLeft, Timer
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import axios from 'axios'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL

// ═══════════════════════════════════════════════════════════════════════════════
// CHRONO COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const Chrono = ({ startTime, isRunning }) => {
  const [elapsed, setElapsed] = useState(0)
  
  useEffect(() => {
    if (!startTime || !isRunning) return
    
    const start = new Date(startTime).getTime()
    
    const tick = () => {
      const now = Date.now()
      setElapsed(Math.floor((now - start) / 1000))
    }
    
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startTime, isRunning])
  
  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60
  
  const format = (n) => String(n).padStart(2, '0')
  
  return (
    <div className="text-center">
      <div className="text-6xl font-mono font-bold text-white">
        {format(hours)}:{format(minutes)}:{format(seconds)}
      </div>
      <p className="text-violet-200 mt-2">Temps écoulé</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function HousekeepingScan() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { api, user, isAuthenticated } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  
  const [zoneData, setZoneData] = useState(null)
  const [tracking, setTracking] = useState(null)
  const [employee, setEmployee] = useState(null)
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // CHECK AUTH AND FETCH DATA
  // ═══════════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      const returnUrl = `/scan/${token}`
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`)
      return
    }
    
    fetchZoneData()
  }, [isAuthenticated, token])
  
  const fetchZoneData = async () => {
    try {
      setLoading(true)
      
      // Get zone info (public endpoint)
      const zoneRes = await axios.get(`${API_URL}/api/qrcodes/scan/${token}`)
      setZoneData(zoneRes.data.zone)
      setTracking(zoneRes.data.current_tracking)
      
      // Get employee info if user is logged in
      if (user?.user_id) {
        try {
          const hotelId = zoneRes.data.zone.hotel_id
          const empRes = await api.get(`/hotels/${hotelId}/staff/employees?is_active=true`)
          const emp = empRes.data.find(e => e.email === user.email)
          if (emp) {
            setEmployee(emp)
          }
        } catch (e) {
          console.log('Could not fetch employee info')
        }
      }
    } catch (err) {
      console.error('Error fetching zone:', err)
      setError(err.response?.data?.detail || 'QR Code invalide')
    } finally {
      setLoading(false)
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const handleStart = async () => {
    if (!employee) {
      toast.error('Vous devez être enregistré comme employé')
      return
    }
    
    setProcessing(true)
    
    try {
      const res = await api.post(`/qrcodes/hotels/${zoneData.hotel_id}/tracking/scan?zone_id=${zoneData.id}`, {
        employee_id: employee.id,
        scan_type: 'start'
      })
      
      setTracking(res.data.tracking)
      toast.success(res.data.message)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur')
    } finally {
      setProcessing(false)
    }
  }
  
  const handleEnd = async () => {
    if (!employee || !tracking) return
    
    setProcessing(true)
    
    try {
      const res = await api.post(`/qrcodes/hotels/${zoneData.hotel_id}/tracking/scan?zone_id=${zoneData.id}`, {
        employee_id: employee.id,
        scan_type: 'end'
      })
      
      setTracking(res.data.tracking)
      toast.success(res.data.message)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur')
    } finally {
      setProcessing(false)
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          <Loader2 size={40} className="animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    )
  }
  
  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-sm">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Erreur</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft size={16} className="mr-2" />
            Retour
          </Button>
        </div>
      </div>
    )
  }
  
  const isInProgress = tracking?.status === 'in_progress'
  const isCompleted = tracking?.status === 'awaiting_validation' || tracking?.status === 'completed'
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 to-indigo-700 flex flex-col" data-testid="hk-scan-page">
      {/* Header */}
      <div className="p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <DoorOpen size={20} />
          <span className="text-sm opacity-80">Housekeeping</span>
        </div>
        <h1 className="text-2xl font-bold">{zoneData?.name}</h1>
        {zoneData?.room_number && (
          <p className="text-violet-200">Chambre {zoneData.room_number} • Étage {zoneData.floor}</p>
        )}
      </div>
      
      {/* Chrono section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {isInProgress ? (
          <Chrono startTime={tracking.scan_start} isRunning={true} />
        ) : isCompleted ? (
          <div className="text-center">
            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={48} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Terminé !</h2>
            <p className="text-violet-200">
              Durée : {tracking.duration_minutes} minutes
            </p>
            <p className="text-violet-200 text-sm mt-2">
              En attente de validation par la gouvernante
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Timer size={48} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Prêt à nettoyer</h2>
            <p className="text-violet-200">
              Appuyez sur Démarrer pour commencer le chrono
            </p>
          </div>
        )}
      </div>
      
      {/* Employee info */}
      {employee && (
        <div className="px-6 mb-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-medium">{employee.first_name} {employee.last_name}</p>
              <p className="text-violet-200 text-sm">{employee.position}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="p-6 bg-white rounded-t-3xl">
        {!employee ? (
          <div className="text-center py-4">
            <AlertCircle size={24} className="text-amber-500 mx-auto mb-2" />
            <p className="text-slate-600">Vous n'êtes pas enregistré comme employé.</p>
          </div>
        ) : isInProgress ? (
          <Button
            onClick={handleEnd}
            disabled={processing}
            className="w-full h-16 text-xl bg-orange-600 hover:bg-orange-700"
            data-testid="hk-end-btn"
          >
            {processing ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Square size={24} className="mr-3" />
                Terminer le nettoyage
              </>
            )}
          </Button>
        ) : isCompleted ? (
          <Button
            onClick={() => navigate('/housekeeping')}
            variant="outline"
            className="w-full h-16 text-xl"
          >
            Retour au tableau de bord
          </Button>
        ) : (
          <Button
            onClick={handleStart}
            disabled={processing}
            className="w-full h-16 text-xl bg-emerald-600 hover:bg-emerald-700"
            data-testid="hk-start-btn"
          >
            {processing ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Play size={24} className="mr-3" />
                Démarrer le nettoyage
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
