import { useState } from 'react';
import { Workflow } from '../data/mockData';

interface WorkflowsProps {
  workflows: Workflow[];
}

export default function Workflows({ workflows }: WorkflowsProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[20px] shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A] mb-1">
              Automation & Workflows
            </h2>
            <p className="text-sm text-slate-600">
              Automatisez vos communications client
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors font-medium text-sm"
          >
            + Créer un workflow
          </button>
        </div>

        <div className="space-y-3">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="border border-slate-200 rounded-lg p-5 hover:border-[#10B981] transition-colors"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                    workflow.isActive ? 'bg-[#10B981]' : 'bg-slate-400'
                  }`}
                >
                  {workflow.isActive ? '✓' : '○'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-[#0F172A]">{workflow.name}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">
                        {workflow.executions} exécutions
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={workflow.isActive}
                          className="sr-only peer"
                          readOnly
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#10B981]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10B981]"></div>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="px-3 py-1 bg-[#DBEAFE] text-[#1E3A8A] rounded-full font-medium">
                      {workflow.trigger}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="px-3 py-1 bg-[#D1FAE5] text-[#065F46] rounded-full font-medium">
                      {workflow.action}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Create Workflow */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] p-8 max-w-2xl w-full mx-4">
            <h3 className="text-2xl font-bold text-[#0F172A] mb-6">
              Créer un nouveau workflow
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom du workflow
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  placeholder="Ex: Bienvenue nouveaux clients"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Déclencheur
                </label>
                <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]">
                  <option>Nouvelle réservation</option>
                  <option>Check-in effectué</option>
                  <option>Check-out effectué</option>
                  <option>Avis reçu</option>
                  <option>Annulation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Action
                </label>
                <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]">
                  <option>Envoyer email</option>
                  <option>Envoyer WhatsApp</option>
                  <option>Envoyer SMS</option>
                  <option>Créer tâche</option>
                  <option>Ajouter tag</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Délai (en heures)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  placeholder="0"
                  defaultValue={0}
                />
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
