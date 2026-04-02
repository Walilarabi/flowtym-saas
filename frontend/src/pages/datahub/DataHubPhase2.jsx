/**
 * Flowtym Data Hub — Dashboard Phase 2
 * Quality Engine, Priority Engine, Smart Cache, Event Bus
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw, Zap, Shield, Database, Activity, CheckCircle2,
  AlertCircle, TrendingUp, Play, Trash2, ArrowRight, Loader2,
  BarChart3, Clock, Server, Layers, ChevronRight
} from 'lucide-react'
import { DataHubNav } from '../../components/datahub/DataHubNav'

// ── Helpers ──────────────────────────────────────────────────────────────────
const gradeColor = (g) => ({
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-amber-100 text-amber-700',
  D: 'bg-red-100 text-red-700',
}[g] || 'bg-slate-100 text-slate-600')

const KpiCard = ({ icon: Icon, label, value, sub, color = 'text-violet-600', bg = 'bg-violet-50' }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
    <div className={`p-2.5 rounded-xl ${bg} flex-shrink-0`}>
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
    <div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
)

// ── Composant principal ──────────────────────────────────────────────────────
export default function DataHubPhase2() {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  const hotelId = currentHotel?.id || 'test-hotel-001'

  const [dashboard, setDashboard] = useState(null)
  const [qualityScore, setQualityScore] = useState(null)
  const [cacheStats, setCacheStats] = useState(null)
  const [sourceHierarchy, setSourceHierarchy] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')

  const BASE = `/datahub/hotels/${hotelId}`

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [dashRes, qualRes, cacheRes, hierarchyRes, eventsRes] = await Promise.allSettled([
        api.get(`${BASE}/phase2/dashboard`),
        api.get(`${BASE}/quality/score`),
        api.get(`${BASE}/cache/stats`),
        api.get(`${BASE}/priority/source-hierarchy`),
        api.get(`${BASE}/events/stream?limit=20`),
      ])

      if (dashRes.status === 'fulfilled')      setDashboard(dashRes.value.data)
      if (qualRes.status === 'fulfilled')      setQualityScore(qualRes.value.data)
      if (cacheRes.status === 'fulfilled')     setCacheStats(cacheRes.value.data)
      if (hierarchyRes.status === 'fulfilled') setSourceHierarchy(hierarchyRes.value.data)
      if (eventsRes.status === 'fulfilled')    setEvents(eventsRes.value.data?.events || [])
    } catch {
      // Silently fallback
    } finally {
      setLoading(false)
    }
  }, [hotelId, api])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleInvalidateCache = async (entityType = null) => {
    setActionLoading('cache-invalidate')
    try {
      const params = entityType ? `?entity_type=${entityType}` : ''
      const res = await api.post(`${BASE}/cache/invalidate${params}`)
      toast.success(res.data?.message || 'Cache invalidé')
      await fetchAll()
    } catch { toast.error('Erreur invalidation cache') }
    finally { setActionLoading('') }
  }

  const handleWarmUpCache = async () => {
    setActionLoading('cache-warmup')
    try {
      const res = await api.post(`${BASE}/cache/warm-up`)
      toast.success(res.data?.message || 'Cache préchauffé')
      await fetchAll()
    } catch { toast.error('Erreur warm-up cache') }
    finally { setActionLoading('') }
  }

  const handleReplayEvents = async () => {
    setActionLoading('replay')
    try {
      const res = await api.post(`${BASE}/events/replay?limit=20`)
      toast.success(`${res.data?.events_replayed || 0} événements re-émis`)
    } catch { toast.error('Erreur replay événements') }
    finally { setActionLoading('') }
  }

  const fmtDate = (iso) => {
    if (!iso) return '—'
    try { return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) }
    catch { return iso }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app, #F8F9FC)' }}>
      <DataHubNav />

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Zap className="h-6 w-6 text-violet-600" />
              Data Hub — Phase 2
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Quality Engine · Priority Engine · Smart Cache · Event Bus
            </p>
          </div>
          <Button
            variant="outline" size="sm"
            onClick={fetchAll}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Engines actifs */}
        {dashboard && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Server className="h-4 w-4 text-violet-600" />
              Engines actifs
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(dashboard.engines_active || {}).map(([k, v]) => (
                <div key={k} className={`flex items-center gap-2 p-2 rounded-lg border ${v ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'}`}>
                  {v
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    : <AlertCircle className="h-4 w-4 text-slate-300 flex-shrink-0" />
                  }
                  <span className="text-xs font-medium text-slate-700 capitalize">
                    {k.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={BarChart3}
            label="Qualité données"
            value={qualityScore ? `${(qualityScore.overall_quality_score * 100).toFixed(0)}%` : '—'}
            sub={qualityScore?.quality_grade ? `Grade ${qualityScore.quality_grade}` : ''}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <KpiCard
            icon={Database}
            label="Cache hit rate"
            value={cacheStats ? `${((cacheStats.cache_stats?.hit_rate || 0) * 100).toFixed(0)}%` : '—'}
            sub={cacheStats ? `${cacheStats.cache_stats?.total_entries || 0} entrées` : ''}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <KpiCard
            icon={Activity}
            label="Événements"
            value={dashboard?.data_summary?.events_total ?? '—'}
            sub="dans l'Event Bus"
            color="text-violet-600"
            bg="bg-violet-50"
          />
          <KpiCard
            icon={Layers}
            label="Sources prioritaires"
            value={sourceHierarchy?.source_hierarchy?.length ?? '—'}
            sub="hiérarchie configurée"
            color="text-amber-600"
            bg="bg-amber-50"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Quality Engine */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              Quality Engine
            </h3>

            {qualityScore ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Score global</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${(qualityScore.overall_quality_score * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      {(qualityScore.overall_quality_score * 100).toFixed(0)}%
                    </span>
                    <Badge className={gradeColor(qualityScore.quality_grade)}>
                      {qualityScore.quality_grade}
                    </Badge>
                  </div>
                </div>

                {Object.entries(qualityScore.by_entity_type || {}).map(([type, score]) => (
                  score !== null && (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 capitalize">{type}s</span>
                      <span className="font-medium text-slate-700">
                        {(score * 100).toFixed(0)}%
                      </span>
                    </div>
                  )
                ))}

                <div className="pt-2 border-t border-slate-100 flex gap-2 text-xs text-slate-400">
                  <span>{qualityScore.reservations_count} réservations</span>
                  <span>·</span>
                  <span>{qualityScore.guests_count} clients</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Lancez une synchronisation pour évaluer la qualité.</p>
            )}
          </div>

          {/* Smart Cache */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              Smart Cache
            </h3>

            {cacheStats ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Entrées', value: cacheStats.cache_stats?.total_entries ?? 0 },
                    { label: 'Hits', value: cacheStats.cache_stats?.hit_count ?? 0 },
                    { label: 'Misses', value: cacheStats.cache_stats?.miss_count ?? 0 },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className="text-lg font-bold text-slate-900">{s.value}</p>
                      <p className="text-xs text-slate-500">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">Performance :</span>
                  <Badge variant="outline" className={
                    cacheStats.performance_grade === 'Excellent' ? 'border-emerald-300 text-emerald-700' :
                    cacheStats.performance_grade === 'Bon' ? 'border-blue-300 text-blue-700' :
                    'border-amber-300 text-amber-700'
                  }>
                    {cacheStats.performance_grade}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Cache non encore initialisé.</p>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Button
                size="sm" variant="outline" className="flex-1"
                onClick={handleWarmUpCache}
                disabled={!!actionLoading}
              >
                {actionLoading === 'cache-warmup'
                  ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  : <Zap className="h-3 w-3 mr-1" />
                }
                Préchauffer
              </Button>
              <Button
                size="sm" variant="outline" className="flex-1 text-red-600 hover:text-red-700"
                onClick={() => handleInvalidateCache()}
                disabled={!!actionLoading}
              >
                {actionLoading === 'cache-invalidate'
                  ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  : <Trash2 className="h-3 w-3 mr-1" />
                }
                Invalider
              </Button>
            </div>
          </div>

          {/* Priority Engine — Source Hierarchy */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              Priority Engine — Hiérarchie des sources
            </h3>
            {sourceHierarchy?.source_hierarchy ? (
              <div className="space-y-2">
                {sourceHierarchy.source_hierarchy.slice(0, 6).map((s, i) => (
                  <div key={s.source} className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${
                      i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-violet-500' : 'bg-slate-400'
                    }`}>{s.rank}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-slate-700 capitalize">
                          {s.source.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-slate-400">{s.priority}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-violet-500' : 'bg-slate-400'
                          }`}
                          style={{ width: `${(s.priority / 100) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Hiérarchie non disponible.</p>
            )}
          </div>

          {/* Event Bus */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-600" />
                Event Bus — Derniers événements
              </h3>
              <Button
                size="sm" variant="ghost"
                onClick={handleReplayEvents}
                disabled={!!actionLoading}
                className="text-xs"
              >
                {actionLoading === 'replay'
                  ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  : <Play className="h-3 w-3 mr-1" />
                }
                Replay
              </Button>
            </div>

            {events.length > 0 ? (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {events.slice(0, 8).map((e, i) => (
                  <div key={e.id ?? i} className="flex items-center gap-3 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      e.type?.includes('created') ? 'bg-emerald-100 text-emerald-700' :
                      e.type?.includes('updated') ? 'bg-blue-100 text-blue-700' :
                      e.type?.includes('cancelled') ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {e.type?.replace('_', ' ')}
                    </span>
                    <span className="text-slate-500 capitalize">{e.source}</span>
                    <span className="text-slate-400 ml-auto flex-shrink-0">{fmtDate(e.occurred_at)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Aucun événement. Lancez une synchronisation.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
