import { Campaign } from '../data/mockData';

interface CampaignsProps {
  campaigns: Campaign[];
}

export default function Campaigns({ campaigns }: CampaignsProps) {
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      draft: { bg: '#F1F5F9', text: '#334155' },
      sent: { bg: '#D1FAE5', text: '#065F46' },
      scheduled: { bg: '#FEF3C7', text: '#92400E' }
    };
    return badges[status] || badges.draft;
  };

  const getChannelIcon = (channel: string) => {
    const icons: Record<string, string> = {
      email: '📧',
      whatsapp: '💬',
      sms: '📱'
    };
    return icons[channel] || '📧';
  };

  return (
    <div className="bg-white rounded-[20px] shadow-sm">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A] mb-1">
              Campagnes marketing
            </h2>
            <p className="text-sm text-slate-600">
              Gérez vos campagnes multicanaux
            </p>
          </div>
          <button className="px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors font-medium text-sm">
            + Nouvelle campagne
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#F8FAFC] border-b border-slate-200">
            <tr>
              <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                Campagne
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                Canal
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                Segment
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                Statut
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                Performances
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns.map((campaign) => {
              const statusBadge = getStatusBadge(campaign.status);
              const openRate =
                campaign.stats.sent > 0
                  ? Math.round((campaign.stats.opened / campaign.stats.sent) * 100)
                  : 0;
              const clickRate =
                campaign.stats.opened > 0
                  ? Math.round((campaign.stats.clicked / campaign.stats.opened) * 100)
                  : 0;

              return (
                <tr key={campaign.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-semibold text-[#0F172A]">
                      {campaign.name}
                    </div>
                    {campaign.scheduledDate && (
                      <div className="text-xs text-slate-500 mt-1">
                        Planifiée le{' '}
                        {new Date(campaign.scheduledDate).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="text-lg">{getChannelIcon(campaign.channel)}</span>
                      {campaign.channel}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-3 py-1 bg-[#F1F5F9] text-[#334155] rounded-full text-sm font-medium">
                      {campaign.segment}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: statusBadge.bg,
                        color: statusBadge.text
                      }}
                    >
                      {campaign.status === 'draft' && 'Brouillon'}
                      {campaign.status === 'sent' && 'Envoyée'}
                      {campaign.status === 'scheduled' && 'Planifiée'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    {campaign.status === 'sent' ? (
                      <div className="space-y-1">
                        <div className="text-xs text-slate-600">
                          📨 {campaign.stats.sent} envois
                        </div>
                        <div className="text-xs text-slate-600">
                          👁️ {openRate}% ouverture
                        </div>
                        <div className="text-xs text-slate-600">
                          🖱️ {clickRate}% clics
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors">
                        Éditer
                      </button>
                      <button className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors">
                        Dupliquer
                      </button>
                      {campaign.status === 'draft' && (
                        <button className="px-3 py-1 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-xs font-medium transition-colors">
                          Envoyer
                        </button>
                      )}
                    </div>
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
