/**
 * Flowtym — Budget & Forecast
 * Prévisions annuelles, comparaison budget vs réel, pricing dynamique.
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  TrendingUp, TrendingDown, Euro, BarChart3, Calendar, Download,
  Plus, Zap, Edit, Trash2, RefreshCw, CheckCircle2, AlertTriangle,
  Settings, Play
} from 'lucide-react'

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
                   'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

const fmtK = (n) => n >= 1000
  ? `${(n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}k€`
  : `${(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€`

const VariancePill = ({ pct }) => {
  if (pct == null) return <span className="text-xs text-slate-400">—</span>
  const pos = pct >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${pos ? 'text-emerald-600' : 'text-red-600'}`}>
      {pos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {pos ? '+' : ''}{pct}%
    </span>
  )
}

// ── Formulaire saisie budget mensuel ─────────────────────────────────────────
const BudgetForm = ({ month, year, existing, onSave, onCancel }) => {
  const [form, setForm] = useState({
    budget_revenue: existing?.budget_revenue ?? '',
    budget_occupation: existing?.budget_occupation ?? '',
    budget_adr: existing?.budget_adr ?? '',
    forecast_revenue: existing?.forecast_revenue ?? '',
    forecast_occupation: existing?.forecast_occupation ?? '',
    forecast_adr: existing?.forecast_adr ?? '',
    notes: existing?.notes ?? '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const num = (v) => v === '' ? undefined : parseFloat(v)

  return (
    <div className="space-y-4">
      <div className="bg-violet-50 rounded-xl px-4 py-2 text-sm font-semibold text-violet-700">
        {MONTHS_FR[month - 1]} {year}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Budget</p>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">CA Budget (€)</label>
              <Input type="number" value={form.budget_revenue} onChange={e => set('budget_revenue', e.target.value)} placeholder="Ex: 45000" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">Occupation Budget (%)</label>
              <Input type="number" min={0} max={100} value={form.budget_occupation} onChange={e => set('budget_occupation', e.target.value)} placeholder="Ex: 75" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">ADR Budget (€)</label>
              <Input type="number" value={form.budget_adr} onChange={e => set('budget_adr', e.target.value)} placeholder="Ex: 120" />
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Forecast</p>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">CA Forecast (€)</label>
              <Input type="number" value={form.forecast_revenue} onChange={e => set('forecast_revenue', e.target.value)} placeholder="Ex: 47000" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">Occupation Forecast (%)</label>
              <Input type="number" min={0} max={100} value={form.forecast_occupation} onChange={e => set('forecast_occupation', e.target.value)} placeholder="Ex: 78" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">ADR Forecast (€)</label>
              <Input type="number" value={form.forecast_adr} onChange={e => set('forecast_adr', e.target.value)} placeholder="Ex: 125" />
            </div>
          </div>
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-500 mb-0.5 block">Notes</label>
        <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Ex: Festival de Cannes → pics anticipés" />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={() => onSave({
          budget_revenue: num(form.budget_revenue),
          budget_occupation: num(form.budget_occupation),
          budget_adr: num(form.budget_adr),
          forecast_revenue: num(form.forecast_revenue),
          forecast_occupation: num(form.forecast_occupation),
          forecast_adr: num(form.forecast_adr),
          notes: form.notes || undefined,
        })} style={{ background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)' }} className="text-white">
          Enregistrer
        </Button>
      </DialogFooter>
    </div>
  )
}

// ── Formulaire règle de prix dynamique ────────────────────────────────────────
const PricingRuleForm = ({ onSave, onCancel, initial = {} }) => {
  const [form, setForm] = useState({
    rule_name: '', room_type_code: '', occupancy_threshold: 80,
    multiplier: 1.2, min_price: '', max_price: '', is_active: true, applies_to_days: [],
    ...initial,
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const toggleDay = (d) => set('applies_to_days',
    form.applies_to_days.includes(d)
      ? form.applies_to_days.filter(x => x !== d)
      : [...form.applies_to_days, d]
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Nom de la règle *</label>
          <Input value={form.rule_name} onChange={e => set('rule_name', e.target.value)} placeholder="Ex: Règle haute saison" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Type de chambre</label>
          <Input value={form.room_type_code} onChange={e => set('room_type_code', e.target.value)} placeholder="DBL, STE, ALL…" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Seuil occupation (%)</label>
          <Input type="number" min={0} max={100} value={form.occupancy_threshold} onChange={e => set('occupancy_threshold', parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Multiplicateur *</label>
          <Input type="number" step="0.05" min={0.5} max={5} value={form.multiplier} onChange={e => set('multiplier', parseFloat(e.target.value) || 1)} />
          <p className="text-xs text-slate-400 mt-0.5">Ex: 1.2 = +20%, 1.5 = +50%</p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Prix min (€)</label>
          <Input type="number" value={form.min_price} onChange={e => set('min_price', e.target.value)} placeholder="Optionnel" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Prix max (€)</label>
          <Input type="number" value={form.max_price} onChange={e => set('max_price', e.target.value)} placeholder="Optionnel" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600 mb-1.5 block">Jours d'application (vide = tous)</label>
          <div className="flex gap-1.5 flex-wrap">
            {DAYS.map((d, i) => (
              <button key={i} type="button" onClick={() => toggleDay(i)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  form.applies_to_days.includes(i)
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-violet-400'
                }`}>{d}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="rounded" />
        <label htmlFor="active" className="text-sm text-slate-700">Règle active</label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={() => onSave({
          ...form,
          min_price: form.min_price ? parseFloat(form.min_price) : null,
          max_price: form.max_price ? parseFloat(form.max_price) : null,
        })} disabled={!form.rule_name}
          style={{ background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)' }} className="text-white">
          {initial.id ? 'Mettre à jour' : 'Créer la règle'}
        </Button>
      </DialogFooter>
    </div>
  )
}

// ── Simulateur ────────────────────────────────────────────────────────────────
const PricingSimulator = ({ onSimulate }) => {
  const [base, setBase] = useState(120)
  const [occ, setOcc] = useState(85)
  const [result, setResult] = useState(null)

  const run = async () => {
    const r = await onSimulate({ base_price: base, current_occupation: occ })
    setResult(r)
  }

  return (
    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Play size={14} /> Simulateur de prix</h3>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs text-slate-500 mb-1 block">Prix de base (€)</label>
          <Input type="number" value={base} onChange={e => setBase(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="flex-1">
          <label className="text-xs text-slate-500 mb-1 block">Occupation actuelle (%)</label>
          <Input type="number" min={0} max={100} value={occ} onChange={e => setOcc(parseFloat(e.target.value) || 0)} />
        </div>
        <Button onClick={run} variant="outline" className="gap-1.5"><Zap size={14} /> Simuler</Button>
      </div>
      {result && (
        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Prix de base</p>
              <p className="font-bold text-slate-700">{result.base_price} €</p>
            </div>
            <div className="text-2xl text-slate-300">→</div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Prix final</p>
              <p className="text-2xl font-black text-violet-700">{result.final_price} €</p>
            </div>
            <div className={`text-sm font-bold ${result.uplift_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {result.uplift_pct >= 0 ? '+' : ''}{result.uplift_pct}%
            </div>
          </div>
          {result.rules_applied?.length > 0 && (
            <div className="mt-2 space-y-1">
              {result.rules_applied.map((r, i) => (
                <p key={i} className="text-xs text-slate-500">
                  ✦ {r.rule_name} (occ ≥ {r.threshold}%) → ×{r.multiplier}
                </p>
              ))}
            </div>
          )}
          {result.rules_applied?.length === 0 && (
            <p className="text-xs text-slate-400 mt-1">Aucune règle déclenchée.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────
export function ForecastPage() {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  const hotelId = currentHotel?.id

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [tab, setTab] = useState('forecast') // 'forecast' | 'pricing'
  const [months, setMonths] = useState([])
  const [stats, setStats] = useState(null)
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [editMonth, setEditMonth] = useState(null)
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [editRule, setEditRule] = useState(null)

  const fetchForecast = useCallback(async () => {
    if (!hotelId) return
    setLoading(true)
    try {
      const [fRes, sRes] = await Promise.all([
        api.get(`/hotels/${hotelId}/forecasts?year=${year}`),
        api.get(`/hotels/${hotelId}/forecasts/stats?year=${year}`),
      ])
      setMonths(fRes.data?.months || [])
      setStats(sRes.data)
    } catch { toast.error('Erreur chargement prévisions') }
    finally { setLoading(false) }
  }, [hotelId, year, api])

  const fetchRules = useCallback(async () => {
    if (!hotelId) return
    try {
      const res = await api.get(`/hotels/${hotelId}/dynamic-pricing`)
      setRules(res.data?.rules || [])
    } catch {}
  }, [hotelId, api])

  useEffect(() => { fetchForecast(); fetchRules() }, [fetchForecast, fetchRules])

  const handleSaveBudget = async (data) => {
    try {
      await api.put(`/hotels/${hotelId}/forecasts/${year}/${editMonth.month}`, data)
      toast.success('Prévisions enregistrées')
      setEditMonth(null)
      fetchForecast()
    } catch { toast.error('Erreur enregistrement') }
  }

  const handleGenerate = async () => {
    try {
      await api.post(`/hotels/${hotelId}/forecasts/generate`, { year: year + 1 })
      toast.success(`Forecast ${year + 1} généré automatiquement`)
      if (year === currentYear + 1) fetchForecast()
    } catch { toast.error('Erreur génération') }
  }

  const handleExport = () => {
    window.open(`${import.meta.env.VITE_BACKEND_URL || ''}/api/hotels/${hotelId}/forecasts/export?year=${year}`, '_blank')
  }

  const handleCreateRule = async (rule) => {
    try {
      await api.post(`/hotels/${hotelId}/dynamic-pricing`, rule)
      toast.success('Règle créée')
      setShowRuleForm(false)
      fetchRules()
    } catch { toast.error('Erreur création règle') }
  }

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Supprimer cette règle ?')) return
    try {
      await api.delete(`/hotels/${hotelId}/dynamic-pricing/${ruleId}`)
      toast.success('Règle supprimée')
      fetchRules()
    } catch { toast.error('Erreur suppression') }
  }

  const handleToggleRule = async (rule) => {
    try {
      await api.put(`/hotels/${hotelId}/dynamic-pricing/${rule.id}`, { is_active: !rule.is_active })
      fetchRules()
    } catch {}
  }

  const handleSimulate = async (params) => {
    try {
      const res = await api.post(`/hotels/${hotelId}/dynamic-pricing/simulate`, params)
      return res.data
    } catch { toast.error('Erreur simulation'); return null }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-violet-600" /> Budget & Forecast
          </h1>
          <p className="text-slate-500 text-sm mt-1">Prévisions annuelles · Réel vs Budget · Prix dynamiques</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium"
            value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button variant="outline" onClick={handleGenerate} className="gap-2 text-sm">
            <Zap size={14} /> Générer N+1
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-2 text-sm">
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { id: 'forecast', label: 'Prévisions', icon: BarChart3 },
          { id: 'pricing', label: 'Prix dynamiques', icon: Zap },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'forecast' && (
        <>
          {/* KPIs annuels */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: `CA Budget ${year}`, value: fmtK(stats.budget?.total_revenue), icon: Euro, color: 'text-slate-600', bg: 'bg-slate-50' },
                { label: `CA Réel ${year}`, value: fmtK(stats.actual?.total_revenue), icon: Euro, color: 'text-violet-600', bg: 'bg-violet-50', variance: stats.variance_revenue_pct },
                { label: 'Occupation Budget', value: `${stats.budget?.avg_occupation ?? 0}%`, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Occupation Réelle', value: `${stats.actual?.avg_occupation ?? 0}%`, icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50', variance: stats.variance_occupation_pct },
              ].map((kpi, i) => (
                <Card key={i} className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`p-1.5 rounded-lg ${kpi.bg}`}><kpi.icon className={`h-4 w-4 ${kpi.color}`} /></div>
                      <p className="text-xs text-slate-500">{kpi.label}</p>
                    </div>
                    <p className="text-xl font-bold text-slate-900">{kpi.value}</p>
                    {kpi.variance != null && <VariancePill pct={kpi.variance} />}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Tableau mensuel */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tableau mensuel {year}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                      <th className="text-left px-4 py-3 font-semibold">Mois</th>
                      <th className="text-right px-3 py-3 font-semibold">Budget CA</th>
                      <th className="text-right px-3 py-3 font-semibold">Forecast CA</th>
                      <th className="text-right px-3 py-3 font-semibold">Réel CA</th>
                      <th className="text-right px-3 py-3 font-semibold">Var.</th>
                      <th className="text-right px-3 py-3 font-semibold">Occ. B.</th>
                      <th className="text-right px-3 py-3 font-semibold">Occ. R.</th>
                      <th className="text-center px-3 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {months.map((m, i) => {
                      const isCurrentMonth = m.month === new Date().getMonth() + 1 && year === currentYear
                      return (
                        <tr key={i} className={`hover:bg-slate-50 transition-colors ${isCurrentMonth ? 'bg-violet-50/40' : ''}`}>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {MONTHS_FR[m.month - 1]}
                            {isCurrentMonth && <span className="ml-1.5 text-[10px] bg-violet-600 text-white px-1.5 py-0.5 rounded-full">En cours</span>}
                          </td>
                          <td className="px-3 py-3 text-right text-slate-600">{m.budget_revenue != null ? fmtK(m.budget_revenue) : <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-3 text-right text-blue-600 font-medium">{m.forecast_revenue != null ? fmtK(m.forecast_revenue) : <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-3 text-right font-semibold text-slate-900">{m.actual_revenue != null ? fmtK(m.actual_revenue) : <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-3 text-right"><VariancePill pct={m.variance_revenue} /></td>
                          <td className="px-3 py-3 text-right text-slate-500">{m.budget_occupation != null ? `${m.budget_occupation}%` : <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-3 text-right font-medium">{m.actual_occupation != null ? `${m.actual_occupation}%` : <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-3 text-center">
                            <button onClick={() => setEditMonth(m)}
                              className="p-1.5 rounded-lg hover:bg-violet-100 text-slate-400 hover:text-violet-600 transition-colors">
                              <Edit size={14} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'pricing' && (
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-slate-900">Règles de prix dynamiques</h2>
              <p className="text-xs text-slate-500 mt-0.5">Ajustement automatique des tarifs selon le taux d'occupation</p>
            </div>
            <Button onClick={() => setShowRuleForm(true)}
              style={{ background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)' }} className="text-white gap-2">
              <Plus size={14} /> Nouvelle règle
            </Button>
          </div>

          <PricingSimulator onSimulate={handleSimulate} />

          <Card className="border-slate-200">
            {rules.length === 0 ? (
              <CardContent className="py-10 text-center">
                <Zap size={36} className="mx-auto mb-2 text-slate-200" />
                <p className="text-slate-500 text-sm">Aucune règle. Créez votre première règle de yield management.</p>
              </CardContent>
            ) : (
              <div className="divide-y divide-slate-100">
                {rules.map(rule => (
                  <div key={rule.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${rule.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{rule.rule_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {rule.room_type_code || 'Toutes chambres'} · Si occ ≥ {rule.occupancy_threshold}% → ×{rule.multiplier}
                        {rule.min_price ? ` (min ${rule.min_price}€)` : ''}
                        {rule.max_price ? ` (max ${rule.max_price}€)` : ''}
                        {rule.applies_to_days?.length > 0 ? ` · ${rule.applies_to_days.length}j/semaine` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${rule.multiplier > 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {rule.multiplier > 1 ? '+' : ''}{Math.round((rule.multiplier - 1) * 100)}%
                      </span>
                      <button onClick={() => handleToggleRule(rule)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${
                          rule.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button onClick={() => handleDeleteRule(rule.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Modal saisie budget */}
      <Dialog open={!!editMonth} onOpenChange={() => setEditMonth(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Saisir les prévisions</DialogTitle></DialogHeader>
          {editMonth && (
            <BudgetForm
              month={editMonth.month} year={year} existing={editMonth}
              onSave={handleSaveBudget} onCancel={() => setEditMonth(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal création règle */}
      <Dialog open={showRuleForm} onOpenChange={setShowRuleForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouvelle règle de prix dynamique</DialogTitle></DialogHeader>
          <PricingRuleForm onSave={handleCreateRule} onCancel={() => setShowRuleForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ForecastPage
