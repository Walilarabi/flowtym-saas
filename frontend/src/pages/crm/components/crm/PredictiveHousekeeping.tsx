import { useState } from 'react';

interface Room {
  id: string;
  number: string;
  floor: number;
  type: string;
  status: 'dirty' | 'cleaning' | 'clean' | 'inspected';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  estimatedTime: number;
  assignedTo: string | null;
  checkoutTime: string | null;
  nextCheckin: string | null;
  guestType: string;
  lastCleaned: string;
  predictedMess: 'low' | 'medium' | 'high';
}

const rooms: Room[] = [
  { id: '1', number: '302', floor: 3, type: 'Deluxe', status: 'dirty', priority: 'urgent', estimatedTime: 25, assignedTo: 'Marie', checkoutTime: '06:30', nextCheckin: '14:00', guestType: 'VIP', lastCleaned: 'Hier', predictedMess: 'low' },
  { id: '2', number: '305', floor: 3, type: 'Standard', status: 'cleaning', priority: 'high', estimatedTime: 35, assignedTo: 'Jean', checkoutTime: '10:00', nextCheckin: '15:00', guestType: 'Famille', lastCleaned: 'Hier', predictedMess: 'high' },
  { id: '3', number: '401', floor: 4, type: 'Suite', status: 'dirty', priority: 'high', estimatedTime: 45, assignedTo: null, checkoutTime: '11:00', nextCheckin: '16:00', guestType: 'Business', lastCleaned: 'Hier', predictedMess: 'medium' },
  { id: '4', number: '208', floor: 2, type: 'Standard', status: 'clean', priority: 'normal', estimatedTime: 20, assignedTo: 'Sophie', checkoutTime: '09:00', nextCheckin: null, guestType: 'Couple', lastCleaned: 'Aujourd\'hui', predictedMess: 'low' },
  { id: '5', number: '512', floor: 5, type: 'Deluxe', status: 'inspected', priority: 'low', estimatedTime: 30, assignedTo: 'Pierre', checkoutTime: '08:00', nextCheckin: '14:00', guestType: 'Business', lastCleaned: 'Aujourd\'hui', predictedMess: 'low' },
  { id: '6', number: '415', floor: 4, type: 'Standard', status: 'dirty', priority: 'normal', estimatedTime: 25, assignedTo: null, checkoutTime: '11:30', nextCheckin: '17:00', guestType: 'Solo', lastCleaned: 'Hier', predictedMess: 'low' }
];

const staff = [
  { id: '1', name: 'Marie', avatar: '👩', roomsToday: 8, completed: 5, efficiency: 95 },
  { id: '2', name: 'Jean', avatar: '👨', roomsToday: 7, completed: 4, efficiency: 88 },
  { id: '3', name: 'Sophie', avatar: '👩‍🦰', roomsToday: 9, completed: 6, efficiency: 92 },
  { id: '4', name: 'Pierre', avatar: '👨‍🦱', roomsToday: 6, completed: 6, efficiency: 98 }
];

