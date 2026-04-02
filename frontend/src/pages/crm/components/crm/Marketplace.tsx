import { useState } from 'react';

interface Plugin {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  price: string;
  rating: number;
  installs: string;
  isInstalled: boolean;
  isNew?: boolean;
}

const plugins: Plugin[] = [
  // Paiement
  { id: '1', name: 'Stripe', icon: '💳', category: 'Paiement', description: 'Paiements en ligne sécurisés', price: 'Gratuit', rating: 4.9, installs: '10K+', isInstalled: true },
  { id: '2', name: 'PayPal', icon: '🅿️', category: 'Paiement', description: 'Paiements internationaux', price: 'Gratuit', rating: 4.7, installs: '8K+', isInstalled: false },
  { id: '3', name: 'SumUp', icon: '📱', category: 'Paiement', description: 'Terminal de paiement mobile', price: '9€/mois', rating: 4.5, installs: '3K+', isInstalled: false },
  
  // Transport
  { id: '4', name: 'Uber', icon: '🚗', category: 'Transport', description: 'Réservation de VTC pour clients', price: 'Gratuit', rating: 4.6, installs: '5K+', isInstalled: true },
  { id: '5', name: 'Blacklane', icon: '🚘', category: 'Transport', description: 'Chauffeur privé premium', price: 'Gratuit', rating: 4.8, installs: '2K+', isInstalled: false },
  
  // Activités
  { id: '6', name: 'GetYourGuide', icon: '🎫', category: 'Activités', description: 'Réservation d\'activités locales', price: 'Commission 8%', rating: 4.7, installs: '6K+', isInstalled: true },
  { id: '7', name: 'Viator', icon: '🗺️', category: 'Activités', description: 'Excursions et visites guidées', price: 'Commission 10%', rating: 4.5, installs: '4K+', isInstalled: false },
  
  // Restaurant
  { id: '8', name: 'TheFork', icon: '🍽️', category: 'Restaurant', description: 'Réservation de restaurant', price: 'Gratuit', rating: 4.6, installs: '7K+', isInstalled: true },
  { id: '9', name: 'OpenTable', icon: '🍴', category: 'Restaurant', description: 'Gestion des réservations', price: '15€/mois', rating: 4.4, installs: '3K+', isInstalled: false },
  
  // IoT
  { id: '10', name: 'Nuki', icon: '🔐', category: 'IoT', description: 'Serrures connectées', price: '19€/mois', rating: 4.8, installs: '2K+', isInstalled: false, isNew: true },
  { id: '11', name: 'Nest', icon: '🌡️', category: 'IoT', description: 'Thermostats intelligents', price: '12€/mois', rating: 4.7, installs: '3K+', isInstalled: false },
  { id: '12', name: 'Philips Hue', icon: '💡', category: 'IoT', description: 'Éclairage connecté', price: '8€/mois', rating: 4.6, installs: '4K+', isInstalled: false },
  
  // Comptabilité
  { id: '13', name: 'QuickBooks', icon: '📊', category: 'Comptabilité', description: 'Comptabilité automatisée', price: '25€/mois', rating: 4.5, installs: '5K+', isInstalled: false },
  { id: '14', name: 'Pennylane', icon: '📈', category: 'Comptabilité', description: 'Gestion financière française', price: '20€/mois', rating: 4.7, installs: '2K+', isInstalled: true, isNew: true },
  
  // Analytics
  { id: '15', name: 'Google Analytics 4', icon: '📉', category: 'Analytics', description: 'Analyse de trafic web', price: 'Gratuit', rating: 4.8, installs: '15K+', isInstalled: true },
  { id: '16', name: 'Hotjar', icon: '🔥', category: 'Analytics', description: 'Heatmaps et enregistrements', price: '15€/mois', rating: 4.6, installs: '4K+', isInstalled: false },
  
  // Communication
  { id: '17', name: 'Twilio', icon: '📞', category: 'Communication', description: 'SMS et appels programmables', price: 'À l\'usage', rating: 4.7, installs: '8K+', isInstalled: true },
  { id: '18', name: 'Intercom', icon: '💬', category: 'Communication', description: 'Chat et support client', price: '29€/mois', rating: 4.6, installs: '3K+', isInstalled: false, isNew: true }
];

