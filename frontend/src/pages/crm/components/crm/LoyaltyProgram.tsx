import { useState } from 'react';

interface LoyaltyLevel {
  id: string;
  name: string;
  icon: string;
  color: string;
  minPoints: number;
  members: number;
  benefits: string[];
  badge: string;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  reward: string;
  progress: number;
  target: number;
  endDate: string;
  participants: number;
}

const loyaltyLevels: LoyaltyLevel[] = [
  {
    id: '1',
    name: 'Explorer',
    icon: '🌱',
    color: 'from-slate-400 to-slate-500',
    minPoints: 0,
    members: 1245,
    benefits: ['-5% sur réservation directe', 'Newsletter exclusive'],
    badge: '🥉'
  },
  {
    id: '2',
    name: 'Voyager',
    icon: '✈️',
    color: 'from-blue-400 to-blue-500',
    minPoints: 500,
    members: 567,
    benefits: ['-10% sur réservation directe', 'Late check-out gratuit', 'Accès ventes privées'],
    badge: '🥈'
  },
  {
    id: '3',
    name: 'Aventurier',
    icon: '🏔️',
    color: 'from-purple-400 to-purple-500',
    minPoints: 1500,
    members: 234,
    benefits: ['-15% sur réservation directe', 'Surclassement automatique', 'Petit-déjeuner offert', 'Invitations événements'],
    badge: '🥇'
  },
  {
    id: '4',
    name: 'Ambassadeur',
    icon: '👑',
    color: 'from-amber-400 to-amber-500',
    minPoints: 5000,
    members: 89,
    benefits: ['-20% sur réservation directe', 'Nuit gratuite / 10 nuits', 'Conciergerie dédiée', 'Spa offert'],
    badge: '💎'
  },
  {
    id: '5',
    name: 'Légende',
    icon: '⭐',
    color: 'from-rose-400 to-rose-500',
    minPoints: 15000,
    members: 12,
    benefits: ['Tarif "ami du propriétaire"', 'Accès illimité tous services', 'Co-création offres', 'Expériences sur-mesure'],
    badge: '👸'
  }
];

const challenges: Challenge[] = [
  {
    id: '1',
    name: 'Première réservation directe',
    description: 'Réservez directement sur notre site',
    reward: '100 points bonus',
    progress: 0,
    target: 1,
    endDate: 'Permanent',
    participants: 234
  },
  {
    id: '2',
    name: 'Weekend en amoureux',
    description: 'Réservez un séjour de 2 nuits minimum pour 2',
    reward: 'Dîner romantique offert',
    progress: 1,
    target: 1,
    endDate: '28 Fév 2025',
    participants: 156
  },
  {
    id: '3',
    name: 'Parrain fidèle',
    description: 'Parrainez 3 amis qui réservent',
    reward: '1 nuit gratuite',
    progress: 2,
    target: 3,
    endDate: '31 Mars 2025',
    participants: 89
  },
  {
    id: '4',
    name: 'Avis 5 étoiles',
    description: 'Laissez 3 avis positifs après vos séjours',
    reward: 'Surclassement garanti',
    progress: 1,
    target: 3,
    endDate: 'Permanent',
    participants: 412
  }
];

