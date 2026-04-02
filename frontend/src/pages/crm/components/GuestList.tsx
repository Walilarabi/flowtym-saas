import { Guest } from '../data/mockData';

interface GuestListProps {
  guests: Guest[];
  onSelectGuest: (guest: Guest) => void;
}

export default function GuestList({ guests, onSelectGuest }: GuestListProps) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getLoyaltyBadge = (score: number) => {
    if (score >= 80) return { label: 'Fidèle', bg: '#EDE9FE', text: '#6D28D9' };
    if (score >= 50) return { label: 'Régulier', bg: '#FEF3C7', text: '#92400E' };
    return { label: 'Nouveau', bg: '#DBEAFE', text: '#1E3A8A' };
  };

  return (
    <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#0F172A]">Clients</h2>
          <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg hover:from-purple-700 hover:to-violet-700 transition-colors font-medium text-sm shadow-md">
            + Ajouter un client
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#F8FAFC] border-b border-slate-200">
            <tr>
              <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Client</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Contact</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Dernier séjour</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Score fidélité</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Tags</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {guests.map((guest) => {
              const loyaltyBadge = getLoyaltyBadge(guest.loyaltyScore);
              return (
                <tr
                  key={guest.id}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => onSelectGuest(guest)}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 flex items-center justify-center text-white font-semibold shadow-sm">
                        {getInitials(guest.firstName, guest.lastName)}
                      </div>
                      <div>
                        <div className="font-semibold text-[#0F172A]">
                          {guest.firstName} {guest.lastName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-slate-600">{guest.email}</div>
                    <div className="text-xs text-slate-500">{guest.phone}</div>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-600">
                    {guest.lastStay && guest.lastStay !== '' 
                      ? new Date(guest.lastStay).toLocaleDateString('fr-FR')
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-[#0F172A]">{guest.loyaltyScore}</span>
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: loyaltyBadge.bg,
                          color: loyaltyBadge.text
                        }}
                      >
                        {loyaltyBadge.label}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1">
                      {guest.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-[#F1F5F9] text-[#334155] rounded-md text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectGuest(guest);
                        }}
                        className="text-purple-600 hover:text-purple-800 font-medium text-sm transition-colors"
                      >
                        Voir détails →
                      </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
