/**
 * Flowboard - Central Dashboard Hub
 * Drag & drop widgets, consolidated KPIs, timeline, AI suggestions
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useHotel } from '@/context/HotelContext';
import { 
  LayoutDashboard, TrendingUp, TrendingDown, Minus, Clock, 
  AlertTriangle, Sparkles, GripVertical, Settings, RefreshCw,
  LogIn, LogOut, Users, Building, Wallet, Star, MessageCircle,
  SprayCan, Brain, ChevronRight, Plus, Search, Calendar,
  BarChart3, Activity, Zap, Eye, EyeOff, Maximize2, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || process.env.REACT_APP_BACKEND_URL || '';

// ═══════════════════════════════════════════════════════════════════════════════
// WIDGET COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const KPICard = ({ kpi }) => {
  const trendIcon = kpi.trend_direction === 'up' ? TrendingUp : 
                    kpi.trend_direction === 'down' ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  
  const colorMap = {
    violet: 'from-violet-500 to-violet-600',
    emerald: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
  };
  
  const bgColor = colorMap[kpi.color] || 'from-slate-500 to-slate-600';
  
  return (
    <div 
      className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200"
      data-testid={`kpi-${kpi.id}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{kpi.label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {typeof kpi.value === 'number' ? kpi.value.toLocaleString('fr-FR') : kpi.value}
            <span className="text-sm font-normal text-slate-500 ml-1">{kpi.unit}</span>
          </p>
        </div>
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${bgColor} flex items-center justify-center`}>
          <span className="text-white text-lg font-bold">{kpi.value > 99 ? '99+' : ''}</span>
        </div>
      </div>
      {kpi.trend !== null && kpi.trend !== undefined && (
        <div className="flex items-center mt-2">
          <TrendIcon className={`w-4 h-4 mr-1 ${kpi.trend_direction === 'up' ? 'text-emerald-500' : kpi.trend_direction === 'down' ? 'text-red-500' : 'text-slate-400'}`} />
          <span className={`text-sm font-medium ${kpi.trend_direction === 'up' ? 'text-emerald-600' : kpi.trend_direction === 'down' ? 'text-red-600' : 'text-slate-500'}`}>
            {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
          </span>
          <span className="text-xs text-slate-400 ml-1">vs hier</span>
        </div>
      )}
    </div>
  );
};

const TimelineEvent = ({ event }) => {
  const iconMap = {
    arrival: LogIn,
    departure: LogOut,
    task: SprayCan,
    alert: AlertTriangle,
    booking: Calendar,
    payment: Wallet,
  };
  const Icon = iconMap[event.type] || Activity;
  
  const priorityColors = {
    urgent: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    normal: 'bg-slate-100 text-slate-700 border-slate-200',
    low: 'bg-slate-50 text-slate-500 border-slate-100',
  };
  
  const time = new Date(event.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  
  return (
    <div 
      className={`flex items-start gap-3 p-3 rounded-lg border ${priorityColors[event.priority] || priorityColors.normal} hover:shadow-sm transition-all cursor-pointer`}
      data-testid={`timeline-${event.id}`}
    >
      <div className="mt-0.5">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{event.title}</span>
          <Badge variant="outline" className="text-xs shrink-0">{time}</Badge>
        </div>
        {event.description && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{event.description}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
    </div>
  );
};

const AlertCard = ({ alert }) => {
  const severityStyles = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500' },
    error: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500' },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-500' },
  };
  const style = severityStyles[alert.severity] || severityStyles.info;
  
  return (
    <div 
      className={`p-3 rounded-lg border ${style.bg} ${style.border}`}
      data-testid={`alert-${alert.id}`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className={`w-4 h-4 mt-0.5 ${style.icon}`} />
        <div className="flex-1">
          <p className="font-medium text-sm text-slate-900">{alert.title}</p>
          <p className="text-xs text-slate-600 mt-0.5">{alert.message}</p>
          {alert.action_label && (
            <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs">
              {alert.action_label} →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const AISuggestionCard = ({ suggestion }) => {
  const impactColors = {
    high: 'bg-violet-100 text-violet-700',
    medium: 'bg-blue-100 text-blue-700',
    low: 'bg-slate-100 text-slate-600',
  };
  
  return (
    <div 
      className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100"
      data-testid={`ai-suggestion-${suggestion.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-slate-900">{suggestion.title}</h4>
            <Badge className={`text-xs ${impactColors[suggestion.impact]}`}>
              Impact {suggestion.impact === 'high' ? 'élevé' : suggestion.impact === 'medium' ? 'moyen' : 'faible'}
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1">{suggestion.description}</p>
          {suggestion.estimated_value && (
            <p className="text-sm font-semibold text-emerald-600 mt-2">
              +{suggestion.estimated_value.toLocaleString('fr-FR', { minimumFractionDigits: 0 })}€ potentiel
            </p>
          )}
          {suggestion.action_items && suggestion.action_items.length > 0 && (
            <div className="mt-2 space-y-1">
              {suggestion.action_items.slice(0, 2).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const QuickActionsWidget = ({ actions }) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      {actions?.map((action) => (
        <Button
          key={action.id}
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-violet-50 hover:border-violet-200"
          onClick={() => window.location.href = action.url}
          data-testid={`quick-action-${action.id}`}
        >
          {action.icon === 'plus' && <Plus className="w-5 h-5 text-violet-500" />}
          {action.icon === 'log-in' && <LogIn className="w-5 h-5 text-green-500" />}
          {action.icon === 'log-out' && <LogOut className="w-5 h-5 text-orange-500" />}
          {action.icon === 'spray-can' && <SprayCan className="w-5 h-5 text-blue-500" />}
          {action.icon === 'bar-chart-3' && <BarChart3 className="w-5 h-5 text-slate-500" />}
          <span className="text-xs font-medium">{action.label}</span>
        </Button>
      ))}
    </div>
  );
};

const HousekeepingWidget = ({ data }) => {
  const total = (data?.pending || 0) + (data?.in_progress || 0) + (data?.completed || 0);
  const completedPercent = total > 0 ? ((data?.completed || 0) / total * 100) : 0;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">Progression</span>
        <span className="text-sm font-bold text-slate-900">{completedPercent.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
          style={{ width: `${completedPercent}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-red-50 rounded-lg">
          <p className="text-lg font-bold text-red-600">{data?.pending || 0}</p>
          <p className="text-xs text-red-500">En attente</p>
        </div>
        <div className="p-2 bg-amber-50 rounded-lg">
          <p className="text-lg font-bold text-amber-600">{data?.in_progress || 0}</p>
          <p className="text-xs text-amber-500">En cours</p>
        </div>
        <div className="p-2 bg-emerald-50 rounded-lg">
          <p className="text-lg font-bold text-emerald-600">{data?.completed || 0}</p>
          <p className="text-xs text-emerald-500">Terminées</p>
        </div>
      </div>
    </div>
  );
};

const ChannelMixWidget = ({ data }) => {
  const channels = data?.channels || {};
  const total = Object.values(channels).reduce((a, b) => a + b, 0) || 1;
  
  const channelColors = {
    direct: '#22c55e',
    booking_com: '#003580',
    expedia: '#ffc72c',
    airbnb: '#ff5a5f',
    other: '#94a3b8',
  };
  
  return (
    <div className="space-y-3">
      <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
        {Object.entries(channels).map(([channel, count]) => (
          <div
            key={channel}
            className="h-full transition-all duration-300"
            style={{ 
              width: `${(count / total) * 100}%`,
              backgroundColor: channelColors[channel] || channelColors.other
            }}
            title={`${channel}: ${count}`}
          />
        ))}
      </div>
      <div className="space-y-1">
        {Object.entries(channels).map(([channel, count]) => (
          <div key={channel} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: channelColors[channel] || channelColors.other }}
              />
              <span className="text-slate-600 capitalize">{channel.replace('_', ' ')}</span>
            </div>
            <span className="font-medium text-slate-900">{count} ({((count / total) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReputationWidget = ({ data }) => {
  const score = data?.global_score || 0;
  const platforms = data?.platforms || {};
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40" cy="40" r="36"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="8"
            />
            <circle
              cx="40" cy="40" r="36"
              fill="none"
              stroke="#6C5CE7"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(score / 5) * 226} 226`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-slate-900">{score.toFixed(1)}</span>
            <span className="text-xs text-slate-500">/5</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {Object.entries(platforms).map(([platform, rating]) => (
          <div key={platform} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
            <span className="text-slate-600 capitalize">{platform}</span>
            <span className="font-semibold text-amber-600 flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {rating}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DRAGGABLE WIDGET WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

const DraggableWidget = ({ widget, children, onDragStart, onDragEnd, onToggleVisibility, isEditing }) => {
  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-2',
    large: 'col-span-2 row-span-2',
    wide: 'col-span-3',
    tall: 'col-span-1 row-span-2',
  };
  
  return (
    <div
      className={`${sizeClasses[widget.size]} ${isEditing ? 'cursor-move' : ''}`}
      draggable={isEditing}
      onDragStart={(e) => onDragStart && onDragStart(e, widget.id)}
      onDragEnd={onDragEnd}
      data-testid={`widget-${widget.id}`}
    >
      <Card className={`h-full ${isEditing ? 'ring-2 ring-violet-200 ring-dashed' : ''} ${!widget.visible ? 'opacity-50' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              {isEditing && <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />}
              {widget.title}
            </CardTitle>
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onToggleVisibility && onToggleVisibility(widget.id)}
              >
                {widget.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {widget.visible && children}
        </CardContent>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FLOWBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const Flowboard = () => {
  const { currentHotel } = useHotel();
  const [flowboardData, setFlowboardData] = useState(null);
  const [quickActions, setQuickActions] = useState([]);
  const [layout, setLayout] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  
  const fetchFlowboardData = useCallback(async () => {
    if (!currentHotel?.id) return;
    
    try {
      const token = localStorage.getItem('flowtym_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [dataRes, actionsRes, layoutRes] = await Promise.all([
        fetch(`${API_URL}/api/flowboard/hotels/${currentHotel.id}/data`, { headers }),
        fetch(`${API_URL}/api/flowboard/hotels/${currentHotel.id}/quick-actions`, { headers }),
        fetch(`${API_URL}/api/flowboard/hotels/${currentHotel.id}/layout`, { headers }),
      ]);
      
      if (dataRes.ok) {
        const data = await dataRes.json();
        setFlowboardData(data);
      }
      
      if (actionsRes.ok) {
        const actions = await actionsRes.json();
        setQuickActions(actions.actions || []);
      }
      
      if (layoutRes.ok) {
        const layoutData = await layoutRes.json();
        setLayout(layoutData);
      }
      
      setLastRefresh(new Date());
      
    } catch (error) {
      console.error('Error fetching flowboard data:', error);
      toast.error('Erreur lors du chargement du dashboard');
    } finally {
      setLoading(false);
    }
  }, [currentHotel?.id]);
  
  useEffect(() => {
    fetchFlowboardData();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchFlowboardData, 60000);
    return () => clearInterval(interval);
  }, [fetchFlowboardData]);
  
  const handleSaveLayout = async () => {
    if (!currentHotel?.id || !layout) return;
    
    try {
      const token = localStorage.getItem('flowtym_token');
      const response = await fetch(`${API_URL}/api/flowboard/hotels/${currentHotel.id}/layout`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ widgets: layout.widgets }),
      });
      
      if (response.ok) {
        toast.success('Layout sauvegardé');
        setIsEditing(false);
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };
  
  const handleToggleVisibility = (widgetId) => {
    if (!layout) return;
    
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === widgetId ? { ...w, visible: !w.visible } : w
      )
    }));
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Chargement du Flowboard...</span>
        </div>
      </div>
    );
  }
  
  if (!flowboardData) {
    return (
      <div className="text-center py-12">
        <LayoutDashboard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Aucune donnée disponible</p>
        <Button variant="outline" className="mt-4" onClick={fetchFlowboardData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Réessayer
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6" data-testid="flowboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Flowboard</h1>
          <p className="text-sm text-slate-500">
            {flowboardData.hotel_name} • {new Date(flowboardData.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-slate-400">
              Màj: {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchFlowboardData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleSaveLayout}>
                Sauvegarder
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Settings className="w-4 h-4 mr-1" />
              Personnaliser
            </Button>
          )}
        </div>
      </div>
      
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {flowboardData.kpis?.pms?.map((kpi) => (
          <KPICard key={kpi.id} kpi={kpi} />
        ))}
      </div>
      
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Column */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-violet-500" />
                  Timeline du jour
                </CardTitle>
                <Badge variant="outline">{flowboardData.timeline?.length || 0} événements</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
              {flowboardData.timeline?.length > 0 ? (
                flowboardData.timeline.map((event) => (
                  <TimelineEvent key={event.id} event={event} />
                ))
              ) : (
                <p className="text-center text-slate-400 py-8">Aucun événement pour aujourd'hui</p>
              )}
            </CardContent>
          </Card>
          
          {/* AI Suggestions */}
          {flowboardData.ai_suggestions?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  Suggestions IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {flowboardData.ai_suggestions.map((suggestion) => (
                  <AISuggestionCard key={suggestion.id} suggestion={suggestion} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Sidebar Column */}
        <div className="space-y-4">
          {/* Alerts */}
          {flowboardData.alerts?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Alertes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {flowboardData.alerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </CardContent>
            </Card>
          )}
          
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-500" />
                Actions rapides
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QuickActionsWidget actions={quickActions} />
            </CardContent>
          </Card>
          
          {/* Housekeeping */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <SprayCan className="w-4 h-4 text-blue-500" />
                Housekeeping
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HousekeepingWidget data={flowboardData.housekeeping_summary} />
            </CardContent>
          </Card>
          
          {/* Channel Mix */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                Mix Canaux
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChannelMixWidget data={flowboardData.channel_summary} />
            </CardContent>
          </Card>
          
          {/* E-Reputation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                E-Réputation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReputationWidget data={flowboardData.ereputation_summary} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Flowboard;
