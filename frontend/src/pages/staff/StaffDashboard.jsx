import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { format, addDays, startOfWeek, isToday, isWeekend } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { 
  Users, Clock, AlertTriangle, UserPlus, Calendar, FileText, 
  ChevronRight, Eye, Briefcase, AlertCircle, CheckCircle2, 
  FileWarning, UserCheck, Activity
} from 'lucide-react'
import { AddEmployeeWizard } from '@/components/staff/AddEmployeeWizard'

// Activity item colors
const ACTIVITY_COLORS = {
  contract: 'bg-emerald-500',
  sick: 'bg-amber-500',
  candidate: 'bg-blue-500',
  export: 'bg-violet-500',
  report: 'bg-emerald-500',
}

export const StaffDashboard = () => {
  const navigate = useNavigate()
  const { user, api } = useAuth()
  const { currentHotel } = useHotel()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [shifts, setShifts] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [wizardOpen, setWizardOpen] = useState(false)

  // Calculate dates
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const fetchData = async () => {
    if (!currentHotel) return
    setLoading(true)
    try {
      const fromDate = format(weekStart, 'yyyy-MM-dd')
      const toDate = format(addDays(weekStart, 6), 'yyyy-MM-dd')
      
      const [empRes, shiftRes, leaveRes] = await Promise.all([
        api.get(`/hotels/${currentHotel.id}/staff/employees`),
        api.get(`/hotels/${currentHotel.id}/staff/shifts?from_date=${fromDate}&to_date=${toDate}`),
        api.get(`/hotels/${currentHotel.id}/leave/requests?status=approved`)
      ])
      setEmployees(empRes.data)
      setShifts(shiftRes.data)
      setLeaveRequests(leaveRes.data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [currentHotel])

  // Calculate KPIs
  const activeEmployees = employees.filter(e => e.is_active)
  const totalEmployees = employees.length
  
  const todayStr = format(today, 'yyyy-MM-dd')
  const todayShifts = shifts.filter(s => s.date === todayStr)
  const presentToday = new Set(todayShifts.map(s => s.employee_id)).size
  
  const todayLeaves = leaveRequests.filter(lr => 
    lr.date_start <= todayStr && lr.date_end >= todayStr
  )
  const onLeaveToday = todayLeaves.length
  
  // Mock data for documents and candidates (these would come from real endpoints)
  const missingDocuments = 3
  const newCandidates = 2

  // Get today's team
  const todayTeam = useMemo(() => {
    const teamMembers = []
    todayShifts.forEach(shift => {
      const employee = employees.find(e => e.id === shift.employee_id)
      if (employee && !teamMembers.find(t => t.id === employee.id)) {
        teamMembers.push({
          ...employee,
          shift_start: shift.start_time,
          shift_end: shift.end_time
        })
      }
    })
    return teamMembers.slice(0, 5)
  }, [todayShifts, employees])

  // Get employees per day for the week
  const weeklyPresence = useMemo(() => {
    return weekDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayShifts = shifts.filter(s => s.date === dateStr)
      return {
        date: day,
        count: new Set(dayShifts.map(s => s.employee_id)).size
      }
    })
  }, [weekDays, shifts])

  // Mock recent activity
  const recentActivity = [
    { id: 1, type: 'contract', text: 'Sophie Martin - Contrat CDI signe', time: 'Il y a 2h' },
    { id: 2, type: 'sick', text: 'Julien Dubois - Arret maladie declare', time: 'Il y a 4h' },
    { id: 3, type: 'candidate', text: 'Alexandre Dupont - Nouvelle candidature', time: 'Il y a 6h' },
    { id: 4, type: 'export', text: 'Planning Janvier exporte', time: 'Hier' },
    { id: 5, type: 'report', text: 'Rapport comptable envoye', time: 'Hier' },
  ]

  // Mock HR alerts
  const hrAlerts = [
    'Julien Dubois - Carte Vitale manquante',
    'Emma Leroy - Justificatif domicile expire',
    'Antoine Rousseau - Carte Vitale manquante',
  ]

  const getDepartmentLabel = (dept) => {
    const labels = {
      front_office: 'Reception',
      housekeeping: 'Hebergement',
      food_beverage: 'Restauration',
      maintenance: 'Maintenance',
      administration: 'Administration',
    }
    return labels[dept] || dept
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full spinner" />
          <span className="text-sm text-slate-500">Chargement du dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="pt-2">
          <h1 className="text-2xl font-bold text-slate-800">
            Bonjour, {user?.first_name || 'Directeur'} <span className="text-2xl">👋</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {format(today, "EEEE d MMMM yyyy", { locale: fr })} • {currentHotel?.name}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Collaborateurs actifs */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                +2 ce mois
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900">{activeEmployees.length}</p>
              <p className="text-sm text-slate-500 mt-1">Collaborateurs actifs</p>
              <p className="text-xs text-slate-400">sur {totalEmployees} total</p>
            </div>
          </div>

          {/* Présents aujourd'hui */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900">{presentToday}</p>
              <p className="text-sm text-slate-500 mt-1">Presents aujourd'hui</p>
              <p className="text-xs text-slate-400">{onLeaveToday} en repos, 0 malade</p>
            </div>
          </div>

          {/* Documents manquants */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900">{missingDocuments}</p>
              <p className="text-sm text-slate-500 mt-1">Documents manquants</p>
              <p className="text-xs text-slate-400">A regulariser</p>
            </div>
          </div>

          {/* Nouvelles candidatures */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                +2
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900">{newCandidates}</p>
              <p className="text-sm text-slate-500 mt-1">Nouvelles candidatures</p>
              <p className="text-xs text-slate-400">En attente de traitement</p>
            </div>
          </div>
        </div>

        {/* Middle Section: Actions + Team + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Actions rapides */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Actions rapides</h2>
            <div className="space-y-1">
              <button 
                onClick={() => navigate('/staff/planning')}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-violet-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Voir le planning</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              </button>

              <button 
                onClick={() => setWizardOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Ajouter un collaborateur</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              </button>

              <button 
                onClick={() => navigate('/staff/contracts')}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Generer un contrat</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              </button>

              <button 
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Eye className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Voir les candidats</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              </button>
            </div>
          </div>

          {/* Équipe du jour */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">Equipe du jour</h2>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {format(today, 'EEE d MMM', { locale: fr })}
              </span>
            </div>
            <div className="space-y-3">
              {todayTeam.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Aucun shift prevu aujourd'hui</p>
              ) : (
                todayTeam.map((member, index) => {
                  const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500']
                  const bgColor = colors[index % colors.length]
                  return (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${bgColor} flex items-center justify-center text-white text-xs font-semibold`}>
                          {member.first_name?.charAt(0)}{member.last_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{member.first_name} {member.last_name}</p>
                          <p className="text-xs text-slate-500">{getDepartmentLabel(member.department)}</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        {member.shift_start || '07:00'}-{member.shift_end || '15:00'}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Activité récente */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Activite recente</h2>
            <div className="space-y-4">
              {recentActivity.map(activity => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${ACTIVITY_COLORS[activity.type]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{activity.text}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* HR Alerts Banner */}
        {hrAlerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">{hrAlerts.length} alertes RH a traiter</p>
                <p className="text-xs text-amber-700 mt-1">
                  {hrAlerts.map((alert, i) => (
                    <span key={i}>
                      • {alert}
                      {i < hrAlerts.length - 1 && '  '}
                    </span>
                  ))}
                </p>
              </div>
            </div>
            <Button variant="ghost" className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 text-sm gap-1">
              Gerer <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Planning cette semaine */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Planning cette semaine</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Semaine du {format(weekStart, 'd', { locale: fr })} au {format(addDays(weekStart, 6), 'd MMMM yyyy', { locale: fr })}
              </p>
            </div>
            <button 
              onClick={() => navigate('/staff/planning')}
              className="text-sm font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1"
            >
              Voir le planning complet <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {weeklyPresence.map((day, index) => {
              const isWeekendDay = isWeekend(day.date)
              const isTodayDate = isToday(day.date)
              
              return (
                <div 
                  key={index}
                  className={`rounded-xl p-4 text-center transition-colors ${
                    isWeekendDay 
                      ? 'bg-violet-50 border border-violet-100' 
                      : isTodayDate 
                        ? 'bg-violet-100 border border-violet-200' 
                        : 'bg-slate-50 border border-slate-100'
                  }`}
                >
                  <p className={`text-xs font-medium ${isWeekendDay ? 'text-violet-600' : 'text-slate-500'}`}>
                    {format(day.date, 'EEE d', { locale: fr })}
                  </p>
                  <p className={`text-2xl font-bold mt-2 ${isWeekendDay ? 'text-violet-700' : 'text-slate-800'}`}>
                    {day.count}
                  </p>
                  <p className={`text-xs mt-1 ${isWeekendDay ? 'text-violet-500' : 'text-slate-400'}`}>
                    presents
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Add Employee Wizard */}
      <AddEmployeeWizard 
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={() => fetchData()}
      />
    </div>
  )
}
