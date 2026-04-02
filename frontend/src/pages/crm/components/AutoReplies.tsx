import { useState } from 'react';

interface AutoReply {
  id: string;
  platform: string;
  trigger: string;
  message: string;
  status: string;
  responseRate: number;
}

interface AutoRepliesProps {
  autoReplies: AutoReply[];
}

export default function AutoReplies({ autoReplies }: AutoRepliesProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'Instagram' | 'Facebook' | 'LinkedIn' | 'WhatsApp'>('all');
  const [showModal, setShowModal] = useState(false);

  const filteredReplies =
    activeFilter === 'all'
      ? autoReplies
      : autoReplies.filter((r) => r.platform === activeFilter);

  const getPlatformBadge = (platform: string) => {
    const badges: Record<string, { bg: string; text: string; icon: string }> = {
      Instagram: { bg: 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)', text: '#FFFFFF', icon: '📷' },
      Facebook: { bg: '#1877F2', text: '#FFFFFF', icon: '👤' },
      LinkedIn: { bg: '#0A66C2', text: '#FFFFFF', icon: '💼' },
      WhatsApp: { bg: '#25D366', text: '#FFFFFF', icon: '💬' }
    };
    return badges[platform] || { bg: '#E2E8F0', text: '#334155', icon: '📱' };
  };

  const stats = {
    total: autoReplies.length,
    active: autoReplies.filter((r) => r.status === 'active').length,
    avgRate: Math.round(autoReplies.reduce((acc, r) => acc + r.responseRate, 0) / autoReplies.length)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[20px] shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              Réponses Automatiques DM
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Automatisez vos réponses sur les réseaux sociaux
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle réponse auto
          </button>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500">Total règles</p>
            <p className="text-2xl font-bold text-[#0F172A]">{stats.total}</p>
          </div>
          <div className="bg-[#D1FAE5] rounded-xl p-4">
            <p className="text-xs text-[#065F46]">Actives</p>
            <p className="text-2xl font-bold text-[#065F46]">{stats.active}</p>
          </div>
          <div className="bg-[#DBEAFE] rounded-xl p-4">
            <p className="text-xs text-[#1E3A8A]">Taux moyen</p>
            <p className="text-2xl font-bold text-[#1E3A8A]">{stats.avgRate}%</p>
          </div>
          <div className="bg-[#FEF3C7] rounded-xl p-4">
            <p className="text-xs text-[#92400E]">Plateformes</p>
            <p className="text-2xl font-bold text-[#92400E]">4</p>
          </div>
        </div>

        {/* Filtres par plateforme */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all' as const, label: 'Toutes', icon: '📱' },
            { id: 'Instagram' as const, label: 'Instagram', icon: '📷' },
            { id: 'Facebook' as const, label: 'Facebook', icon: '👤' },
            { id: 'LinkedIn' as const, label: 'LinkedIn', icon: '💼' },
            { id: 'WhatsApp' as const, label: 'WhatsApp', icon: '💬' }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                activeFilter === filter.id
                  ? 'bg-[#10B981] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Liste des réponses automatiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredReplies.map((reply) => {
          const badge = getPlatformBadge(reply.platform);
          return (
            <div
              key={reply.id}
              className="bg-white rounded-[16px] shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: badge.bg }}
                  >
                    {badge.icon}
                  </div>
                  <div>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium text-white"
                      style={{ background: badge.bg }}
                    >
                      {reply.platform}
                    </span>
                    <h3 className="font-semibold text-[#0F172A] mt-1">
                      {reply.trigger}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      reply.status === 'active'
                        ? 'bg-[#D1FAE5] text-[#065F46]'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {reply.status === 'active' ? '✓ Actif' : '○ Inactif'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 mb-4">
                <p className="text-sm text-slate-700 leading-relaxed">
                  {reply.message}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Taux de réponse</p>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${reply.responseRate}%`,
                            backgroundColor: reply.responseRate >= 90 ? '#7C3AED' : reply.responseRate >= 70 ? '#F59E0B' : '#EF4444'
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-[#0F172A]">
                        {reply.responseRate}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Modifier">
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Dupliquer">
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section connexion PMS */}
      <div className="bg-white rounded-[20px] shadow-sm p-6">
        <h3 className="text-lg font-bold text-[#0F172A] mb-4 flex items-center gap-2">
          🔗 Connexions aux systèmes hôteliers
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'PMS (Mews)', status: 'connected', icon: '🏨' },
            { name: 'Channel Manager', status: 'connected', icon: '📡' },
            { name: 'Booking Engine', status: 'connected', icon: '📅' },
            { name: 'Restaurant System', status: 'warning', icon: '🍽️' },
            { name: 'Spa Manager', status: 'connected', icon: '💆' },
            { name: 'Parking System', status: 'connected', icon: '🅿️' },
            { name: 'Conciergerie AI', status: 'connected', icon: '🤖' },
            { name: 'Réputation', status: 'connected', icon: '⭐' }
          ].map((system, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border-2 ${
                system.status === 'connected'
                  ? 'border-[#10B981] bg-[#F0FDF4]'
                  : 'border-[#F59E0B] bg-[#FFFBEB]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{system.icon}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    system.status === 'connected'
                      ? 'bg-[#D1FAE5] text-[#065F46]'
                      : 'bg-[#FEF3C7] text-[#92400E]'
                  }`}
                >
                  {system.status === 'connected' ? '✓ Connecté' : '⚠️ À configurer'}
                </span>
              </div>
              <p className="font-medium text-[#0F172A] mt-2 text-sm">{system.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal nouvelle réponse auto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#0F172A]">Nouvelle réponse automatique</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">Plateforme</label>
                <select className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981]">
                  <option>Instagram DM</option>
                  <option>Facebook Messenger</option>
                  <option>LinkedIn Messages</option>
                  <option>WhatsApp Business</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">Déclencheur</label>
                <select className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981]">
                  <option>Demande de disponibilité</option>
                  <option>Question sur les tarifs</option>
                  <option>Question Parking</option>
                  <option>Question Spa</option>
                  <option>Question Restaurant</option>
                  <option>Demande de réservation</option>
                  <option>Avis positif / Story</option>
                  <option>Demande séminaire</option>
                  <option>Information quartier</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">Message automatique</label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  placeholder="Bonjour ! Merci de votre message..."
                />
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  <strong>💡 Variables disponibles :</strong>
                  <br />
                  • {"{nom_client}"} - Nom du client
                  <br />
                  • {"{disponibilite}"} - Disponibilité PMS en temps réel
                  <br />
                  • {"{prix}"} - Prix depuis Channel Manager
                  <br />
                  • {"{lien_reservation}"} - Lien Booking Engine
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl transition-colors"
              >
                Créer la réponse auto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
