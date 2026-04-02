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
  LogIn,
  Calendar as CalendarIcon,
  User,
  Bed,
  Clock,
  Check,
  ChevronRight,
} from 'lucide-react';

export const ArrivalsPage = () => {
  const { api } = useAuth();
  const { currentHotel } = useHotel();
  const [arrivals, setArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchArrivals = async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await api.get(`/hotels/${currentHotel.id}/arrivals?date=${dateStr}`);
      setArrivals(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des arrivees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArrivals();
  }, [currentHotel, selectedDate]);

  const handleCheckIn = async (reservationId) => {
    try {
      await api.patch(`/hotels/${currentHotel.id}/reservations/${reservationId}/status?status=checked_in`);
      toast.success('Check-in effectue');
      fetchArrivals();
    } catch (error) {
      toast.error('Erreur lors du check-in');
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <LogIn className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Arrivees</h1>
            <p className="text-sm text-slate-500">
              {arrivals.length} arrivees prevues pour le {format(selectedDate, 'dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" data-testid="btn-date-picker-arrivals">
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

      {/* Arrivals List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full spinner" />
          </div>
        ) : arrivals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <LogIn className="w-12 h-12 mb-2 text-slate-300" />
            <p>Aucune arrivee prevue pour cette date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {arrivals.map((arrival) => (
              <div
                key={arrival.id}
                className="bg-white rounded-lg border border-slate-200 p-4"
                data-testid={`arrival-${arrival.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                      <User className="w-6 h-6 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{arrival.client_name}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Bed className="w-3.5 h-3.5" />
                          Chambre {arrival.room_number}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {arrival.nights} nuits
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-mono text-lg font-semibold text-slate-900">
                        {arrival.total_amount.toFixed(0)} EUR
                      </p>
                      <Badge variant={arrival.balance > 0 ? 'destructive' : 'secondary'}>
                        {arrival.balance > 0 ? `Solde: ${arrival.balance.toFixed(0)} EUR` : 'Paye'}
                      </Badge>
                    </div>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleCheckIn(arrival.id)}
                      data-testid={`btn-checkin-${arrival.id}`}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Check-in
                    </Button>
                  </div>
                </div>
                {arrival.special_requests && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-sm text-slate-600">
                      <strong>Demandes speciales:</strong> {arrival.special_requests}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
