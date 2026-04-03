/**
 * Flowtym SaaS Admin — Système i18n léger
 * Supporte FR (défaut) et EN sans dépendance externe
 *
 * Usage :
 *   const { t, lang, setLang } = useI18n()
 *   t('nav.reservations')  // → "Réservations" ou "Reservations"
 */

import { createContext, useContext, useState, useCallback } from 'react'

// ── Dictionnaire de traductions ──────────────────────────────────────────────

const translations = {
  fr: {
    // ── Navigation principale ─────────────────────────────────────────────
    'nav.flowboard':      'Flowboard',
    'nav.consignes':      'Consignes',
    'nav.pms':            'PMS',
    'nav.channel':        'Channel',
    'nav.rms':            'Hoptym',
    'nav.ereputation':    'E-Réputation',
    'nav.crm':            'CRM',
    'nav.booking':        'Booking',
    'nav.housekeeping':   'Housekeeping',
    'nav.maintenance':    'Maintenance',
    'nav.staff':          'Staff',
    'nav.rapports':       'Rapports',
    'nav.datahub':        'Data Hub',
    'nav.integrations':   'Intégrations',
    'nav.config':         'Configuration',

    // ── Sous-navigation PMS ───────────────────────────────────────────────
    'pms.planning':       'Planning',
    'pms.reservations':   'Réservations',
    'pms.clients':        'Clients',
    'pms.arrivals':       'Arrivées',
    'pms.departures':     'Départs',
    'pms.groups':         'Groups & Séminaires',
    'pms.simulation':     'Simulation & Offres',
    'pms.nightaudit':     'Clôture',
    'pms.reports':        'Rapports',

    // ── Sous-navigation Staff ─────────────────────────────────────────────
    'staff.dashboard':    'Dashboard',
    'staff.planning':     'Planning',
    'staff.pointage':     'Pointage',
    'staff.employees':    'Personnel',
    'staff.contracts':    'Contrats',
    'staff.payroll':      'Paie & URSSAF',
    'staff.recruitment':  'Recrutement',
    'staff.reporting':    'Reporting',
    'staff.config':       'Configuration',

    // ── Actions communes ──────────────────────────────────────────────────
    'action.save':        'Enregistrer',
    'action.cancel':      'Annuler',
    'action.delete':      'Supprimer',
    'action.edit':        'Modifier',
    'action.create':      'Créer',
    'action.add':         'Ajouter',
    'action.close':       'Fermer',
    'action.confirm':     'Confirmer',
    'action.search':      'Rechercher',
    'action.filter':      'Filtrer',
    'action.export':      'Exporter',
    'action.import':      'Importer',
    'action.refresh':     'Actualiser',
    'action.download':    'Télécharger',
    'action.upload':      'Importer',
    'action.send':        'Envoyer',
    'action.validate':    'Valider',
    'action.reject':      'Refuser',
    'action.print':       'Imprimer',
    'action.view':        'Voir',
    'action.back':        'Retour',
    'action.next':        'Suivant',
    'action.prev':        'Précédent',
    'action.apply':       'Appliquer',
    'action.reset':       'Réinitialiser',
    'action.logout':      'Déconnexion',

    // ── États ─────────────────────────────────────────────────────────────
    'status.active':      'Actif',
    'status.inactive':    'Inactif',
    'status.pending':     'En attente',
    'status.confirmed':   'Confirmé',
    'status.cancelled':   'Annulé',
    'status.completed':   'Terminé',
    'status.in_progress': 'En cours',
    'status.draft':       'Brouillon',
    'status.published':   'Publié',
    'status.archived':    'Archivé',
    'status.error':       'Erreur',
    'status.success':     'Succès',
    'status.loading':     'Chargement…',
    'status.no_data':     'Aucune donnée',
    'status.empty':       'Aucun résultat',

    // ── Réservations ──────────────────────────────────────────────────────
    'res.title':          'Réservations',
    'res.new':            'Nouvelle réservation',
    'res.checkin':        'Arrivée',
    'res.checkout':       'Départ',
    'res.guests':         'Voyageurs',
    'res.room':           'Chambre',
    'res.amount':         'Montant',
    'res.channel':        'Canal',
    'res.status':         'Statut',
    'res.notes':          'Notes',
    'res.total':          'Total',
    'res.nights':         'Nuits',

    // ── Clients ───────────────────────────────────────────────────────────
    'client.title':       'Clients',
    'client.name':        'Nom',
    'client.email':       'Email',
    'client.phone':       'Téléphone',
    'client.country':     'Pays',
    'client.loyalty':     'Fidélité',
    'client.total_stays': 'Séjours',
    'client.total_spent': 'CA total',
    'client.new':         'Nouveau client',

    // ── Chambres ──────────────────────────────────────────────────────────
    'room.title':         'Chambres',
    'room.number':        'Numéro',
    'room.type':          'Type',
    'room.floor':         'Étage',
    'room.status':        'Statut',
    'room.capacity':      'Capacité',
    'room.price':         'Prix',
    'room.available':     'Disponible',
    'room.occupied':      'Occupée',
    'room.cleaning':      'Nettoyage',
    'room.maintenance':   'Maintenance',
    'room.new':           'Nouvelle chambre',

    // ── KPIs & Métriques ──────────────────────────────────────────────────
    'kpi.occupancy':      'Taux d\'occupation',
    'kpi.adr':            'Prix moyen (ADR)',
    'kpi.revpar':         'RevPAR',
    'kpi.revenue':        'Chiffre d\'affaires',
    'kpi.arrivals':       'Arrivées',
    'kpi.departures':     'Départs',
    'kpi.stayover':       'En séjour',
    'kpi.available':      'Disponibles',

    // ── Dates & Temps ─────────────────────────────────────────────────────
    'date.today':         'Aujourd\'hui',
    'date.yesterday':     'Hier',
    'date.tomorrow':      'Demain',
    'date.this_week':     'Cette semaine',
    'date.this_month':    'Ce mois',
    'date.last_month':    'Mois dernier',
    'date.custom':        'Période personnalisée',

    // ── Messages système ──────────────────────────────────────────────────
    'msg.save_success':   'Modifications enregistrées',
    'msg.save_error':     'Erreur lors de l\'enregistrement',
    'msg.delete_confirm': 'Confirmer la suppression ?',
    'msg.delete_success': 'Suppression effectuée',
    'msg.delete_error':   'Erreur lors de la suppression',
    'msg.load_error':     'Erreur de chargement',
    'msg.no_permission':  'Vous n\'avez pas les droits nécessaires',
    'msg.session_expired':'Votre session a expiré',
    'msg.required_field': 'Champ obligatoire',

    // ── Housekeeping ──────────────────────────────────────────────────────
    'hk.title':           'Housekeeping',
    'hk.tasks':           'Tâches',
    'hk.clean':           'À nettoyer',
    'hk.dirty':           'Sale',
    'hk.inspected':       'Inspectée',
    'hk.do_not_disturb':  'Ne pas déranger',
    'hk.assigned_to':     'Assignée à',
    'hk.priority':        'Priorité',
    'hk.room_type':       'Type de chambre',

    // ── Staff ─────────────────────────────────────────────────────────────
    'staff_emp.title':    'Personnel',
    'staff_emp.name':     'Nom',
    'staff_emp.role':     'Rôle',
    'staff_emp.dept':     'Service',
    'staff_emp.schedule': 'Planning',
    'staff_emp.contract': 'Contrat',

    // ── CRM ───────────────────────────────────────────────────────────────
    'crm.title':          'CRM',
    'crm.segments':       'Segments',
    'crm.campaigns':      'Campagnes',
    'crm.messages':       'Messages',
    'crm.analytics':      'Analytics',
    'crm.vip':            'VIP',
    'crm.loyal':          'Fidèle',
    'crm.regular':        'Régulier',
    'crm.new':            'Nouveau',

    // ── Langue ────────────────────────────────────────────────────────────
    'lang.fr':            'Français',
    'lang.en':            'English',
    'lang.label':         'Langue',
  },

  en: {
    // ── Main navigation ───────────────────────────────────────────────────
    'nav.flowboard':      'Flowboard',
    'nav.consignes':      'Logbook',
    'nav.pms':            'PMS',
    'nav.channel':        'Channel',
    'nav.rms':            'Hoptym',
    'nav.ereputation':    'E-Reputation',
    'nav.crm':            'CRM',
    'nav.booking':        'Booking',
    'nav.housekeeping':   'Housekeeping',
    'nav.staff':          'Staff',
    'nav.maintenance':    'Maintenance',
    'nav.rapports':       'Reports',
    'nav.datahub':        'Data Hub',
    'nav.integrations':   'Integrations',
    'nav.config':         'Settings',

    // ── PMS sub-navigation ────────────────────────────────────────────────
    'pms.planning':       'Calendar',
    'pms.reservations':   'Reservations',
    'pms.clients':        'Guests',
    'pms.arrivals':       'Arrivals',
    'pms.departures':     'Departures',
    'pms.groups':         'Groups & Events',
    'pms.simulation':     'Quotes & Offers',
    'pms.nightaudit':     'Night Audit',
    'pms.reports':        'Reports',

    // ── Staff sub-navigation ──────────────────────────────────────────────
    'staff.dashboard':    'Dashboard',
    'staff.planning':     'Schedule',
    'staff.pointage':     'Time Tracking',
    'staff.employees':    'Employees',
    'staff.contracts':    'Contracts',
    'staff.payroll':      'Payroll',
    'staff.recruitment':  'Recruitment',
    'staff.reporting':    'Reporting',
    'staff.config':       'Settings',

    // ── Common actions ────────────────────────────────────────────────────
    'action.save':        'Save',
    'action.cancel':      'Cancel',
    'action.delete':      'Delete',
    'action.edit':        'Edit',
    'action.create':      'Create',
    'action.add':         'Add',
    'action.close':       'Close',
    'action.confirm':     'Confirm',
    'action.search':      'Search',
    'action.filter':      'Filter',
    'action.export':      'Export',
    'action.import':      'Import',
    'action.refresh':     'Refresh',
    'action.download':    'Download',
    'action.upload':      'Upload',
    'action.send':        'Send',
    'action.validate':    'Validate',
    'action.reject':      'Reject',
    'action.print':       'Print',
    'action.view':        'View',
    'action.back':        'Back',
    'action.next':        'Next',
    'action.prev':        'Previous',
    'action.apply':       'Apply',
    'action.reset':       'Reset',
    'action.logout':      'Sign out',

    // ── Statuses ──────────────────────────────────────────────────────────
    'status.active':      'Active',
    'status.inactive':    'Inactive',
    'status.pending':     'Pending',
    'status.confirmed':   'Confirmed',
    'status.cancelled':   'Cancelled',
    'status.completed':   'Completed',
    'status.in_progress': 'In progress',
    'status.draft':       'Draft',
    'status.published':   'Published',
    'status.archived':    'Archived',
    'status.error':       'Error',
    'status.success':     'Success',
    'status.loading':     'Loading…',
    'status.no_data':     'No data',
    'status.empty':       'No results',

    // ── Reservations ──────────────────────────────────────────────────────
    'res.title':          'Reservations',
    'res.new':            'New reservation',
    'res.checkin':        'Check-in',
    'res.checkout':       'Check-out',
    'res.guests':         'Guests',
    'res.room':           'Room',
    'res.amount':         'Amount',
    'res.channel':        'Channel',
    'res.status':         'Status',
    'res.notes':          'Notes',
    'res.total':          'Total',
    'res.nights':         'Nights',

    // ── Clients / Guests ──────────────────────────────────────────────────
    'client.title':       'Guests',
    'client.name':        'Name',
    'client.email':       'Email',
    'client.phone':       'Phone',
    'client.country':     'Country',
    'client.loyalty':     'Loyalty',
    'client.total_stays': 'Stays',
    'client.total_spent': 'Total revenue',
    'client.new':         'New guest',

    // ── Rooms ─────────────────────────────────────────────────────────────
    'room.title':         'Rooms',
    'room.number':        'Number',
    'room.type':          'Type',
    'room.floor':         'Floor',
    'room.status':        'Status',
    'room.capacity':      'Capacity',
    'room.price':         'Price',
    'room.available':     'Available',
    'room.occupied':      'Occupied',
    'room.cleaning':      'Housekeeping',
    'room.maintenance':   'Maintenance',
    'room.new':           'New room',

    // ── KPIs & Metrics ────────────────────────────────────────────────────
    'kpi.occupancy':      'Occupancy rate',
    'kpi.adr':            'Average daily rate (ADR)',
    'kpi.revpar':         'RevPAR',
    'kpi.revenue':        'Revenue',
    'kpi.arrivals':       'Arrivals',
    'kpi.departures':     'Departures',
    'kpi.stayover':       'Stay-overs',
    'kpi.available':      'Available',

    // ── Dates & Time ──────────────────────────────────────────────────────
    'date.today':         'Today',
    'date.yesterday':     'Yesterday',
    'date.tomorrow':      'Tomorrow',
    'date.this_week':     'This week',
    'date.this_month':    'This month',
    'date.last_month':    'Last month',
    'date.custom':        'Custom period',

    // ── System messages ───────────────────────────────────────────────────
    'msg.save_success':   'Changes saved',
    'msg.save_error':     'Error while saving',
    'msg.delete_confirm': 'Confirm deletion?',
    'msg.delete_success': 'Successfully deleted',
    'msg.delete_error':   'Error while deleting',
    'msg.load_error':     'Loading error',
    'msg.no_permission':  'You don\'t have the required permissions',
    'msg.session_expired':'Your session has expired',
    'msg.required_field': 'Required field',

    // ── Housekeeping ──────────────────────────────────────────────────────
    'hk.title':           'Housekeeping',
    'hk.tasks':           'Tasks',
    'hk.clean':           'To clean',
    'hk.dirty':           'Dirty',
    'hk.inspected':       'Inspected',
    'hk.do_not_disturb':  'Do not disturb',
    'hk.assigned_to':     'Assigned to',
    'hk.priority':        'Priority',
    'hk.room_type':       'Room type',

    // ── Staff ─────────────────────────────────────────────────────────────
    'staff_emp.title':    'Employees',
    'staff_emp.name':     'Name',
    'staff_emp.role':     'Role',
    'staff_emp.dept':     'Department',
    'staff_emp.schedule': 'Schedule',
    'staff_emp.contract': 'Contract',

    // ── CRM ───────────────────────────────────────────────────────────────
    'crm.title':          'CRM',
    'crm.segments':       'Segments',
    'crm.campaigns':      'Campaigns',
    'crm.messages':       'Messages',
    'crm.analytics':      'Analytics',
    'crm.vip':            'VIP',
    'crm.loyal':          'Loyal',
    'crm.regular':        'Regular',
    'crm.new':            'New',

    // ── Language ──────────────────────────────────────────────────────────
    'lang.fr':            'Français',
    'lang.en':            'English',
    'lang.label':         'Language',
  },
}

