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
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Clock, Calendar as CalendarIcon, LogIn, LogOut, Play, Square, Check, AlertCircle } from 'lucide-react'

export const StaffTimeTracking = () => {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  const [employees, setEmployees] = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedEmployee, setSelectedEmployee] = useState('all')
  const [clockingEmployee, setClockingEmployee] = useState(null)

  const fetchData = async () => {
    if (!currentHotel) return
    setLoading(true)
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const params = selectedEmployee !== 'all' ? `&employee_id=${selectedEmployee}` : ''
      const [empRes, entryRes] = await Promise.all([
        api.get(`/hotels/${currentHotel.id}/staff/employees?is_active=true`),
        api.get(`/hotels/${currentHotel.id}/staff/time-entries?from_date=${dateStr}&to_date=${dateStr}${params}`)
      ])
      setEmployees(empRes.data)
      setEntries(entryRes.data)
    } catch (error) {
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [currentHotel, selectedDate, selectedEmployee])

  const handleClockIn = async (employeeId) => {
    setClockingEmployee(employeeId)
    try {
      const now = new Date()
      await api.post(`/hotels/${currentHotel.id}/staff/time-entries`, {
        employee_id: employeeId,
        date: format(now, 'yyyy-MM-dd'),
        clock_in: now.toISOString()
      })
      toast.success('Pointage d\'entree enregistre')
      fetchData()
    } catch (error) {
      toast.error('Erreur lors du pointage')
    } finally {
      setClockingEmployee(null)
    }
  }

  const handleClockOut = async (entryId) => {
    try {
      await api.patch(`/hotels/${currentHotel.id}/staff/time-entries/${entryId}/clock-out`)
      toast.success('Pointage de sortie enregistre')
      fetchData()
    } catch (error) {
      toast.error('Erreur lors du pointage')
    }
  }

  const getEmployeeEntry = (employeeId) => {
    return entries.find(e => e.employee_id === employeeId && e.status === 'clocked_in')
  }

  const getTotalHours = () => {
    return entries.reduce((sum, e) => sum + (e.worked_hours || 0), 0)
  }

  const getClockedInCount = () => {
    return entries.filter(e => e.status === 'clocked_in').length
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pointage</h1>
            <p className="text-sm text-slate-500">{format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr })}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <LogIn className="w-4 h-4" />
            <span className="text-xs font-medium">Pointes actuellement</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{getClockedInCount()}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">Total heures</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{getTotalHours().toFixed(1)}h</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Check className="w-4 h-4" />
            <span className="text-xs font-medium">Pointages</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{entries.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="w-4 h-4 mr-2" />
              {format(selectedDate, 'dd MMM yyyy', { locale: fr })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={selectedDate} onSelect={d => d && setSelectedDate(d)} locale={fr} />
          </PopoverContent>
        </Popover>
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Employe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les employes</SelectItem>
            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Quick clock-in buttons */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="font-semibold text-slate-900 mb-4">Pointage rapide</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {employees.map(employee => {
            const activeEntry = getEmployeeEntry(employee.id)
            const isClocking = clockingEmployee === employee.id
            return (
              <div key={employee.id} className={`p-3 rounded-lg border ${activeEntry ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${activeEntry ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="text-sm font-medium truncate">{employee.first_name}</span>
                </div>
                {activeEntry ? (
                  <Button size="sm" variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleClockOut(activeEntry.id)}>
                    <Square className="w-3 h-3 mr-1" />Sortie
                  </Button>
                ) : (
                  <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => handleClockIn(employee.id)} disabled={isClocking}>
                    {isClocking ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" /> : <><Play className="w-3 h-3 mr-1" />Entree</>}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Entries list */}
      <div className="flex-1 bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-slate-600">Employe</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-600">Entree</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-600">Sortie</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-600">Duree</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-600">Statut</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center"><div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full spinner mx-auto" /></td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Aucun pointage pour cette date</td></tr>
              ) : entries.map(entry => (
                <tr key={entry.id} className="table-row-hover">
                  <td className="p-3">
                    <p className="font-medium text-slate-900">{entry.employee_name}</p>
                  </td>
                  <td className="p-3 font-mono text-sm">{format(parseISO(entry.clock_in), 'HH:mm')}</td>
                  <td className="p-3 font-mono text-sm">{entry.clock_out ? format(parseISO(entry.clock_out), 'HH:mm') : '-'}</td>
                  <td className="p-3 font-mono text-sm">{entry.worked_hours ? `${entry.worked_hours.toFixed(1)}h` : '-'}</td>
                  <td className="p-3">
                    <Badge className={entry.status === 'clocked_in' ? 'bg-emerald-100 text-emerald-700' : entry.status === 'validated' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}>
                      {entry.status === 'clocked_in' ? 'En cours' : entry.status === 'validated' ? 'Valide' : 'Termine'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {entry.status === 'clocked_in' && (
                      <Button size="sm" variant="outline" onClick={() => handleClockOut(entry.id)}>
                        <Square className="w-3 h-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