export default function PredictiveHousekeeping(_props: { language?: string }) {
  const [roomList, _setRoomList] = useState(rooms);
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const filteredRooms = selectedFloor === 'all' 
    ? roomList 
    : roomList.filter(r => r.floor === selectedFloor);

  const getStatusColor = (status: Room['status']) => {
    switch (status) {
      case 'dirty': return 'bg-red-100 text-red-700 border-red-200';
      case 'cleaning': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'clean': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'inspected': return 'bg-purple-100 text-purple-700 border-purple-200';
    }
  };

  const getPriorityColor = (priority: Room['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-slate-400';
    }
  };

  const stats = {
    total: roomList.length,
    dirty: roomList.filter(r => r.status === 'dirty').length,
    cleaning: roomList.filter(r => r.status === 'cleaning').length,
    clean: roomList.filter(r => r.status === 'clean').length,
    inspected: roomList.filter(r => r.status === 'inspected').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-4xl">🧹</span>
              Predictive Housekeeping
            </h2>
            <p className="text-purple-100 mt-1">Planning intelligent optimisé par IA</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition-colors">
              🔄 Optimiser
            </button>
            <button className="px-4 py-2 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-colors">
              📋 Exporter planning
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
          <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
          <div className="text-sm text-slate-500">Total chambres</div>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 shadow-sm border border-red-100 text-center">
          <div className="text-3xl font-bold text-red-600">{stats.dirty}</div>
          <div className="text-sm text-red-500">À nettoyer</div>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 shadow-sm border border-amber-100 text-center">
          <div className="text-3xl font-bold text-amber-600">{stats.cleaning}</div>
          <div className="text-sm text-amber-500">En cours</div>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 shadow-sm border border-blue-100 text-center">
          <div className="text-3xl font-bold text-blue-600">{stats.clean}</div>
          <div className="text-sm text-blue-500">Nettoyées</div>
        </div>
        <div className="bg-purple-50 rounded-2xl p-4 shadow-sm border border-purple-100 text-center">
          <div className="text-3xl font-bold text-purple-600">{stats.inspected}</div>
          <div className="text-sm text-purple-500">Inspectées</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedFloor('all')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              selectedFloor === 'all' ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tous les étages
          </button>
          {[2, 3, 4, 5].map((floor) => (
            <button
              key={floor}
              onClick={() => setSelectedFloor(floor)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                selectedFloor === floor ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Étage {floor}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
          >
            ☰
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
          >
            ⊞
          </button>
        </div>
      </div>

      {/* Rooms List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Planning du jour - {filteredRooms.length} chambres</h3>
        </div>
        
        {viewMode === 'list' ? (
          <div className="divide-y divide-slate-100">
            {filteredRooms.map((room) => (
              <div key={room.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Priority indicator */}
                  <div className={`w-2 h-12 rounded-full ${getPriorityColor(room.priority)}`}></div>
                  
                  {/* Room info */}
                  <div className="w-24">
                    <div className="text-lg font-bold text-slate-800">{room.number}</div>
                    <div className="text-sm text-slate-500">{room.type}</div>
                  </div>
                  
                  {/* Status */}
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(room.status)}`}>
                    {room.status === 'dirty' ? '🔴 À nettoyer' : 
                     room.status === 'cleaning' ? '🟡 En cours' :
                     room.status === 'clean' ? '🔵 Nettoyée' : '🟢 Inspectée'}
                  </span>
                  
                  {/* Predicted mess */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Désordre prédit:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      room.predictedMess === 'high' ? 'bg-red-100 text-red-700' :
                      room.predictedMess === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {room.predictedMess === 'high' ? '⬆️ Élevé' : 
                       room.predictedMess === 'medium' ? '➡️ Moyen' : '⬇️ Faible'}
                    </span>
                  </div>
                  
                  {/* Time */}
                  <div className="text-center">
                    <div className="text-sm font-medium text-slate-700">⏱️ {room.estimatedTime} min</div>
                    <div className="text-xs text-slate-400">Estimation IA</div>
                  </div>
                  
                  {/* Checkout/Checkin */}
                  <div className="text-center">
                    <div className="text-sm text-slate-600">
                      {room.checkoutTime && <span>🚪 Départ {room.checkoutTime}</span>}
                    </div>
                    <div className="text-sm text-slate-600">
                      {room.nextCheckin && <span>🔑 Arrivée {room.nextCheckin}</span>}
                    </div>
                  </div>
                  
                  {/* Guest type */}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    room.guestType === 'VIP' ? 'bg-purple-100 text-purple-700' :
                    room.guestType === 'Famille' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {room.guestType}
                  </span>
                  
                  {/* Assigned */}
                  <div className="ml-auto flex items-center gap-2">
                    {room.assignedTo ? (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                        👤 {room.assignedTo}
                      </span>
                    ) : (
                      <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors">
                        + Assigner
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredRooms.map((room) => (
              <div 
                key={room.id}
                className={`p-4 rounded-xl border-2 ${getStatusColor(room.status)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl font-bold">{room.number}</span>
                  <span className={`w-3 h-3 rounded-full ${getPriorityColor(room.priority)}`}></span>
                </div>
                <div className="text-sm text-slate-600">{room.type}</div>
                <div className="text-sm mt-2">⏱️ {room.estimatedTime} min</div>
                {room.assignedTo && (
                  <div className="text-sm mt-1">👤 {room.assignedTo}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staff Performance */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Performance équipe</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {staff.map((member) => (
            <div key={member.id} className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{member.avatar}</span>
                <div>
                  <div className="font-semibold text-slate-800">{member.name}</div>
                  <div className="text-sm text-slate-500">{member.completed}/{member.roomsToday} chambres</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Efficacité</span>
                  <span className="font-medium text-slate-700">{member.efficiency}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      member.efficiency >= 95 ? 'bg-purple-600' :
                      member.efficiency >= 85 ? 'bg-purple-400' : 'bg-amber-500'
                    }`}
                    style={{ width: `${member.efficiency}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
