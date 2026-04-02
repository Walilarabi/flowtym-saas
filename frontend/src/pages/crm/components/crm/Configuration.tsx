import { useState } from 'react';

interface MenuItem {
  id: string;
  name: string;
  icon: string;
  order: number;
  active: boolean;
  visible: boolean;
  description: string;
  category: 'core' | 'innovation';
}

interface Role {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  permissions: string[];
  userCount: number;
}

interface ModuleConnection {
  id: string;
  name: string;
  icon: string;
  status: 'connected' | 'partial' | 'disconnected';
  data: string[];
  lastSync: string;
}

const defaultMenuItems: MenuItem[] = [
  { id: 'clients', name: 'Clients', icon: '👥', order: 1, active: true, visible: true, description: 'Gestion des fiches clients', category: 'core' },
  { id: 'segmentation', name: 'Segmentation', icon: '🎯', order: 2, active: true, visible: true, description: 'Segments et scoring', category: 'core' },
  { id: 'inbox', name: 'Inbox', icon: '💬', order: 3, active: true, visible: true, description: 'Communications multicanal', category: 'core' },
  { id: 'auto-replies', name: 'Réponses Auto', icon: '🤖', order: 4, active: true, visible: true, description: 'Réponses automatiques', category: 'core' },
  { id: 'workflows', name: 'Workflows', icon: '⚙️', order: 5, active: true, visible: true, description: 'Automation des tâches', category: 'core' },
  { id: 'campaigns', name: 'Campagnes', icon: '📧', order: 6, active: true, visible: true, description: 'Marketing et newsletters', category: 'core' },
  { id: 'analytics', name: 'Analytics', icon: '📊', order: 7, active: true, visible: true, description: 'Rapports et statistiques', category: 'core' },
  { id: 'integrations', name: 'Connecteurs', icon: '🔗', order: 8, active: true, visible: true, description: 'Intégrations externes', category: 'core' },
  { id: 'configuration', name: 'Configuration', icon: '🛠️', order: 9, active: true, visible: true, description: 'Paramètres du CRM', category: 'core' },
  // MODULES INTELLIGENCE
  { id: 'copilot', name: 'Copilot IA', icon: '🧠', order: 10, active: true, visible: true, description: 'Assistant IA conversationnel', category: 'innovation' },
  { id: 'upsells', name: 'Upsell Engine', icon: '💎', order: 11, active: true, visible: true, description: 'Maximisation des revenus', category: 'innovation' },
  { id: 'loyalty', name: 'Programme Fidélité', icon: '🏆', order: 12, active: true, visible: true, description: 'Fidélisation gamifiée', category: 'innovation' },
  { id: 'feedback', name: 'Micro-Feedback', icon: '📝', order: 13, active: true, visible: true, description: 'Feedback temps réel', category: 'innovation' },
  { id: 'sustainability', name: 'Sustainability', icon: '🌱', order: 14, active: true, visible: true, description: 'Éco-responsabilité', category: 'innovation' },
  { id: 'marketplace', name: 'Marketplace', icon: '🏪', order: 15, active: true, visible: true, description: 'Plugins et extensions', category: 'innovation' },
  { id: 'voice', name: 'Voice Concierge', icon: '🎙️', order: 16, active: true, visible: true, description: 'Assistant vocal', category: 'innovation' },
  { id: 'housekeeping', name: 'Housekeeping', icon: '🧹', order: 17, active: true, visible: true, description: 'Ménage prédictif', category: 'innovation' },
  { id: 'community', name: 'Community', icon: '🌐', order: 18, active: true, visible: true, description: 'Benchmarks et forum', category: 'innovation' },
];

