import { useState, useEffect } from 'react';
import * as crmApi from '../services/crmApi';

interface KPICardsProps {
  language?: 'fr' | 'en';
}

export default function KPICards({ language = 'fr' }: KPICardsProps) {
  const [analytics, setAnalytics] = useState<crmApi.CRMAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    crmApi.getAnalytics()
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
  
  const labels = {
    fr: {
      totalClients: 'Clients totaux',
      retentionRate: 'Taux de rétention',
      npsScore: 'Score NPS',
      revenuePerClient: 'CA moyen par client',
      vsLastMonth: 'vs mois dernier',
      newThisMonth: 'nouveaux ce mois'
    },
    en: {
      totalClients: 'Total Clients',
      retentionRate: 'Retention Rate',
      npsScore: 'NPS Score',
      revenuePerClient: 'Avg Revenue per Client',
      vsLastMonth: 'vs last month',
      newThisMonth: 'new this month'
    }
  }[language];

  const kpis = analytics ? [
    {
      label: labels.totalClients,
      value: analytics.total_clients.toLocaleString(),
      change: `+${analytics.new_clients_month}`,
      subtitle: labels.newThisMonth,
      changeType: 'positive' as const,
      icon: '👥',
      gradient: 'from-purple-500 to-violet-600',
      bg: 'bg-purple-50',
    },
    {
      label: labels.retentionRate,
      value: `${analytics.retention_rate}%`,
      change: analytics.retention_rate >= 50 ? '+' : '-',
      subtitle: labels.vsLastMonth,
      changeType: analytics.retention_rate >= 50 ? 'positive' as const : 'negative' as const,
      icon: '🔄',
      gradient: 'from-purple-500 to-violet-600',
      bg: 'bg-purple-50',
    },
    {
      label: labels.npsScore,
      value: String(Math.round(analytics.average_nps)),
      change: analytics.average_nps >= 50 ? '+' : '',
      subtitle: labels.vsLastMonth,
      changeType: analytics.average_nps >= 50 ? 'positive' as const : 'neutral' as const,
      icon: '⭐',
      gradient: 'from-purple-500 to-violet-600',
      bg: 'bg-purple-50',
    },
    {
      label: labels.revenuePerClient,
      value: `${analytics.average_ltv.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€`,
      change: analytics.average_ltv > 0 ? '+' : '',
      subtitle: labels.vsLastMonth,
      changeType: analytics.average_ltv > 0 ? 'positive' as const : 'neutral' as const,
      icon: '💰',
      gradient: 'from-purple-500 to-violet-600',
      bg: 'bg-purple-50',
    }
  ] : [];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-[20px] p-6 shadow-sm border border-slate-100 animate-pulse">
            <div className="h-11 w-11 bg-slate-200 rounded-xl mb-4"></div>
            <div className="h-8 w-24 bg-slate-200 rounded mb-2"></div>
            <div className="h-4 w-20 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {kpis.map((kpi, index) => (
        <div key={index} className="bg-white rounded-[20px] p-6 shadow-sm hover:shadow-md transition-all border border-slate-100 group">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-11 h-11 rounded-xl ${kpi.bg} flex items-center justify-center text-xl group-hover:scale-110 transition-transform`}>
              {kpi.icon}
            </div>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
              kpi.changeType === 'positive'
                ? 'bg-[#D1FAE5] text-[#065F46]'
                : kpi.changeType === 'negative'
                ? 'bg-[#FEE2E2] text-[#991B1B]'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {kpi.changeType === 'positive' ? '▲' : kpi.changeType === 'negative' ? '▼' : '●'} {kpi.change}
            </span>
          </div>
          <div className="text-[32px] font-bold text-[#0F172A] mb-1 leading-none">
            {kpi.value}
          </div>
          <div className="text-sm text-slate-500 mt-1">{kpi.label}</div>
          <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${kpi.gradient} rounded-full`}
              style={{ width: kpi.changeType === 'positive' ? '70%' : kpi.changeType === 'negative' ? '40%' : '50%' }}>
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-1">{kpi.subtitle}</div>
        </div>
      ))}
    </div>
  );
}
