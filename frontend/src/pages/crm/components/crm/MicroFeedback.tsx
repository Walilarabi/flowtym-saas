import { useState } from 'react';

interface FeedbackPoint {
  id: string;
  name: string;
  icon: string;
  trigger: string;
  responses: number;
  avgScore: number;
  trend: 'up' | 'down' | 'stable';
  isActive: boolean;
}

interface FeedbackAlert {
  id: string;
  guestName: string;
  room: string;
  feedbackPoint: string;
  score: number;
  comment: string;
  timestamp: string;
  status: 'new' | 'in_progress' | 'resolved';
}

const feedbackPoints: FeedbackPoint[] = [
  { id: '1', name: 'Première nuit', icon: '🌙', trigger: 'J+1 à 9h', responses: 234, avgScore: 8.7, trend: 'up', isActive: true },
  { id: '2', name: 'Petit-déjeuner', icon: '🍳', trigger: 'Après petit-déj', responses: 189, avgScore: 8.2, trend: 'stable', isActive: true },
  { id: '3', name: 'Spa', icon: '🧖', trigger: 'Après visite spa', responses: 67, avgScore: 9.1, trend: 'up', isActive: true },
  { id: '4', name: 'Restaurant', icon: '🍽️', trigger: 'Après dîner', responses: 145, avgScore: 8.5, trend: 'down', isActive: true },
  { id: '5', name: 'WiFi', icon: '📶', trigger: 'J+1 à 14h', responses: 312, avgScore: 7.8, trend: 'down', isActive: true },
  { id: '6', name: 'Check-out', icon: '🚪', trigger: 'Après départ', responses: 201, avgScore: 9.0, trend: 'up', isActive: true }
];

const recentAlerts: FeedbackAlert[] = [
  {
    id: '1',
    guestName: 'Marc Dubois',
    room: '302',
    feedbackPoint: 'Première nuit',
    score: 3,
    comment: 'Climatisation bruyante, impossible de dormir',
    timestamp: 'Il y a 15 min',
    status: 'new'
  },
  {
    id: '2',
    guestName: 'Sophie Bernard',
    room: '415',
    feedbackPoint: 'WiFi',
    score: 4,
    comment: 'Connexion très lente, impossible de travailler',
    timestamp: 'Il y a 45 min',
    status: 'in_progress'
  },
  {
    id: '3',
    guestName: 'Jean Martin',
    room: '208',
    feedbackPoint: 'Restaurant',
    score: 5,
    comment: 'Attente trop longue pour être servi',
    timestamp: 'Il y a 2h',
    status: 'in_progress'
  }
];

