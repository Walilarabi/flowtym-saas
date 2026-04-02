import { useState } from 'react';

interface Benchmark {
  name: string;
  yourValue: number;
  avgValue: number;
  topValue: number;
  unit: string;
  isHigherBetter: boolean;
}

interface ForumTopic {
  id: string;
  title: string;
  author: string;
  replies: number;
  views: number;
  lastActivity: string;
  tags: string[];
}

interface Event {
  id: string;
  name: string;
  type: 'webinar' | 'meetup' | 'summit';
  date: string;
  location: string;
  attendees: number;
}

const benchmarks: Benchmark[] = [
  { name: 'RevPAR', yourValue: 125, avgValue: 98, topValue: 180, unit: '€', isHigherBetter: true },
  { name: 'Taux d\'occupation', yourValue: 78, avgValue: 72, topValue: 92, unit: '%', isHigherBetter: true },
  { name: 'Note moyenne', yourValue: 8.7, avgValue: 8.2, topValue: 9.4, unit: '/10', isHigherBetter: true },
  { name: 'Taux de réponse', yourValue: 94, avgValue: 85, topValue: 99, unit: '%', isHigherBetter: true },
  { name: 'Temps de réponse', yourValue: 2.3, avgValue: 4.5, topValue: 0.8, unit: 'h', isHigherBetter: false },
  { name: 'Taux direct', yourValue: 35, avgValue: 28, topValue: 55, unit: '%', isHigherBetter: true }
];

const forumTopics: ForumTopic[] = [
  { id: '1', title: 'Comment gérez-vous les no-shows ?', author: 'Hotel_Paris', replies: 34, views: 256, lastActivity: 'Il y a 2h', tags: ['revenue', 'politique'] },
  { id: '2', title: 'Meilleures pratiques pour les avis négatifs', author: 'LuxuryResort', replies: 28, views: 189, lastActivity: 'Il y a 5h', tags: ['reputation', 'service'] },
  { id: '3', title: 'Intégration WhatsApp : retour d\'expérience', author: 'BoutiqueHotel', replies: 45, views: 312, lastActivity: 'Il y a 8h', tags: ['tech', 'communication'] },
  { id: '4', title: 'Stratégies pricing basse saison', author: 'SeasonalHotel', replies: 19, views: 145, lastActivity: 'Hier', tags: ['revenue', 'pricing'] },
  { id: '5', title: 'Former son équipe à Flowtym', author: 'TrainingPro', replies: 52, views: 423, lastActivity: 'Hier', tags: ['formation', 'onboarding'] }
];

const events: Event[] = [
  { id: '1', name: 'Flowtym Summit Paris 2025', type: 'summit', date: '15 Mars 2025', location: 'Paris, France', attendees: 450 },
  { id: '2', name: 'Webinar: IA & Revenue Management', type: 'webinar', date: '22 Fév 2025', location: 'En ligne', attendees: 230 },
  { id: '3', name: 'Petit-déjeuner Revenue Managers', type: 'meetup', date: '28 Fév 2025', location: 'Lyon, France', attendees: 35 },
  { id: '4', name: 'Workshop: Automatisation CRM', type: 'webinar', date: '5 Mars 2025', location: 'En ligne', attendees: 180 }
];

