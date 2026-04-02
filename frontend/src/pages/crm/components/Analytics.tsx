
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
  BarElement
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Analytics() {
  // Données pour le graphique d'évolution du taux de rétention
  const retentionData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
    datasets: [
      {
        label: 'Taux de rétention',
        data: [65, 67, 68, 70, 72, 71, 73, 74, 72, 71, 68, 68],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  // Données pour le graphique de répartition par canal
  const channelData = {
    labels: ['Email', 'WhatsApp', 'SMS', 'Téléphone'],
    datasets: [
      {
        data: [45, 30, 15, 10],
        backgroundColor: ['#3B82F6', '#7C3AED', '#F59E0B', '#8B5CF6'],
        borderWidth: 0
      }
    ]
  };

  // Données pour le top 5 des segments par CA
  const segmentData = {
    labels: ['VIP', 'Fidèles', 'Réguliers', 'Nouveaux', 'Affaires'],
    datasets: [
      {
        label: 'CA (€)',
        data: [45000, 38000, 32000, 18000, 25000],
        backgroundColor: '#7C3AED'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[20px] shadow-sm p-6">
        <h2 className="text-xl font-bold text-[#0F172A] mb-1">
          Analyse & Reporting
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          Mesurez l'efficacité de vos actions CRM
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Évolution du taux de rétention */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-bold text-[#0F172A] mb-4">
              Évolution du taux de rétention (12 mois)
            </h3>
            <div className="h-64">
              <Line data={retentionData} options={chartOptions} />
            </div>
          </div>

          {/* Répartition par canal */}
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-bold text-[#0F172A] mb-4">
              Répartition des communications par canal
            </h3>
            <div className="h-64">
              <Doughnut data={channelData} options={doughnutOptions} />
            </div>
          </div>

          {/* Top 5 segments par CA */}
          <div className="border border-slate-200 rounded-lg p-6 lg:col-span-2">
            <h3 className="font-bold text-[#0F172A] mb-4">
              Top 5 des segments par chiffre d'affaires
            </h3>
            <div className="h-64">
              <Bar data={segmentData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Métriques complémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <div className="text-sm text-slate-600 mb-2">Taux d'engagement global</div>
          <div className="text-3xl font-bold text-[#10B981] mb-2">64%</div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="bg-[#10B981] h-2 rounded-full" style={{ width: '64%' }}></div>
          </div>
        </div>

        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <div className="text-sm text-slate-600 mb-2">Temps de réponse moyen</div>
          <div className="text-3xl font-bold text-[#0F172A] mb-2">2h 15m</div>
          <div className="text-xs text-slate-500">-12% vs mois dernier</div>
        </div>

        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <div className="text-sm text-slate-600 mb-2">Satisfaction client (CSAT)</div>
          <div className="text-3xl font-bold text-[#10B981] mb-2">4.6/5</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className="text-[#F59E0B] text-lg">
                {star <= 4 ? '⭐' : '☆'}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
