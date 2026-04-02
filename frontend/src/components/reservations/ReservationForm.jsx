import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useHotel } from '@/context/HotelContext';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Search, Plus, User } from 'lucide-react';

const CHANNELS = [
  { value: 'direct', label: 'Direct' },
  { value: 'booking_com', label: 'Booking.com' },
  { value: 'expedia', label: 'Expedia' },
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'other', label: 'Autre' },
];

const RATE_TYPES = [
  { value: 'standard', label: 'Standard' },
  { value: 'flex', label: 'Flexible' },
  { value: 'non_refundable', label: 'Non remboursable' },
  { value: 'corporate', label: 'Corporate' },
];

export const ReservationForm = ({ onSuccess, onCancel, initialData = null }) => {
  const { api } = useAuth();
  const { currentHotel, rooms } = useHotel();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientSearch, setShowClientSearch] = useState(true);
  const [showNewClient, setShowNewClient] = useState(false);
  
  const [formData, setFormData] = useState({
    client_id: '',
    room_id: '',
    check_in: format(new Date(), 'yyyy-MM-dd'),
    check_out: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    adults: 1,
    children: 0,
    channel: 'direct',
    rate_type: 'standard',
    room_rate: 0,
    total_amount: 0,
    notes: '',
    special_requests: '',
  });

  const [newClient, setNewClient] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

  const [selectedClient, setSelectedClient] = useState(null);

  // Search clients
  useEffect(() => {
    const searchClients = async () => {
      if (!currentHotel || clientSearch.length < 2) {
        setClients([]);
        return;
      }
      try {
        const response = await api.get(`/hotels/${currentHotel.id}/clients?search=${encodeURIComponent(clientSearch)}`);
        setClients(response.data.slice(0, 5));
      } catch (error) {
        console.error('Failed to search clients:', error);
      }
    };
    
    const timer = setTimeout(searchClients, 300);
    return () => clearTimeout(timer);
  }, [clientSearch, currentHotel, api]);

  // Calculate totals when room or dates change
  useEffect(() => {
    if (formData.room_id && formData.check_in && formData.check_out) {
      const room = rooms.find(r => r.id === formData.room_id);
      if (room) {
        const checkIn = new Date(formData.check_in);
        const checkOut = new Date(formData.check_out);
        const nights = Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
        const roomRate = room.base_price;
        const total = roomRate * nights;
        setFormData(prev => ({
          ...prev,
          room_rate: roomRate,
          total_amount: total,
        }));
      }
    }
  }, [formData.room_id, formData.check_in, formData.check_out, rooms]);

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setFormData(prev => ({ ...prev, client_id: client.id }));
    setShowClientSearch(false);
    setClientSearch('');
  };

  const handleCreateClient = async () => {
    if (!newClient.first_name || !newClient.last_name) {
      toast.error('Veuillez renseigner le nom et prenom du client');
      return;
    }
    
    try {
      const response = await api.post(`/hotels/${currentHotel.id}/clients`, newClient);
      setSelectedClient(response.data);
      setFormData(prev => ({ ...prev, client_id: response.data.id }));
      setShowNewClient(false);
      setShowClientSearch(false);
      toast.success('Client cree');
    } catch (error) {
      toast.error('Erreur lors de la creation du client');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.client_id) {
      toast.error('Veuillez selectionner un client');
      return;
    }
    if (!formData.room_id) {
      toast.error('Veuillez selectionner une chambre');
      return;
    }
    
    setLoading(true);
    try {
      await api.post(`/hotels/${currentHotel.id}/reservations`, formData);
      toast.success('Reservation creee avec succes');
      onSuccess?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la creation de la reservation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      {/* Client Selection */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Client</Label>
        
        {selectedClient ? (
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="font-medium">{selectedClient.first_name} {selectedClient.last_name}</p>
                <p className="text-sm text-slate-500">{selectedClient.email || selectedClient.phone}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedClient(null);
                setFormData(prev => ({ ...prev, client_id: '' }));
                setShowClientSearch(true);
              }}
            >
              Changer
            </Button>
          </div>
        ) : showNewClient ? (
          <div className="space-y-3 p-4 border border-slate-200 rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Prenom *</Label>
                <Input
                  value={newClient.first_name}
                  onChange={(e) => setNewClient({ ...newClient, first_name: e.target.value })}
                  placeholder="Jean"
                  data-testid="input-new-client-firstname"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nom *</Label>
                <Input
                  value={newClient.last_name}
                  onChange={(e) => setNewClient({ ...newClient, last_name: e.target.value })}
                  placeholder="Dupont"
                  data-testid="input-new-client-lastname"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="jean@email.com"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telephone</Label>
                <Input
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowNewClient(false)}>
                Annuler
              </Button>
              <Button type="button" size="sm" onClick={handleCreateClient} data-testid="btn-create-client">
                Creer le client
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Rechercher un client..."
                className="pl-9"
                data-testid="input-client-search"
              />
            </div>
            {clients.length > 0 && (
              <div className="border border-slate-200 rounded-lg divide-y">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    className="w-full p-3 text-left hover:bg-slate-50 flex items-center gap-3"
                    onClick={() => handleSelectClient(client)}
                    data-testid={`client-option-${client.id}`}
                  >
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-medium">
                      {client.first_name?.charAt(0)}{client.last_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{client.first_name} {client.last_name}</p>
                      <p className="text-xs text-slate-500">{client.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewClient(true)}
              className="w-full"
              data-testid="btn-show-new-client"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau client
            </Button>
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Arrivee</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start" data-testid="btn-check-in-date">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {format(new Date(formData.check_in), 'dd MMM yyyy', { locale: fr })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={new Date(formData.check_in)}
                onSelect={(date) => date && setFormData(prev => ({ 
                  ...prev, 
                  check_in: format(date, 'yyyy-MM-dd'),
                  check_out: format(addDays(date, 1), 'yyyy-MM-dd')
                }))}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Depart</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start" data-testid="btn-check-out-date">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {format(new Date(formData.check_out), 'dd MMM yyyy', { locale: fr })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={new Date(formData.check_out)}
                onSelect={(date) => date && setFormData(prev => ({ ...prev, check_out: format(date, 'yyyy-MM-dd') }))}
                locale={fr}
                disabled={(date) => date <= new Date(formData.check_in)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Room Selection */}
      <div className="space-y-2">
        <Label>Chambre</Label>
        <Select
          value={formData.room_id}
          onValueChange={(v) => setFormData(prev => ({ ...prev, room_id: v }))}
        >
          <SelectTrigger data-testid="select-room">
            <SelectValue placeholder="Selectionner une chambre" />
          </SelectTrigger>
          <SelectContent>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.number} - {room.room_type} ({room.base_price} EUR/nuit)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Channel and Rate Type */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Canal</Label>
          <Select
            value={formData.channel}
            onValueChange={(v) => setFormData(prev => ({ ...prev, channel: v }))}
          >
            <SelectTrigger data-testid="select-channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((channel) => (
                <SelectItem key={channel.value} value={channel.value}>
                  {channel.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Type de tarif</Label>
          <Select
            value={formData.rate_type}
            onValueChange={(v) => setFormData(prev => ({ ...prev, rate_type: v }))}
          >
            <SelectTrigger data-testid="select-rate-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RATE_TYPES.map((rate) => (
                <SelectItem key={rate.value} value={rate.value}>
                  {rate.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Guests */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Adultes</Label>
          <Input
            type="number"
            min="1"
            value={formData.adults}
            onChange={(e) => setFormData(prev => ({ ...prev, adults: parseInt(e.target.value) || 1 }))}
            data-testid="input-adults"
          />
        </div>
        <div className="space-y-2">
          <Label>Enfants</Label>
          <Input
            type="number"
            min="0"
            value={formData.children}
            onChange={(e) => setFormData(prev => ({ ...prev, children: parseInt(e.target.value) || 0 }))}
            data-testid="input-children"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Demandes speciales</Label>
        <Textarea
          value={formData.special_requests}
          onChange={(e) => setFormData(prev => ({ ...prev, special_requests: e.target.value }))}
          placeholder="Arrivee tardive, lit bebe, etc."
          rows={2}
          data-testid="textarea-special-requests"
        />
      </div>

      {/* Total */}
      <div className="p-4 bg-slate-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-600">Prix par nuit</span>
          <span className="font-mono">{formData.room_rate.toFixed(2)} EUR</span>
        </div>
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>Total</span>
          <span className="font-mono">{formData.total_amount.toFixed(2)} EUR</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Annuler
        </Button>
        <Button 
          type="submit" 
          className="flex-1 bg-violet-600 hover:bg-violet-700" 
          disabled={loading}
          data-testid="btn-submit-reservation"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spinner" />
          ) : (
            'Creer la reservation'
          )}
        </Button>
      </div>
    </form>
  );
};