const defaultRoles: Role[] = [
  {
    id: 'admin',
    name: 'Administrateur',
    icon: '👑',
    color: '#7C3AED',
    description: 'Accès complet à tous les modules',
    permissions: ['clients', 'segmentation', 'inbox', 'auto-replies', 'workflows', 'campaigns', 'analytics', 'integrations', 'configuration', 'copilot', 'upsells', 'loyalty', 'feedback', 'sustainability', 'marketplace', 'voice', 'housekeeping', 'community'],
    userCount: 2
  },
  {
    id: 'manager',
    name: 'Manager',
    icon: '💼',
    color: '#3B82F6',
    description: 'Gestion et reporting + intelligence',
    permissions: ['clients', 'segmentation', 'inbox', 'workflows', 'campaigns', 'analytics', 'copilot', 'upsells', 'loyalty', 'feedback', 'sustainability', 'community'],
    userCount: 3
  },
  {
    id: 'receptionist',
    name: 'Réceptionniste',
    icon: '🛎️',
    color: '#8B5CF6',
    description: "Clients, communications et outils d'aide",
    permissions: ['clients', 'inbox', 'auto-replies', 'copilot', 'feedback', 'voice'],
    userCount: 8
  },
  {
    id: 'marketing',
    name: 'Marketing',
    icon: '📢',
    color: '#F59E0B',
    description: 'Campagnes, segments et fidélisation',
    permissions: ['segmentation', 'campaigns', 'analytics', 'upsells', 'loyalty', 'community'],
    userCount: 2
  },
  {
    id: 'readonly',
    name: 'Lecture seule',
    icon: '👁️',
    color: '#6B7280',
    description: 'Consultation uniquement',
    permissions: ['clients', 'analytics'],
    userCount: 5
  },
];

const moduleConnections: ModuleConnection[] = [
  { id: 'pms', name: 'PMS', icon: '🏨', status: 'connected', data: ['Réservations', 'Check-in/out', 'Factures', 'Clients'], lastSync: 'Il y a 2 min' },
  { id: 'channel-manager', name: 'Channel Manager', icon: '🌐', status: 'connected', data: ['Disponibilités', 'Tarifs', 'Canaux OTA'], lastSync: 'Il y a 1 min' },
  { id: 'rms', name: 'RMS', icon: '💰', status: 'connected', data: ['Prix optimaux', 'Prévisions', 'Scoring'], lastSync: 'Il y a 5 min' },
  { id: 'ereputation', name: 'E-Réputation', icon: '⭐', status: 'connected', data: ['Avis', 'Notes', 'Sentiment', 'Alertes'], lastSync: 'Il y a 3 min' },
  { id: 'staff', name: 'Staff', icon: '👥', status: 'connected', data: ['Équipes', 'Planning', 'Tâches'], lastSync: 'Il y a 10 min' },
  { id: 'housekeeping', name: 'Housekeeping', icon: '🧹', status: 'connected', data: ['Chambres', 'Statuts', 'Priorités'], lastSync: 'Il y a 1 min' },
  { id: 'maintenance', name: 'Maintenance', icon: '🔧', status: 'partial', data: ['Tickets', 'Interventions'], lastSync: 'Il y a 1 heure' },
  { id: 'restaurant', name: 'Restauration', icon: '🍽️', status: 'partial', data: ['Réservations', 'Commandes'], lastSync: 'Il y a 30 min' },
  { id: 'breakfast', name: 'Petit-déjeuner', icon: '🥐', status: 'connected', data: ['Préférences', 'Allergies'], lastSync: 'Il y a 5 min' },
  { id: 'marketing', name: 'Marketing', icon: '📢', status: 'connected', data: ['Campagnes', 'Segments', 'Stats'], lastSync: 'Il y a 2 min' },
  { id: 'reports', name: 'Rapports', icon: '📊', status: 'connected', data: ['KPIs', 'Analytics', 'Exports'], lastSync: 'Il y a 1 min' },
  { id: 'configuration', name: 'Configuration', icon: '⚙️', status: 'connected', data: ['Paramètres', 'Droits', 'Modules'], lastSync: 'En temps réel' },
];

