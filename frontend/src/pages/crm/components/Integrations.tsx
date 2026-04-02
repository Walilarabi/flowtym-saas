import { useState } from 'react';

interface Integration {
  id: string;
  name: string;
  status: string;
  icon: string;
  category?: string;
  description?: string;
}

interface IntegrationsProps {
  integrations: Integration[];
}

// Extended integrations data with more PMS and Channel Managers
const extendedIntegrations: Integration[] = [
  // PMS - Property Management Systems
  { id: '1', name: 'Mews', status: 'connected', icon: '🏨', category: 'PMS', description: 'PMS Cloud moderne' },
  { id: '2', name: 'Oracle Opera', status: 'connected', icon: '🔵', category: 'PMS', description: 'Solution enterprise' },
  { id: '3', name: 'Medialogue', status: 'connected', icon: '📋', category: 'PMS', description: 'PMS francophone' },
  { id: '4', name: 'Apaleo', status: 'connected', icon: '🏔️', category: 'PMS', description: 'API-first PMS' },
  { id: '5', name: 'Asterio', status: 'warning', icon: '⭐', category: 'PMS', description: 'À configurer' },
  { id: '6', name: 'Vega', status: 'disconnected', icon: '✨', category: 'PMS', description: 'PMS français' },
  { id: '7', name: 'Proyel', status: 'disconnected', icon: '📊', category: 'PMS', description: 'Gestion hotelière' },
  { id: '8', name: 'Protel', status: 'connected', icon: '🖥️', category: 'PMS', description: 'Solution complète' },
  { id: '9', name: 'Cloudbeds', status: 'connected', icon: '☁️', category: 'PMS', description: 'PMS cloud' },
  { id: '10', name: 'Smart Host', status: 'disconnected', icon: '🤖', category: 'PMS', description: 'Automatisation IA' },
  { id: '11', name: 'RoomRacoon', status: 'warning', icon: '🦊', category: 'PMS', description: 'PMS PME' },
  { id: '12', name: 'Librarix', status: 'disconnected', icon: '📚', category: 'PMS', description: 'Bibliothèque' },

  // Channel Managers
  { id: '13', name: "D'edge", status: 'connected', icon: '📡', category: 'Channel Manager', description: 'Distribution directe' },
  { id: '14', name: 'SiteMinder', status: 'connected', icon: '🌐', category: 'Channel Manager', description: 'Leader mondial' },
  { id: '15', name: 'Siteminder', status: 'warning', icon: '🔗', category: 'Channel Manager', description: 'Synonym' },
  { id: '16', name: 'Yieldlab', status: 'disconnected', icon: '📈', category: 'Channel Manager', description: 'Revenue management' },
  { id: '17', name: 'PriceMatch', status: 'disconnected', icon: '💹', category: 'Channel Manager', description: 'Optimisation tarifs' },
  { id: '18', name: 'BookLogic', status: 'disconnected', icon: '📖', category: 'Channel Manager', description: 'Channel manager' },

  // Marketing & Email
  { id: '19', name: 'Mailchimp', status: 'connected', icon: '📧', category: 'Marketing', description: 'Email marketing' },
  { id: '20', name: 'HubSpot', status: 'disconnected', icon: '🟠', category: 'Marketing', description: 'CRM & Marketing' },
  { id: '21', name: 'Brevo (Sendinblue)', status: 'connected', icon: '💌', category: 'Marketing', description: 'Email & SMS' },
  { id: '22', name: 'Klaviyo', status: 'disconnected', icon: '📨', category: 'Marketing', description: 'E-commerce email' },

  // WhatsApp & Messaging
  { id: '23', name: 'WhatsApp Business', status: 'warning', icon: '💬', category: 'Messaging', description: 'API Meta - À configurer' },
  { id: '24', name: 'Twilio', status: 'connected', icon: '📱', category: 'Messaging', description: 'SMS & Calls' },
  { id: '25', name: 'MessageBird', status: 'disconnected', icon: '🐦', category: 'Messaging', description: 'Omnichannel' },

  // Reputation & Reviews
  { id: '26', name: 'TrustYou', status: 'connected', icon: '⭐', category: 'Réputation', description: 'E-Reputation' },
  { id: '27', name: 'ReviewPro', status: 'connected', icon: '🏆', category: 'Réputation', description: 'Guest intelligence' },
  { id: '28', name: 'Google Hotel Center', status: 'connected', icon: '🔍', category: 'Réputation', description: 'Avis Google' },
  { id: '29', name: 'Booking.com Reviews', status: 'connected', icon: '🛏️', category: 'Réputation', description: 'Avis Booking' },

  // Booking Engine
  { id: '30', name: 'Flowtym Booking', status: 'connected', icon: '🚀', category: 'Booking Engine', description: 'Moteur de réservation' },
  { id: '31', name: 'Beds24', status: 'disconnected', icon: '🛏️', category: 'Booking Engine', description: 'Booking engine' },
  { id: '32', name: 'WuBook', status: 'disconnected', icon: '📅', category: 'Booking Engine', description: 'Distribution' },

  // Analytics
  { id: '33', name: 'Google Analytics 4', status: 'connected', icon: '📊', category: 'Analytics', description: 'Web analytics' },
  { id: '34', name: 'Meta Pixel', status: 'connected', icon: '📌', category: 'Analytics', description: 'Facebook tracking' },
  { id: '35', name: 'Hotjar', status: 'disconnected', icon: '👁️', category: 'Analytics', description: 'Heatmaps' },

  // Payment
  { id: '36', name: 'Stripe', status: 'connected', icon: '💳', category: 'Paiement', description: 'Paiements en ligne' },
  { id: '37', name: 'PayPal', status: 'connected', icon: '🅿️', category: 'Paiement', description: 'Paiements' },
  { id: '38', name: 'Ingenico', status: 'disconnected', icon: '💰', category: 'Paiement', description: 'Terminal paiement' },
];

