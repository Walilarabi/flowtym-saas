import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useHotel } from '@/context/HotelContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Settings,
  Building2,
  User,
  CreditCard,
  Bell,
  Shield,
  Plus,
} from 'lucide-react';

export const SettingsPage = () => {
  const { user } = useAuth();
  const { currentHotel, rooms, createRoom } = useHotel();
  const [loading, setLoading] = useState(false);
  const [newRoom, setNewRoom] = useState({
    number: '',
    room_type: 'double',
    floor: 1,
    max_occupancy: 2,
    base_price: 100,
  });

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!newRoom.number) return;
    setLoading(true);
    try {
      await createRoom(newRoom);
      setNewRoom({ ...newRoom, number: '' });
    } catch (error) {
      // Error handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Parametres</h1>
            <p className="text-sm text-slate-500">Gerez votre hotel et votre compte</p>
          </div>
        </div>

        <Tabs defaultValue="hotel" className="space-y-6">
          <TabsList>
            <TabsTrigger value="hotel">Hotel</TabsTrigger>
            <TabsTrigger value="rooms">Chambres</TabsTrigger>
            <TabsTrigger value="account">Compte</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="hotel">
            <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Informations de l'hotel
              </h2>
              
              {currentHotel && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom de l'hotel</Label>
                    <Input value={currentHotel.name} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Etoiles</Label>
                    <Input value={`${currentHotel.stars} etoiles`} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Ville</Label>
                    <Input value={currentHotel.city || '-'} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Pays</Label>
                    <Input value={currentHotel.country} disabled />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="rooms">
            <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
              <h2 className="font-semibold text-slate-900">Gestion des chambres</h2>
              
              {/* Add room form */}
              <form onSubmit={handleAddRoom} className="flex items-end gap-4">
                <div className="space-y-2">
                  <Label>Numero</Label>
                  <Input
                    value={newRoom.number}
                    onChange={(e) => setNewRoom({ ...newRoom, number: e.target.value })}
                    placeholder="101"
                    className="w-24"
                    data-testid="input-new-room-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <select
                    value={newRoom.room_type}
                    onChange={(e) => setNewRoom({ ...newRoom, room_type: e.target.value })}
                    className="h-10 px-3 border border-slate-200 rounded-md"
                  >
                    <option value="single">Simple</option>
                    <option value="double">Double</option>
                    <option value="twin">Twin</option>
                    <option value="suite">Suite</option>
                    <option value="family">Familiale</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Etage</Label>
                  <Input
                    type="number"
                    value={newRoom.floor}
                    onChange={(e) => setNewRoom({ ...newRoom, floor: parseInt(e.target.value) || 1 })}
                    className="w-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prix/nuit</Label>
                  <Input
                    type="number"
                    value={newRoom.base_price}
                    onChange={(e) => setNewRoom({ ...newRoom, base_price: parseFloat(e.target.value) || 100 })}
                    className="w-24"
                  />
                </div>
                <Button type="submit" disabled={loading || !newRoom.number} data-testid="btn-add-new-room">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </form>

              {/* Rooms list */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 text-xs font-semibold text-slate-600">Numero</th>
                      <th className="text-left p-3 text-xs font-semibold text-slate-600">Type</th>
                      <th className="text-left p-3 text-xs font-semibold text-slate-600">Etage</th>
                      <th className="text-left p-3 text-xs font-semibold text-slate-600">Capacite</th>
                      <th className="text-right p-3 text-xs font-semibold text-slate-600">Prix/nuit</th>
                      <th className="text-left p-3 text-xs font-semibold text-slate-600">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rooms.map((room) => (
                      <tr key={room.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-semibold">{room.number}</td>
                        <td className="p-3 capitalize">{room.room_type}</td>
                        <td className="p-3">{room.floor}</td>
                        <td className="p-3">{room.max_occupancy}</td>
                        <td className="p-3 text-right font-mono">{room.base_price} EUR</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            room.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                            room.status === 'occupied' ? 'bg-blue-100 text-blue-700' :
                            room.status === 'cleaning' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {room.status === 'available' ? 'Disponible' :
                             room.status === 'occupied' ? 'Occupee' :
                             room.status === 'cleaning' ? 'Nettoyage' :
                             room.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="account">
            <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5" />
                Mon compte
              </h2>
              
              {user && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prenom</Label>
                    <Input value={user.first_name} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input value={user.last_name} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user.email} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input value={user.role} disabled />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="integrations">
            <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Integrations de paiement
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                      <span className="font-bold text-violet-600">S</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Stripe</p>
                      <p className="text-sm text-slate-500">Paiements par carte bancaire</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                    Actif
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg opacity-50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="font-bold text-blue-600">A</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Adyen</p>
                      <p className="text-sm text-slate-500">Solution de paiement avancee</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Configurer
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg opacity-50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="font-bold text-blue-600">P</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">PayPal</p>
                      <p className="text-sm text-slate-500">Paiements PayPal</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Configurer
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
