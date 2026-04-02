import { Guest } from '../data/mockData';

interface GuestDetailProps {
  guest: Guest;
  onBack: () => void;
}

export default function GuestDetail({ guest, onBack }: GuestDetailProps) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getChannelBadge = (channel: string) => {
    const badges: Record<string, { bg: string; text: string; icon: string }> = {
      whatsapp: { bg: '#EDE9FE', text: '#6D28D9', icon: '💬' },
      email: { bg: '#DBEAFE', text: '#1E3A8A', icon: '📧' },
      sms: { bg: '#FEF3C7', text: '#92400E', icon: '💬' }
    };
    return badges[channel] || badges.email;
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-purple-600 transition-colors font-medium"
      >
        ← Retour à la liste
      </button>

      {/* Guest Header */}
      <div className="bg-white rounded-[20px] shadow-sm p-8">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
            {getInitials(guest.firstName, guest.lastName)}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#0F172A] mb-2">
                  {guest.firstName} {guest.lastName}
                </h2>
                <div className="flex flex-wrap gap-2 mb-3">
                  {guest.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {guest.loyaltyScore}
                </div>
                <div className="text-sm text-slate-600">Score fidélité</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-sm text-slate-600 mb-1">Email</div>
                <div className="font-medium text-[#0F172A]">{guest.email}</div>
              </div>
              <div>
                <div className="text-sm text-slate-600 mb-1">Téléphone</div>
                <div className="font-medium text-[#0F172A]">{guest.phone}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <div className="text-3xl font-bold text-[#0F172A] mb-1">
            {guest.totalStays}
          </div>
          <div className="text-sm text-slate-600">Séjours totaux</div>
        </div>
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <div className="text-3xl font-bold text-[#0F172A] mb-1">
            {guest.totalRevenue.toLocaleString()}€
          </div>
          <div className="text-sm text-slate-600">Chiffre d'affaires</div>
        </div>
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <div className="text-3xl font-bold text-[#0F172A] mb-1">
            {guest.reviews.length > 0
              ? guest.reviews[0].rating
              : 'N/A'}
          </div>
          <div className="text-sm text-slate-600">Dernière note</div>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="grid grid-cols-2 gap-6">
        {/* Historique des séjours */}
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#0F172A] mb-4">
            Historique des séjours
          </h3>
          <div className="space-y-3">
            {guest.stays.map((stay) => (
              <div
                key={stay.id}
                className="border border-slate-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-[#0F172A]">
                    {stay.roomType}
                  </div>
                  <div className="font-bold text-purple-600">{stay.rate}€</div>
                </div>
                <div className="text-sm text-slate-600 mb-1">
                  {new Date(stay.checkIn).toLocaleDateString('fr-FR')} →{' '}
                  {new Date(stay.checkOut).toLocaleDateString('fr-FR')}
                </div>
                <div className="text-xs text-slate-500">
                  Canal: {stay.channel}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Préférences */}
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#0F172A] mb-4">Préférences</h3>
          <div className="space-y-3">
            {guest.preferences.bedType && (
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Type de lit</span>
                <span className="font-medium text-[#0F172A]">
                  {guest.preferences.bedType}
                </span>
              </div>
            )}
            {guest.preferences.floor && (
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Étage</span>
                <span className="font-medium text-[#0F172A]">
                  {guest.preferences.floor}
                </span>
              </div>
            )}
            {guest.preferences.allergies && guest.preferences.allergies.length > 0 && (
              <div className="py-2">
                <div className="text-slate-600 mb-2">Allergies</div>
                <div className="flex flex-wrap gap-2">
                  {guest.preferences.allergies.map((allergy, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-[#FEE2E2] text-[#991B1B] rounded-md text-sm font-medium"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {!guest.preferences.bedType &&
              !guest.preferences.floor &&
              (!guest.preferences.allergies || guest.preferences.allergies.length === 0) && (
                <div className="text-sm text-slate-500 italic">
                  Aucune préférence enregistrée
                </div>
              )}
          </div>
        </div>

        {/* Communications récentes */}
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#0F172A] mb-4">
            Communications récentes
          </h3>
          <div className="space-y-3">
            {guest.communications.map((comm) => {
              const badge = getChannelBadge(comm.channel);
              return (
                <div
                  key={comm.id}
                  className={`border-l-4 p-3 rounded ${
                    comm.direction === 'received'
                      ? 'bg-purple-50 border-purple-500'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ backgroundColor: badge.bg, color: badge.text }}
                    >
                      {badge.icon} {comm.channel}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(comm.date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700">{comm.message}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Avis */}
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#0F172A] mb-4">Avis</h3>
          {guest.reviews.length > 0 ? (
            <div className="space-y-3">
              {guest.reviews.map((review) => (
                <div
                  key={review.id}
                  className="border border-slate-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-[#10B981]">
                        {review.rating}/10
                      </div>
                      <span className="text-xs text-slate-500">
                        {review.platform}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(review.date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{review.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500 italic">
              Aucun avis disponible
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
