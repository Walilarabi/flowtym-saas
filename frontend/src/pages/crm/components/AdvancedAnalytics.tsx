import { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import * as crmApi from '../services/crmApi';
import type { AdvancedAnalyticsResponse, AttritionRisk, PeriodFilter } from '../services/crmApi';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AdvancedAnalyticsProps {
  language?: 'fr' | 'en';
}

export default function AdvancedAnalytics({ language = 'fr' }: AdvancedAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState<'6m' | '12m' | 'custom'>('6m');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [data, setData] = useState<AdvancedAnalyticsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'retention' | 'ltv' | 'attrition'>('overview');
  const [exportLoading, setExportLoading] = useState(false);

  const labels = {
    fr: {
      title: 'Analytique Avancée',
      subtitle: 'Analysez en profondeur la rétention, la valeur client et les risques d\'attrition',
      period: 'Période',
      last6months: '6 derniers mois',
      last12months: '12 derniers mois',
      custom: 'Personnalisé',
      apply: 'Appliquer',
      overview: 'Vue d\'ensemble',
      retention: 'Rétention',
      ltv: 'Valeur Client (LTV)',
      attrition: 'Prédictions Attrition',
      exportPdf: 'Export PDF',
      exportExcel: 'Export Excel',
      totalClients: 'Clients totaux',
      activeClients: 'Clients actifs',
      highRisk: 'Clients à risque',
      avgLtv: 'LTV moyen',
      totalRevenue: 'CA total',
      retentionRate: 'Taux rétention',
      retentionCohorts: 'Cohortes de rétention',
      cohortMonth: 'Cohorte',
      initialClients: 'Clients initiaux',
      retention30d: '30 jours',
      retention60d: '60 jours',
      retention90d: '90 jours',
      retention180d: '180 jours',
      ltvBySegment: 'LTV par segment',
      topClientsByLtv: 'Top 10 clients par LTV',
      ltvTrend: 'Évolution LTV',
      attritionRisks: 'Clients à risque d\'attrition',
      riskScore: 'Score risque',
      daysSince: 'Jours sans séjour',
      riskFactors: 'Facteurs de risque',
      aiAnalysis: 'Analyse IA',
      recommendations: 'Actions recommandées',
      critical: 'Critique',
      high: 'Élevé',
      medium: 'Moyen',
      low: 'Faible',
      noData: 'Aucune donnée disponible',
      from: 'Du',
      to: 'Au'
    },
    en: {
      title: 'Advanced Analytics',
      subtitle: 'Deep analysis of retention, customer value, and attrition risks',
      period: 'Period',
      last6months: 'Last 6 months',
      last12months: 'Last 12 months',
      custom: 'Custom',
      apply: 'Apply',
      overview: 'Overview',
      retention: 'Retention',
      ltv: 'Customer Value (LTV)',
      attrition: 'Attrition Predictions',
      exportPdf: 'Export PDF',
      exportExcel: 'Export Excel',
      totalClients: 'Total Clients',
      activeClients: 'Active Clients',
      highRisk: 'At-Risk Clients',
      avgLtv: 'Average LTV',
      totalRevenue: 'Total Revenue',
      retentionRate: 'Retention Rate',
      retentionCohorts: 'Retention Cohorts',
      cohortMonth: 'Cohort',
      initialClients: 'Initial Clients',
      retention30d: '30 days',
      retention60d: '60 days',
      retention90d: '90 days',
      retention180d: '180 days',
      ltvBySegment: 'LTV by Segment',
      topClientsByLtv: 'Top 10 Clients by LTV',
      ltvTrend: 'LTV Trend',
      attritionRisks: 'Attrition Risk Clients',
      riskScore: 'Risk Score',
      daysSince: 'Days Since Stay',
      riskFactors: 'Risk Factors',
      aiAnalysis: 'AI Analysis',
      recommendations: 'Recommended Actions',
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      noData: 'No data available',
      from: 'From',
      to: 'To'
    }
  }[language];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const period: PeriodFilter = periodType === 'custom' && customStartDate && customEndDate
        ? { type: 'custom', start_date: customStartDate, end_date: customEndDate }
        : { type: periodType };
      
      const result = await crmApi.getAdvancedAnalytics(period);
      setData(result);
    } catch (error) {
      console.error('Error loading advanced analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [periodType, customStartDate, customEndDate]);

  useEffect(() => {
    if (periodType !== 'custom') {
      loadData();
    }
  }, [periodType, loadData]);

  const handleApplyCustomPeriod = () => {
    if (customStartDate && customEndDate) {
      loadData();
    }
  };

  const handleExportPDF = () => {
    setExportLoading(true);
    setTimeout(() => {
      window.print();
      setExportLoading(false);
    }, 500);
  };

  const handleExportExcel = () => {
    if (!data) return;
    
    setExportLoading(true);
    
    // Create CSV content
    let csv = 'Analytique CRM Avancée\n\n';
    
    // KPIs
    csv += 'KPIs Summary\n';
    csv += `${labels.totalClients},${data.summary_kpis.total_clients}\n`;
    csv += `${labels.activeClients},${data.summary_kpis.active_clients}\n`;
    csv += `${labels.highRisk},${data.summary_kpis.high_risk_clients}\n`;
    csv += `${labels.avgLtv},${data.summary_kpis.average_ltv}€\n`;
    csv += `${labels.totalRevenue},${data.summary_kpis.total_revenue}€\n`;
    csv += '\n';
    
    // Retention cohorts
    csv += `${labels.retentionCohorts}\n`;
    csv += `${labels.cohortMonth},${labels.initialClients},${labels.retention30d},${labels.retention60d},${labels.retention90d},${labels.retention180d}\n`;
    data.retention_cohorts.forEach(c => {
      csv += `${c.cohort_month},${c.initial_clients},${c.retention_30d}%,${c.retention_60d}%,${c.retention_90d}%,${c.retention_180d}%\n`;
    });
    csv += '\n';
    
    // LTV by segment
    csv += `${labels.ltvBySegment}\n`;
    csv += 'Segment,LTV Moyen,CA Total,Nombre Clients\n';
    data.ltv_by_segment.forEach(s => {
      csv += `${s.segment},${s.avg_ltv}€,${s.total_revenue}€,${s.client_count}\n`;
    });
    csv += '\n';
    
    // Attrition risks
    csv += `${labels.attritionRisks}\n`;
    csv += 'Client,Email,Score Risque,Niveau,Jours Sans Séjour,Facteurs\n';
    data.attrition_risks.forEach(r => {
      csv += `${r.client_name},${r.email},${r.risk_score},${r.risk_level},${r.days_since_last_stay},"${r.risk_factors.join('; ')}"\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crm_analytics_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    setExportLoading(false);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'critical': return labels.critical;
      case 'high': return labels.high;
      case 'medium': return labels.medium;
      default: return labels.low;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-[20px] shadow-sm p-8 text-center">
        <div className="text-slate-500">{labels.noData}</div>
      </div>
    );
  }

  // Chart data
  const retentionChartData = {
    labels: data.retention_cohorts.map(c => c.cohort_month),
    datasets: [
      {
        label: labels.retention30d,
        data: data.retention_cohorts.map(c => c.retention_30d),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: false
      },
      {
        label: labels.retention90d,
        data: data.retention_cohorts.map(c => c.retention_90d),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: false
      },
      {
        label: labels.retention180d,
        data: data.retention_cohorts.map(c => c.retention_180d),
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        fill: false
      }
    ]
  };

  const ltvSegmentData = {
    labels: data.ltv_by_segment.map(s => s.segment.charAt(0).toUpperCase() + s.segment.slice(1)),
    datasets: [
      {
        label: 'LTV Moyen (€)',
        data: data.ltv_by_segment.map(s => s.avg_ltv),
        backgroundColor: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444']
      }
    ]
  };

  const ltvTrendData = {
    labels: data.ltv_trend.map(t => t.month),
    datasets: [
      {
        label: 'LTV Moyen (€)',
        data: data.ltv_trend.map(t => t.avg_ltv),
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="bg-white rounded-[20px] shadow-sm p-6 print:shadow-none print:border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A] mb-1">{labels.title}</h2>
            <p className="text-sm text-slate-600">{labels.subtitle}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            {/* Period Selector */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setPeriodType('6m')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  periodType === '6m' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {labels.last6months}
              </button>
              <button
                onClick={() => setPeriodType('12m')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  periodType === '12m' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {labels.last12months}
              </button>
              <button
                onClick={() => setPeriodType('custom')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  periodType === 'custom' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {labels.custom}
              </button>
            </div>
            
            {/* Custom date inputs */}
            {periodType === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                />
                <button
                  onClick={handleApplyCustomPeriod}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
                >
                  {labels.apply}
                </button>
              </div>
            )}
            
            {/* Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                disabled={exportLoading}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                {labels.exportPdf}
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exportLoading}
                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
              >
                {labels.exportExcel}
              </button>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-1 mt-6 bg-slate-100 rounded-lg p-1 print:hidden">
          {(['overview', 'retention', 'ltv', 'attrition'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {labels[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="text-sm text-slate-500 mb-1">{labels.totalClients}</div>
          <div className="text-2xl font-bold text-[#0F172A]">{data.summary_kpis.total_clients}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="text-sm text-slate-500 mb-1">{labels.activeClients}</div>
          <div className="text-2xl font-bold text-green-600">{data.summary_kpis.active_clients}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="text-sm text-slate-500 mb-1">{labels.highRisk}</div>
          <div className="text-2xl font-bold text-red-600">{data.summary_kpis.high_risk_clients}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="text-sm text-slate-500 mb-1">{labels.avgLtv}</div>
          <div className="text-2xl font-bold text-purple-600">{data.summary_kpis.average_ltv.toLocaleString()}€</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="text-sm text-slate-500 mb-1">{labels.totalRevenue}</div>
          <div className="text-2xl font-bold text-[#0F172A]">{data.summary_kpis.total_revenue.toLocaleString()}€</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="text-sm text-slate-500 mb-1">{labels.retentionRate}</div>
          <div className="text-2xl font-bold text-blue-600">{data.summary_kpis.retention_rate_avg}%</div>
        </div>
      </div>

      {/* Tab Content */}
      {(activeTab === 'overview' || activeTab === 'retention') && (
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#0F172A] mb-4">{labels.retentionCohorts}</h3>
          
          {data.retention_cohorts.length > 0 ? (
            <>
              <div className="h-72 mb-6">
                <Line data={retentionChartData} options={chartOptions} />
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">{labels.cohortMonth}</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">{labels.initialClients}</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">{labels.retention30d}</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">{labels.retention60d}</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">{labels.retention90d}</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">{labels.retention180d}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.retention_cohorts.map((cohort, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{cohort.cohort_month}</td>
                        <td className="px-4 py-3 text-center">{cohort.initial_clients}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            cohort.retention_30d >= 30 ? 'bg-green-100 text-green-800' : 
                            cohort.retention_30d >= 15 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {cohort.retention_30d}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            cohort.retention_60d >= 25 ? 'bg-green-100 text-green-800' : 
                            cohort.retention_60d >= 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {cohort.retention_60d}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            cohort.retention_90d >= 20 ? 'bg-green-100 text-green-800' : 
                            cohort.retention_90d >= 8 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {cohort.retention_90d}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            cohort.retention_180d >= 15 ? 'bg-green-100 text-green-800' : 
                            cohort.retention_180d >= 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {cohort.retention_180d}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-500">{labels.noData}</div>
          )}
        </div>
      )}

      {(activeTab === 'overview' || activeTab === 'ltv') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LTV by Segment */}
          <div className="bg-white rounded-[20px] shadow-sm p-6">
            <h3 className="text-lg font-bold text-[#0F172A] mb-4">{labels.ltvBySegment}</h3>
            {data.ltv_by_segment.length > 0 ? (
              <div className="h-64">
                <Bar data={ltvSegmentData} options={{ ...chartOptions, plugins: { legend: { display: false } } }} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">{labels.noData}</div>
            )}
          </div>
          
          {/* LTV Trend */}
          <div className="bg-white rounded-[20px] shadow-sm p-6">
            <h3 className="text-lg font-bold text-[#0F172A] mb-4">{labels.ltvTrend}</h3>
            {data.ltv_trend.length > 0 ? (
              <div className="h-64">
                <Line data={ltvTrendData} options={{ ...chartOptions, plugins: { legend: { display: false } } }} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">{labels.noData}</div>
            )}
          </div>
        </div>
      )}

      {(activeTab === 'overview' || activeTab === 'ltv') && data.top_clients_by_ltv.length > 0 && (
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#0F172A] mb-4">{labels.topClientsByLtv}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Client</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Type</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Séjours</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">CA Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.top_clients_by_ltv.map((client, idx) => (
                  <tr key={client.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-purple-600">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">{client.name}</td>
                    <td className="px-4 py-3 text-slate-600">{client.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        client.client_type === 'vip' ? 'bg-purple-100 text-purple-800' :
                        client.client_type === 'business' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {client.client_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{client.total_stays}</td>
                    <td className="px-4 py-3 text-right font-semibold">{client.total_spent.toLocaleString()}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(activeTab === 'overview' || activeTab === 'attrition') && (
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#0F172A]">{labels.attritionRisks}</h3>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                {labels.critical}: {data.attrition_risks.filter(r => r.risk_level === 'critical').length}
              </span>
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                {labels.high}: {data.attrition_risks.filter(r => r.risk_level === 'high').length}
              </span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                {labels.medium}: {data.attrition_risks.filter(r => r.risk_level === 'medium').length}
              </span>
            </div>
          </div>
          
          {data.attrition_risks.length > 0 ? (
            <div className="space-y-4">
              {data.attrition_risks.map((risk) => (
                <div key={risk.client_id} className={`border rounded-xl p-4 ${getRiskColor(risk.risk_level)}`}>
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="font-bold text-lg">{risk.client_name}</div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getRiskColor(risk.risk_level)}`}>
                          {getRiskLabel(risk.risk_level)} ({risk.risk_score}/100)
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 mb-3">{risk.email}</div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-slate-500">{labels.daysSince}</div>
                          <div className="font-semibold">{risk.days_since_last_stay} jours</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Séjours</div>
                          <div className="font-semibold">{risk.total_stays}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">CA Total</div>
                          <div className="font-semibold">{risk.total_spent.toLocaleString()}€</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">{labels.riskScore}</div>
                          <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                            <div 
                              className={`h-2 rounded-full ${
                                risk.risk_score >= 70 ? 'bg-red-500' :
                                risk.risk_score >= 50 ? 'bg-orange-500' :
                                risk.risk_score >= 30 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${risk.risk_score}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-slate-700 mb-1">{labels.riskFactors}</div>
                        <div className="flex flex-wrap gap-1">
                          {risk.risk_factors.map((factor, idx) => (
                            <span key={idx} className="px-2 py-1 bg-white/50 rounded text-xs">
                              {factor}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {risk.ai_analysis && (
                        <div className="mb-3 p-3 bg-white/50 rounded-lg">
                          <div className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                            <span>🧠</span> {labels.aiAnalysis}
                          </div>
                          <div className="text-sm">{risk.ai_analysis}</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="lg:w-72">
                      <div className="text-xs font-semibold text-slate-700 mb-2">{labels.recommendations}</div>
                      <div className="space-y-2">
                        {risk.recommended_actions.map((action, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-purple-600 mt-0.5">→</span>
                            <span>{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">{labels.noData}</div>
          )}
        </div>
      )}
    </div>
  );
}
