import { useState } from 'react';

interface SustainabilityAxis {
  id: string;
  name: string;
  icon: string;
  score: number;
  trend: number;
  details: string;
  color: string;
}

interface Initiative {
  id: string;
  name: string;
  description: string;
  impact: string;
  savings: string;
  status: 'active' | 'planned' | 'completed';
}

const axes: SustainabilityAxis[] = [
  { id: '1', name: 'Énergie', icon: '⚡', score: 82, trend: 5, details: '12% d\'économie grâce aux thermostats connectés', color: 'from-yellow-400 to-orange-500' },
  { id: '2', name: 'Eau', icon: '💧', score: 71, trend: -2, details: 'Programme serviettes réutilisées : 67% adoption', color: 'from-blue-400 to-cyan-500' },
  { id: '3', name: 'Déchets', icon: '♻️', score: 75, trend: 8, details: '89% de tri sélectif', color: 'from-green-400 to-emerald-500' },
  { id: '4', name: 'Carbone', icon: '🌍', score: 84, trend: 3, details: 'Compensation : 2.3 tonnes ce mois', color: 'from-purple-400 to-pink-500' }
];

const initiatives: Initiative[] = [
  { id: '1', name: 'Thermostats intelligents', description: 'Régulation automatique de la température', impact: '-15% consommation', savings: '2,400€/mois', status: 'active' },
  { id: '2', name: 'Éclairage LED', description: '100% des chambres équipées LED', impact: '-40% électricité éclairage', savings: '800€/mois', status: 'completed' },
  { id: '3', name: 'Serviettes vertes', description: 'Programme de réutilisation des serviettes', impact: '-30% lavages', savings: '600€/mois', status: 'active' },
  { id: '4', name: 'Panneaux solaires', description: 'Installation de 50m² de panneaux', impact: '20% énergie renouvelable', savings: '1,200€/mois', status: 'planned' },
  { id: '5', name: 'Compostage', description: 'Valorisation des déchets alimentaires', impact: '-25% déchets', savings: '300€/mois', status: 'active' },
  { id: '6', name: 'Bornes de recharge', description: '4 bornes véhicules électriques', impact: 'Attractivité éco-clients', savings: 'Revenus: 450€/mois', status: 'completed' }
];

