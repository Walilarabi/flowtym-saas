import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useHotel } from '@/context/HotelContext';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Calendar,
  User,
  CreditCard,
  Clock,
  FileText,
  Mail,
  Phone,
  MapPin,
  Edit,
  Copy,
  XCircle,
  Check,
  Plus,
  Send,
} from 'lucide-react';

const STATUS_LABELS = {
  pending: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmee', className: 'bg-blue-100 text-blue-700' },
  checked_in: { label: 'Check-in', className: 'bg-emerald-100 text-emerald-700' },
  checked_out: { label: 'Check-out', className: 'bg-slate-100 text-slate-700' },
  cancelled: { label: 'Annulee', className: 'bg-red-100 text-red-700' },
  no_show: { label: 'No-show', className: 'bg-pink-100 text-pink-700' },
};

const CHANNEL_LABELS = {
  direct: 'Direct',
  booking_com: 'Booking.com',
  expedia: 'Expedia',
  airbnb: 'Airbnb',
  other: 'Autre',
};

export const ReservationDetail = ({ reservation, onClose, onUpdate }) => {
  const { api } = useAuth();
  const { currentHotel } = useHotel();
  const [client, setClient] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');

  useEffect(() => {
    fetchDetails();
  }, [reservation]);

  const fetchDetails = async () => {
    try {
      const [clientRes, paymentsRes] = await Promise.all([
        api.get(`/hotels/${currentHotel.id}/clients/${reservation.client_id}`),
        api.get(`/hotels/${currentHotel.id}/payments?reservation_id=${reservation.id}`),
      ]);
      setClient(clientRes.data);
      setPayments(paymentsRes.data);
    } catch (error) {
      console.error('Failed to fetch details:', error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setLoading(true);
    try {
      await api.patch(`/hotels/${currentHotel.id}/reservations/${reservation.id}/status?status=${newStatus}`);
      toast.success('Statut mis a jour');
      onUpdate?.();
    } catch (error) {
      toast.error('Erreur lors de la mise a jour');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    
    setLoading(true);
    try {
      await api.post(`/hotels/${currentHotel.id}/payments`, {
        reservation_id: reservation.id,
        amount: amount,
        method: paymentMethod,
      });
      toast.success('Paiement enregistre');
      setPaymentAmount('');
      fetchDetails();
      onUpdate?.();
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement du paiement');
    } finally {
      setLoading(false);
    }
  };

  const status = STATUS_LABELS[reservation.status] || { label: reservation.status, className: 'bg-slate-100' };

  return (
    <>
      <SheetHeader>
        <div className="flex items-center justify-between">
          <div>
            <SheetTitle className="text-xl">Reservation #{reservation.id.slice(0, 8)}</SheetTitle>
            <p className="text-sm text-slate-500 mt-1">
              Creee le {format(parseISO(reservation.created_at), 'dd/MM/yyyy a HH:mm', { locale: fr })}
            </p>
          </div>
          <Badge className={status.className}>{status.label}</Badge>
        </div>
      </SheetHeader>

      <Tabs defaultValue="info" className="mt-6">
        <TabsList className="w-full">
          <TabsTrigger value="info" className="flex-1">Infos</TabsTrigger>
          <TabsTrigger value="client" className="flex-1">Client</TabsTrigger>
          <TabsTrigger value="billing" className="flex-1">Facturation</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">Historique</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Arrivee</span>
              </div>
              <p className="font-semibold">{format(parseISO(reservation.check_in), 'dd MMMM yyyy', { locale: fr })}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Depart</span>
              </div>
              <p className="font-semibold">{format(parseISO(reservation.check_out), 'dd MMMM yyyy', { locale: fr })}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Chambre</label>
              <p className="font-semibold">{reservation.room_number}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Type</label>
              <p className="capitalize">{reservation.room_type}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Nuits</label>
              <p>{reservation.nights}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Adultes</label>
              <p>{reservation.adults}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Enfants</label>
              <p>{reservation.children}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Canal</label>
              <p>{CHANNEL_LABELS[reservation.channel]}</p>
            </div>
          </div>

          {reservation.special_requests && (
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-xs font-medium text-amber-700 mb-1">Demandes speciales</p>
              <p className="text-sm">{reservation.special_requests}</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="pt-4 border-t space-y-3">
            <p className="text-sm font-medium text-slate-700">Actions rapides</p>
            <div className="flex flex-wrap gap-2">
              {reservation.status === 'confirmed' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleStatusChange('checked_in')}
                  disabled={loading}
                  data-testid="btn-checkin"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Check-in
                </Button>
              )}
              {reservation.status === 'checked_in' && (
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => handleStatusChange('checked_out')}
                  disabled={loading}
                  data-testid="btn-checkout"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Check-out
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Send className="w-4 h-4 mr-1" />
                Envoyer confirmation
              </Button>
              <Button variant="outline" size="sm">
                <CreditCard className="w-4 h-4 mr-1" />
                Lien de paiement
              </Button>
              {!['cancelled', 'checked_out'].includes(reservation.status) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={loading}
                  data-testid="btn-cancel"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Annuler
                </Button>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Client Tab */}
        <TabsContent value="client" className="mt-4 space-y-4">
          {client ? (
            <>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center">
                  <span className="text-xl font-semibold text-slate-600">
                    {client.first_name?.charAt(0)}{client.last_name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{client.first_name} {client.last_name}</h3>
                  {client.company && <p className="text-sm text-slate-500">{client.company}</p>}
                </div>
              </div>

              <div className="space-y-3">
                {client.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.city && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{client.city}, {client.country}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Total sejours</p>
                  <p className="text-xl font-bold">{client.total_stays}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">CA total</p>
                  <p className="text-xl font-bold">{client.total_revenue?.toFixed(0) || 0} EUR</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-slate-500 py-8">Chargement...</p>
          )}
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="mt-4 space-y-4">
          {/* Summary */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Chambre ({reservation.nights} nuits x {reservation.room_rate} EUR)</span>
              <span className="font-mono">{(reservation.nights * reservation.room_rate).toFixed(2)} EUR</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Total</span>
              <span className="font-mono font-semibold">{reservation.total_amount.toFixed(2)} EUR</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Paye</span>
              <span className="font-mono text-emerald-600">{reservation.paid_amount.toFixed(2)} EUR</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Solde</span>
              <span className={`font-mono font-semibold ${reservation.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {reservation.balance.toFixed(2)} EUR
              </span>
            </div>
          </div>

          {/* Add Payment */}
          {reservation.balance > 0 && (
            <div className="p-4 border border-slate-200 rounded-lg space-y-3">
              <p className="text-sm font-medium">Enregistrer un paiement</p>
              <div className="flex gap-3">
                <Input
                  type="number"
                  placeholder="Montant"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="flex-1"
                  data-testid="input-payment-amount"
                />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="px-3 border border-slate-200 rounded-md"
                >
                  <option value="card">Carte</option>
                  <option value="cash">Especes</option>
                  <option value="transfer">Virement</option>
                  <option value="check">Cheque</option>
                </select>
                <Button onClick={handleAddPayment} disabled={loading} data-testid="btn-add-payment">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Payments List */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Historique des paiements</p>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Aucun paiement enregistre</p>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{payment.method}</p>
                      <p className="text-xs text-slate-500">
                        {format(parseISO(payment.created_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                    <span className="font-mono font-semibold text-emerald-600">
                      +{payment.amount.toFixed(2)} EUR
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Reservation creee</p>
                <p className="text-xs text-slate-500">
                  {format(parseISO(reservation.created_at), 'dd/MM/yyyy a HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
            {reservation.updated_at !== reservation.created_at && (
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                  <Edit className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium">Reservation modifiee</p>
                  <p className="text-xs text-slate-500">
                    {format(parseISO(reservation.updated_at), 'dd/MM/yyyy a HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};