// WhatsApp Auto-Responses Configuration
const autoResponses = [
  {
    id: 1,
    trigger: 'disponibilité',
    keywords: ['disponible', 'disponibilité', 'dispos', 'chambre libre', 'rooms available'],
    response: '🔍 Recherche en cours sur le PMS...\n\nVoici nos chambres disponibles pour vos dates :\n\n🛏️ Chambre Classic - 89€/nuit\n🛏️🛏️ Chambre Superior - 129€/nuit\n🏠 Suite Deluxe - 199€/nuit\n\nSouhaitez-vous procéder à une réservation ?',
    connectedTo: ['Mews', 'Apaleo', 'Oracle Opera'],
    status: 'active',
    category: 'Disponibilité'
  },
  {
    id: 2,
    trigger: 'prix',
    keywords: ['prix', 'tarif', 'cost', 'rate', 'combien', 'moins cher'],
    response: '💰 Consultation des tarifs en temps réel...\n\nTarifs pour aujourd\'hui :\n\n📅 Jour : 89€ - 299€\n📅 Week-end : 109€ - 349€\n📅 Semaine pro : 79€ - 249€\n\nCode promo disponible : BIENVENUE10 (-10%)\n\n一脚',
    connectedTo: ['Mews', 'Apaleo', 'Oracle Opera', 'D\'edge', 'SiteMinder'],
    status: 'active',
    category: 'Tarification'
  },
  {
    id: 3,
    trigger: 'parking',
    keywords: ['parking', 'park', 'garer', 'voiture', 'stationnement'],
    response: '🚗 Stationnement disponible :\n\n• Parking souterrain : 15€/jour\n• Parking extérieur : 10€/jour\n• Places limitées - reservation recommandée\n• Charge véhicule électrique : +5€/jour\n\nNous sommes situés à 5min du centre-ville avec parking sécurisé 24h/24 🔒',
    connectedTo: ['Hotel Info'],
    status: 'active',
    category: 'Services'
  },
  {
    id: 4,
    trigger: 'spa',
    keywords: ['spa', 'bien-être', 'massage', 'soin', 'wellness', 'détente'],
    response: '💆 Bien-être & Spa :\n\n🌸 Soins disponibles :\n• Massage relaxant : 60€ (50min)\n• Massage deep tissue : 75€ (60min)\n• Soin visage : 55€ (45min)\n• Forfait duo : 120€ (90min)\n\n⏰ Horaires : 10h - 20h\n📞 Réservation recommandée\n\nVotre séjour inclut l\'accès au hammam gratuit !',
    connectedTo: ['Spa Manager', 'Hotel Info'],
    status: 'active',
    category: 'Services'
  },
  {
    id: 5,
    trigger: 'restaurant',
    keywords: ['restaurant', 'repas', 'dîner', 'déjeuner', 'dinner', 'lunch', 'manger', 'cuisine'],
    response: '🍽️ Restaurant "Le Flowtym" :\n\n🌅 Petit-déjeuner :\n• Buffet : 18€/pers\n• Continental : 12€/pers\n• Horaires : 7h - 10h30\n\n🍽️ Déjeuner : 12h - 14h\n🍷 Dîner : 19h - 22h\n\n👨‍🍳 Notre chef propose une cuisine française moderne avec produits locaux.\n\n🍾 Room service disponible 24h/24',
    connectedTo: ['Restaurant System', 'Hotel Info'],
    status: 'active',
    category: 'Restauration'
  },
  {
    id: 6,
    trigger: 'informations quartier',
    keywords: ['quartier', 'enville', 'visiter', 'tourisme', 'activité', 'activite', 'chose à faire', '推荐的', 'what to do'],
    response: '🏛️ Quartier & Environs :\n\n📍 À proximité (步行) :\n• Centre historique : 5 min\n• Musée : 10 min\n• Parc : 3 min\n• Restaurant locals : 2 min\n\n🚕 Transport :\n• Gare : 15 min\n• Aéroport : 25 min\n\n🎯 Suggestions :\n• Balade dans la vieille ville\n• Marché local (mardi & samedi)\n• Randonnée Montagne (30min)\n\nVoulez-vous que je vous envoie notre guide digital ? 📱',
    connectedTo: ['Concierge AI', 'Hotel Info'],
    status: 'active',
    category: 'Conciergerie'
  },
  {
    id: 7,
    trigger: 'check-in',
    keywords: ['check-in', 'arrivée', 'arriver', 'arrival', 'rendez-vous', 'horaire arrival'],
    response: '🏨 Check-in / Check-out :\n\n✅ Check-in : à partir de 15h\n✅ Check-out : avant 11h\n\n📝 Documents nécessaires :\n• Piece d\'identite\n• Carte bancaire caution\n\n🌙 Arrivée tardive ?\n• Code d\'accès autonome disponible\n• Reception 24h/24\n\nVoulez-vous préparer votre check-in en ligne ?',
    connectedTo: ['Mews', 'Apaleo'],
    status: 'active',
    category: 'Services'
  },
  {
    id: 8,
    trigger: 'wifi',
    keywords: ['wifi', 'internet', 'connexion', 'network', 'password', 'mot de passe'],
    response: '📶 WiFi Gratuit :\n\n🌐 Nom du réseau : Flowtym-Free\n🔑 Mot de passe : Votre numéro de chambre\n\n📡 Vitesse : 500Mbps Fibre\n💻 Compatible tous appareils\n\nBon surf ! 🌊',
    connectedTo: ['Network System'],
    status: 'active',
    category: 'Technique'
  }
];

