// Types
export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  lastStay: string;
  loyaltyScore: number;
  tags: string[];
  totalStays: number;
  totalRevenue: number;
  socialProfiles?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
  preferences: {
    bedType?: string;
    floor?: string;
    allergies?: string[];
  };
  stays: Stay[];
  communications: Communication[];
  reviews: Review[];
}

export interface Stay {
  id: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  rate: number;
  channel: string;
}

export interface Communication {
  id: string;
  channel: 'email' | 'whatsapp' | 'sms' | 'instagram' | 'facebook' | 'linkedin';
  message: string;
  date: string;
  direction: 'sent' | 'received';
}

export interface Review {
  id: string;
  date: string;
  rating: number;
  comment: string;
  platform: string;
}

export interface Segment {
  id: string;
  name: string;
  count: number;
  description: string;
  color: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: 'email' | 'whatsapp' | 'sms' | 'instagram' | 'facebook';
  segment: string;
  status: 'draft' | 'sent' | 'scheduled';
  stats: {
    sent: number;
    opened: number;
    clicked: number;
  };
  scheduledDate?: string;
}

export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  action: string;
  isActive: boolean;
  executions: number;
}

export interface Conversation {
  id: string;
  guestName: string;
  guestAvatar: string;
  channel: 'whatsapp' | 'email' | 'sms' | 'instagram' | 'facebook' | 'linkedin';
  lastMessage: string;
  date: string;
  unread: boolean;
}

