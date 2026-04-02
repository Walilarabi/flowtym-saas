import { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  MagnifyingGlass,
  FunnelSimple,
  CaretRight,
  Eye,
  ArrowsClockwise,
  CalendarBlank
} from '@phosphor-icons/react';
import { DataHubNav, DataHubBreadcrumb } from '../../components/datahub/DataHubNav';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_BACKEND_URL || '';
const HOTEL_ID = 'test-hotel-001';

const sourceColors = {
  mews: 'bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
  booking_com: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  dedge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  flowtym_pms: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const statusColors = {
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  checked_in: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  checked_out: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  modified: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  pending: 'bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
  no_show: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

const channelLabels = {
  direct: 'Direct',
  booking_com: 'Booking.com',
  expedia: 'Expedia',
  channel_manager: 'Channel Manager',
  hrs: 'HRS',
  airbnb: 'Airbnb',
};

export default function DataHubData() {
  const [reservations, setReservations] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('reservations');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [detailModal, setDetailModal] = useState(false);

  const pageSize = 20;

  const fetchReservations = useCallback(async () => {
    try {
      let url = `${API_URL}/api/datahub/hotels/${HOTEL_ID}/reservations?page=${page}&page_size=${pageSize}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (channelFilter !== 'all') url += `&channel=${channelFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReservations(data.data || []);
        setTotal(data.total || 0);
        setHasMore(data.has_more || false);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, channelFilter]);

  const fetchGuests = useCallback(async () => {
    try {
      let url = `${API_URL}/api/datahub/hotels/${HOTEL_ID}/guests?page=${page}&page_size=${pageSize}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setGuests(data.data || []);
        setTotal(data.total || 0);
        setHasMore(data.has_more || false);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }, [page, search]);

  useEffect(() => {
    setLoading(true);
    if (tab === 'reservations') {
      fetchReservations();
    } else if (tab === 'guests') {
      fetchGuests();
    } else {
      setLoading(false);
    }
  }, [tab, fetchReservations, fetchGuests]);

  const handleViewReservation = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/datahub/hotels/${HOTEL_ID}/reservations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedReservation(data);
        setDetailModal(true);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DataHubNav />
      
      <main className="max-w-[1600px] mx-auto p-4 md:p-8 lg:p-12">
        <DataHubBreadcrumb items={[{ label: 'Données Unifiées' }]} />

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
            Données Unifiées
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Accédez aux données normalisées provenant de toutes les sources
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }}>
          <TabsList className="mb-6">
            <TabsTrigger value="reservations" data-testid="tab-reservations">
              <Database size={16} className="mr-2" />
              Réservations
            </TabsTrigger>
            <TabsTrigger value="guests" data-testid="tab-guests">
              Clients
            </TabsTrigger>
            <TabsTrigger value="rates" data-testid="tab-rates">
              Tarifs
            </TabsTrigger>
          </TabsList>

          {/* Reservations Tab */}
          <TabsContent value="reservations">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="text-lg">
                  {total} Réservations
                </CardTitle>
                <div className="flex gap-3">
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[150px]" data-testid="status-filter">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="confirmed">Confirmée</SelectItem>
                      <SelectItem value="checked_in">Checked In</SelectItem>
                      <SelectItem value="checked_out">Checked Out</SelectItem>
                      <SelectItem value="cancelled">Annulée</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={channelFilter} onValueChange={(v) => { setChannelFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[150px]" data-testid="channel-filter">
                      <SelectValue placeholder="Canal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les canaux</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="booking_com">Booking.com</SelectItem>
                      <SelectItem value="channel_manager">Channel Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse space-y-4">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
                    ))}
                  </div>
                ) : reservations.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-200 dark:border-slate-800">
                            <TableHead>Confirmation</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Check-in</TableHead>
                            <TableHead>Check-out</TableHead>
                            <TableHead>Nuits</TableHead>
                            <TableHead>Montant</TableHead>
                            <TableHead>Canal</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reservations.map((res, index) => (
                            <TableRow 
                              key={index}
                              className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              data-testid={`reservation-row-${index}`}
                            >
                              <TableCell className="font-mono text-sm font-medium">
                                {res.confirmation_number}
                              </TableCell>
                              <TableCell>{res.guest_name}</TableCell>
                              <TableCell className="font-mono text-sm">
                                {res.check_in_date}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {res.check_out_date}
                              </TableCell>
                              <TableCell className="text-center">{res.nights}</TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(res.total_amount, res.currency)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize text-xs">
                                  {channelLabels[res.channel] || res.channel}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={`text-xs ${sourceColors[res.source_system] || 'bg-slate-100'}`}>
                                  {res.source_system}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={`text-xs capitalize ${statusColors[res.status] || ''}`}>
                                  {res.status.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewReservation(res.id)}
                                  data-testid={`view-res-${index}`}
                                >
                                  <Eye size={16} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <p className="text-sm text-slate-500">
                        Page {page} • {total} résultats
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          Précédent
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPage(p => p + 1)}
                          disabled={!hasMore}
                        >
                          Suivant
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Database size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">
                      Aucune réservation trouvée
                    </p>
                    <p className="text-sm text-slate-400 mt-2">
                      Lancez une synchronisation pour importer des données
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Guests Tab */}
          <TabsContent value="guests">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="text-lg">Clients</CardTitle>
                <div className="relative">
                  <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Rechercher..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="guest-search"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {guests.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Téléphone</TableHead>
                          <TableHead>Pays</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Séjours</TableHead>
                          <TableHead>CA Total</TableHead>
                          <TableHead>Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {guests.map((guest, index) => (
                          <TableRow key={index} data-testid={`guest-row-${index}`}>
                            <TableCell className="font-medium">{guest.full_name}</TableCell>
                            <TableCell className="text-sm">{guest.email || '-'}</TableCell>
                            <TableCell className="font-mono text-sm">{guest.phone || '-'}</TableCell>
                            <TableCell>{guest.country}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {guest.guest_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">{guest.total_stays}</TableCell>
                            <TableCell>{formatCurrency(guest.total_revenue)}</TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${sourceColors[guest.source_system] || ''}`}>
                                {guest.source_system}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-slate-500">Aucun client trouvé</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rates Tab */}
          <TabsContent value="rates">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="py-12 text-center">
                <CalendarBlank size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-500 dark:text-slate-400">
                  Vue Tarifs à venir (Phase 2)
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Reservation Detail Modal */}
      <Dialog open={detailModal} onOpenChange={setDetailModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Réservation {selectedReservation?.confirmation_number}
              {selectedReservation && (
                <Badge className={statusColors[selectedReservation.status] || ''}>
                  {selectedReservation.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedReservation && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Check-in</p>
                  <p className="font-medium">{selectedReservation.check_in_date}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Check-out</p>
                  <p className="font-medium">{selectedReservation.check_out_date}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Nuits</p>
                  <p className="font-medium">{selectedReservation.nights}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Montant</p>
                  <p className="font-medium text-lg">
                    {formatCurrency(selectedReservation.total_amount, selectedReservation.currency)}
                  </p>
                </div>
              </div>

              {/* Source & Channel */}
              <div className="flex gap-4">
                <Badge className={sourceColors[selectedReservation.source_system] || ''}>
                  Source: {selectedReservation.source_system}
                </Badge>
                <Badge variant="outline">
                  Canal: {channelLabels[selectedReservation.channel] || selectedReservation.channel}
                </Badge>
              </div>

              {/* Transformation Log */}
              {selectedReservation.transformation_log && selectedReservation.transformation_log.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <ArrowsClockwise size={16} />
                    Journal de transformation
                  </h4>
                  <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-emerald-400 max-h-48 overflow-y-auto">
                    {selectedReservation.transformation_log.map((log, i) => (
                      <div key={i} className="mb-2">
                        <span className="text-slate-500">{log.source_field}</span>
                        <span className="text-slate-600 mx-2">→</span>
                        <span className="text-amber-400">{log.transformation_rule}</span>
                        <span className="text-slate-600 mx-2">:</span>
                        <span className="text-slate-400">{log.original_value}</span>
                        <span className="text-emerald-500 mx-1">→</span>
                        <span>{log.normalized_value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Source Data */}
              <div>
                <h4 className="font-semibold mb-2">Données source (JSON)</h4>
                <pre className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-xs overflow-x-auto max-h-48">
                  {JSON.stringify(selectedReservation, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
