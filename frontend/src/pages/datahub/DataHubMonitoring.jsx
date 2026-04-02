import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ChartLineUp, 
  Heartbeat,
  Warning,
  CheckCircle,
  ArrowsClockwise,
  FunnelSimple,
  Terminal,
  Clock
} from '@phosphor-icons/react';
import { DataHubNav, DataHubBreadcrumb } from '../../components/datahub/DataHubNav';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_BACKEND_URL || '';
const HOTEL_ID = 'test-hotel-001';

export default function DataHubMonitoring() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const terminalRef = useRef(null);

  // Mock chart data
  const [chartData, setChartData] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/datahub/hotels/${HOTEL_ID}/events?limit=100`),
        fetch(`${API_URL}/api/datahub/hotels/${HOTEL_ID}/stats`)
      ]);

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      // Generate mock chart data
      const now = new Date();
      const mockData = [];
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        mockData.push({
          time: hour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          reservations: Math.floor(Math.random() * 20) + 5,
          syncs: Math.floor(Math.random() * 10) + 2,
          errors: Math.floor(Math.random() * 3),
        });
      }
      setChartData(mockData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchData, 10000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchData, autoRefresh]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [events]);

  const getEventIcon = (type) => {
    if (type.includes('created')) return <CheckCircle size={14} className="text-emerald-500" />;
    if (type.includes('failed') || type.includes('error')) return <Warning size={14} className="text-red-500" />;
    if (type.includes('sync')) return <ArrowsClockwise size={14} className="text-blue-500" />;
    return <Activity size={14} className="text-slate-400" />;
  };

  const formatEventType = (type) => {
    const labels = {
      'reservation.created': 'RESERVATION_CREATED',
      'reservation.modified': 'RESERVATION_MODIFIED',
      'reservation.cancelled': 'RESERVATION_CANCELLED',
      'sync.completed': 'SYNC_COMPLETED',
      'sync.failed': 'SYNC_FAILED',
      'connector.connected': 'CONNECTOR_CONNECTED',
      'connector.error': 'CONNECTOR_ERROR',
    };
    return labels[type] || type.toUpperCase().replace('.', '_');
  };

  const filteredEvents = eventFilter === 'all' 
    ? events 
    : events.filter(e => e.event_type.includes(eventFilter));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DataHubNav />
        <div className="max-w-[1600px] mx-auto p-4 md:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-slate-200 rounded-xl"></div>
              <div className="h-64 bg-slate-200 rounded-xl"></div>
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
        <DataHubBreadcrumb items={[{ label: 'Monitoring' }]} />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
              Monitoring
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Surveillance en temps réel de l'activité Data Hub
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              data-testid="toggle-auto-refresh"
            >
              <Heartbeat size={16} className={`mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
              {autoRefresh ? 'Live' : 'Pause'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              data-testid="refresh-btn"
            >
              <ArrowsClockwise size={16} />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Réservations (24h)</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats?.total_reservations || 0}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Syncs (24h)</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats?.syncs_last_24h || 0}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Erreurs (24h)</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats?.failed_syncs_last_24h || 0}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Connecteurs actifs</p>
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                {stats?.active_connectors || 0}/{stats?.total_connectors || 5}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Activity Chart */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ChartLineUp size={20} weight="duotone" className="text-violet-500" />
                Activité (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorReservations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSyncs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: 'none', 
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }}
                    />
                    <Area type="monotone" dataKey="reservations" stroke="#7c3aed" fill="url(#colorReservations)" strokeWidth={2} />
                    <Area type="monotone" dataKey="syncs" stroke="#10b981" fill="url(#colorSyncs)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Réservations</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Syncs</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Chart */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Warning size={20} weight="duotone" className="text-red-500" />
                Erreurs (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: 'none', 
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }}
                    />
                    <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event Log Terminal */}
        <Card className="bg-[#0a0a0a] border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Terminal size={20} className="text-emerald-400" />
              Event Stream
              {autoRefresh && (
                <span className="relative flex h-2 w-2 ml-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </CardTitle>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-slate-300" data-testid="event-filter">
                <FunnelSimple size={16} className="mr-2" />
                <SelectValue placeholder="Tous les événements" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les événements</SelectItem>
                <SelectItem value="reservation">Réservations</SelectItem>
                <SelectItem value="sync">Synchronisation</SelectItem>
                <SelectItem value="error">Erreurs</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            <div 
              ref={terminalRef}
              className="h-80 overflow-y-auto font-mono text-sm p-4 space-y-2"
              style={{ scrollBehavior: 'smooth' }}
            >
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 py-1 hover:bg-slate-900/50 px-2 rounded transition-colors"
                    data-testid={`event-log-${index}`}
                  >
                    <span className="text-slate-600 text-xs whitespace-nowrap">
                      {new Date(event.created_at).toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit' 
                      })}
                    </span>
                    {getEventIcon(event.event_type)}
                    <span className={`
                      ${event.event_type.includes('error') || event.event_type.includes('failed') 
                        ? 'text-red-400' 
                        : event.event_type.includes('created') 
                          ? 'text-emerald-400' 
                          : 'text-blue-400'
                      }
                    `}>
                      [{formatEventType(event.event_type)}]
                    </span>
                    <span className="text-slate-400 truncate">
                      {event.entity_type}:{event.entity_id.substring(0, 8)}...
                    </span>
                    <Badge className="ml-auto text-xs bg-slate-800 text-slate-400 border-slate-700">
                      {event.priority}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Clock size={32} className="mx-auto mb-2" />
                  <p>En attente d'événements...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