// Mock Data
export const mockGuests: Guest[] = [
  {
    id: '1',
    firstName: 'Sophie',
    lastName: 'Martin',
    email: 'sophie.martin@example.com',
    phone: '+33 6 12 34 56 78',
    lastStay: '2024-02-15',
    loyaltyScore: 85,
    tags: ['VIP', 'Régulier'],
    totalStays: 8,
    totalRevenue: 4200,
    preferences: {
      bedType: 'King',
      floor: 'Élevé',
      allergies: ['Gluten']
    },
    stays: [
      { id: 's1', checkIn: '2024-02-15', checkOut: '2024-02-18', roomType: 'Suite Junior', rate: 450, channel: 'Direct' },
      { id: 's2', checkIn: '2023-11-10', checkOut: '2023-11-13', roomType: 'Deluxe', rate: 380, channel: 'Direct' },
      { id: 's3', checkIn: '2023-08-05', checkOut: '2023-08-08', roomType: 'Suite Junior', rate: 450, channel: 'Booking.com' }
    ],
    communications: [
      { id: 'c1', channel: 'whatsapp', message: 'Merci pour votre accueil !', date: '2024-02-18', direction: 'received' },
      { id: 'c2', channel: 'email', message: 'Confirmation de réservation', date: '2024-02-10', direction: 'sent' }
    ],
    reviews: [
      { id: 'r1', date: '2024-02-20', rating: 9, comment: 'Séjour exceptionnel, équipe au top !', platform: 'Google' }
    ]
  },
  {
    id: '2',
    firstName: 'Thomas',
    lastName: 'Dubois',
    email: 'thomas.dubois@example.com',
    phone: '+33 6 98 76 54 32',
    lastStay: '2024-03-01',
    loyaltyScore: 45,
    tags: ['Affaires'],
    totalStays: 3,
    totalRevenue: 1350,
    preferences: {
      bedType: 'Queen',
      floor: 'Bas'
    },
    stays: [
      { id: 's4', checkIn: '2024-03-01', checkOut: '2024-03-03', roomType: 'Standard', rate: 250, channel: 'Expedia' },
      { id: 's5', checkIn: '2024-01-15', checkOut: '2024-01-17', roomType: 'Standard', rate: 250, channel: 'Direct' }
    ],
    communications: [
      { id: 'c3', channel: 'email', message: 'Demande de facture', date: '2024-03-03', direction: 'received' }
    ],
    reviews: [
      { id: 'r2', date: '2024-03-05', rating: 7, comment: 'Correct pour le prix', platform: 'Booking.com' }
    ]
  },
  {
    id: '3',
    firstName: 'Emma',
    lastName: 'Bernard',
    email: 'emma.bernard@example.com',
    phone: '+33 7 11 22 33 44',
    lastStay: '2024-02-28',
    loyaltyScore: 92,
    tags: ['VIP', 'Fidèle', 'Famille'],
    totalStays: 12,
    totalRevenue: 6800,
    preferences: {
      bedType: 'Twin',
      floor: 'Élevé',
      allergies: ['Lactose']
    },
    stays: [
      { id: 's6', checkIn: '2024-02-28', checkOut: '2024-03-03', roomType: 'Suite Familiale', rate: 650, channel: 'Direct' },
      { id: 's7', checkIn: '2023-12-20', checkOut: '2023-12-27', roomType: 'Suite Familiale', rate: 700, channel: 'Direct' }
    ],
    communications: [
      { id: 'c4', channel: 'whatsapp', message: 'Pouvons-nous avoir la même chambre ?', date: '2024-02-25', direction: 'received' },
      { id: 'c5', channel: 'whatsapp', message: 'Bien sûr ! Chambre 305 réservée', date: '2024-02-25', direction: 'sent' }
    ],
    reviews: [
      { id: 'r3', date: '2024-03-05', rating: 10, comment: 'Parfait comme toujours !', platform: 'Google' }
    ]
  },
  {
    id: '4',
    firstName: 'Lucas',
    lastName: 'Moreau',
    email: 'lucas.moreau@example.com',
    phone: '+33 6 55 44 33 22',
    lastStay: '2024-01-10',
    loyaltyScore: 25,
    tags: ['Nouveau'],
    totalStays: 1,
    totalRevenue: 380,
    preferences: {
      bedType: 'King'
    },
    stays: [
      { id: 's8', checkIn: '2024-01-10', checkOut: '2024-01-12', roomType: 'Deluxe', rate: 380, channel: 'Airbnb' }
    ],
    communications: [
      { id: 'c6', channel: 'email', message: 'Bienvenue !', date: '2024-01-08', direction: 'sent' }
    ],
    reviews: []
  },
  {
    id: '5',
    firstName: 'Chloé',
    lastName: 'Leroy',
    email: 'chloe.leroy@example.com',
    phone: '+33 7 88 99 00 11',
    lastStay: '2023-08-15',
    loyaltyScore: 15,
    tags: ['Inactif'],
    totalStays: 2,
    totalRevenue: 620,
    preferences: {},
    stays: [
      { id: 's9', checkIn: '2023-08-15', checkOut: '2023-08-18', roomType: 'Standard', rate: 250, channel: 'Booking.com' },
      { id: 's10', checkIn: '2023-05-10', checkOut: '2023-05-12', roomType: 'Standard', rate: 240, channel: 'Direct' }
    ],
    communications: [
      { id: 'c7', channel: 'email', message: 'On vous a manqué !', date: '2024-02-01', direction: 'sent' }
    ],
    reviews: [
      { id: 'r4', date: '2023-08-20', rating: 8, comment: 'Bien situé', platform: 'Booking.com' }
    ]
  }
];

export const mockSegments: Segment[] = [
  { id: '1', name: 'Clients VIP', count: 23, description: 'Score fidélité > 80', color: '#10B981' },
  { id: '2', name: 'Nouveaux clients', count: 45, description: 'Premier séjour < 3 mois', color: '#3B82F6' },
  { id: '3', name: 'Clients réguliers', count: 67, description: '3-7 séjours', color: '#F59E0B' },
  { id: '4', name: 'Clients fidèles', count: 34, description: '8+ séjours', color: '#8B5CF6' },
  { id: '5', name: 'Clients inactifs', count: 28, description: 'Pas de séjour > 6 mois', color: '#EF4444' }
];

export const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Offre Saint-Valentin',
    channel: 'email',
    segment: 'Clients VIP',
    status: 'sent',
    stats: { sent: 23, opened: 18, clicked: 12 }
  },
  {
    id: '2',
    name: 'Bienvenue nouveaux clients',
    channel: 'whatsapp',
    segment: 'Nouveaux clients',
    status: 'scheduled',
    stats: { sent: 0, opened: 0, clicked: 0 },
    scheduledDate: '2024-03-20'
  },
  {
    id: '3',
    name: 'Réactivation inactifs',
    channel: 'email',
    segment: 'Clients inactifs',
    status: 'draft',
    stats: { sent: 0, opened: 0, clicked: 0 }
  },
  {
    id: '4',
    name: 'Promo Pâques',
    channel: 'sms',
    segment: 'Clients réguliers',
    status: 'sent',
    stats: { sent: 67, opened: 67, clicked: 34 }
  }
];

