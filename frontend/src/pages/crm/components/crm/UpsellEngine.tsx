import { useState } from 'react';

interface UpsellRule {
  id: string;
  name: string;
  trigger: string;
  triggerIcon: string;
  offer: string;
  discount: string;
  channel: string;
  conversionRate: number;
  revenue: number;
  isActive: boolean;
}

const mockUpsellRules: UpsellRule[] = [
  {
    id: '1',
    name: 'Surclassement réservation',
    trigger: 'Nouvelle réservation',
    triggerIcon: '📅',
    offer: 'Chambre Deluxe au prix de la Standard',
    discount: '+25€/nuit',
    channel: 'Email',
    conversionRate: 18,
    revenue: 4250,
    isActive: true
  },
  {
    id: '2',
    name: 'Pack Arrivée J-7',
    trigger: '7 jours avant arrivée',
    triggerIcon: '📆',
    offer: 'Parking + Petit-déjeuner + Early check-in',
    discount: '-15%',
    channel: 'WhatsApp',
    conversionRate: 24,
    revenue: 3180,
    isActive: true
  },
  {
    id: '3',
    name: 'Romantique J-1',
    trigger: '1 jour avant arrivée',
    triggerIcon: '💕',
    offer: 'Champagne + Roses + Surclassement vue',
    discount: '89€',
    channel: 'SMS',
    conversionRate: 12,
    revenue: 1420,
    isActive: true
  },
  {
    id: '4',
    name: 'Spa pendant séjour',
    trigger: 'Pendant le séjour (J+1)',
    triggerIcon: '🧖',
    offer: 'Accès Spa + Massage duo',
    discount: '-20%',
    channel: 'App Push',
    conversionRate: 31,
    revenue: 5670,
    isActive: true
  },
  {
    id: '5',
    name: 'Late checkout',
    trigger: 'Jour du départ (8h)',
    triggerIcon: '🕐',
    offer: 'Départ tardif 16h au lieu de 11h',
    discount: '35€',
    channel: 'SMS',
    conversionRate: 42,
    revenue: 2890,
    isActive: true
  },
  {
    id: '6',
    name: 'Fidélité réservation',
    trigger: 'Checkout effectué',
    triggerIcon: '🎁',
    offer: '-15% prochaine réservation directe',
    discount: '-15%',
    channel: 'Email',
    conversionRate: 8,
    revenue: 12400,
    isActive: false
  }
];

export default function UpsellEngine(_props: { language?: string }) {
  const [rules, setRules] = useState(mockUpsellRules);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredRules = rules.filter(rule => {
    if (filter === 'active') return rule.isActive;
    if (filter === 'inactive') return !rule.isActive;
    return true;
  });

  const totalRevenue = rules.filter(r => r.isActive).reduce((sum, r) => sum + r.revenue, 0);
  const avgConversion = rules.filter(r => r.isActive).reduce((sum, r) => sum + r.conversionRate, 0) / rules.filter(r => r.isActive).length;

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-4xl">💎</span>
              Upsell Engine
            </h2>
            <p className="text-purple-100 mt-1">Maximisez chaque réservation avec des offres intelligentes</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-colors"
          >
            + Nouvelle règle
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Revenus additionnels</div>
          <div className="text-3xl font-bold text-[#10B981]">{totalRevenue.toLocaleString()}€</div>
          <div className="text-xs text-emerald-600 mt-1">+23% vs mois dernier</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Taux conversion moyen</div>
          <div className="text-3xl font-bold text-slate-800">{avgConversion.toFixed(1)}%</div>
          <div className="text-xs text-emerald-600 mt-1">+5.2% vs mois dernier</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Offres envoyées</div>
          <div className="text-3xl font-bold text-slate-800">1,247</div>
          <div className="text-xs text-slate-500 mt-1">Ce mois</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Revenu / résa</div>
          <div className="text-3xl font-bold text-slate-800">+47€</div>
          <div className="text-xs text-emerald-600 mt-1">Moyenne additionnelle</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === f
                ? 'bg-[#10B981] text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {f === 'all' ? 'Toutes' : f === 'active' ? 'Actives' : 'Inactives'}
            <span className="ml-2 text-sm opacity-75">
              ({rules.filter(r => f === 'all' ? true : f === 'active' ? r.isActive : !r.isActive).length})
            </span>
          </button>
        ))}
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {filteredRules.map((rule) => (
          <div
            key={rule.id}
            className={`bg-white rounded-2xl p-5 shadow-sm border transition-all ${
              rule.isActive ? 'border-emerald-200' : 'border-slate-200 opacity-60'
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Trigger Icon */}
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
                rule.isActive ? 'bg-purple-100' : 'bg-slate-100'
              }`}>
                {rule.triggerIcon}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-800">{rule.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    rule.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  <span className="font-medium">Déclencheur :</span> {rule.trigger}
                </p>
                <p className="text-sm text-slate-700 mt-1">
                  <span className="font-medium">Offre :</span> {rule.offer} 
                  <span className="text-purple-600 font-semibold ml-2">{rule.discount}</span>
                </p>
              </div>

              {/* Stats */}
              <div className="text-center px-4 border-l border-slate-100">
                <div className="text-xs text-slate-500">Canal</div>
                <div className="font-medium text-slate-700">{rule.channel}</div>
              </div>
              <div className="text-center px-4 border-l border-slate-100">
                <div className="text-xs text-slate-500">Conversion</div>
                <div className="font-bold text-[#10B981]">{rule.conversionRate}%</div>
              </div>
              <div className="text-center px-4 border-l border-slate-100">
                <div className="text-xs text-slate-500">Revenus</div>
                <div className="font-bold text-slate-800">{rule.revenue.toLocaleString()}€</div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    rule.isActive ? 'bg-[#10B981]' : 'bg-slate-300'
                  }`}
                >
                  <span className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all shadow ${
                    rule.isActive ? 'left-6' : 'left-0.5'
                  }`}></span>
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  ✏️
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  📊
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {rule.isActive && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Performance ce mois</span>
                  <span>{rule.conversionRate}% de conversion</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    style={{ width: `${Math.min(rule.conversionRate * 2, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Nouvelle règle d'upsell</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nom de la règle</label>
                <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981]" placeholder="Ex: Offre Spa Weekend" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Déclencheur</label>
                <select className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981]">
                  <option>Nouvelle réservation</option>
                  <option>7 jours avant arrivée</option>
                  <option>3 jours avant arrivée</option>
                  <option>1 jour avant arrivée</option>
                  <option>Pendant le séjour</option>
                  <option>Jour du départ</option>
                  <option>Après le séjour</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Offre</label>
                <textarea className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981]" rows={3} placeholder="Décrivez l'offre..."></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Prix/Réduction</label>
                  <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981]" placeholder="Ex: 49€ ou -20%" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Canal</label>
                  <select className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981]">
                    <option>Email</option>
                    <option>WhatsApp</option>
                    <option>SMS</option>
                    <option>App Push</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Segment ciblé</label>
                <select className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981]">
                  <option>Tous les clients</option>
                  <option>VIP uniquement</option>
                  <option>Couples</option>
                  <option>Familles</option>
                  <option>Business</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Annuler</button>
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 bg-[#10B981] text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors">Créer la règle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