export default function Community(_props: { language?: string }) {
  const [activeTab, setActiveTab] = useState<'benchmarks' | 'forum' | 'events' | 'awards'>('benchmarks');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-4xl">🌐</span>
              Flowtym Community
            </h2>
            <p className="text-violet-100 mt-1">Connectez-vous avec +2,500 hôteliers</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">2,547</div>
              <div className="text-violet-200 text-sm">Membres</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">156</div>
              <div className="text-violet-200 text-sm">En ligne</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-slate-100 w-fit">
        {[
          { id: 'benchmarks', label: 'Benchmarks', icon: '📊' },
          { id: 'forum', label: 'Forum', icon: '💬' },
          { id: 'events', label: 'Événements', icon: '📅' },
          { id: 'awards', label: 'Awards', icon: '🏆' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-[#10B981] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Benchmarks Tab */}
      {activeTab === 'benchmarks' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Vos performances vs le marché</h3>
              <span className="text-sm text-slate-500">Données anonymisées • Hôtels 4★ similaires</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {benchmarks.map((bench) => {
                const yourPercentile = bench.isHigherBetter
                  ? ((bench.yourValue - bench.avgValue) / (bench.topValue - bench.avgValue)) * 50 + 50
                  : ((bench.avgValue - bench.yourValue) / (bench.avgValue - bench.topValue)) * 50 + 50;
                const isAboveAvg = bench.isHigherBetter 
                  ? bench.yourValue > bench.avgValue 
                  : bench.yourValue < bench.avgValue;

                return (
                  <div key={bench.name} className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-700">{bench.name}</span>
                      <span className={`text-lg font-bold ${isAboveAvg ? 'text-emerald-600' : 'text-red-500'}`}>
                        {bench.yourValue}{bench.unit}
                      </span>
                    </div>
                    <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-400 z-10"></div>
                      <div 
                        className={`absolute inset-y-0 left-0 rounded-full ${isAboveAvg ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(Math.max(yourPercentile, 5), 95)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-500">
                      <span>Min</span>
                      <span>Moy: {bench.avgValue}{bench.unit}</span>
                      <span>Top: {bench.topValue}{bench.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🎯</div>
              <div>
                <h4 className="font-semibold text-emerald-800">Vous êtes dans le Top 25% !</h4>
                <p className="text-emerald-700">Votre établissement performe mieux que 75% des hôtels similaires.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forum Tab */}
      {activeTab === 'forum' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">Discussions récentes</h3>
            <button className="px-4 py-2 bg-[#10B981] text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">
              + Nouveau sujet
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {forumTopics.map((topic) => (
                <div key={topic.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800 hover:text-[#10B981]">{topic.title}</h4>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm text-slate-500">par {topic.author}</span>
                        <div className="flex gap-1">
                          {topic.tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>💬 {topic.replies}</span>
                        <span>👁️ {topic.views}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{topic.lastActivity}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">Événements à venir</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((event) => (
              <div key={event.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    event.type === 'summit' ? 'bg-purple-100 text-purple-700' :
                    event.type === 'webinar' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {event.type === 'summit' ? '🎪 Summit' : event.type === 'webinar' ? '💻 Webinar' : '☕ Meetup'}
                  </span>
                  <span className="text-sm text-slate-500">👥 {event.attendees} inscrits</span>
                </div>
                <h4 className="font-semibold text-slate-800 mb-2">{event.name}</h4>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span>📅 {event.date}</span>
                  <span>📍 {event.location}</span>
                </div>
                <button className="mt-4 w-full py-2 bg-[#10B981] text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors">
                  S'inscrire
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Awards Tab */}
      {activeTab === 'awards' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Vos distinctions</h3>
            <div className="flex flex-wrap gap-4">
              {[
                { icon: '🥇', name: 'Top RevPAR Q4 2024', desc: 'Meilleure progression' },
                { icon: '⭐', name: 'Excellence Service', desc: 'Note > 9/10 pendant 3 mois' },
                { icon: '🚀', name: 'Early Adopter', desc: 'Membre depuis 2024' },
                { icon: '💬', name: 'Contributeur actif', desc: '50+ messages forum' }
              ].map((award, idx) => (
                <div key={idx} className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                  <span className="text-3xl">{award.icon}</span>
                  <div>
                    <div className="font-medium text-slate-800">{award.name}</div>
                    <div className="text-xs text-slate-500">{award.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Classement communauté</h3>
            <div className="space-y-3">
              {[
                { rank: 1, name: 'Grand Hotel Paris', score: 9847, badge: '🥇' },
                { rank: 2, name: 'Luxury Resort Cannes', score: 9234, badge: '🥈' },
                { rank: 3, name: 'Boutique Hotel Lyon', score: 8956, badge: '🥉' },
                { rank: 4, name: 'Votre établissement', score: 8234, badge: '📍', isYou: true },
                { rank: 5, name: 'Seaside Hotel Nice', score: 7845, badge: '' }
              ].map((hotel) => (
                <div 
                  key={hotel.rank}
                  className={`flex items-center justify-between p-4 rounded-xl ${
                    hotel.isYou ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl w-8 text-center">{hotel.badge || hotel.rank}</span>
                    <span className={`font-medium ${hotel.isYou ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {hotel.name}
                    </span>
                    {hotel.isYou && (
                      <span className="px-2 py-0.5 bg-emerald-200 text-emerald-700 rounded text-xs font-medium">
                        C'est vous !
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-slate-700">{hotel.score.toLocaleString()} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
