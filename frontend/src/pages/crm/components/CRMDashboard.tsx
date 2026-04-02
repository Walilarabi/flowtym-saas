import { useState, useEffect, useRef, useCallback } from 'react';
import { mockIntegrations, Guest } from '../data/mockData';
import * as crmApi from '../services/crmApi';
import type { CRMClient, CRMSegment, CRMCampaign, CRMWorkflow, CRMConversation, CRMAlert, CRMAutoReply } from '../services/crmApi';
import KPICards from './KPICards';
import GuestList from './GuestList';
import GuestDetail from './GuestDetail';
import Segmentation from './Segmentation';
import Communications from './Communications';
import Workflows from './Workflows';
import Campaigns from './Campaigns';
import Analytics from './Analytics';
import AdvancedAnalytics from './AdvancedAnalytics';
import Alerts from './Alerts';
import Integrations from './Integrations';
import AutoReplies from './AutoReplies';
import Configuration from './crm/Configuration';
import Copilot from './crm/Copilot';
import UpsellEngine from './crm/UpsellEngine';
import LoyaltyProgram from './crm/LoyaltyProgram';
import MicroFeedback from './crm/MicroFeedback';
import Sustainability from './crm/Sustainability';
import Marketplace from './crm/Marketplace';
import VoiceConcierge from './crm/VoiceConcierge';
import PredictiveHousekeeping from './crm/PredictiveHousekeeping';
import Community from './crm/Community';

// Convert API client to Guest format for compatibility
function clientToGuest(client: CRMClient): Guest {
  return {
    id: client.id,
    firstName: client.first_name,
    lastName: client.last_name,
    email: client.email,
    phone: client.phone || '',
    lastStay: client.last_stay || '',
    loyaltyScore: client.loyalty_score,
    tags: client.tags,
    totalStays: client.total_stays,
    totalRevenue: client.total_spent,
    preferences: client.preferences as any,
    stays: (client.stays || []).map(s => ({
      id: s.id || '',
      checkIn: s.check_in || '',
      checkOut: s.check_out || '',
      roomType: s.room_type || '',
      rate: s.total_amount || 0,
      channel: s.channel || 'Direct'
    })),
    communications: [],
    reviews: []
  };
}

type TabId = 'clients' | 'segments' | 'communications' | 'auto-replies' | 'workflows' | 'campaigns' | 'analytics' | 'advanced-analytics' | 'connectors' | 'configuration' | 'copilot' | 'upsells' | 'loyalty' | 'feedback' | 'sustainability' | 'marketplace' | 'voice' | 'housekeeping' | 'community';
type Language = 'fr' | 'en';

const innovationTabIds: TabId[] = ['copilot', 'upsells', 'loyalty', 'feedback', 'sustainability', 'marketplace', 'voice', 'housekeeping', 'community'];

const translations = {
  fr: {
    title: 'Flowtym CRM',
    subtitle: "Gestion de la relation client — L'OS qui pense, prédit et agit pour votre hôtel",
    showKPI: 'Afficher les KPI & Alertes',
    hideKPI: 'Masquer les KPI & Alertes',
    openCopilot: 'Ouvrir Flowtym Copilot',
    tabs: {
      clients: 'Clients', segments: 'Segmentation', communications: 'Inbox',
      'auto-replies': 'Réponses Auto', workflows: 'Workflows', campaigns: 'Campagnes',
      innovations: 'Intelligence', analytics: 'Analytics', 'advanced-analytics': 'Analytique Avancée',
      connectors: 'Connecteurs',
      configuration: 'Configuration', copilot: 'Copilot IA', upsells: 'Upsells',
      loyalty: 'Fidélité', feedback: 'Feedback', sustainability: 'Éco-Score',
      marketplace: 'Marketplace', voice: 'Voice Concierge', housekeeping: 'Housekeeping',
      community: 'Community'
    }
  },
  en: {
    title: 'Flowtym CRM',
    subtitle: 'Customer Relationship Management — The OS that thinks, predicts and acts for your hotel',
    showKPI: 'Show KPIs & Alerts',
    hideKPI: 'Hide KPIs & Alerts',
    openCopilot: 'Open Flowtym Copilot',
    tabs: {
      clients: 'Clients', segments: 'Segmentation', communications: 'Inbox',
      'auto-replies': 'Auto Replies', workflows: 'Workflows', campaigns: 'Campaigns',
      innovations: 'Intelligence', analytics: 'Analytics', 'advanced-analytics': 'Advanced Analytics',
      connectors: 'Connectors',
      configuration: 'Configuration', copilot: 'Copilot AI', upsells: 'Upsells',
      loyalty: 'Loyalty', feedback: 'Feedback', sustainability: 'Eco-Score',
      marketplace: 'Marketplace', voice: 'Voice Concierge', housekeeping: 'Housekeeping',
      community: 'Community'
    }
  }
};

