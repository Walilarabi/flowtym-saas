// Complete translations for Flowtym CRM
export type Language = 'fr' | 'en';

export interface Translations {
  app: {
    title: string;
    subtitle: string;
    innovations: string;
  };
  tabs: {
    clients: string;
    segments: string;
    communications: string;
    'auto-replies': string;
    workflows: string;
    campaigns: string;
    analytics: string;
    connectors: string;
    configuration: string;
    copilot: string;
    upsells: string;
    loyalty: string;
    feedback: string;
    sustainability: string;
    marketplace: string;
    voice: string;
    housekeeping: string;
    community: string;
  };
  kpi: {
    totalClients: string;
    retentionRate: string;
    npsScore: string;
    revenuePerClient: string;
  };
  alerts: {
    retentionDrop: { title: string; message: string };
    vipInactive: { title: string; message: string };
    whatsappPending: { title: string; message: string };
  };
  kpiToggle: {
    hide: string;
    show: string;
  };
  copilot: {
    open: string;
    title: string;
    subtitle: string;
  };
  // Add more translations as needed
}

export const translations: Record<Language, Translations> = {
  fr: {
    app: {
      title: 'Flowtym CRM',
      subtitle: "Gestion de la relation client — L'OS qui pense, prédit et agit pour votre hôtel",
      innovations: '✨ INNOVATIONS'
    },
    tabs: {
      clients: 'Clients',
      segments: 'Segmentation',
      communications: 'Inbox',
      'auto-replies': 'Réponses Auto',
      workflows: 'Workflows',
      campaigns: 'Campagnes',
      analytics: 'Analytics',
      connectors: 'Connecteurs',
      configuration: 'Configuration',
      copilot: 'Copilot IA',
      upsells: 'Upsells',
      loyalty: 'Fidélité',
      feedback: 'Feedback',
      sustainability: 'Éco-Score',
      marketplace: 'Marketplace',
      voice: 'Voice',
      housekeeping: 'Housekeeping',
      community: 'Community'
    },
    kpi: {
      totalClients: 'Clients totaux',
      retentionRate: 'Taux de rétention',
      npsScore: 'Score NPS',
      revenuePerClient: 'CA par client'
    },
    alerts: {
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
    kpiToggle: {
      hide: 'Masquer les KPI',
      show: 'Afficher les KPI'
    },
    copilot: {
      open: 'Ouvrir Flowtym Copilot',
      title: 'Flowtym Copilot',
      subtitle: 'Votre assistant IA intelligent'
    }
  },
  en: {
    app: {
      title: 'Flowtym CRM',
      subtitle: 'Customer Relationship Management — The OS that thinks, predicts and acts for your hotel',
      innovations: '✨ INNOVATIONS'
    },
    tabs: {
      clients: 'Clients',
      segments: 'Segmentation',
      communications: 'Inbox',
      'auto-replies': 'Auto Replies',
      workflows: 'Workflows',
      campaigns: 'Campaigns',
      analytics: 'Analytics',
      connectors: 'Connectors',
      configuration: 'Configuration',
      copilot: 'Copilot AI',
      upsells: 'Upsells',
      loyalty: 'Loyalty',
      feedback: 'Feedback',
      sustainability: 'Eco-Score',
      marketplace: 'Marketplace',
      voice: 'Voice',
      housekeeping: 'Housekeeping',
      community: 'Community'
    },
    kpi: {
      totalClients: 'Total Clients',
      retentionRate: 'Retention Rate',
      npsScore: 'NPS Score',
      revenuePerClient: 'Revenue per Client'
    },
    alerts: {
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
    },
    kpiToggle: {
      hide: 'Hide KPIs',
      show: 'Show KPIs'
    },
    copilot: {
      open: 'Open Flowtym Copilot',
      title: 'Flowtym Copilot',
      subtitle: 'Your intelligent AI assistant'
    }
  }
};

// Message translations for client communications
export const messageTranslations: Record<string, { fr: string; en: string }> = {
  'Merci pour votre accueil !': {
    fr: 'Merci pour votre accueil !',
    en: 'Thank you for the warm welcome!'
  },
  'Confirmation de réservation': {
    fr: 'Confirmation de réservation',
    en: 'Booking confirmation'
  },
  'Demande de facture': {
    fr: 'Demande de facture',
    en: 'Invoice request'
  },
  "Pouvons-nous avoir la même chambre ?": {
    fr: "Pouvons-nous avoir la même chambre ?",
    en: 'Can we have the same room?'
  },
  'Bien sûr ! Chambre 305 réservée': {
    fr: 'Bien sûr ! Chambre 305 réservée',
    en: 'Of course! Room 305 reserved'
  },
  'Bienvenue !': {
    fr: 'Bienvenue !',
    en: 'Welcome!'
  },
  'On vous a manqué !': {
    fr: 'On vous a manqué !',
    en: 'We missed you!'
  },
  "Séjour exceptionnel, équipe au top !": {
    fr: 'Séjour exceptionnel, équipe au top !',
    en: 'Exceptional stay, top-notch team!'
  },
  'Correct pour le prix': {
    fr: 'Correct pour le prix',
    en: 'Adequate for the price'
  },
  'Parfait comme toujours !': {
    fr: 'Parfait comme toujours !',
    en: 'Perfect as always!'
  },
  'Bien situé': {
    fr: 'Bien situé',
    en: 'Well located'
  },
  'Merci beaucoup ! À bientôt 😊': {
    fr: 'Merci beaucoup ! À bientôt 😊',
    en: 'Thank you so much! See you soon 😊'
  },
  "Pouvez-vous m'envoyer la facture détaillée ?": {
    fr: "Pouvez-vous m'envoyer la facture détaillée ?",
    en: 'Can you send me the detailed invoice?'
  },
  'Est-il possible de réserver la chambre 305 ?': {
    fr: 'Est-il possible de réserver la chambre 305 ?',
    en: 'Is it possible to book room 305?'
  },
  'Réservation confirmée pour le 20 mars': {
    fr: 'Réservation confirmée pour le 20 mars',
    en: 'Booking confirmed for March 20th'
  },
  'Merci pour votre séjour chez nous !': {
    fr: 'Merci pour votre séjour chez nous !',
    en: 'Thank you for staying with us!'
  },
  'Bonjour ! Avez-vous des disponibilités pour le week-end ? 🏨': {
    fr: 'Bonjour ! Avez-vous des disponibilités pour le week-end ? 🏨',
    en: 'Hello! Do you have availability for the weekend? 🏨'
  },
  'Super séjour ! Je recommande vivement 👍': {
    fr: 'Super séjour ! Je recommande vivement 👍',
    en: 'Great stay! I highly recommend 👍'
  },
  "Bonjour, nous organisons un séminaire d'entreprise, pouvez-vous nous envoyer un devis ?": {
    fr: "Bonjour, nous organisons un séminaire d'entreprise, pouvez-vous nous envoyer un devis ?",
    en: 'Hello, we are organizing a company seminar, can you send us a quote?'
  },
  "Votre spa a l'air incroyable ! Quels sont vos tarifs ? 💆": {
    fr: "Votre spa a l'air incroyable ! Quels sont vos tarifs ? 💆",
    en: 'Your spa looks amazing! What are your rates? 💆'
  },
  'Je cherche un hôtel pour mes 40 ans, avez-vous des suites ?': {
    fr: 'Je cherche un hôtel pour mes 40 ans, avez-vous des suites ?',
    en: 'I am looking for a hotel for my 40th birthday, do you have suites?'
  }
};

export function translateMessage(message: string, language: Language): string {
  return messageTranslations[message]?.[language] || message;
}
