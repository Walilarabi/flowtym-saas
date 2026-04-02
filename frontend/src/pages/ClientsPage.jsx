import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useHotel } from '@/context/HotelContext';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Tag,
  Star,
  Building,
} from 'lucide-react';
import { ClientForm } from '@/components/clients/ClientForm';

const TAG_COLORS = {
  VIP: 'bg-amber-100 text-amber-700',
  Affaires: 'bg-blue-100 text-blue-700',
  Famille: 'bg-emerald-100 text-emerald-700',
  Regulier: 'bg-violet-100 text-violet-700',
};

export const ClientsPage = () => {
  const { api } = useAuth();
  const { currentHotel } = useHotel();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [clientReservations, setClientReservations] = useState([]);

  const fetchClients = async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await api.get(`/hotels/${currentHotel.id}/clients${params}`);
      setClients(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [currentHotel]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchClientReservations = async (clientId) => {
    try {
      const response = await api.get(`/hotels/${currentHotel.id}/reservations`);
      const clientRes = response.data.filter((r) => r.client_id === clientId);
      setClientReservations(clientRes);
    } catch (error) {
      console.error('Failed to fetch client reservations:', error);
    }
  };

  const handleViewClient = async (client) => {
    setSelectedClient(client);
    setShowNewClient(false);
    setSheetOpen(true);
    await fetchClientReservations(client.id);
  };

  const handleNewClient = () => {
    setSelectedClient(null);
    setShowNewClient(true);
    setSheetOpen(true);
    setClientReservations([]);
  };

  const handleClientSaved = () => {
    setSheetOpen(false);
    fetchClients();
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cardex Clients</h1>
          <p className="text-sm text-slate-500">{clients.length} clients enregistres</p>
        </div>
        <Button
          className="bg-violet-600 hover:bg-violet-700"
          onClick={handleNewClient}
          data-testid="btn-new-client"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau client
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-slate-200 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher par nom, email, telephone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-clients"
          />
        </div>
      </div>

      {/* Clients Grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full spinner" />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <User className="w-12 h-12 mb-2 text-slate-300" />
            <p>Aucun client trouve</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {clients.map((client) => (
              <div
                key={client.id}
                className="bg-white rounded-lg border border-slate-200 p-4 cursor-pointer card-hover"
                onClick={() => handleViewClient(client)}
                data-testid={`client-card-${client.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-slate-600">
                        {client.first_name?.charAt(0)}{client.last_name?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {client.first_name} {client.last_name}
                      </h3>
                      {client.company && (
                        <p className="text-xs text-slate-500">{client.company}</p>
                      )}
                    </div>
                  </div>
                </div>

                {client.tags && client.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {client.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${TAG_COLORS[tag] || 'bg-slate-100 text-slate-600'}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-1 text-sm text-slate-600">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{client.city}, {client.country}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{client.total_stays} sejours</span>
                  <span className="font-medium text-slate-700">{client.total_revenue?.toFixed(0) || 0} EUR</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Client Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          {showNewClient ? (
            <>
              <SheetHeader>
                <SheetTitle>Nouveau client</SheetTitle>
              </SheetHeader>
              <ClientForm onSuccess={handleClientSaved} onCancel={() => setSheetOpen(false)} />
            </>
          ) : selectedClient ? (
            <>
              <SheetHeader>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
                    <span className="text-xl font-semibold text-slate-600">
                      {selectedClient.first_name?.charAt(0)}{selectedClient.last_name?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <SheetTitle className="text-xl">
                      {selectedClient.first_name} {selectedClient.last_name}
                    </SheetTitle>
                    {selectedClient.company && (
                      <p className="text-sm text-slate-500">{selectedClient.company}</p>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="info" className="mt-6">
                <TabsList className="w-full">
                  <TabsTrigger value="info" className="flex-1">Informations</TabsTrigger>
                  <TabsTrigger value="stays" className="flex-1">Sejours</TabsTrigger>
                  <TabsTrigger value="preferences" className="flex-1">Preferences</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Email</label>
                      <p className="text-sm">{selectedClient.email || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Telephone</label>
                      <p className="text-sm">{selectedClient.phone || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Adresse</label>
                      <p className="text-sm">{selectedClient.address || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Ville</label>
                      <p className="text-sm">{selectedClient.city ? `${selectedClient.city}, ${selectedClient.country}` : '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Langue</label>
                      <p className="text-sm">{selectedClient.language === 'fr' ? 'Francais' : selectedClient.language}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Date de naissance</label>
                      <p className="text-sm">{selectedClient.birth_date || '-'}</p>
                    </div>
                  </div>

                  {selectedClient.tags && selectedClient.tags.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedClient.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedClient.notes && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">Notes</label>
                      <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedClient.notes}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="kpi-card">
                      <p className="text-xs text-slate-500 mb-1">Total sejours</p>
                      <p className="text-2xl font-bold">{selectedClient.total_stays}</p>
                    </div>
                    <div className="kpi-card">
                      <p className="text-xs text-slate-500 mb-1">Chiffre d'affaires</p>
                      <p className="text-2xl font-bold">{selectedClient.total_revenue?.toFixed(0) || 0} EUR</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="stays" className="mt-4">
                  {clientReservations.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">Aucun sejour enregistre</p>
                  ) : (
                    <div className="space-y-3">
                      {clientReservations.map((res) => (
                        <div key={res.id} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-900">Chambre {res.room_number}</span>
                            <Badge variant="outline">{res.status}</Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>
                              {format(parseISO(res.check_in), 'dd MMM', { locale: fr })} - {format(parseISO(res.check_out), 'dd MMM yyyy', { locale: fr })}
                            </span>
                            <span className="font-medium text-slate-700">{res.total_amount.toFixed(0)} EUR</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="preferences" className="mt-4">
                  <div className="space-y-4">
                    {selectedClient.preferences && Object.keys(selectedClient.preferences).length > 0 ? (
                      Object.entries(selectedClient.preferences).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-600 capitalize">{key.replace('_', ' ')}</span>
                          <span className="text-sm font-medium">{String(value)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-500 py-8">Aucune preference enregistree</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-6 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => {
                  setShowNewClient(true);
                }}>
                  Modifier
                </Button>
                <Button className="flex-1 bg-violet-600 hover:bg-violet-700">
                  Nouvelle reservation
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
};