const SUPPORTED_LANGS = ['fr', 'en']
const STORAGE_KEY = 'flowtym_lang'

// ── Context ──────────────────────────────────────────────────────────────────

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && SUPPORTED_LANGS.includes(stored)) return stored
    const browser = navigator.language?.slice(0, 2)
    return SUPPORTED_LANGS.includes(browser) ? browser : 'fr'
  })

  const setLang = useCallback((newLang) => {
    if (!SUPPORTED_LANGS.includes(newLang)) return
    localStorage.setItem(STORAGE_KEY, newLang)
    setLangState(newLang)
    // Update <html lang=""> attribute
    document.documentElement.setAttribute('lang', newLang)
  }, [])

  /**
   * Traduit une clé. Supporte l'interpolation : t('msg', { name: 'Jean' })
   * Fallback sur la clé elle-même si non trouvée.
   */
  const t = useCallback((key, vars = {}) => {
    const dict = translations[lang] || translations['fr']
    let str = dict[key] ?? translations['fr'][key] ?? key

    // Interpolation simple : {name} → vars.name
    if (vars && typeof vars === 'object') {
      str = str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`))
    }

    return str
  }, [lang])

  /** Détecte si la langue courante est RTL (arabe, hébreu…) */
  const isRTL = lang === 'ar' || lang === 'he'

  return (
    <I18nContext.Provider value={{ lang, setLang, t, isRTL, supportedLangs: SUPPORTED_LANGS }}>
      {children}
    </I18nContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

// ── Export des traductions brutes (pour tests, SSR…) ─────────────────────────
export { translations, SUPPORTED_LANGS }
