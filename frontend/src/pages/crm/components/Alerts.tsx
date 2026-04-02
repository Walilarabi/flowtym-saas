interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  color: string;
}

interface AlertsProps {
  alerts: Alert[];
  language?: 'fr' | 'en';
}

const alertTranslations = {
  fr: {
    retentionDrop: {
      title: 'Chute du taux de rétention',
      message: 'Le taux de rétention a diminué de 5% ce mois par rapport au mois dernier'
    },
    vipInactive: {
      title: 'Clients VIP sans interaction',
      message: "3 clients VIP n'ont eu aucune interaction depuis 90 jours"
    },
    whatsappPending: {
      title: 'Messages WhatsApp en attente',
      message: '2 messages WhatsApp sans réponse depuis 4 heures'
    }
  },
  en: {
    retentionDrop: {
      title: 'Retention Rate Drop',
      message: 'Retention rate decreased by 5% this month compared to last month'
    },
    vipInactive: {
      title: 'VIP Clients Inactive',
      message: '3 VIP clients have had no interaction for 90 days'
    },
    whatsappPending: {
      title: 'WhatsApp Messages Pending',
      message: '2 WhatsApp messages unanswered for 4 hours'
    }
  }
};

export default function Alerts({ alerts, language = 'fr' }: AlertsProps) {
  const t = alertTranslations[language];
  
  const translatedAlerts = alerts.map(alert => {
    if (alert.id === '1') return { ...alert, title: t.retentionDrop.title, message: t.retentionDrop.message };
    if (alert.id === '2') return { ...alert, title: t.vipInactive.title, message: t.vipInactive.message };
    if (alert.id === '3') return { ...alert, title: t.whatsappPending.title, message: t.whatsappPending.message };
    return alert;
  });
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {translatedAlerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-white rounded-[20px] p-4 shadow-sm border-l-4"
          style={{ borderLeftColor: alert.color }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: alert.color }}
            >
              {alert.type === 'warning' && '⚠️'}
              {alert.type === 'error' && '❗'}
              {alert.type === 'info' && 'ℹ️'}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-[#0F172A] text-sm mb-1">
                {alert.title}
              </h4>
              <p className="text-xs text-slate-600">{alert.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
