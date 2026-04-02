import { useState } from 'react';
import { Conversation } from '../data/mockData';
import { translateMessage } from '../data/translations';

interface CommunicationsProps {
  conversations: Conversation[];
  language?: 'fr' | 'en';
}

const communicationTranslations = {
  fr: {
    unifiedInbox: 'Inbox Unifié',
    allConversations: 'Toutes vos conversations centralisées',
    unread: 'non lus',
    newMessage: 'Nouveau message',
    all: 'Tous',
    messenger: 'Messenger',
    noConversations: 'Aucune conversation sur ce canal',
    reply: 'Répondre',
    assign: 'Assigner',
    archive: 'Archiver',
    avgResponseTime: "Temps de réponse moyen",
    responseRate: 'Taux de réponse',
    messagesToday: "Messages aujourd'hui",
    pending: 'En attente'
  },
  en: {
    unifiedInbox: 'Unified Inbox',
    allConversations: 'All your conversations centralized',
    unread: 'unread',
    newMessage: 'New Message',
    all: 'All',
    messenger: 'Messenger',
    noConversations: 'No conversations on this channel',
    reply: 'Reply',
    assign: 'Assign',
    archive: 'Archive',
    avgResponseTime: 'Average Response Time',
    responseRate: 'Response Rate',
    messagesToday: 'Messages Today',
    pending: 'Pending'
  }
};

export default function Communications({ conversations, language = 'fr' }: CommunicationsProps) {
  const t = communicationTranslations[language];
  const [activeFilter, setActiveFilter] = useState<'all' | 'whatsapp' | 'email' | 'sms' | 'instagram' | 'facebook' | 'linkedin'>('all');

  const filteredConversations =
    activeFilter === 'all'
      ? conversations
      : conversations.filter((c) => c.channel === activeFilter);

  const getChannelBadge = (channel: string) => {
    const badges: Record<string, { bg: string; text: string; icon: string }> = {
      whatsapp: { bg: '#D1FAE5', text: '#065F46', icon: '💬' },
      email: { bg: '#DBEAFE', text: '#1E3A8A', icon: '📧' },
      sms: { bg: '#FEF3C7', text: '#92400E', icon: '📱' },
      instagram: { bg: '#FCE7F3', text: '#9D174D', icon: '📷' },
      facebook: { bg: '#DBEAFE', text: '#1E40AF', icon: '👤' },
      linkedin: { bg: '#E0E7FF', text: '#3730A3', icon: '💼' }
    };
    return badges[channel] || badges.email;
  };

  const filters = [
    { id: 'all' as const, label: t.all, count: conversations.length, icon: '📥' },
    { id: 'whatsapp' as const, label: 'WhatsApp', count: conversations.filter((c) => c.channel === 'whatsapp').length, icon: '💬' },
    { id: 'email' as const, label: 'Email', count: conversations.filter((c) => c.channel === 'email').length, icon: '📧' },
    { id: 'sms' as const, label: 'SMS', count: conversations.filter((c) => c.channel === 'sms').length, icon: '📱' },
    { id: 'instagram' as const, label: 'Instagram', count: conversations.filter((c) => c.channel === 'instagram').length, icon: '📷' },
    { id: 'facebook' as const, label: t.messenger, count: conversations.filter((c) => c.channel === 'facebook').length, icon: '👤' },
    { id: 'linkedin' as const, label: 'LinkedIn', count: conversations.filter((c) => c.channel === 'linkedin').length, icon: '💼' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[20px] shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              {t.unifiedInbox}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t.allConversations}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {conversations.filter((c) => c.unread).length} {t.unread}
            </span>
            <button className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-sm font-medium transition-colors">
              {t.newMessage}
            </button>
          </div>
        </div>

        {/* Filtres par canal */}
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
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
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                activeFilter === filter.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Liste des conversations */}
      <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredConversations.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-slate-500">{t.noConversations}</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const badge = getChannelBadge(conversation.channel);
              return (
                <div
                  key={conversation.id}
                  className={`p-6 hover:bg-slate-50 transition-colors cursor-pointer ${
                    conversation.unread ? 'bg-[#F0FDF4] border-l-4 border-l-[#10B981]' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#10B981] flex items-center justify-center text-white font-semibold flex-shrink-0 relative">
                      {conversation.guestAvatar}
                      {conversation.unread && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-[#0F172A]">
                            {conversation.guestName}
                          </h3>
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: badge.bg, color: badge.text }}
                          >
                            {badge.icon} {conversation.channel.charAt(0).toUpperCase() + conversation.channel.slice(1)}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {conversation.date}
                        </span>
                      </div>
                      <p className={`text-sm mb-3 truncate ${
                        conversation.unread ? 'text-[#0F172A] font-medium' : 'text-slate-600'
                      }`}>
                        {translateMessage(conversation.lastMessage, language)}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-2 ml-auto">
                          <button className="px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            {t.reply}
                          </button>
                          <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {t.assign}
                          </button>
                          <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            {t.archive}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: t.avgResponseTime, value: '12 min', icon: '⚡', color: '#10B981' },
          { label: t.responseRate, value: '94%', icon: '✅', color: '#3B82F6' },
          { label: t.messagesToday, value: '23', icon: '📊', color: '#F59E0B' },
          { label: t.pending, value: conversations.filter((c) => c.unread).length.toString(), icon: '⏳', color: '#EF4444' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-[16px] shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ backgroundColor: `${stat.color}20` }}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="text-lg font-bold text-[#0F172A]">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