export default function LoyaltyProgram(_props: { language?: string }) {
  const [activeTab, setActiveTab] = useState<'levels' | 'challenges' | 'referral'>('levels');
  const [showModal, setShowModal] = useState(false);

  const totalMembers = loyaltyLevels.reduce((sum, l) => sum + l.members, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-rose-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-4xl">🏆</span>
              Programme Fidélité 3.0
            </h2>
            <p className="text-amber-100 mt-1">Gamification et récompenses pour vos clients</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 bg-white text-amber-600 rounded-xl font-semibold hover:bg-amber-50 transition-colors"
          >
            ⚙️ Configurer
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Membres total</div>
          <div className="text-3xl font-bold text-slate-800">{totalMembers.toLocaleString()}</div>
          <div className="text-xs text-emerald-600 mt-1">+12% ce mois</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Points distribués</div>
          <div className="text-3xl font-bold text-amber-500">847K</div>
          <div className="text-xs text-slate-500 mt-1">Ce mois</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Taux de réachat</div>
          <div className="text-3xl font-bold text-[#10B981]">34%</div>
          <div className="text-xs text-emerald-600 mt-1">+8% vs non-membres</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Parrainages</div>
          <div className="text-3xl font-bold text-slate-800">156</div>
          <div className="text-xs text-emerald-600 mt-1">+24 ce mois</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-slate-100 w-fit">
        {[
          { id: 'levels', label: 'Niveaux', icon: '🎖️' },
          { id: 'challenges', label: 'Challenges', icon: '🎯' },
          { id: 'referral', label: 'Parrainage', icon: '🤝' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-[#10B981] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Levels Tab */}
      {activeTab === 'levels' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {loyaltyLevels.map((level, idx) => (
            <div key={level.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className={`bg-gradient-to-r ${level.color} p-4 text-white text-center`}>
                <div className="text-4xl mb-2">{level.icon}</div>
                <h3 className="font-bold text-lg">{level.name}</h3>
                <div className="text-sm opacity-90">{level.badge} {level.minPoints}+ pts</div>
              </div>
              <div className="p-4">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-slate-800">{level.members}</div>
                  <div className="text-xs text-slate-500">membres</div>
                </div>
                <div className="space-y-2">
                  {level.benefits.map((benefit, bidx) => (
                    <div key={bidx} className="flex items-start gap-2 text-sm">
                      <span className="text-[#10B981]">✓</span>
                      <span className="text-slate-600">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
              {idx < loyaltyLevels.length - 1 && (
                <div className="px-4 pb-4">
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${level.color}`}
                      style={{ width: `${(level.members / totalMembers) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Challenges Tab */}
      {activeTab === 'challenges' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">Challenges actifs</h3>
            <button className="px-4 py-2 bg-[#10B981] text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">
              + Nouveau challenge
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-slate-800">{challenge.name}</h4>
                    <p className="text-sm text-slate-500">{challenge.description}</p>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">
                    🎁 {challenge.reward}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Progression</span>
                    <span className="font-medium text-slate-700">{challenge.progress}/{challenge.target}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-rose-400 rounded-full transition-all"
                      style={{ width: `${(challenge.progress / challenge.target) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>📅 {challenge.endDate}</span>
                    <span>👥 {challenge.participants} participants</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referral Tab */}
      {activeTab === 'referral' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Programme de parrainage</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-emerald-50 rounded-xl">
                <div className="text-4xl mb-3">🎁</div>
                <h4 className="font-semibold text-slate-800">Le parrain reçoit</h4>
                <p className="text-[#10B981] font-bold text-xl mt-2">15% de réduction</p>
                <p className="text-sm text-slate-500">sur sa prochaine réservation</p>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-xl">
                <div className="text-4xl mb-3">🎉</div>
                <h4 className="font-semibold text-slate-800">Le filleul reçoit</h4>
                <p className="text-purple-600 font-bold text-xl mt-2">10% de réduction</p>
                <p className="text-sm text-slate-500">sur sa première réservation</p>
              </div>
              <div className="text-center p-6 bg-amber-50 rounded-xl">
                <div className="text-4xl mb-3">⭐</div>
                <h4 className="font-semibold text-slate-800">Bonus fidélité</h4>
                <p className="text-amber-600 font-bold text-xl mt-2">+200 points</p>
                <p className="text-sm text-slate-500">pour chaque parrainage réussi</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Top parrains du mois</h3>
            <div className="space-y-3">
              {[
                { rank: '🥇', name: 'Marie Laurent', referrals: 8, points: 1600 },
                { rank: '🥈', name: 'Jean Dupont', referrals: 6, points: 1200 },
                { rank: '🥉', name: 'Sophie Martin', referrals: 5, points: 1000 },
                { rank: '4', name: 'Pierre Durand', referrals: 4, points: 800 },
                { rank: '5', name: 'Claire Bernard', referrals: 3, points: 600 }
              ].map((parrain, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center text-lg">{parrain.rank}</span>
                    <span className="font-medium text-slate-800">{parrain.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500">{parrain.referrals} parrainages</span>
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold">
                      +{parrain.points} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Configuration du programme</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nom du programme</label>
                <input type="text" defaultValue="Flowtym Rewards" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Points par € dépensé</label>
                <input type="number" defaultValue={1} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Valeur du point (€)</label>
                <input type="number" defaultValue={0.01} step={0.01} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981]" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Annuler</button>
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 bg-[#10B981] text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
