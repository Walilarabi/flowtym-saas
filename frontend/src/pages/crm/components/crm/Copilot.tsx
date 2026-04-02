import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface Props { language?: 'fr' | 'en'; }

const tr = {
  fr: {
    title: 'Flowtym Copilot',
    subtitle: 'Votre assistant IA — posez vos questions en langage naturel',
    placeholder: 'Posez votre question...',
    send: 'Envoyer',
    typing: 'Copilot analyse vos données...',
    suggestions: 'Suggestions rapides',
    statsTitle: 'Analyses en temps réel',
    stats: [
      { label: 'Taux de rétention', value: '73%', trend: '+5%', color: 'text-purple-600' },
      { label: 'RevPAR', value: '142€', trend: '+12%', color: 'text-purple-600' },
      { label: 'Score NPS', value: '67', trend: '-3', color: 'text-red-500' },
      { label: 'Churn risk', value: '12%', trend: '+2%', color: 'text-orange-500' },
    ],
    greeting: "Bonjour ! Je suis Flowtym Copilot 🧠\n\nJe peux analyser vos données hôtelières, répondre à vos questions et vous aider à prendre les meilleures décisions. Que puis-je faire pour vous ?",
    quickQ: ["Pourquoi le RevPAR a baissé ?", "Clients VIP inactifs depuis 6 mois ?", "Génère une campagne Saint-Valentin", "Analyse les avis négatifs récents", "Prévision revenu mois prochain"],
  },
  en: {
    title: 'Flowtym Copilot',
    subtitle: 'Your AI assistant — ask questions in natural language',
    placeholder: 'Ask your question...',
    send: 'Send',
    typing: 'Copilot is analyzing your data...',
    suggestions: 'Quick suggestions',
    statsTitle: 'Real-time insights',
    stats: [
      { label: 'Retention Rate', value: '73%', trend: '+5%', color: 'text-purple-600' },
      { label: 'RevPAR', value: '€142', trend: '+12%', color: 'text-purple-600' },
      { label: 'NPS Score', value: '67', trend: '-3', color: 'text-red-500' },
      { label: 'Churn Risk', value: '12%', trend: '+2%', color: 'text-orange-500' },
    ],
    greeting: "Hello! I'm Flowtym Copilot 🧠\n\nI can analyze your hotel data, answer your questions and help you make the best decisions. What can I do for you?",
    quickQ: ["Why did RevPAR drop?", "VIP clients inactive for 6 months?", "Create a Valentine's Day campaign", "Analyze recent negative reviews", "Next month revenue forecast"],
  }
};

const mockResponses: Record<string, { fr: string; en: string; suggestions: string[] }> = {
  revpar: {
    fr: "📊 **Analyse du RevPAR — Baisse de 8% ce mois**\n\n**3 facteurs identifiés :**\n1. 🏨 Taux d'occupation en baisse de 8% vs N-1\n2. ⭐ 2 avis négatifs mentionnant 'climatisation'\n3. 🏷️ Concurrent 'Hôtel Riviera' a baissé ses prix de 12%\n\n**💡 Actions recommandées :**\n• Créer une campagne 'dernière minute' (-15%)\n• Vérifier chambres 302, 305, 308 (climatisation)\n• Répondre aux 2 avis négatifs",
    en: "📊 **RevPAR Analysis — Down 8% this month**\n\n**3 factors identified:**\n1. 🏨 Occupancy down 8% vs last year\n2. ⭐ 2 negative reviews mentioning 'air conditioning'\n3. 🏷️ Competitor 'Hotel Riviera' lowered prices by 12%\n\n**💡 Recommended actions:**\n• Create a 'last minute' campaign (-15%)\n• Check rooms 302, 305, 308 (AC)\n• Reply to the 2 negative reviews",
    suggestions: ["Voir les avis négatifs", "Créer la campagne", "Analyser la concurrence"]
  },
  vip: {
    fr: "👑 **Clients VIP inactifs depuis 6+ mois**\n\n| Client | Dernière visite | CA total | Risque churn |\n|--------|----------------|----------|--------------|\n| Sophie Laurent | 8 mois | 4 200€ | 🔴 Élevé |\n| Marc Dubois | 7 mois | 3 800€ | 🟠 Moyen |\n| Emma Wilson | 6 mois | 5 100€ | 🟡 Faible |\n\n**💡 Action suggérée :** Envoyer une offre personnalisée 'On vous a manqué' avec -20% sur la prochaine réservation.",
    en: "👑 **VIP Clients inactive for 6+ months**\n\n| Client | Last visit | Total Revenue | Churn Risk |\n|--------|-----------|--------------|------------|\n| Sophie Laurent | 8 months | €4,200 | 🔴 High |\n| Marc Dubois | 7 months | €3,800 | 🟠 Medium |\n| Emma Wilson | 6 months | €5,100 | 🟡 Low |\n\n**💡 Suggested action:** Send a personalized 'We missed you' offer with -20% on next booking.",
    suggestions: ["Envoyer la campagne", "Voir les fiches clients", "Créer un workflow"]
  },
  campagne: {
    fr: "💝 **Campagne Saint-Valentin — Générée !**\n\n**Objet :** 'Un week-end inoubliable pour deux 💕'\n**Canal :** Email + WhatsApp\n**Segment :** Couples (234 contacts)\n**Offre :** Nuit + Petit-déjeuner + Champagne = 189€\n\n**Planning :**\n• J-21 (25 Jan) : Email d'annonce\n• J-7 (8 Fév) : Rappel WhatsApp\n• J-2 (12 Fév) : SMS dernière chance\n\n✅ Prête à être envoyée !",
    en: "💝 **Valentine's Campaign — Generated!**\n\n**Subject:** 'An unforgettable weekend for two 💕'\n**Channel:** Email + WhatsApp\n**Segment:** Couples (234 contacts)\n**Offer:** Night + Breakfast + Champagne = €189\n\n**Schedule:**\n• D-21 (Jan 25): Announcement email\n• D-7 (Feb 8): WhatsApp reminder\n• D-2 (Feb 12): Last chance SMS\n\n✅ Ready to send!",
    suggestions: ["Modifier la campagne", "Prévisualiser l'email", "Envoyer maintenant"]
  },
};

