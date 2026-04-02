import { useState } from 'react';
import { Segment } from '../data/mockData';

interface SegmentationProps {
  segments: Segment[];
}

export default function Segmentation({ segments }: SegmentationProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[20px] shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#0F172A]">
            Segmentation client
          </h2>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors font-medium text-sm"
          >
            + Créer un segment
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((segment) => (
            <div
              key={segment.id}
              className="border-2 rounded-[20px] p-6 hover:shadow-md transition-shadow cursor-pointer"
              style={{ borderColor: segment.color }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: segment.color }}
                >
                  {segment.count}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[#0F172A] text-lg">
                    {segment.name}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                {segment.description}
              </p>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors">
                  Voir clients
                </button>
                <button className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors">
                  Campagne
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Create Segment */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] p-8 max-w-lg w-full mx-4">
            <h3 className="text-2xl font-bold text-[#0F172A] mb-6">
              Créer un nouveau segment
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom du segment
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  placeholder="Ex: Clients premium"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Condition
                </label>
                <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]">
                  <option>Score fidélité &gt; 80</option>
                  <option>Nombre de séjours &gt; 5</option>
                  <option>CA total &gt; 2000€</option>
                  <option>Dernière visite &lt; 3 mois</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Couleur
                </label>
                <div className="flex gap-2">
                  {['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444'].map(
                    (color) => (
                      <div
                        key={color}
                        className="w-10 h-10 rounded-full cursor-pointer border-2 border-white hover:border-slate-300"
                        style={{ backgroundColor: color }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium text-slate-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg font-medium transition-colors"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
