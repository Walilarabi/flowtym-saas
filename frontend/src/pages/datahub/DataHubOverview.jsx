import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plugs, 
  ArrowsClockwise, 
  Database, 
  Users, 
  CurrencyEur,
  Warning,
  CheckCircle,
  Clock,
  TrendUp,
  TrendDown,
  CaretRight,
  Lightning,
  Gear,
  Bed,
  Tag
} from '@phosphor-icons/react';
import { DataHubNav, DataHubBreadcrumb } from '../../components/datahub/DataHubNav';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { useDataHubConfigData } from '../../hooks/useConfigData';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_BACKEND_URL || '';
const HOTEL_ID = 'test-hotel-001';

export default function DataHubOverview() {
  const [stats, setStats] = useState(null);
  const [connectors, setConnectors] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Get configuration data from central Configuration module
  const { data: configData, loading: configLoading } = useDataHubConfigData();

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, connectorsRes, eventsRes] = await Promise.all([
        fetch(`${API_URL}/api/datahub/hotels/${HOTEL_ID}/stats`),
        fetch(`${API_URL}/api/datahub/connectors/available`),
        fetch(`${API_URL}/api/datahub/hotels/${HOTEL_ID}/events?limit=10`)
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (connectorsRes.ok) {
        const data = await connectorsRes.json();
        setConnectors(data.connectors || []);
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const kpiCards = [
    {
      title: 'Réservations',
      value: stats?.total_reservations || 0,
      icon: Database,
      color: 'violet',
      trend: '+12%',
      trendUp: true
    },
    {
      title: 'Clients',
      value: stats?.total_guests || 0,
      icon: Users,
      color: 'blue',
      trend: '+5%',
      trendUp: true
    },
    {
      title: 'Syncs (24h)',
      value: stats?.syncs_last_24h || 0,
      icon: ArrowsClockwise,
      color: 'emerald',
      trend: stats?.failed_syncs_last_24h > 0 ? `${stats?.failed_syncs_last_24h} erreurs` : 'OK',
      trendUp: stats?.failed_syncs_last_24h === 0
    },
    {
      title: 'Connecteurs',
      value: `${stats?.active_connectors || 0}/${connectors.length}`,
      icon: Plugs,
      color: 'amber',
      trend: 'Actifs',
      trendUp: true
    },
  ];

  const getConnectorIcon = (type) => {
    switch (type) {
      case 'pms': return '🏨';
      case 'ota': return '🌐';
      case 'channel_manager': return '📡';
      case 'payment': return '💳';
      case 'rate_shopper': return '📊';
      default: return '🔌';
    }
  };

  const formatEventType = (type) => {
    const labels = {
      'reservation.created': 'Nouvelle réservation',
      'reservation.modified': 'Réservation modifiée',
      'reservation.cancelled': 'Annulation',
      'sync.completed': 'Sync terminé',
      'sync.failed': 'Erreur sync',
    };
    return labels[type] || type;
  };

  const getEventColor = (type) => {
    if (type.includes('created')) return 'bg-emerald-500';
    if (type.includes('cancelled') || type.includes('failed')) return 'bg-red-500';
    if (type.includes('modified')) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DataHubNav />
        <div className="max-w-[1600px] mx-auto p-4 md:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DataHubNav />
      
      <main className="max-w-[1600px] mx-auto p-4 md:p-8 lg:p-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
            Data Hub
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Centre de contrôle des intégrations et données Flowtym
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpiCards.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <Card 
                key={index}
                data-testid={`kpi-card-${kpi.title.toLowerCase()}`}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700 transition-all duration-200 hover:-translate-y-1 cursor-pointer"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                        {kpi.title}
                      </p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">
                        {kpi.value}
                      </p>
                      <div className={`flex items-center gap-1 mt-2 text-sm ${kpi.trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
                        {kpi.trendUp ? <TrendUp size={14} /> : <TrendDown size={14} />}
                        <span>{kpi.trend}</span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl bg-${kpi.color}-100 dark:bg-${kpi.color}-900/20`}>
                      <Icon size={24} weight="duotone" className={`text-${kpi.color}-600 dark:text-${kpi.color}-400`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Connectors Status */}
          <div className="lg:col-span-5">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">Connecteurs</CardTitle>
                <Link 
                  to="/datahub/connectors"
                  className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
                  data-testid="view-all-connectors"
                >
                  Voir tout <CaretRight size={14} />
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {connectors.map((connector, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    data-testid={`connector-row-${connector.name}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getConnectorIcon(connector.type)}</span>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {connector.display_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          {connector.type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                    >
                      <CheckCircle size={12} className="mr-1" />
                      Disponible
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Channel Distribution */}
          <div className="lg:col-span-4">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Répartition par Canal</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.reservations_by_channel && Object.keys(stats.reservations_by_channel).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(stats.reservations_by_channel).map(([channel, count]) => {
                      const total = Object.values(stats.reservations_by_channel).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      
                      return (
                        <div key={channel}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                              {channel.replace('_', ' ')}
                            </span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                    Aucune donnée disponible
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Events */}
          <div className="lg:col-span-3">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Lightning size={18} weight="duotone" className="text-amber-500" />
                  Activité
                </CardTitle>
              </CardHeader>
              <CardContent>
                {events.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {events.map((event, index) => (
                      <div 
                        key={index}
                        className="flex items-start gap-3 text-sm"
                      >
                        <div className={`w-2 h-2 mt-1.5 rounded-full ${getEventColor(event.event_type)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-700 dark:text-slate-300 truncate">
                            {formatEventType(event.event_type)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(event.created_at).toLocaleTimeString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                    Aucun événement récent
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Status by Reservation */}
        {stats?.reservations_by_status && Object.keys(stats.reservations_by_status).length > 0 && (
          <Card className="mt-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Statut des Réservations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {Object.entries(stats.reservations_by_status).map(([status, count]) => {
                  const colors = {
                    confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
                    checked_in: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
                    checked_out: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
                    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
                    modified: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
                    pending: 'bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
                  };
                  
                  return (
                    <div 
                      key={status}
                      className={`px-4 py-2 rounded-lg ${colors[status] || 'bg-slate-100 text-slate-700'}`}
                    >
                      <span className="font-semibold text-lg">{count}</span>
                      <span className="ml-2 capitalize">{status.replace('_', ' ')}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configuration Integration Section */}
        <Card className="mt-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Gear size={18} weight="duotone" className="text-violet-500" />
              Données de Configuration
            </CardTitle>
            <Link 
              to="/config"
              className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
            >
              Gérer <CaretRight size={14} />
            </Link>
          </CardHeader>
          <CardContent>
            {configLoading ? (
              <div className="text-center py-8 text-slate-500">Chargement...</div>
            ) : configData ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Room Types from Config */}
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Bed size={16} className="text-blue-500" />
                    Types de chambres ({configData.room_types?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {configData.room_types?.slice(0, 4).map((rt) => (
                      <div key={rt.id} className="flex items-center justify-between text-sm p-2 rounded bg-slate-50 dark:bg-slate-800">
                        <span className="font-medium">{rt.code}</span>
                        <span className="text-slate-500">{rt.name}</span>
                        <Badge variant="outline">{rt.base_price}€</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rate Plans from Config */}
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Tag size={16} className="text-emerald-500" />
                    Plans tarifaires ({configData.rate_plans?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {configData.rate_plans?.slice(0, 4).map((rp) => (
                      <div key={rp.id} className="flex items-center justify-between text-sm p-2 rounded bg-slate-50 dark:bg-slate-800">
                        <span className="font-medium">{rp.code}</span>
                        <span className="text-slate-500">{rp.name}</span>
                        <Badge variant={rp.is_public ? 'default' : 'secondary'}>
                          {rp.is_public ? 'Public' : 'Privé'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hotel Info */}
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Gear size={16} className="text-amber-500" />
                    Paramètres
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                      <span className="text-slate-500">Devise</span>
                      <span className="font-medium">{configData.currency || 'EUR'}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                      <span className="text-slate-500">Fuseau</span>
                      <span className="font-medium">{configData.timezone || 'Europe/Paris'}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                      <span className="text-slate-500">Check-in</span>
                      <span className="font-medium">{configData.check_in_time || '15:00'}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
                      <span className="text-slate-500">Check-out</span>
                      <span className="font-medium">{configData.check_out_time || '11:00'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">
                Configuration non disponible
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
