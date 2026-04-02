import { useState } from 'react';

interface VoiceCommand {
  id: string;
  command: string;
  category: string;
  response: string;
  timestamp: string;
  room: string;
  status: 'completed' | 'pending' | 'failed';
}

const recentCommands: VoiceCommand[] = [
  { id: '1', command: 'Règle la climatisation sur 22 degrés', category: 'Confort', response: 'Climatisation réglée sur 22°C', timestamp: 'Il y a 5 min', room: '302', status: 'completed' },
  { id: '2', command: 'Réserve une table au restaurant pour 20h', category: 'Restaurant', response: 'Table réservée pour 2 personnes à 20h', timestamp: 'Il y a 15 min', room: '415', status: 'completed' },
  { id: '3', command: 'Commande un taxi pour 14h30', category: 'Transport', response: 'Taxi confirmé pour 14h30', timestamp: 'Il y a 30 min', room: '208', status: 'completed' },
  { id: '4', command: 'À quelle heure ferme la piscine ?', category: 'Info', response: 'La piscine ferme à 21h', timestamp: 'Il y a 45 min', room: '512', status: 'completed' },
  { id: '5', command: 'Room service : un club sandwich et une bière', category: 'Room Service', response: 'Commande en préparation, livraison dans 25 min', timestamp: 'Il y a 1h', room: '305', status: 'pending' },
  { id: '6', command: 'Réveil demain à 7h30', category: 'Réveil', response: 'Réveil programmé pour 7h30', timestamp: 'Il y a 2h', room: '402', status: 'completed' }
];

const categories = [
  { name: 'Confort', icon: '🌡️', count: 156, color: 'bg-blue-100 text-blue-700' },
  { name: 'Restaurant', icon: '🍽️', count: 89, color: 'bg-amber-100 text-amber-700' },
  { name: 'Room Service', icon: '🛎️', count: 234, color: 'bg-purple-100 text-purple-700' },
  { name: 'Transport', icon: '🚗', count: 67, color: 'bg-green-100 text-green-700' },
  { name: 'Info', icon: '❓', count: 312, color: 'bg-slate-100 text-slate-700' },
  { name: 'Réveil', icon: '⏰', count: 145, color: 'bg-pink-100 text-pink-700' }
];

export default function VoiceConcierge(_props: { language?: string }) {
  const [isListening, setIsListening] = useState(false);
  const [currentCommand, setCurrentCommand] = useState('');
  const [demoMode, setDemoMode] = useState(false);

  const simulateVoice = () => {
    setIsListening(true);
    setDemoMode(true);
    
    const commands = [
      'Réserve une table au restaurant pour ce soir',
      'Règle la climatisation sur 21 degrés',
      'Commande un petit-déjeuner en chambre pour 8h'
    ];
    
    const randomCommand = commands[Math.floor(Math.random() * commands.length)];
    
    let i = 0;
    const interval = setInterval(() => {
      if (i <= randomCommand.length) {
        setCurrentCommand(randomCommand.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsListening(false);
          setCurrentCommand('');
          setDemoMode(false);
        }, 2000);
      }
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-4xl">🎙️</span>
              Voice Concierge
            </h2>
            <p className="text-rose-100 mt-1">Assistant vocal intelligent pour vos clients</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              isListening ? 'bg-green-400 text-green-900' : 'bg-white/20 text-white'
            }`}>
              {isListening ? '🔴 En écoute...' : '⚪ En attente'}
            </span>
          </div>
        </div>
      </div>

      {/* Demo Interface */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
        <div className="max-w-md mx-auto">
          <div 
            onClick={simulateVoice}
            className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center cursor-pointer transition-all ${
              isListening 
                ? 'bg-gradient-to-r from-rose-500 to-orange-500 animate-pulse scale-110' 
                : 'bg-gradient-to-r from-rose-400 to-orange-400 hover:scale-105'
            }`}
          >
            <span className="text-5xl text-white">{isListening ? '🎤' : '🎙️'}</span>
          </div>
          
          <div className="mt-6 h-16">
            {isListening ? (
              <div className="space-y-2">
                <p className="text-lg font-medium text-slate-800">{currentCommand || 'Écoute en cours...'}</p>
                <div className="flex justify-center gap-1">
                  {[1,2,3,4,5].map((i) => (
                    <div 
                      key={i}
                      className="w-1 bg-rose-500 rounded animate-pulse"
                      style={{ 
                        height: `${Math.random() * 24 + 8}px`,
                        animationDelay: `${i * 100}ms`
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-500">Cliquez sur le micro pour tester la démo</p>
            )}
          </div>

          <p className="text-sm text-slate-400 mt-4">
            "Hey Flowtym, {demoMode ? currentCommand || '...' : 'réserve-moi une table au restaurant'}"
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Commandes ce mois</div>
          <div className="text-3xl font-bold text-slate-800">1,003</div>
          <div className="text-xs text-emerald-600 mt-1">+34% vs mois dernier</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Taux de réussite</div>
          <div className="text-3xl font-bold text-[#10B981]">94%</div>
          <div className="text-xs text-emerald-600 mt-1">+2% vs mois dernier</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Temps réponse</div>
          <div className="text-3xl font-bold text-slate-800">1.2s</div>
          <div className="text-xs text-emerald-600 mt-1">-0.3s vs mois dernier</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm mb-1">Chambres équipées</div>
          <div className="text-3xl font-bold text-slate-800">45</div>
          <div className="text-xs text-slate-500 mt-1">/ 60 chambres</div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Commandes par catégorie</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <div key={cat.name} className="text-center p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
              <span className="text-3xl">{cat.icon}</span>
              <div className="font-medium text-slate-800 mt-2">{cat.name}</div>
              <div className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${cat.color}`}>
                {cat.count} commandes
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Commands */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Commandes récentes</h3>
          <button className="px-4 py-2 text-[#10B981] hover:bg-emerald-50 rounded-xl font-medium transition-colors">
            Voir tout →
          </button>
        </div>
        <div className="space-y-3">
          {recentCommands.map((cmd) => (
            <div key={cmd.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                cmd.status === 'completed' ? 'bg-emerald-100' : cmd.status === 'pending' ? 'bg-amber-100' : 'bg-red-100'
              }`}>
                <span className="text-lg">
                  {cmd.status === 'completed' ? '✓' : cmd.status === 'pending' ? '⏳' : '✗'}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">"{cmd.command}"</span>
                  <span className="px-2 py-0.5 bg-slate-200 rounded text-xs text-slate-600">{cmd.category}</span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{cmd.response}</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-slate-600">Chambre {cmd.room}</div>
                <div className="text-xs text-slate-400">{cmd.timestamp}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Configuration des commandes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'Contrôle climatisation', icon: '🌡️', enabled: true },
            { name: 'Réservation restaurant', icon: '🍽️', enabled: true },
            { name: 'Room service', icon: '🛎️', enabled: true },
            { name: 'Réservation taxi', icon: '🚗', enabled: true },
            { name: 'Contrôle éclairage', icon: '💡', enabled: false },
            { name: 'Contrôle TV', icon: '📺', enabled: false },
            { name: 'Réveil vocal', icon: '⏰', enabled: true },
            { name: 'Informations hôtel', icon: '❓', enabled: true }
          ].map((cmd, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-xl">{cmd.icon}</span>
                <span className="font-medium text-slate-700">{cmd.name}</span>
              </div>
              <button
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  cmd.enabled ? 'bg-[#10B981]' : 'bg-slate-300'
                }`}
              >
                <span className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all shadow ${
                  cmd.enabled ? 'left-6' : 'left-0.5'
                }`}></span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