export default function MicroFeedback(_props: { language?: string }) {
  const [points, setPoints] = useState(feedbackPoints);
  const [alerts, setAlerts] = useState(recentAlerts);
  const [selectedAlert, setSelectedAlert] = useState<FeedbackAlert | null>(null);

  const togglePoint = (id: string) => {
    setPoints(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  const updateAlertStatus = (id: string, status: FeedbackAlert['status']) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    setSelectedAlert(null);
  };

  const avgOverallScore = points.reduce((sum, p) => sum + p.avgScore, 0) / points.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-4xl">📝</span>
              Micro-Feedback Temps Réel
            </h2>
            <p className="text-blue-100 mt-1">Capturez la satisfaction client à chaque étape du séjour</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{avgOverallScore.toFixed(1)}/10</div>
            <div className="text-blue-100 text-sm">Score moyen global</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Réponses ce mois</div>
          <div className="text-3xl font-bold text-slate-800">1,148</div>
          <div className="text-xs text-emerald-600 mt-1">+18% vs mois dernier</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Taux de réponse</div>
          <div className="text-3xl font-bold text-[#10B981]">67%</div>
          <div className="text-xs text-emerald-600 mt-1">+5% vs mois dernier</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Alertes actives</div>
          <div className="text-3xl font-bold text-red-500">{alerts.filter(a => a.status !== 'resolved').length}</div>
          <div className="text-xs text-slate-500 mt-1">À traiter</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Temps résolution</div>
          <div className="text-3xl font-bold text-slate-800">23 min</div>
          <div className="text-xs text-emerald-600 mt-1">-12 min vs mois dernier</div>
        </div>
      </div>

      {/* Feedback Points */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Points de collecte</h3>
          <button className="px-4 py-2 bg-[#10B981] text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">
            + Ajouter un point
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {points.map((point) => (
            <div 
              key={point.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                point.isActive ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{point.icon}</span>
                  <div>
                    <h4 className="font-semibold text-slate-800">{point.name}</h4>
                    <p className="text-xs text-slate-500">{point.trigger}</p>
                  </div>
                </div>
                <button
                  onClick={() => togglePoint(point.id)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    point.isActive ? 'bg-[#10B981]' : 'bg-slate-300'
                  }`}
                >
                  <span className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all shadow ${
                    point.isActive ? 'left-5' : 'left-0.5'
                  }`}></span>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-slate-500">{point.responses} réponses</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${
                    point.avgScore >= 8 ? 'text-[#10B981]' : point.avgScore >= 6 ? 'text-amber-500' : 'text-red-500'
                  }`}>
                    {point.avgScore}/10
                  </span>
                  <span className={`text-sm ${
                    point.trend === 'up' ? 'text-emerald-500' : point.trend === 'down' ? 'text-red-500' : 'text-slate-400'
                  }`}>
                    {point.trend === 'up' ? '↑' : point.trend === 'down' ? '↓' : '→'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">🚨 Alertes insatisfaction</h3>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
              {alerts.filter(a => a.status === 'new').length} nouvelles
            </span>
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">
              {alerts.filter(a => a.status === 'in_progress').length} en cours
            </span>
          </div>
        </div>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div 
              key={alert.id}
              onClick={() => setSelectedAlert(alert)}
              className={`p-4 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                alert.status === 'new' 
                  ? 'bg-red-50 border-l-4 border-red-500' 
                  : alert.status === 'in_progress'
                  ? 'bg-amber-50 border-l-4 border-amber-500'
                  : 'bg-emerald-50 border-l-4 border-emerald-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                    alert.score <= 4 ? 'bg-red-200 text-red-700' : 'bg-amber-200 text-amber-700'
                  }`}>
                    {alert.score}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{alert.guestName}</span>
                      <span className="text-sm text-slate-500">• Chambre {alert.room}</span>
                      <span className="px-2 py-0.5 bg-slate-200 rounded text-xs">{alert.feedbackPoint}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">"{alert.comment}"</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">{alert.timestamp}</div>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                    alert.status === 'new' 
                      ? 'bg-red-200 text-red-700' 
                      : alert.status === 'in_progress'
                      ? 'bg-amber-200 text-amber-700'
                      : 'bg-emerald-200 text-emerald-700'
                  }`}>
                    {alert.status === 'new' ? 'Nouveau' : alert.status === 'in_progress' ? 'En cours' : 'Résolu'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Gérer l'alerte</h3>
                <button onClick={() => setSelectedAlert(null)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-2xl font-bold text-red-600">
                  {selectedAlert.score}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">{selectedAlert.guestName}</h4>
                  <p className="text-sm text-slate-500">Chambre {selectedAlert.room} • {selectedAlert.feedbackPoint}</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl mb-4">
                <p className="text-slate-700">"{selectedAlert.comment}"</p>
              </div>
              <div className="space-y-3">
                <h5 className="font-medium text-slate-700">Actions rapides</h5>
                <div className="grid grid-cols-2 gap-2">
                  <button className="p-3 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                    📞 Appeler le client
                  </button>
                  <button className="p-3 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-100 transition-colors">
                    💬 Envoyer WhatsApp
                  </button>
                  <button className="p-3 bg-amber-50 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors">
                    🔧 Créer ticket maintenance
                  </button>
                  <button className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors">
                    🎁 Offrir compensation
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-between">
              <button 
                onClick={() => updateAlertStatus(selectedAlert.id, 'in_progress')}
                className="px-5 py-2.5 bg-amber-100 text-amber-700 rounded-xl font-medium hover:bg-amber-200 transition-colors"
              >
                ⏳ Marquer en cours
              </button>
              <button 
                onClick={() => updateAlertStatus(selectedAlert.id, 'resolved')}
                className="px-5 py-2.5 bg-[#10B981] text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
              >
                ✓ Marquer résolu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