const categories = ['Tous', 'Paiement', 'Transport', 'Activités', 'Restaurant', 'IoT', 'Comptabilité', 'Analytics', 'Communication'];

export default function Marketplace(_props: { language?: string }) {
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [installedPlugins, setInstalledPlugins] = useState<string[]>(
    plugins.filter(p => p.isInstalled).map(p => p.id)
  );
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlugins = plugins.filter(plugin => {
    const matchesCategory = selectedCategory === 'Tous' || plugin.category === selectedCategory;
    const matchesSearch = plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          plugin.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleInstall = (pluginId: string) => {
    setInstalledPlugins(prev => 
      prev.includes(pluginId) 
        ? prev.filter(id => id !== pluginId)
        : [...prev, pluginId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-4xl">🏪</span>
              Flowtym Marketplace
            </h2>
            <p className="text-indigo-100 mt-1">Étendez les capacités de votre hôtel avec des plugins</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{installedPlugins.length}</div>
            <div className="text-indigo-100 text-sm">plugins installés</div>
          </div>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <input
            type="text"
            placeholder="Rechercher un plugin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#10B981] focus:border-transparent"
          />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm">Disponibles</div>
          <div className="text-2xl font-bold text-slate-800">{plugins.length}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm">Catégories</div>
          <div className="text-2xl font-bold text-slate-800">{categories.length - 1}</div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              selectedCategory === cat
                ? 'bg-[#10B981] text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat}
            {cat !== 'Tous' && (
              <span className="ml-2 text-sm opacity-75">
                ({plugins.filter(p => p.category === cat).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Plugins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredPlugins.map((plugin) => {
          const isInstalled = installedPlugins.includes(plugin.id);
          return (
            <div 
              key={plugin.id}
              className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-all hover:shadow-md ${
                isInstalled ? 'border-emerald-200' : 'border-slate-100'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{plugin.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-800">{plugin.name}</h4>
                      {plugin.isNew && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">NEW</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{plugin.category}</p>
                  </div>
                </div>
                {isInstalled && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                    ✓ Installé
                  </span>
                )}
              </div>
              
              <p className="text-sm text-slate-600 mb-3">{plugin.description}</p>
              
              <div className="flex items-center justify-between text-sm mb-4">
                <div className="flex items-center gap-1 text-amber-500">
                  {'★'.repeat(Math.floor(plugin.rating))}
                  <span className="text-slate-500 ml-1">{plugin.rating}</span>
                </div>
                <span className="text-slate-500">{plugin.installs} installs</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`font-medium ${plugin.price === 'Gratuit' ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {plugin.price}
                </span>
                <button
                  onClick={() => toggleInstall(plugin.id)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    isInstalled
                      ? 'bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600'
                      : 'bg-[#10B981] text-white hover:bg-emerald-600'
                  }`}
                >
                  {isInstalled ? 'Désinstaller' : 'Installer'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredPlugins.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Aucun plugin trouvé</h3>
          <p className="text-slate-500">Essayez avec d'autres critères de recherche</p>
        </div>
      )}

      {/* API Section */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-3">
              <span className="text-2xl">🔌</span>
              API Flowtym
            </h3>
            <p className="text-slate-400 mt-1">Construisez votre propre intégration avec notre API REST</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition-colors">
              📚 Documentation
            </button>
            <button className="px-4 py-2 bg-[#10B981] text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">
              🔑 Obtenir une clé API
            </button>
          </div>
        </div>
        <div className="mt-4 p-4 bg-slate-800 rounded-xl">
          <code className="text-sm text-emerald-400">
            curl -X GET "https://api.flowtym.com/v1/guests" \<br />
            &nbsp;&nbsp;-H "Authorization: Bearer YOUR_API_KEY"
          </code>
        </div>
      </div>
    </div>
  );
}
