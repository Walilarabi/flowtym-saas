import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useHotel } from '@/context/HotelContext';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  LogOut,
  Calendar as CalendarIcon,
  User,
  Bed,
  Clock,
  Check,
  Receipt,
  CreditCard,
} from 'lucide-react';

export const DeparturesPage = () => {
  const { api } = useAuth();
  const { currentHotel } = useHotel();
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchDepartures = async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await api.get(`/hotels/${currentHotel.id}/departures?date=${dateStr}`);
      setDepartures(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des departs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartures();
  }, [currentHotel, selectedDate]);

  const handleCheckOut = async (reservationId) => {
    try {
      await api.patch(`/hotels/${currentHotel.id}/reservations/${reservationId}/status?status=checked_out`);
      toast.success('Check-out effectue');
      fetchDepartures();
    } catch (error) {
      toast.error('Erreur lors du check-out');
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <LogOut className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Departs</h1>
            <p className="text-sm text-slate-500">
              {departures.length} departs prevus pour le {format(selectedDate, 'dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" data-testid="btn-date-picker-departures">
              <CalendarIcon className="w-4 h-4 mr-2" />
              {format(selectedDate, 'dd MMM yyyy', { locale: fr })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={fr}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Departures List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full spinner" />
          </div>
        ) : departures.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <LogOut className="w-12 h-12 mb-2 text-slate-300" />
            <p>Aucun depart prevu pour cette date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {departures.map((departure) => (
              <div
                key={departure.id}
                className="bg-white rounded-lg border border-slate-200 p-4"
                data-testid={`departure-${departure.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                      <User className="w-6 h-6 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{departure.client_name}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Bed className="w-3.5 h-3.5" />
                          Chambre {departure.room_number}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {departure.nights} nuits
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-mono text-lg font-semibold text-slate-900">
                        {departure.total_amount.toFixed(0)} EUR
                      </p>
                      <Badge variant={departure.balance > 0 ? 'destructive' : 'secondary'}>
                        {departure.balance > 0 ? `A payer: ${departure.balance.toFixed(0)} EUR` : 'Solde'}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-2">
                      {departure.balance > 0 && (
                        <Button variant="outline" size="sm" data-testid={`btn-payment-${departure.id}`}>
                          <CreditCard className="w-4 h-4 mr-1" />
                          Paiement
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700"
                        onClick={() => handleCheckOut(departure.id)}
                        data-testid={`btn-checkout-${departure.id}`}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Check-out
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