function getResponse(input: string, lang: 'fr' | 'en') {
  const lower = input.toLowerCase();
  if (lower.includes('revpar') || lower.includes('baiss') || lower.includes('drop')) return { ...mockResponses.revpar, content: mockResponses.revpar[lang] };
  if (lower.includes('vip') || lower.includes('inactif') || lower.includes('inactive')) return { ...mockResponses.vip, content: mockResponses.vip[lang] };
  if (lower.includes('campagne') || lower.includes('campaign') || lower.includes('valentin')) return { ...mockResponses.campagne, content: mockResponses.campagne[lang] };
  return {
    content: lang === 'fr'
      ? `🤖 J'analyse votre question : **"${input}"**\n\nBasé sur vos données actuelles :\n• 1 247 clients actifs\n• Taux de rétention : 73%\n• RevPAR moyen : 142€\n• NPS : 67/100\n\n💡 Que souhaitez-vous approfondir ?`
      : `🤖 Analyzing your question: **"${input}"**\n\nBased on your current data:\n• 1,247 active clients\n• Retention rate: 73%\n• Average RevPAR: €142\n• NPS: 67/100\n\n💡 What would you like to explore further?`,
    suggestions: lang === 'fr'
      ? ["Voir les KPIs", "Analyser les clients", "Créer une campagne"]
      : ["View KPIs", "Analyze clients", "Create a campaign"]
  };
}

export default function Copilot({ language = 'fr' }: Props) {
  const t = tr[language];
  const [messages, setMessages] = useState<Message[]>([{
    id: '1', type: 'assistant', content: t.greeting, timestamp: new Date(), suggestions: t.quickQ
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), type: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    await new Promise(r => setTimeout(r, 1200));
    const resp = getResponse(text, language);
    const botMsg: Message = { id: (Date.now() + 1).toString(), type: 'assistant', content: resp.content, timestamp: new Date(), suggestions: resp.suggestions };
    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Chat */}
      <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden" style={{ height: '620px' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-violet-700 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">🧠</div>
          <div>
            <h2 className="font-bold text-white">{t.title}</h2>
            <p className="text-purple-200 text-xs">{t.subtitle}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-white text-xs">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
              {msg.type === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-sm flex-shrink-0">🧠</div>
              )}
              <div className={`max-w-[80%] ${msg.type === 'user' ? 'order-1' : ''}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.type === 'user'
                    ? 'bg-purple-600 text-white rounded-tr-sm'
                    : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
                {msg.suggestions && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.suggestions.map((s, i) => (
                      <button key={i} onClick={() => sendMessage(s)}
                        className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full text-xs font-medium border border-purple-200 transition-all hover:border-purple-400">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {msg.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-sm flex-shrink-0">👤</div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-sm">🧠</div>
              <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-slate-100 text-sm text-slate-500 flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}></span>
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}></span>
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}></span>
                </span>
                {t.typing}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="flex gap-3">
            <input
              type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
              placeholder={t.placeholder}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
            <button onClick={() => sendMessage(input)}
              className="px-5 py-3 bg-gradient-to-r from-purple-600 to-violet-700 text-white rounded-xl font-medium text-sm hover:from-purple-700 hover:to-violet-800 transition-all shadow-md hover:shadow-lg">
              {t.send} ✈️
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar KPIs */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">📊 {t.statsTitle}</h3>
          <div className="space-y-3">
            {t.stats.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-sm text-slate-600">{s.label}</span>
                <div className="text-right">
                  <div className={`font-bold text-lg ${s.color}`}>{s.value}</div>
                  <div className={`text-xs ${s.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{s.trend}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl border border-purple-100 p-5">
          <h3 className="font-semibold text-purple-700 mb-3">💡 {t.suggestions}</h3>
          <div className="space-y-2">
            {t.quickQ.map((q, i) => (
              <button key={i} onClick={() => sendMessage(q)}
                className="w-full text-left px-3 py-2 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded-lg text-xs border border-purple-100 hover:border-purple-300 transition-all">
                💬 {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
