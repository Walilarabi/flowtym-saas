import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useHotel } from '@/context/HotelContext';
import { format, addDays, startOfDay, differenceInDays, parseISO, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  TrendingUp,
  Users,
  DollarSign,
  Bed,
  LogIn,
  LogOut,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { ReservationForm } from '@/components/reservations/ReservationForm';
import { ReservationDetail } from '@/components/reservations/ReservationDetail';

const CHANNEL_COLORS = {
  direct: { bg: 'bg-emerald-500', text: 'text-white', label: 'Direct' },
  booking_com: { bg: 'bg-[#003580]', text: 'text-white', label: 'Booking' },
  expedia: { bg: 'bg-[#FFB300]', text: 'text-slate-900', label: 'Expedia' },
  airbnb: { bg: 'bg-[#FF5A5F]', text: 'text-white', label: 'Airbnb' },
  other: { bg: 'bg-slate-500', text: 'text-white', label: 'Autre' },
};

const ROOM_TYPE_LABELS = {
  single: 'Simple',
  double: 'Double',
  twin: 'Twin',
  suite: 'Suite',
  family: 'Familiale',
};

export const PlanningPage = () => {
  const { api } = useAuth();
  const { currentHotel, rooms } = useHotel();
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [reservations, setReservations] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showKpis, setShowKpis] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showNewReservation, setShowNewReservation] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const daysToShow = 30;
  const dates = useMemo(() => 
    Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i)),
    [startDate]
  );

  const fetchPlanningData = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const fromDate = format(startDate, 'yyyy-MM-dd');
      const toDate = format(addDays(startDate, daysToShow - 1), 'yyyy-MM-dd');
      
      const [planningRes, dashboardRes] = await Promise.all([
        api.get(`/hotels/${currentHotel.id}/planning?from_date=${fromDate}&to_date=${toDate}`),
        api.get(`/hotels/${currentHotel.id}/dashboard`),
      ]);
      
      setReservations(planningRes.data.reservations);
      setDailyStats(planningRes.data.daily_stats);
      setDashboard(dashboardRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des donnees');
    } finally {
      setLoading(false);
    }
  }, [api, currentHotel, startDate]);

  useEffect(() => {
    fetchPlanningData();
  }, [fetchPlanningData]);

  const getReservationsForRoom = (roomId) => {
    return reservations.filter(r => r.room_id === roomId);
  };

  const getReservationPosition = (reservation, roomIndex) => {
    const checkIn = parseISO(reservation.check_in.split('T')[0]);
    const checkOut = parseISO(reservation.check_out.split('T')[0]);
    
    const startOffset = differenceInDays(checkIn, startDate);
    const endOffset = differenceInDays(checkOut, startDate);
    
    // Clip to visible range
    const visibleStart = Math.max(0, startOffset);
    const visibleEnd = Math.min(daysToShow, endOffset);
    
    if (visibleStart >= daysToShow || visibleEnd <= 0) return null;
    
    const cellWidth = 100 / daysToShow;
    const left = visibleStart * cellWidth;
    const width = (visibleEnd - visibleStart) * cellWidth;
    
    return { left: `${left}%`, width: `${width}%` };
  };

  const handleReservationClick = (reservation) => {
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
    fetchPlanningData();
  };

  const getDayStats = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return dailyStats.find(s => s.date === dateStr) || { available: 0, occupancy_rate: 0, adr: 0 };
  };

  const navigatePrev = () => setStartDate(addDays(startDate, -7));
  const navigateNext = () => setStartDate(addDays(startDate, 7));
  const navigateToday = () => setStartDate(startOfDay(new Date()));

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Premium KPI Cards */}
      {showKpis && dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" data-testid="kpis-row">
          <div className="bg-white rounded-xl p-5 relative overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6' }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)' }} />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F5F4FE' }}>
                <TrendingUp className="w-4 h-4" style={{ color: '#6C5CE7' }} />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6B7280' }}>Occupation</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#1F2937', letterSpacing: '-0.02em' }}>{dashboard.occupancy_rate}%</p>
          </div>
          <div className="bg-white rounded-xl p-5 relative overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6' }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: '#22C55E' }} />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#DCFCE7' }}>
                <DollarSign className="w-4 h-4" style={{ color: '#22C55E' }} />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6B7280' }}>ADR</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#1F2937', letterSpacing: '-0.02em' }}>{dashboard.adr.toFixed(0)}€</p>
          </div>
          <div className="bg-white rounded-xl p-5 relative overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6' }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: '#3B82F6' }} />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#DBEAFE' }}>
                <TrendingUp className="w-4 h-4" style={{ color: '#3B82F6' }} />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6B7280' }}>RevPAR</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#1F2937', letterSpacing: '-0.02em' }}>{dashboard.revpar.toFixed(0)}€</p>
          </div>
          <div className="bg-white rounded-xl p-5 relative overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6' }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: '#F59E0B' }} />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#FEF3C7' }}>
                <Bed className="w-4 h-4" style={{ color: '#F59E0B' }} />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6B7280' }}>Chambres dispo</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#1F2937', letterSpacing: '-0.02em' }}>{dashboard.available_rooms}<span style={{ color: '#9CA3AF', fontSize: '18px' }}>/{dashboard.total_rooms}</span></p>
          </div>
          <div className="bg-white rounded-xl p-5 relative overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6' }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: '#22C55E' }} />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#DCFCE7' }}>
                <LogIn className="w-4 h-4" style={{ color: '#22C55E' }} />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6B7280' }}>Arrivées</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#22C55E', letterSpacing: '-0.02em' }}>{dashboard.arrivals}</p>
          </div>
          <div className="bg-white rounded-xl p-5 relative overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6' }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: '#EF4444' }} />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#FEE2E2' }}>
                <LogOut className="w-4 h-4" style={{ color: '#EF4444' }} />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6B7280' }}>Départs</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#EF4444', letterSpacing: '-0.02em' }}>{dashboard.departures}</p>
          </div>
        </div>
      )}

      {/* Planning Controls */}
      <div className="flex items-center justify-between gap-4 bg-white rounded-lg border border-slate-200 p-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={navigatePrev} data-testid="btn-prev-week">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" data-testid="btn-date-picker">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {format(startDate, 'dd MMM yyyy', { locale: fr })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(startOfDay(date))}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={navigateNext} data-testid="btn-next-week">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={navigateToday} data-testid="btn-today">
            Aujourd'hui
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowKpis(!showKpis)}
            data-testid="btn-toggle-kpis"
          >
            {showKpis ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            KPIs
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            data-testid="btn-toggle-stats"
          >
            {showStats ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            Stats
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchPlanningData}
            data-testid="btn-refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'spinner' : ''}`} />
          </Button>
          <Button
            size="sm"
            className="bg-violet-600 hover:bg-violet-700"
            onClick={handleNewReservation}
            data-testid="btn-new-reservation"
          >
            <Plus className="w-4 h-4 mr-1" />
            Reservation
          </Button>
        </div>
      </div>

      {/* Planning Grid */}
      <div className="flex-1 bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col min-h-0">
        {/* Header with dates */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
          {/* Room column header */}
          <div className="w-32 shrink-0 p-2 border-r border-slate-200 font-medium text-xs text-slate-600">
            Chambre
          </div>
          {/* Date headers */}
          <div className="flex-1 flex">
            {dates.map((date, i) => {
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div
                  key={i}
                  className={`flex-1 min-w-[40px] p-1 border-r border-slate-200 text-center last:border-r-0
                    ${isToday ? 'bg-violet-100' : isWeekend ? 'bg-slate-100' : ''}`}
                  data-testid={`date-header-${format(date, 'yyyy-MM-dd')}`}
                >
                  <div className="text-[10px] text-slate-500 uppercase">
                    {format(date, 'EEE', { locale: fr })}
                  </div>
                  <div className={`text-sm font-semibold ${isToday ? 'text-violet-700' : 'text-slate-900'}`}>
                    {format(date, 'd')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats row */}
        {showStats && (
          <div className="flex border-b border-slate-200 bg-slate-50/50 shrink-0">
            <div className="w-32 shrink-0 p-2 border-r border-slate-200 text-xs text-slate-500">
              Dispo / TO%
            </div>
            <div className="flex-1 flex">
              {dates.map((date, i) => {
                const stats = getDayStats(date);
                return (
                  <div
                    key={i}
                    className="flex-1 min-w-[40px] p-1 border-r border-slate-200 text-center last:border-r-0"
                  >
                    <div className="text-xs font-medium text-slate-700">{stats.available}</div>
                    <div className="text-[10px] text-slate-500">{stats.occupancy_rate}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Room rows */}
        <div className="flex-1 overflow-y-auto">
          {rooms.map((room, roomIndex) => (
            <div
              key={room.id}
              className="flex border-b border-slate-100 hover:bg-slate-50/50 relative"
              style={{ minHeight: '44px' }}
              data-testid={`room-row-${room.number}`}
            >
              {/* Room info */}
              <div className="w-32 shrink-0 p-2 border-r border-slate-200 flex flex-col justify-center">
                <span className="font-semibold text-sm text-slate-900">{room.number}</span>
                <span className="text-[10px] text-slate-500">
                  {ROOM_TYPE_LABELS[room.room_type]} - Et.{room.floor}
                </span>
              </div>
              
              {/* Grid cells */}
              <div className="flex-1 relative">
                <div className="absolute inset-0 flex">
                  {dates.map((date, i) => {
                    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                    return (
                      <div
                        key={i}
                        className={`flex-1 min-w-[40px] border-r border-slate-100 last:border-r-0
                          ${isToday ? 'bg-violet-50/50' : ''}`}
                        data-testid={`cell-${room.number}-${format(date, 'yyyy-MM-dd')}`}
                      />
                    );
                  })}
                </div>
                
                {/* Reservation bars */}
                {getReservationsForRoom(room.id).map((reservation) => {
                  const position = getReservationPosition(reservation, roomIndex);
                  if (!position) return null;
                  
                  const channel = CHANNEL_COLORS[reservation.channel] || CHANNEL_COLORS.other;
                  
                  return (
                    <div
                      key={reservation.id}
                      className={`reservation-bar ${channel.bg} ${channel.text}`}
                      style={{
                        left: position.left,
                        width: position.width,
                        top: '6px',
                      }}
                      onClick={() => handleReservationClick(reservation)}
                      data-testid={`reservation-${reservation.id}`}
                    >
                      <span className="truncate text-xs">
                        {reservation.client_name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          {rooms.length === 0 && (
            <div className="flex items-center justify-center h-40 text-slate-500">
              Aucune chambre configuree
            </div>
          )}
        </div>
      </div>

      {/* Channel legend */}
      <div className="flex items-center gap-4 text-xs">
        {Object.entries(CHANNEL_COLORS).map(([key, value]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${value.bg}`} />
            <span className="text-slate-600">{value.label}</span>
          </div>
        ))}
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
