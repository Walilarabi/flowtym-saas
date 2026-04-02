import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useHotel } from '@/context/HotelContext';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  BarChart3,
  Calendar as CalendarIcon,
  TrendingUp,
  DollarSign,
  Users,
  Download,
  PieChart,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const CHANNEL_COLORS = {
  direct: '#16a34a',
  booking_com: '#003580',
  expedia: '#FFB300',
  airbnb: '#FF5A5F',
  other: '#64748b',
};

export const ReportsPage = () => {
  const { api } = useAuth();
  const { currentHotel } = useHotel();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [occupancyData, setOccupancyData] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  const [paymentsData, setPaymentsData] = useState(null);

  const fetchReports = async () => {
    if (!currentHotel) return;
    setLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');
      
      const [occRes, revRes, payRes] = await Promise.all([
        api.get(`/hotels/${currentHotel.id}/reports/occupancy?from_date=${fromDate}&to_date=${toDate}`),
        api.get(`/hotels/${currentHotel.id}/reports/revenue?from_date=${fromDate}&to_date=${toDate}`),
        api.get(`/hotels/${currentHotel.id}/reports/payments?from_date=${fromDate}&to_date=${toDate}`),
      ]);
      
      setOccupancyData(occRes.data.data.map(d => ({
        ...d,
        date: format(new Date(d.date), 'dd/MM'),
      })));
      setRevenueData(revRes.data);
      setPaymentsData(payRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des rapports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [currentHotel, dateRange]);

  const handleExport = (type) => {
    toast.success(`Export ${type} en cours...`);
    // Export logic would go here
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Rapports</h1>
            <p className="text-sm text-slate-500">
              Du {format(dateRange.from, 'dd MMM', { locale: fr })} au {format(dateRange.to, 'dd MMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" data-testid="btn-date-range">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Periode
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => range && setDateRange(range)}
                locale={fr}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={() => handleExport('pdf')} data-testid="btn-export-pdf">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')} data-testid="btn-export-excel">
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full spinner" />
        </div>
      ) : (
        <Tabs defaultValue="performance" className="flex-1">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="payments">Paiements</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="mt-4 space-y-4">
            {/* Summary KPIs */}
            <div className="grid grid-cols-4 gap-4">
              <div className="kpi-card">
                <p className="text-xs text-slate-500 mb-1">Occupation moyenne</p>
                <p className="text-2xl font-bold">
                  {occupancyData.length > 0 
                    ? (occupancyData.reduce((a, b) => a + b.occupancy_rate, 0) / occupancyData.length).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="kpi-card">
                <p className="text-xs text-slate-500 mb-1">Revenue total</p>
                <p className="text-2xl font-bold">{revenueData?.total_revenue?.toFixed(0) || 0} EUR</p>
              </div>
              <div className="kpi-card">
                <p className="text-xs text-slate-500 mb-1">Reservations</p>
                <p className="text-2xl font-bold">{revenueData?.total_reservations || 0}</p>
              </div>
              <div className="kpi-card">
                <p className="text-xs text-slate-500 mb-1">Encaissements</p>
                <p className="text-2xl font-bold">{paymentsData?.total?.toFixed(0) || 0} EUR</p>
              </div>
            </div>

            {/* Occupancy Chart */}
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Taux d'occupation quotidien</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={occupancyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="occupancy_rate"
                      stroke="#7c3aed"
                      fill="#7c3aed"
                      fillOpacity={0.2}
                      name="Occupation %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="mt-4 space-y-4">
            {/* Revenue by Channel */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 mb-4">Revenue par canal</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={revenueData?.by_channel || []}
                        dataKey="revenue"
                        nameKey="channel"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ channel, revenue }) => `${channel}: ${revenue.toFixed(0)}EUR`}
                      >
                        {(revenueData?.by_channel || []).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CHANNEL_COLORS[entry.channel] || CHANNEL_COLORS.other} 
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 mb-4">Reservations par canal</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData?.by_channel || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} stroke="#64748b" />
                      <YAxis type="category" dataKey="channel" tick={{ fontSize: 12 }} stroke="#64748b" width={80} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Channel breakdown table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-slate-600">Canal</th>
                    <th className="text-right p-3 text-xs font-semibold text-slate-600">Reservations</th>
                    <th className="text-right p-3 text-xs font-semibold text-slate-600">Revenue</th>
                    <th className="text-right p-3 text-xs font-semibold text-slate-600">% du total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(revenueData?.by_channel || []).map((channel) => (
                    <tr key={channel.channel}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: CHANNEL_COLORS[channel.channel] || CHANNEL_COLORS.other }}
                          />
                          <span className="font-medium capitalize">{channel.channel.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono">{channel.count}</td>
                      <td className="p-3 text-right font-mono">{channel.revenue.toFixed(2)} EUR</td>
                      <td className="p-3 text-right font-mono">
                        {revenueData?.total_revenue > 0 
                          ? ((channel.revenue / revenueData.total_revenue) * 100).toFixed(1)
                          : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="mt-4 space-y-4">
            {/* Payments by method */}
            <div className="grid grid-cols-4 gap-4">
              {(paymentsData?.by_method || []).map((method) => (
                <div key={method.method} className="kpi-card">
                  <p className="text-xs text-slate-500 mb-1 capitalize">{method.method}</p>
                  <p className="text-2xl font-bold">{method.total.toFixed(0)} EUR</p>
                  <p className="text-xs text-slate-400">{method.count} transactions</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Repartition des paiements</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentsData?.by_method || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="method" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                    <Tooltip />
                    <Bar dataKey="total" fill="#16a34a" radius={[4, 4, 0, 0]} name="Montant EUR" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