export const mockWorkflows: Workflow[] = [
  {
    id: '1',
    name: 'Nouvelle réservation → Email confirmation',
    trigger: 'Nouvelle réservation',
    action: 'Email de confirmation',
    isActive: true,
    executions: 234
  },
  {
    id: '2',
    name: 'Check-out → Demande avis',
    trigger: 'Check-out effectué',
    action: 'Email demande avis (J+1)',
    isActive: true,
    executions: 189
  },
  {
    id: '3',
    name: 'Note < 6 → Email excuse + coupon',
    trigger: 'Avis négatif reçu',
    action: 'Email personnalisé + coupon 20%',
    isActive: true,
    executions: 12
  },
  {
    id: '4',
    name: 'J-3 avant arrivée → WhatsApp check-in',
    trigger: '3 jours avant arrivée',
    action: 'WhatsApp avec lien check-in',
    isActive: true,
    executions: 156
  },
  {
    id: '5',
    name: 'Inactivité 6 mois → Réactivation',
    trigger: 'Pas de séjour depuis 6 mois',
    action: 'Email "On vous a manqué" + offre',
    isActive: false,
    executions: 45
  }
];

export const mockConversations: Conversation[] = [
  {
    id: '1',
    guestName: 'Sophie Martin',
    guestAvatar: 'SM',
    channel: 'whatsapp',
    lastMessage: 'Merci beaucoup ! À bientôt 😊',
    date: '2024-03-15 14:32',
    unread: false
  },
  {
    id: '2',
    guestName: 'Thomas Dubois',
    guestAvatar: 'TD',
    channel: 'email',
    lastMessage: 'Pouvez-vous m\'envoyer la facture détaillée ?',
    date: '2024-03-15 09:15',
    unread: true
  },
  {
    id: '3',
    guestName: 'Emma Bernard',
    guestAvatar: 'EB',
    channel: 'whatsapp',
    lastMessage: 'Est-il possible de réserver la chambre 305 ?',
    date: '2024-03-14 18:45',
    unread: true
  },
  {
    id: '4',
    guestName: 'Marc Petit',
    guestAvatar: 'MP',
    channel: 'sms',
    lastMessage: 'Réservation confirmée pour le 20 mars',
    date: '2024-03-13 11:20',
    unread: false
  },
  {
    id: '5',
    guestName: 'Julie Laurent',
    guestAvatar: 'JL',
    channel: 'email',
    lastMessage: 'Merci pour votre séjour chez nous !',
    date: '2024-03-12 16:00',
    unread: false
  },
  {
    id: '6',
    guestName: 'Marie Dupont',
    guestAvatar: 'MD',
    channel: 'instagram',
    lastMessage: 'Bonjour ! Avez-vous des disponibilités pour le week-end ? 🏨',
    date: '2024-03-15 11:20',
    unread: true
  },
  {
    id: '7',
    guestName: 'Pierre Durand',
    guestAvatar: 'PD',
    channel: 'facebook',
    lastMessage: 'Super séjour ! Je recommande vivement 👍',
    date: '2024-03-14 20:15',
    unread: false
  },
  {
    id: '8',
    guestName: 'Alexandra Chen',
    guestAvatar: 'AC',
    channel: 'linkedin',
    lastMessage: 'Bonjour, nous organisons un séminaire d\'entreprise, pouvez-vous nous envoyer un devis ?',
    date: '2024-03-14 16:30',
    unread: true
  },
  {
    id: '9',
    guestName: 'Nicolas Blanc',
    guestAvatar: 'NB',
    channel: 'instagram',
    lastMessage: 'Votre spa a l\'air incroyable ! Quels sont vos tarifs ? 💆',
    date: '2024-03-14 14:00',
    unread: true
  },
  {
    id: '10',
    guestName: 'Caroline Petit',
    guestAvatar: 'CP',
    channel: 'facebook',
    lastMessage: 'Je cherche un hôtel pour mes 40 ans, avez-vous des suites ?',
    date: '2024-03-13 19:45',
    unread: false
  }
];

