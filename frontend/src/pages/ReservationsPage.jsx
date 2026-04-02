import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useHotel } from '@/context/HotelContext';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  XCircle,
  Mail,
  CreditCard,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReservationForm } from '@/components/reservations/ReservationForm';
import { ReservationDetail } from '@/components/reservations/ReservationDetail';

const STATUS_LABELS = {
  pending: { label: 'En attente', className: 'status-pending' },
  confirmed: { label: 'Confirmee', className: 'status-confirmed' },
  checked_in: { label: 'Check-in', className: 'status-checked_in' },
  checked_out: { label: 'Check-out', className: 'status-checked_out' },
  cancelled: { label: 'Annulee', className: 'status-cancelled' },
  no_show: { label: 'No-show', className: 'status-no_show' },
};

const CHANNEL_LABELS = {
  direct: 'Direct',
  booking_com: 'Booking.com',
  expedia: 'Expedia',
  airbnb: 'Airbnb',
  other: 'Autre',
};

export const ReservationsPage = () => {
  const { api } = useAuth();
  const { currentHotel } = useHotel();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showNewReservation, setShowNewReservation] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchReservations = async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (channelFilter !== 'all') params.append('channel', channelFilter);
      
      const response = await api.get(`/hotels/${currentHotel.id}/reservations?${params}`);
      setReservations(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [currentHotel, statusFilter, channelFilter]);

  const filteredReservations = reservations.filter((r) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      r.client_name.toLowerCase().includes(searchLower) ||
      r.room_number.toLowerCase().includes(searchLower) ||
      r.id.toLowerCase().includes(searchLower)
    );
  });

  const handleViewReservation = (reservation) => {
    setSelectedReservation(reservation);
    setShowNewReservation(false);
    setSheetOpen(true);
  };

  const handleNewReservation = () => {
    setSelectedReservation(null);
    setShowNewReservation(true);
    setSheetOpen(true);
  };

  const handleReservationSaved = () => {
    setSheetOpen(false);
    fetchReservations();
  };

  const handleStatusChange = async (reservationId, newStatus) => {
    try {
      await api.patch(`/hotels/${currentHotel.id}/reservations/${reservationId}/status?status=${newStatus}`);
      toast.success('Statut mis a jour');
      fetchReservations();
    } catch (error) {
      toast.error('Erreur lors de la mise a jour du statut');
    }
  };

  const exportToCsv = () => {
    const headers = ['ID', 'Client', 'Chambre', 'Arrivee', 'Depart', 'Statut', 'Canal', 'Total'];
    const rows = filteredReservations.map((r) => [
      r.id,
      r.client_name,
      r.room_number,
      r.check_in.split('T')[0],
      r.check_out.split('T')[0],
      STATUS_LABELS[r.status]?.label || r.status,
      CHANNEL_LABELS[r.channel] || r.channel,
      r.total_amount,
    ]);
    
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV telecharge');
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reservations</h1>
          <p className="text-sm text-slate-500">{filteredReservations.length} reservations</p>
        </div>
        <Button
          className="bg-violet-600 hover:bg-violet-700"
          onClick={handleNewReservation}
          data-testid="btn-new-reservation"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle reservation
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher par client, chambre, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="filter-status">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-40" data-testid="filter-channel">
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les canaux</SelectItem>
            {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportToCsv} data-testid="btn-export">
          <Download className="w-4 h-4 mr-2" />
          Exporter
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Statut</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Client</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Dates</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Chambre</th>
                <th className="text-left p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Canal</th>
                <th className="text-right p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Montant</th>
                <th className="text-right p-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Solde</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full spinner mx-auto mb-2" />
                    Chargement...
                  </td>
                </tr>
              ) : filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Aucune reservation trouvee
                  </td>
                </tr>
              ) : (
                filteredReservations.map((reservation) => (
                  <tr
                    key={reservation.id}
                    className="table-row-hover cursor-pointer"
                    onClick={() => handleViewReservation(reservation)}
                    data-testid={`reservation-row-${reservation.id}`}
                  >
                    <td className="p-3">
                      <span className={`status-badge ${STATUS_LABELS[reservation.status]?.className}`}>
                        {STATUS_LABELS[reservation.status]?.label || reservation.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-900">{reservation.client_name}</div>
                      {reservation.client_email && (
                        <div className="text-xs text-slate-500">{reservation.client_email}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-slate-900">
                        {format(parseISO(reservation.check_in), 'dd MMM', { locale: fr })} - {format(parseISO(reservation.check_out), 'dd MMM yyyy', { locale: fr })}
                      </div>
                      <div className="text-xs text-slate-500">{reservation.nights} nuits</div>
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-sm">{reservation.room_number}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-slate-600">
                        {CHANNEL_LABELS[reservation.channel] || reservation.channel}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="font-mono text-sm font-medium">{reservation.total_amount.toFixed(2)} EUR</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-mono text-sm font-medium ${reservation.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {reservation.balance.toFixed(2)} EUR
                      </span>
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`btn-actions-${reservation.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewReservation(reservation)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Voir details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="w-4 h-4 mr-2" />
                            Envoyer confirmation
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Lien de paiement
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {reservation.status === 'confirmed' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(reservation.id, 'checked_in')}>
                              Check-in
                            </DropdownMenuItem>
                          )}
                          {reservation.status === 'checked_in' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(reservation.id, 'checked_out')}>
                              Check-out
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleStatusChange(reservation.id, 'cancelled')}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Annuler
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reservation Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          {showNewReservation ? (
            <>
              <SheetHeader>
                <SheetTitle>Nouvelle reservation</SheetTitle>
              </SheetHeader>
              <ReservationForm onSuccess={handleReservationSaved} onCancel={() => setSheetOpen(false)} />
            </>
          ) : selectedReservation ? (
            <ReservationDetail
              reservation={selectedReservation}
              onClose={() => setSheetOpen(false)}
              onUpdate={handleReservationSaved}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
};