export default function Configuration() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems);
  const [roles, setRoles] = useState<Role[]>(defaultRoles);
  const [activeTab, setActiveTab] = useState<'menus' | 'roles' | 'connectivity' | 'general'>('menus');
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  void showMenuModal; void showRoleModal; void editingMenu; void editingRole;

  const toggleMenuVisibility = (id: string) => {
    setMenuItems(menuItems.map(item =>
      item.id === id ? { ...item, visible: !item.visible } : item
    ));
  };

  const toggleMenuActive = (id: string) => {
    setMenuItems(menuItems.map(item =>
      item.id === id ? { ...item, active: !item.active } : item
    ));
  };

  const deleteMenu = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce menu ?')) {
      setMenuItems(menuItems.filter(item => item.id !== id));
    }
  };

  const deleteRole = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rôle ?')) {
      setRoles(roles.filter(role => role.id !== id));
    }
  };

  const togglePermission = (roleId: string, menuId: string) => {
    setRoles(roles.map(role => {
      if (role.id === roleId) {
        const hasPermission = role.permissions.includes(menuId);
        return {
          ...role,
          permissions: hasPermission
            ? role.permissions.filter(p => p !== menuId)
            : [...role.permissions, menuId]
        };
      }
      return role;
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-purple-100 text-purple-800';
      case 'partial': return 'bg-amber-100 text-amber-800';
      case 'disconnected': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return '✅';
      case 'partial': return '⚠️';
      case 'disconnected': return '❌';
      default: return '⚪';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'connected': return 'Connecté';
      case 'partial': return 'Partiel';
      case 'disconnected': return 'Non connecté';
      default: return 'Inconnu';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[20px] shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Configuration</h2>
            <p className="text-sm text-gray-500">Paramètres généraux, menus, rôles et connectivité</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <span className="text-xs font-medium text-purple-700">Flowtym CRM v2.0</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('menus')}
            className={`px-4 py-2 font-medium transition-all ${
              activeTab === 'menus'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Menus
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 font-medium transition-all ${
              activeTab === 'roles'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👥 Rôles & Accès
          </button>
          <button
            onClick={() => setActiveTab('connectivity')}
            className={`px-4 py-2 font-medium transition-all ${
              activeTab === 'connectivity'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔗 Connectivité
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 font-medium transition-all ${
              activeTab === 'general'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚙️ Général
          </button>
        </div>
      </div>

      {/* Menus Management */}
      {activeTab === 'menus' && (
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Gestion des Menus</h3>
            <button
              onClick={() => setShowMenuModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
            >
              ➕ Ajouter un menu
            </button>
          </div>

          <div className="space-y-6">
            {/* Core Menus */}
            <div>
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Modules de Base
              </h4>
              <div className="space-y-2">
                {menuItems.filter(m => m.category === 'core').map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Visibility toggle */}
                      <button
                        onClick={() => toggleMenuVisibility(item.id)}
                        className={`p-2 rounded-lg transition-all font-bold text-lg ${
                          item.visible ? 'text-purple-600 bg-purple-50' : 'text-slate-400 bg-slate-100'
                        }`}
                        title={item.visible ? 'Masquer' : 'Afficher'}
                      >
                        {item.visible ? '👁️' : '👁️‍🗨️'}
                      </button>
                      {/* Active toggle */}
                      <button
                        onClick={() => toggleMenuActive(item.id)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                          item.active
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                        title={item.active ? 'Actif' : 'Inactif'}
                      >
                        {item.active ? '✓ Actif' : '○ Inactif'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingMenu(item);
                          setShowMenuModal(true);
                        }}
                        className="p-2 text-slate-500 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-all"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteMenu(item.id)}
                        className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Intelligence Menus */}
            <div>
              <h4 className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                🧠 Modules Intelligence
              </h4>
              <div className="space-y-2">
                {menuItems.filter(m => m.category === 'innovation').map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-all border border-purple-100">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-purple-500">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleMenuVisibility(item.id)}
                        className={`p-2 rounded-lg transition-all text-lg ${
                          item.visible ? 'text-purple-600 bg-purple-100' : 'text-slate-400 bg-slate-100'
                        }`}
                        title={item.visible ? 'Masquer' : 'Afficher'}
                      >
                        {item.visible ? '👁️' : '👁️‍🗨️'}
                      </button>
                      <button
                        onClick={() => toggleMenuActive(item.id)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                          item.active
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {item.active ? '✓ Actif' : '○ Inactif'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingMenu(item);
                          setShowMenuModal(true);
                        }}
                        className="p-2 text-purple-400 hover:text-purple-700 rounded-lg hover:bg-purple-100 transition-all"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteMenu(item.id)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roles & Permissions */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Rôles & Permissions</h3>
            <button
              onClick={() => setShowRoleModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
            >
              ➕ Créer un rôle
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {roles.map((role) => (
              <div key={role.id} className="p-4 bg-slate-50 rounded-xl hover:shadow-md transition-all border border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: role.color + '20' }}
                  >
                    {role.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{role.name}</h4>
                    <p className="text-xs text-gray-500">{role.userCount} utilisateurs</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {role.permissions.slice(0, 4).map(p => (
                    <span key={p} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">{p}</span>
                  ))}
                  {role.permissions.length > 4 && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">+{role.permissions.length - 4}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingRole(role);
                      setShowRoleModal(true);
                    }}
                    className="flex-1 px-3 py-1.5 text-sm bg-white border border-purple-200 text-purple-600 rounded-lg hover:bg-purple-50 transition-all"
                  >
                    ✏️ Éditer
                  </button>
                  <button
                    onClick={() => deleteRole(role.id)}
                    className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Permissions Matrix */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Matrice des Permissions</h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left p-3 font-semibold text-slate-700 sticky left-0 bg-slate-50">Rôle</th>
                    {menuItems.map((menu) => (
                      <th key={menu.id} className="p-3 text-center" title={menu.name}>
                        <span className="text-base">{menu.icon}</span>
                        <div className="text-xs text-slate-500 mt-1 whitespace-nowrap" style={{fontSize: '9px'}}>{menu.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role, idx) => (
                    <tr key={role.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="p-3 font-medium sticky left-0 bg-inherit">
                        <span className="flex items-center gap-2">
                          {role.icon} <span>{role.name}</span>
                        </span>
                      </td>
                      {menuItems.map((menu) => (
                        <td key={menu.id} className="p-3 text-center">
                          <button
                            onClick={() => togglePermission(role.id, menu.id)}
                            className={`w-6 h-6 rounded-md mx-auto transition-all flex items-center justify-center text-xs font-bold ${
                              role.permissions.includes(menu.id)
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'bg-slate-200 text-slate-400 hover:bg-purple-100'
                            }`}
                          >
                            {role.permissions.includes(menu.id) ? '✓' : ''}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Module Connectivity */}
      {activeTab === 'connectivity' && (
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Connectivité Inter-Modules</h3>
              <p className="text-sm text-gray-500">Statut des connexions avec les autres modules Flowtym</p>
            </div>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2">
              🔄 Actualiser
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-purple-50 rounded-xl text-center border border-purple-100">
              <p className="text-3xl font-bold text-purple-700">
                {moduleConnections.filter(m => m.status === 'connected').length}
              </p>
              <p className="text-sm text-purple-600 font-medium mt-1">✅ Connectés</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl text-center border border-amber-100">
              <p className="text-3xl font-bold text-amber-600">
                {moduleConnections.filter(m => m.status === 'partial').length}
              </p>
              <p className="text-sm text-amber-600 font-medium mt-1">⚠️ Partiels</p>
            </div>
            <div className="p-4 bg-red-50 rounded-xl text-center border border-red-100">
              <p className="text-3xl font-bold text-red-600">
                {moduleConnections.filter(m => m.status === 'disconnected').length}
              </p>
              <p className="text-sm text-red-600 font-medium mt-1">❌ Non connectés</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {moduleConnections.map((module) => (
              <div key={module.id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md hover:border-purple-200 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{module.icon}</span>
                    <h4 className="font-semibold text-gray-900">{module.name}</h4>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(module.status)}`}>
                    {getStatusIcon(module.status)} {getStatusLabel(module.status)}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium">Données échangées :</p>
                  <div className="flex flex-wrap gap-1">
                    {module.data.map((data, idx) => (
                      <span key={idx} className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                        {data}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                  <span>🕐</span> {module.lastSync}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Paramètres Généraux</h3>

          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'établissement
              </label>
              <input
                type="text"
                defaultValue="Hôtel Flowtym"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Langue par défaut
                </label>
                <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none">
                  <option>Français</option>
                  <option>English</option>
                  <option>Español</option>
                  <option>Deutsch</option>
                  <option>Italiano</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Devise
                </label>
                <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none">
                  <option>EUR (€)</option>
                  <option>USD ($)</option>
                  <option>GBP (£)</option>
                  <option>CHF (Fr)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fuseau horaire
              </label>
              <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none">
                <option>Europe/Paris</option>
                <option>Europe/London</option>
                <option>Europe/Berlin</option>
                <option>America/New_York</option>
                <option>Asia/Dubai</option>
              </select>
            </div>

            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <h4 className="text-sm font-semibold text-purple-900 mb-3">🔔 Notifications</h4>
              <div className="space-y-3">
                {['Nouvelle réservation', 'Avis négatif (< 6/10)', 'Arrivée client VIP', 'Message non lu > 2h', 'Chute du taux de rétention', 'Client inactif > 90 jours'].map((notif) => (
                  <label key={notif} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 accent-purple-600 rounded"
                    />
                    <span className="text-sm text-gray-700">{notif}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">🧮 Formule de Scoring Fidélité</h4>
              <div className="bg-white rounded-lg p-3 border border-slate-200 font-mono text-sm text-purple-700">
                Score = (nb_séjours × 10) + (CA_total / 100) + (note_moy × 5)
              </div>
              <p className="text-xs text-gray-500 mt-2">Score maximum : 100 points</p>
            </div>

            <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-violet-700 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-violet-800 transition-all shadow-lg shadow-purple-200">
              💾 Sauvegarder les paramètres
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
