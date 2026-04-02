import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useHotel } from '@/context/HotelContext';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Moon,
  Calendar as CalendarIcon,
  Check,
  AlertCircle,
  TrendingUp,
  Users,
  LogIn,
  LogOut,
  DollarSign,
  Bed,
  FileText,
  Lock,
} from 'lucide-react';

export const NightAuditPage = () => {
  const { api } = useAuth();
  const { currentHotel } = useHotel();
  const [selectedDate, setSelectedDate] = useState(subDays(new Date(), 1));
  const [auditData, setAuditData] = useState(null);
  const [existingAudit, setExistingAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(1);

  const fetchAuditData = async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Check if audit exists for this date
      try {
        const auditRes = await api.get(`/hotels/${currentHotel.id}/night-audit/${dateStr}`);
        setExistingAudit(auditRes.data);
      } catch (error) {
        if (error.response?.status === 404) {
          setExistingAudit(null);
        }
      }
      
      // Get dashboard data for the date
      const dashboardRes = await api.get(`/hotels/${currentHotel.id}/dashboard`);
      setAuditData(dashboardRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des donnees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [currentHotel, selectedDate]);

  const handleRunAudit = async () => {
    setProcessing(true);
    try {
      // Simulate steps
      setStep(1);
      await new Promise(r => setTimeout(r, 800));
      setStep(2);
      await new Promise(r => setTimeout(r, 800));
      setStep(3);
      await new Promise(r => setTimeout(r, 800));
      
      // Create the audit
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await api.post(`/hotels/${currentHotel.id}/night-audit`, {
        date: dateStr,
        notes: '',
      });
      
      setExistingAudit(response.data);
      setStep(4);
      toast.success('Cloture effectuee avec succes');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la cloture');
    } finally {
      setProcessing(false);
    }
  };

  const steps = [
    { id: 1, label: 'Verification des reservations', icon: FileText },
    { id: 2, label: 'Calcul des statistiques', icon: TrendingUp },
    { id: 3, label: 'Validation des paiements', icon: DollarSign },
    { id: 4, label: 'Cloture terminee', icon: Check },
  ];

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Moon className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cloture (Night Audit)</h1>
            <p className="text-sm text-slate-500">
              Cloture du {format(selectedDate, 'dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" data-testid="btn-date-picker-audit">
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
              disabled={(date) => date > subDays(new Date(), 1)}
            />
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full spinner" />
        </div>
      ) : existingAudit ? (
        // Audit completed view
        <div className="flex-1 bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Cloture effectuee</h2>
              <p className="text-sm text-slate-500">
                Le {format(selectedDate, 'dd/MM/yyyy')} a ete cloture
                {existingAudit.completed_at && ` le ${format(new Date(existingAudit.completed_at), 'dd/MM/yyyy a HH:mm', { locale: fr })}`}
              </p>
            </div>
          </div>

          {/* Audit Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="kpi-card">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Occupation</span>
              </div>
              <p className="text-2xl font-bold">{existingAudit.occupancy_rate}%</p>
            </div>
            <div className="kpi-card">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-medium">Revenue</span>
              </div>
              <p className="text-2xl font-bold">{existingAudit.revenue.toFixed(0)} EUR</p>
            </div>
            <div className="kpi-card">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Bed className="w-4 h-4" />
                <span className="text-xs font-medium">ADR</span>
              </div>
              <p className="text-2xl font-bold">{existingAudit.adr.toFixed(0)} EUR</p>
            </div>
            <div className="kpi-card">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">RevPAR</span>
              </div>
              <p className="text-2xl font-bold">{existingAudit.revpar.toFixed(0)} EUR</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Chambres occupees</p>
              <p className="text-xl font-semibold">{existingAudit.occupied_rooms} / {existingAudit.total_rooms}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg">
              <p className="text-sm text-emerald-700">Arrivees</p>
              <p className="text-xl font-semibold text-emerald-700">{existingAudit.arrivals}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-700">Departs</p>
              <p className="text-xl font-semibold text-amber-700">{existingAudit.departures}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">No-shows</p>
              <p className="text-xl font-semibold text-red-700">{existingAudit.no_shows}</p>
            </div>
          </div>
        </div>
      ) : (
        // Run audit view
        <div className="flex-1 flex flex-col gap-6">
          {/* Preview KPIs */}
          {auditData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="kpi-card">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium">Occupation prevue</span>
                </div>
                <p className="text-2xl font-bold">{auditData.occupancy_rate}%</p>
              </div>
              <div className="kpi-card">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium">Revenue prevu</span>
                </div>
                <p className="text-2xl font-bold">{auditData.revenue?.toFixed(0) || 0} EUR</p>
              </div>
              <div className="kpi-card">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <LogIn className="w-4 h-4" />
                  <span className="text-xs font-medium">Arrivees</span>
                </div>
                <p className="text-2xl font-bold">{auditData.arrivals}</p>
              </div>
              <div className="kpi-card">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <LogOut className="w-4 h-4" />
                  <span className="text-xs font-medium">Departs</span>
                </div>
                <p className="text-2xl font-bold">{auditData.departures}</p>
              </div>
            </div>
          )}

          {/* Workflow Steps */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-6">Workflow de cloture</h2>
            
            <div className="space-y-4 mb-8">
              {steps.map((s, index) => {
                const Icon = s.icon;
                const isActive = processing && step === s.id;
                const isComplete = processing ? step > s.id : false;
                
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                      isComplete ? 'bg-emerald-50' : isActive ? 'bg-violet-50' : 'bg-slate-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isComplete ? 'bg-emerald-500' : isActive ? 'bg-violet-500' : 'bg-slate-200'
                    }`}>
                      {isComplete ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : isActive ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spinner" />
                      ) : (
                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${
                        isComplete ? 'text-emerald-700' : isActive ? 'text-violet-700' : 'text-slate-600'
                      }`}>
                        {s.label}
                      </p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-8 h-0.5 ${isComplete ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              size="lg"
              onClick={handleRunAudit}
              disabled={processing}
              data-testid="btn-run-audit"
            >
              {processing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spinner mr-2" />
                  Cloture en cours...
                </>
              ) : (
                <>
                  <Moon className="w-5 h-5 mr-2" />
                  Lancer la cloture
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