// Reputation integration
const reputationData = {
  moduleName: 'Flowtym Réputation',
  connected: true,
  lastSync: 'Il y a 5 minutes',
  overallRating: 8.7,
  totalReviews: 1247,
  sentiment: {
    positive: 78,
    neutral: 15,
    negative: 7
  },
  sources: [
    { name: 'Google', rating: 8.9, count: 456 },
    { name: 'Booking.com', rating: 8.6, count: 523 },
    { name: 'TripAdvisor', rating: 8.8, count: 156 },
    { name: 'Expedia', rating: 8.5, count: 112 }
  ]
};

export default function Integrations({}: IntegrationsProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showAutoResponseModal, setShowAutoResponseModal] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<typeof autoResponses[0] | null>(null);
  const [showReputationModal, setShowReputationModal] = useState(false);

  const categories = [
    { id: 'all', label: 'Tous', icon: '🔗' },
    { id: 'PMS', label: 'PMS', icon: '🏨' },
    { id: 'Channel Manager', label: 'Channel Manager', icon: '📡' },
    { id: 'Marketing', label: 'Marketing', icon: '📧' },
    { id: 'Messaging', label: 'Messaging', icon: '💬' },
    { id: 'Réputation', label: 'Réputation', icon: '⭐' },
    { id: 'Booking Engine', label: 'Booking Engine', icon: '🚀' },
    { id: 'Analytics', label: 'Analytics', icon: '📊' },
    { id: 'Paiement', label: 'Paiement', icon: '💳' },
  ];

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string; icon: string }> = {
      connected: { bg: '#D1FAE5', text: '#065F46', label: 'Connecté', icon: '✅' },
      warning: { bg: '#FEF3C7', text: '#92400E', label: 'À configurer', icon: '⚠️' },
      disconnected: { bg: '#FEE2E2', text: '#991B1B', label: 'Non connecté', icon: '❌' }
    };
    return badges[status] || badges.disconnected;
  };

  const filteredIntegrations = activeCategory === 'all' 
    ? extendedIntegrations 
    : extendedIntegrations.filter(i => i.category === activeCategory);

  const connectedCount = extendedIntegrations.filter(i => i.status === 'connected').length;
  const warningCount = extendedIntegrations.filter(i => i.status === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-[20px] shadow-sm p-5 border-l-4 border-[#10B981]">
          <div className="text-3xl font-bold text-[#0F172A]">{connectedCount}</div>
          <div className="text-slate-600 text-sm">Connecteurs actifs</div>
        </div>
        <div className="bg-white rounded-[20px] shadow-sm p-5 border-l-4 border-amber-500">
          <div className="text-3xl font-bold text-[#0F172A]">{warningCount}</div>
          <div className="text-slate-600 text-sm">À configurer</div>
        </div>
        <div className="bg-white rounded-[20px] shadow-sm p-5 border-l-4 border-blue-500">
          <div className="text-3xl font-bold text-[#0F172A]">{extendedIntegrations.length}</div>
          <div className="text-slate-600 text-sm">Total intégrations</div>
        </div>
      </div>

      {/* Reputation Module Integration */}
      <div className="bg-white rounded-[20px] shadow-sm p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl">⭐</div>
            <div>
              <h2 className="text-xl font-bold text-[#0F172A]">Module Réputation</h2>
              <p className="text-sm text-slate-600">Intégration Flowtym Réputation</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-[#D1FAE5] text-[#065F46] rounded-full text-sm font-medium">
              ✅ Synchronisé
            </span>
            <button 
              onClick={() => setShowReputationModal(true)}
              className="text-[#10B981] hover:text-[#059669] font-medium text-sm"
            >
              Voir détails →
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#0F172A]">{reputationData.overallRating}</div>
            <div className="text-xs text-slate-600">Note globale</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#0F172A]">{reputationData.totalReviews}</div>
            <div className="text-xs text-slate-600">Avis totaux</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{reputationData.sentiment.positive}%</div>
            <div className="text-xs text-slate-600">Sentiment positif</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-slate-600">{reputationData.lastSync}</div>
            <div className="text-xs text-slate-600">Dernière sync</div>
          </div>
        </div>
      </div>

      {/* WhatsApp Auto-Responses */}
      <div className="bg-white rounded-[20px] shadow-sm p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-xl">💬</div>
            <div>
              <h2 className="text-xl font-bold text-[#0F172A]">WhatsApp Auto-Responses</h2>
              <p className="text-sm text-slate-600">Réponses automatiques connectées aux services</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAutoResponseModal(true)}
            className="bg-[#10B981] text-white px-4 py-2 rounded-xl font-medium hover:bg-[#059669] transition-colors flex items-center gap-2"
          >
            <span>+</span> Nouvelle réponse
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {autoResponses.map((response) => (
            <div 
              key={response.id}
              onClick={() => setSelectedResponse(response)}
              className="border border-slate-200 rounded-xl p-4 hover:border-[#10B981] cursor-pointer transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-1 bg-[#D1FAE5] text-[#065F46] rounded-full text-xs font-medium">
                  {response.category}
                </span>
                <span className={`w-2 h-2 rounded-full ${response.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
              </div>
              <h3 className="font-semibold text-[#0F172A] mb-1">{response.trigger}</h3>
              <p className="text-xs text-slate-500 line-clamp-2">{response.response.substring(0, 80)}...</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {response.connectedTo.slice(0, 2).map((conn, idx) => (
                  <span key={idx} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {conn}
                  </span>
                ))}
                {response.connectedTo.length > 2 && (
                  <span className="text-xs text-slate-400">+{response.connectedTo.length - 2}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connectors Grid */}
      <div className="bg-white rounded-[20px] shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#0F172A] mb-1">Tous les connecteurs</h2>
          <p className="text-sm text-slate-600">Gérez vos intégrations PMS, Channel Manager, Marketing...</p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                activeCategory === cat.id
                  ? 'bg-[#10B981] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="mr-1">{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredIntegrations.map((integration) => {
            const statusBadge = getStatusBadge(integration.status);
            return (
              <div
                key={integration.id}
                className="border border-slate-200 rounded-xl p-4 hover:border-[#10B981] transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{integration.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#0F172A] text-sm">
                      {integration.name}
                    </h3>
                    <p className="text-xs text-slate-500">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                    style={{
                      backgroundColor: statusBadge.bg,
                      color: statusBadge.text
                    }}
                  >
                    {statusBadge.icon} {statusBadge.label}
                  </span>
                  {integration.status === 'connected' ? (
                    <button className="text-xs text-slate-600 hover:text-[#10B981] font-medium">
                      Configurer
                    </button>
                  ) : (
                    <button className="text-xs text-[#10B981] hover:text-[#059669] font-medium">
                      Connecter
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-Response Modal */}
      {showAutoResponseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#0F172A]">Nouvelle réponse automatique</h2>
              <button onClick={() => setShowAutoResponseModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mot-clé déclencheur</label>
                <input type="text" placeholder="ex: disponibilité, prix, parking..." className="w-full px-4 py-2 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mots-clés (séparés par virgule)</label>
                <input type="text" placeholder="ex: disponible, dispo, chambre libre..." className="w-full px-4 py-2 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Réponse automatique</label>
                <textarea rows={4} placeholder="Entrez la réponse automatique..." className="w-full px-4 py-2 border border-slate-200 rounded-xl"></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Connecté à</label>
                <div className="flex gap-2 flex-wrap">
                  {['Mews', 'Apaleo', 'Oracle Opera', 'D\'edge', 'SiteMinder', 'Hotel Info', 'Booking Engine'].map(s => (
                    <label key={s} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" className="rounded text-[#10B981]" />
                      <span className="text-sm">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowAutoResponseModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Annuler</button>
                <button className="flex-1 px-4 py-2 bg-[#10B981] text-white rounded-xl hover:bg-[#059669]">Créer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Response Detail Modal */}
      {selectedResponse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#0F172A]">{selectedResponse.trigger}</h2>
              <button onClick={() => setSelectedResponse(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <span className="px-2 py-1 bg-[#D1FAE5] text-[#065F46] rounded-full text-xs font-medium">
                  {selectedResponse.category}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-1">Mots-clés</h4>
                <div className="flex gap-1 flex-wrap">
                  {selectedResponse.keywords.map((kw, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">{kw}</span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-1">Connecté à</h4>
                <div className="flex gap-1 flex-wrap">
                  {selectedResponse.connectedTo.map((conn, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{conn}</span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-1">Réponse</h4>
                <div className="bg-slate-50 p-3 rounded-lg text-sm whitespace-pre-wrap">{selectedResponse.response}</div>
              </div>
              <div className="flex gap-3 pt-4">
                <button className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Modifier</button>
                <button className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50">Désactiver</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reputation Modal */}
      {showReputationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="text-3xl">⭐</div>
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A]">Module Réputation</h2>
                  <p className="text-sm text-slate-600">Données en temps réel</p>
                </div>
              </div>
              <button onClick={() => setShowReputationModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-4xl font-bold text-[#10B981]">{reputationData.overallRating}/10</div>
                <div className="text-sm text-slate-600">Note globale</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-4xl font-bold text-[#0F172A]">{reputationData.totalReviews}</div>
                <div className="text-sm text-slate-600">Avis totaux</div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-[#0F172A] mb-3">Analyse sémantique</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="w-20 text-sm text-slate-600">Positif</span>
                  <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${reputationData.sentiment.positive}%` }}></div>
                  </div>
                  <span className="w-12 text-sm text-green-600 font-medium">{reputationData.sentiment.positive}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-sm text-slate-600">Neutre</span>
                  <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${reputationData.sentiment.neutral}%` }}></div>
                  </div>
                  <span className="w-12 text-sm text-amber-600 font-medium">{reputationData.sentiment.neutral}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-sm text-slate-600">Négatif</span>
                  <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${reputationData.sentiment.negative}%` }}></div>
                  </div>
                  <span className="w-12 text-sm text-red-600 font-medium">{reputationData.sentiment.negative}%</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-[#0F172A] mb-3">Par source</h3>
              <div className="space-y-2">
                {reputationData.sources.map((source, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700">{source.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-600">{source.count} avis</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">{source.rating}/10</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Rafraîchir</button>
              <button className="flex-1 px-4 py-2 bg-[#10B981] text-white rounded-xl hover:bg-[#059669]">Voir tous les avis</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
