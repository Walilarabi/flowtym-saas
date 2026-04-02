import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Receipt, Calculator, Download, Check, Send, FileText, Euro, Building2, AlertCircle } from 'lucide-react'

const MONTHS = [
  { value: 1, label: 'Janvier' }, { value: 2, label: 'Fevrier' }, { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' }, { value: 8, label: 'Aout' }, { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' }, { value: 11, label: 'Novembre' }, { value: 12, label: 'Decembre' },
]

export const StaffPayroll = () => {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  const [employees, setEmployees] = useState([])
  const [payrolls, setPayrolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const fetchData = async () => {
    if (!currentHotel) return
    setLoading(true)
    try {
      const [empRes, payRes] = await Promise.all([
        api.get(`/hotels/${currentHotel.id}/staff/employees?is_active=true`),
        api.get(`/hotels/${currentHotel.id}/staff/payroll?month=${selectedMonth}&year=${selectedYear}`)
      ])
      setEmployees(empRes.data)
      setPayrolls(payRes.data)
    } catch (error) {
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [currentHotel, selectedMonth, selectedYear])

  const handleCalculatePayroll = async (employeeId) => {
    setCalculating(true)
    try {
      await api.post(`/hotels/${currentHotel.id}/staff/payroll/calculate`, {
        employee_id: employeeId,
        month: selectedMonth,
        year: selectedYear
      })
      toast.success('Bulletin calcule')
      fetchData()
    } catch (error) {
      toast.error('Erreur lors du calcul')
    } finally {
      setCalculating(false)
    }
  }

  const handleCalculateAll = async () => {
    setCalculating(true)
    try {
      for (const emp of employees) {
        await api.post(`/hotels/${currentHotel.id}/staff/payroll/calculate`, {
          employee_id: emp.id,
          month: selectedMonth,
          year: selectedYear
        })
      }
      toast.success('Tous les bulletins calcules')
      fetchData()
    } catch (error) {
      toast.error('Erreur lors du calcul')
    } finally {
      setCalculating(false)
    }
  }

  const handleValidatePayroll = async (payrollId) => {
    try {
      await api.patch(`/hotels/${currentHotel.id}/staff/payroll/${payrollId}/validate`)
      toast.success('Bulletin valide')
      fetchData()
    } catch (error) {
      toast.error('Erreur lors de la validation')
    }
  }

  const handleMarkPaid = async (payrollId) => {
    try {
      await api.patch(`/hotels/${currentHotel.id}/staff/payroll/${payrollId}/mark-paid`)
      toast.success('Bulletin marque comme paye')
      fetchData()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const getEmployeePayroll = (employeeId) => payrolls.find(p => p.employee_id === employeeId)

  const getTotals = () => {
    const gross = payrolls.reduce((s, p) => s + p.gross_salary, 0)
    const net = payrolls.reduce((s, p) => s + p.net_salary, 0)
    const charges = payrolls.reduce((s, p) => s + p.social_charges_employer, 0)
    return { gross, net, charges, total: gross + charges }
  }

  const totals = getTotals()

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <Receipt className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Paie & URSSAF</h1>
            <p className="text-sm text-slate-500">{MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}</p>
          </div>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700" onClick={handleCalculateAll} disabled={calculating}>
          {calculating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
          Calculer tous les bulletins
        </Button>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-3">
        <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(parseInt(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-slate-500 mb-1"><Euro className="w-4 h-4" /><span className="text-xs font-medium">Masse salariale brute</span></div>
          <p className="text-2xl font-bold">{totals.gross.toLocaleString()} EUR</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-slate-500 mb-1"><Building2 className="w-4 h-4" /><span className="text-xs font-medium">Charges patronales</span></div>
          <p className="text-2xl font-bold text-amber-600">{totals.charges.toLocaleString()} EUR</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-slate-500 mb-1"><Receipt className="w-4 h-4" /><span className="text-xs font-medium">Net a payer</span></div>
          <p className="text-2xl font-bold text-emerald-600">{totals.net.toLocaleString()} EUR</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-slate-500 mb-1"><AlertCircle className="w-4 h-4" /><span className="text-xs font-medium">Cout total employeur</span></div>
          <p className="text-2xl font-bold text-violet-600">{totals.total.toLocaleString()} EUR</p>
        </div>
      </div>

      <Tabs defaultValue="payslips" className="flex-1">
        <TabsList>
          <TabsTrigger value="payslips">Bulletins de paie</TabsTrigger>
          <TabsTrigger value="urssaf">Declaration URSSAF</TabsTrigger>
        </TabsList>

        <TabsContent value="payslips" className="mt-4">
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold text-slate-600">Employe</th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-600">Heures</th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-600">Brut</th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-600">Charges sal.</th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-600">Net</th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-600">Statut</th>
                  <th className="w-32"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center"><div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full spinner mx-auto" /></td></tr>
                ) : employees.map(employee => {
                  const payroll = getEmployeePayroll(employee.id)
                  return (
                    <tr key={employee.id} className="table-row-hover">
                      <td className="p-3"><p className="font-medium text-slate-900">{employee.first_name} {employee.last_name}</p></td>
                      <td className="p-3 text-right font-mono">{payroll?.worked_hours || '-'}</td>
                      <td className="p-3 text-right font-mono">{payroll ? `${payroll.gross_salary.toLocaleString()} EUR` : '-'}</td>
                      <td className="p-3 text-right font-mono text-red-600">{payroll ? `-${payroll.social_charges_employee.toLocaleString()} EUR` : '-'}</td>
                      <td className="p-3 text-right font-mono font-semibold text-emerald-600">{payroll ? `${payroll.net_salary.toLocaleString()} EUR` : '-'}</td>
                      <td className="p-3">
                        {payroll ? (
                          <Badge className={payroll.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : payroll.status === 'validated' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}>
                            {payroll.status === 'paid' ? 'Paye' : payroll.status === 'validated' ? 'Valide' : 'Brouillon'}
                          </Badge>
                        ) : <Badge variant="outline">Non calcule</Badge>}
                      </td>
                      <td className="p-3">
                        {!payroll ? (
                          <Button size="sm" variant="outline" onClick={() => handleCalculatePayroll(employee.id)} disabled={calculating}>
                            <Calculator className="w-3 h-3 mr-1" />Calculer
                          </Button>
                        ) : payroll.status === 'draft' ? (
                          <Button size="sm" variant="outline" onClick={() => handleValidatePayroll(payroll.id)}>
                            <Check className="w-3 h-3 mr-1" />Valider
                          </Button>
                        ) : payroll.status === 'validated' ? (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleMarkPaid(payroll.id)}>
                            <Euro className="w-3 h-3 mr-1" />Payer
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline"><Download className="w-3 h-3 mr-1" />PDF</Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="urssaf" className="mt-4">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Declaration URSSAF - {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}</h2>
            
            {payrolls.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Calculez d'abord les bulletins de paie</p>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {['securite_sociale', 'assurance_chomage', 'retraite_complementaire', 'csg_crds', 'formation_professionnelle', 'taxe_apprentissage'].map(key => {
                    const total = payrolls.reduce((s, p) => s + (p.urssaf_declarations?.[key] || 0), 0)
                    const labels = {
                      securite_sociale: 'Securite sociale (maladie, vieillesse)',
                      assurance_chomage: 'Assurance chomage',
                      retraite_complementaire: 'Retraite complementaire',
                      csg_crds: 'CSG / CRDS',
                      formation_professionnelle: 'Formation professionnelle',
                      taxe_apprentissage: 'Taxe d\'apprentissage'
                    }
                    return (
                      <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-700">{labels[key]}</span>
                        <span className="font-mono font-semibold">{total.toFixed(2)} EUR</span>
                      </div>
                    )
                  })}
                </div>
                
                <div className="flex items-center justify-between p-4 bg-violet-50 rounded-lg border border-violet-200">
                  <span className="font-semibold text-violet-900">Total cotisations URSSAF</span>
                  <span className="text-xl font-bold text-violet-700">
                    {payrolls.reduce((s, p) => s + Object.values(p.urssaf_declarations || {}).reduce((a, b) => a + b, 0), 0).toFixed(2)} EUR
                  </span>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" className="flex-1"><Download className="w-4 h-4 mr-2" />Telecharger DSN</Button>
                  <Button className="flex-1 bg-violet-600 hover:bg-violet-700"><Send className="w-4 h-4 mr-2" />Transmettre a l'URSSAF</Button>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