const mainTabs = [
  { id: 'clients', icon: '👥' },
  { id: 'segments', icon: '🎯' },
  { id: 'communications', icon: '💬' },
  { id: 'auto-replies', icon: '🤖' },
  { id: 'workflows', icon: '⚙️' },
  { id: 'campaigns', icon: '📧' },
];

const afterInnovationTabs = [
  { id: 'analytics', icon: '📊' },
  { id: 'advanced-analytics', icon: '📈' },
  { id: 'connectors', icon: '🔗' },
  { id: 'configuration', icon: '🛠️' },
];

const innovationTabs = [
  { id: 'copilot', icon: '🧠' },
  { id: 'upsells', icon: '💎' },
  { id: 'loyalty', icon: '🏆' },
  { id: 'feedback', icon: '📝' },
  { id: 'sustainability', icon: '🌱' },
  { id: 'marketplace', icon: '🏪' },
  { id: 'voice', icon: '🎙️' },
  { id: 'housekeeping', icon: '🧹' },
  { id: 'community', icon: '🌐' },
];

export default function CRMDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('clients');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [language, setLanguage] = useState<Language>('fr');
  const [showKPI, setShowKPI] = useState(true);
  const [innovationsOpen, setInnovationsOpen] = useState(false);
  
  // Data states - loaded from API
  const [guests, setGuests] = useState<Guest[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [autoReplies, setAutoReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load data from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [
        clientsRes,
        segmentsRes,
        campaignsRes,
        workflowsRes,
        conversationsRes,
        alertsRes,
        autoRepliesRes
      ] = await Promise.all([
        crmApi.getClients({ limit: 100 }).catch(() => ({ clients: [] })),
        crmApi.getSegments().catch(() => []),
        crmApi.getCampaigns().catch(() => []),
        crmApi.getWorkflows().catch(() => []),
        crmApi.getConversations().catch(() => []),
        crmApi.getAlerts().catch(() => []),
        crmApi.getAutoReplies().catch(() => [])
      ]);
      
      // Convert clients to Guest format
      setGuests((clientsRes.clients || []).map(clientToGuest));
      
      // Convert segments to expected format
      setSegments((segmentsRes || []).map((s: CRMSegment) => ({
        id: s.id,
        name: s.name,
        count: s.client_count,
        description: s.description,
        color: s.color
      })));
      
      // Convert campaigns to expected format
      setCampaigns((campaignsRes || []).map((c: CRMCampaign) => ({
        id: c.id,
        name: c.name,
        channel: c.type as any,
        segment: c.segment_ids?.[0] || '',
        status: c.status as any,
        stats: {
          sent: c.sent_count,
          opened: Math.round(c.sent_count * c.open_rate / 100),
          clicked: Math.round(c.sent_count * c.click_rate / 100)
        },
        scheduledDate: c.scheduled_at
      })));
      
      // Convert workflows to expected format
      setWorkflows((workflowsRes || []).map((w: CRMWorkflow) => ({
        id: w.id,
        name: w.name,
        trigger: w.trigger?.type || '',
        action: w.actions?.[0]?.type || '',
        isActive: w.status === 'active',
        executions: w.executions_count
      })));
      
      // Convert conversations to expected format
      setConversations((conversationsRes || []).map((c: CRMConversation) => ({
        id: c.id,
        guestName: c.client_name || 'Client',
        guestAvatar: (c.client_name || 'C').slice(0, 2).toUpperCase(),
        channel: c.channel as any,
        lastMessage: c.last_message,
        date: c.last_message_at,
        unread: c.unread_count > 0
      })));
      
      // Convert alerts to expected format
      setAlerts((alertsRes || []).map((a: CRMAlert) => ({
        id: a.id,
        type: a.priority === 'high' ? 'error' : a.priority === 'medium' ? 'warning' : 'info',
        title: a.title,
        message: a.message,
        color: a.priority === 'high' ? '#EF4444' : a.priority === 'medium' ? '#F59E0B' : '#3B82F6'
      })));
      
      // Convert auto-replies to expected format
      setAutoReplies((autoRepliesRes || []).map((ar: CRMAutoReply) => ({
        id: ar.id,
        platform: ar.channel,
        trigger: ar.name,
        message: ar.response_template,
        status: ar.is_active ? 'active' : 'inactive',
        responseRate: ar.usage_count
      })));
      
    } catch (error) {
      console.error('Error loading CRM data:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  const t = translations[language];
  const isInnovationActive = innovationTabIds.includes(activeTab);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setInnovationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTabClick = (id: string) => {
    setActiveTab(id as TabId);
    setSelectedGuest(null);
    setInnovationsOpen(false);
  };

  const handleInnovationClick = (id: string) => {
    setActiveTab(id as TabId);
    setInnovationsOpen(false);
    setSelectedGuest(null);
  };

  const tabClass = (id: string) =>
    `px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
      activeTab === id
        ? 'bg-purple-600 text-white shadow-md'
        : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
    }`;

  return (
    <div id="crmContent" className="min-h-screen bg-[#F8FAFC] p-6 font-sans">

      {/* ── HEADER ── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold text-lg shadow-md">F</div>
            <h1 className="text-3xl font-bold text-[#0F172A]">{t.title}</h1>
          </div>
          <p className="text-slate-500 text-sm ml-13 pl-1">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* KPI Toggle */}
          <button
            onClick={() => setShowKPI(!showKPI)}
            title={showKPI ? t.hideKPI : t.showKPI}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all shadow-sm ${
              showKPI
                ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
                : 'bg-white text-slate-600 border-slate-200 hover:border-purple-400 hover:text-purple-600'
            }`}
          >
            {showKPI ? '🙈' : '👁️'} {showKPI ? t.hideKPI : t.showKPI}
          </button>
          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
            className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200 hover:border-purple-400 hover:text-purple-600 text-sm font-medium transition-all shadow-sm"
          >
            {language === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR'}
          </button>
        </div>
      </div>

      {/* ── KPI + ALERTS (masquables) ── */}
      {showKPI && (
        <div className="mb-6">
          <KPICards language={language} />
          <div className="mt-4">
            <Alerts alerts={alerts} language={language} />
          </div>
        </div>
      )}

      {/* ── NAVIGATION ── */}
      <div className="mb-6 bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
        <div className="flex items-center gap-1 flex-wrap">

          {/* Main tabs BEFORE Innovations */}
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={tabClass(tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{t.tabs[tab.id as keyof typeof t.tabs]}</span>
            </button>
          ))}

          {/* ── INTELLIGENCE DROPDOWN ── */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setInnovationsOpen(!innovationsOpen)}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
                isInnovationActive || innovationsOpen
                  ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md'
                  : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <span>{t.tabs.innovations}</span>
              <span className={`text-xs transition-transform duration-200 ${innovationsOpen ? 'rotate-180' : ''}`}>▼</span>
              {isInnovationActive && !innovationsOpen && (
                <span className="ml-1 w-2 h-2 rounded-full bg-white opacity-80 inline-block"></span>
              )}
            </button>

            {/* Dropdown Panel */}
            {innovationsOpen && (
              <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-xl border border-purple-100 p-2 w-64">
                <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider px-3 py-2 mb-1">
                  {language === 'fr' ? 'Modules Intelligence' : 'Intelligence Modules'}
                </div>
                {innovationTabs.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleInnovationClick(sub.id)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeTab === sub.id
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-700 hover:bg-purple-50 hover:text-purple-700'
                    }`}
                  >
                    <span className="text-base">{sub.icon}</span>
                    <span>{t.tabs[sub.id as keyof typeof t.tabs]}</span>
                    {activeTab === sub.id && <span className="ml-auto text-xs">●</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main tabs AFTER Innovations */}
          {afterInnovationTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={tabClass(tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{t.tabs[tab.id as keyof typeof t.tabs]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT AREA ── */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'clients' && (
              selectedGuest
                ? <GuestDetail guest={selectedGuest} onBack={() => setSelectedGuest(null)} />
                : <GuestList guests={guests} onSelectGuest={setSelectedGuest} />
            )}
            {activeTab === 'segments' && <Segmentation segments={segments} />}
            {activeTab === 'communications' && <Communications conversations={conversations} language={language} />}
            {activeTab === 'auto-replies' && <AutoReplies autoReplies={autoReplies} />}
            {activeTab === 'workflows' && <Workflows workflows={workflows} />}
            {activeTab === 'campaigns' && <Campaigns campaigns={campaigns} />}
            {activeTab === 'analytics' && <Analytics />}
            {activeTab === 'advanced-analytics' && <AdvancedAnalytics language={language} />}
            {activeTab === 'connectors' && <Integrations integrations={mockIntegrations} />}
            {activeTab === 'configuration' && <Configuration />}
            {activeTab === 'copilot' && <Copilot language={language} />}
            {activeTab === 'upsells' && <UpsellEngine language={language} />}
            {activeTab === 'loyalty' && <LoyaltyProgram language={language} />}
            {activeTab === 'feedback' && <MicroFeedback language={language} />}
            {activeTab === 'sustainability' && <Sustainability language={language} />}
            {activeTab === 'marketplace' && <Marketplace language={language} />}
            {activeTab === 'voice' && <VoiceConcierge language={language} />}
            {activeTab === 'housekeeping' && <PredictiveHousekeeping language={language} />}
            {activeTab === 'community' && <Community language={language} />}
          </>
        )}
      </div>

      {/* ── FLOATING COPILOT BUTTON ── */}
      <button
        onClick={() => { setActiveTab('copilot'); setInnovationsOpen(false); }}
        title={t.openCopilot}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-purple-500 to-violet-700 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all flex items-center justify-center text-2xl z-40"
      >
        🧠
      </button>
    </div>
  );
}