export default function Sustainability(_props: { language?: string }) {
  const [_selectedAxis, _setSelectedAxis] = useState<SustainabilityAxis | null>(null);

  const globalScore = Math.round(axes.reduce((sum, a) => sum + a.score, 0) / axes.length);
  const totalSavings = 5750; // €/mois

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-4xl">🌱</span>
              Sustainability Score
            </h2>
            <p className="text-green-100 mt-1">Mesurez et améliorez votre impact environnemental</p>
          </div>
          <div className="text-center">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="none" />
                <circle 
                  cx="56" cy="56" r="48" 
                  stroke="white" 
                  strokeWidth="8" 
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${globalScore * 3.02} 302`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div>
                  <div className="text-3xl font-bold">{globalScore}</div>
                  <div className="text-xs opacity-80">/100</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Score global</div>
          <div className="text-3xl font-bold text-[#10B981]">{globalScore}/100</div>
          <div className="text-xs text-emerald-600 mt-1">+5 pts ce mois</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Économies réalisées</div>
          <div className="text-3xl font-bold text-slate-800">{totalSavings.toLocaleString()}€</div>
          <div className="text-xs text-slate-500 mt-1">Ce mois</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">CO₂ compensé</div>
          <div className="text-3xl font-bold text-slate-800">2.3T</div>
          <div className="text-xs text-emerald-600 mt-1">+0.4T vs mois dernier</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Badge obtenu</div>
          <div className="text-3xl font-bold">🏆</div>
          <div className="text-xs text-emerald-600 mt-1">Hôtel Éco-Responsable 2025</div>
        </div>
      </div>

      {/* Axes */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Axes environnementaux</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {axes.map((axis) => (
            <div 
              key={axis.id}
              onClick={() => _setSelectedAxis(axis)}
              className="cursor-pointer p-4 rounded-xl border-2 border-slate-100 hover:border-emerald-200 transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{axis.icon}</span>
                <span className={`text-sm font-medium ${axis.trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {axis.trend >= 0 ? '+' : ''}{axis.trend}%
                </span>
              </div>
              <h4 className="font-semibold text-slate-800">{axis.name}</h4>
              <div className="mt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Score</span>
                  <span className="font-bold">{axis.score}/100</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${axis.color} rounded-full`}
                    style={{ width: `${axis.score}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">{axis.details}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Initiatives */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Initiatives actives</h3>
          <button className="px-4 py-2 bg-[#10B981] text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">
            + Nouvelle initiative
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {initiatives.map((init) => (
            <div 
              key={init.id}
              className={`p-4 rounded-xl border ${
                init.status === 'active' 
                  ? 'border-emerald-200 bg-emerald-50/50' 
                  : init.status === 'completed'
                  ? 'border-blue-200 bg-blue-50/50'
                  : 'border-amber-200 bg-amber-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-800">{init.name}</h4>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  init.status === 'active' 
                    ? 'bg-emerald-200 text-emerald-700' 
                    : init.status === 'completed'
                    ? 'bg-blue-200 text-blue-700'
                    : 'bg-amber-200 text-amber-700'
                }`}>
                  {init.status === 'active' ? 'Active' : init.status === 'completed' ? 'Terminée' : 'Planifiée'}
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-3">{init.description}</p>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Impact: <span className="font-medium text-slate-700">{init.impact}</span></span>
                <span className="text-emerald-600 font-medium">{init.savings}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Badges & Certifications */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Badges & Certifications</h3>
        <div className="flex flex-wrap gap-4">
          {[
            { icon: '🌿', name: 'Green Hotel 2025', status: 'obtained' },
            { icon: '♻️', name: 'Zéro Déchet Bronze', status: 'obtained' },
            { icon: '⚡', name: 'Efficacité Énergétique', status: 'obtained' },
            { icon: '💧', name: 'Économie d\'Eau', status: 'in_progress' },
            { icon: '🌍', name: 'Carbone Neutre', status: 'locked' }
          ].map((badge, idx) => (
            <div 
              key={idx}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                badge.status === 'obtained' 
                  ? 'bg-emerald-100 border-2 border-emerald-300' 
                  : badge.status === 'in_progress'
                  ? 'bg-amber-100 border-2 border-amber-300'
                  : 'bg-slate-100 border-2 border-slate-200 opacity-50'
              }`}
            >
              <span className="text-2xl">{badge.icon}</span>
              <div>
                <div className="font-medium text-slate-800">{badge.name}</div>
                <div className={`text-xs ${
                  badge.status === 'obtained' 
                    ? 'text-emerald-600' 
                    : badge.status === 'in_progress'
                    ? 'text-amber-600'
                    : 'text-slate-500'
                }`}>
                  {badge.status === 'obtained' ? '✓ Obtenu' : badge.status === 'in_progress' ? '⏳ En cours' : '🔒 À débloquer'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Objectives */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Objectifs du mois</h3>
        <div className="space-y-4">
          {[
            { name: 'Réduire la consommation d\'eau de 10%', progress: 70, target: '10%' },
            { name: 'Atteindre 95% de tri sélectif', progress: 89, target: '95%' },
            { name: 'Installer 2 nouvelles bornes de recharge', progress: 50, target: '2' },
            { name: 'Former 100% du staff aux gestes éco', progress: 85, target: '100%' }
          ].map((obj, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-700">{obj.name}</span>
                <span className="font-medium text-slate-800">{obj.progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    obj.progress >= 80 ? 'bg-emerald-500' : obj.progress >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${obj.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