export const mockAlerts = [
  {
    id: '1',
    type: 'warning',
    title: 'Chute du taux de rétention',
    message: 'Le taux de rétention a diminué de 5% ce mois par rapport au mois dernier',
    color: '#F59E0B'
  },
  {
    id: '2',
    type: 'error',
    title: 'Clients VIP sans interaction',
    message: '3 clients VIP n\'ont eu aucune interaction depuis 90 jours',
    color: '#EF4444'
  },
  {
    id: '3',
    type: 'info',
    title: 'Messages WhatsApp en attente',
    message: '2 messages WhatsApp sans réponse depuis 4 heures',
    color: '#3B82F6'
  }
];

export const mockIntegrations = [
  { id: '1', name: 'PMS Mews', status: 'connected', icon: '✅' },
  { id: '2', name: 'WhatsApp Business', status: 'warning', icon: '⚠️' },
  { id: '3', name: 'Mailchimp', status: 'connected', icon: '✅' },
  { id: '4', name: 'HubSpot', status: 'disconnected', icon: '❌' },
  { id: '5', name: 'Instagram DM', status: 'connected', icon: '✅' },
  { id: '6', name: 'Facebook Messenger', status: 'connected', icon: '✅' },
  { id: '7', name: 'LinkedIn Messages', status: 'warning', icon: '⚠️' }
];

// Réponses automatiques DM (Social Media)
export const mockAutoReplies = [
  {
    id: '1',
    platform: 'Instagram',
    trigger: 'Demande de disponibilité',
    message: 'Bonjour ! Merci de votre intérêt 😊 Pour vérifier nos disponibilités en temps réel, je vous invite à consulter notre moteur de réservation ou me préciser vos dates souhaitées.',
    status: 'active',
    responseRate: 92
  },
  {
    id: '2',
    platform: 'Instagram',
    trigger: 'Question sur les tarifs',
    message: 'Bonjour ! Nos tarifs varient selon la période et le type de chambre. Pouvez-vous me préciser vos dates et le nombre de personnes ? Je vous ferai une proposition personnalisée ! 🏨',
    status: 'active',
    responseRate: 88
  },
  {
    id: '3',
    platform: 'Facebook',
    trigger: 'Demande de réservation',
    message: 'Bonjour ! Pour réserver, vous pouvez utiliser notre moteur de réservation en ligne ou nous appeler au +33 1 23 45 67 89. Comment puis-je vous aider ?',
    status: 'active',
    responseRate: 95
  },
  {
    id: '4',
    platform: 'Instagram',
    trigger: 'Question Spa',
    message: 'Bonjour ! Notre spa propose massages, soins du visage et accès piscine. Tarifs : Massage 60min 85€, Accès spa 45€/jour. Réservation au 📞 +33 1 23 45 67 89',
    status: 'active',
    responseRate: 85
  },
  {
    id: '5',
    platform: 'Facebook',
    trigger: 'Question Restaurant',
    message: 'Bonjour ! Notre restaurant est ouvert de 12h à 14h30 et 19h à 22h30. Menu déjeuner 35€, Menu dégustation 85€. Réservation recommandée ! 🍽️',
    status: 'active',
    responseRate: 90
  },
  {
    id: '6',
    platform: 'Instagram',
    trigger: 'Question Parking',
    message: 'Bonjour ! Nous disposons d\'un parking privé sécurisé à 25€/nuit. Places limitées, réservation recommandée ! 🚗',
    status: 'active',
    responseRate: 94
  },
  {
    id: '7',
    platform: 'LinkedIn',
    trigger: 'Demande séminaire',
    message: 'Bonjour ! Merci pour votre intérêt pour nos espaces de réunion. Nous proposons 3 salles modulables (10 à 100 personnes). Un commercial vous contactera sous 24h.',
    status: 'active',
    responseRate: 100
  },
  {
    id: '8',
    platform: 'Instagram',
    trigger: 'Avis positif / Story',
    message: 'Merci beaucoup pour votre message ! 🙏 Nous sommes ravis que vous ayez apprécié votre séjour. N\'hésitez pas à partager votre expérience !',
    status: 'active',
    responseRate: 78
  }
];
