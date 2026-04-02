/**
 * MobileBreakfastView - Vue Mobile Petit-déjeuner
 * Basée sur le design Rorck (breakfast/index.tsx)
 * Flux: Cuisine → Livraison → Servi
 */

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Coffee, Truck, CheckCircle, Plus, BarChart3, Settings
} from 'lucide-react'

// Configuration des statuts
const STATUS_CONFIG = {
  a_preparer: { label: 'À préparer', color: '#F59E0B' },
  prepare: { label: 'Préparé', color: '#3B82F6' },
  en_livraison: { label: 'En livraison', color: '#0D9488' },
  servi: { label: 'Servi', color: '#22C55E' },
}

export default function MobileBreakfastView({ data, actions }) {
  const { breakfast } = data
  const [activeTab, setActiveTab] = useState('cuisine')

  // Filtrer les commandes par onglet
  const cuisineOrders = useMemo(() =>
    breakfast.filter(o => o.status === 'a_preparer').sort((a, b) => a.room_number.localeCompare(b.room_number)),
    [breakfast]
  )

  const deliveryOrders = useMemo(() =>
    breakfast.filter(o => o.status === 'prepare' || o.status === 'en_livraison').sort((a, b) => a.room_number.localeCompare(b.room_number)),
    [breakfast]
  )

  const historyOrders = useMemo(() =>
    breakfast.filter(o => o.status === 'servi').sort((a, b) => a.room_number.localeCompare(b.room_number)),
    [breakfast]
  )

  // Stats
  const stats = useMemo(() => ({
    toPrepare: breakfast.filter(o => o.status === 'a_preparer').length,
    prepared: breakfast.filter(o => o.status === 'prepare').length,
    delivering: breakfast.filter(o => o.status === 'en_livraison').length,
    served: breakfast.filter(o => o.status === 'servi').length,
  }), [breakfast])

  // Actions
  const handleStatusUpdate = useCallback((orderId, newStatus) => {
    const statusLabel = STATUS_CONFIG[newStatus]?.label
    if (window.confirm(`Marquer comme "${statusLabel}" ?`)) {
      const updates = { status: newStatus }
      if (newStatus === 'servi') updates.served_at = new Date().toISOString()
      actions.updateBreakfast?.(orderId, updates)
      toast.success(`Commande mise à jour: ${statusLabel}`)
    }
  }, [actions])

  // Commandes à afficher selon l'onglet
  const currentOrders = activeTab === 'cuisine' ? cuisineOrders : activeTab === 'livraison' ? deliveryOrders : historyOrders

  // Render une carte de commande
  const renderOrderCard = (order) => {
    const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.a_preparer

    return (
      <div 
        key={order.id}
        className="bg-white rounded-xl p-4 border border-slate-200 space-y-2"
        data-testid={`breakfast-order-${order.room_number}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-extrabold text-slate-900">{order.room_number}</span>
            <div 
              className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white"
              style={{ backgroundColor: statusConfig.color }}
            >
              {statusConfig.label}
            </div>
          </div>
          {!order.included && (
            <div className="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-semibold text-amber-600">💰 Payant</span>
            </div>
          )}
        </div>

        {/* Guest */}
        <p className="font-semibold text-sm text-slate-900">{order.guest_name}</p>
        
        {/* Details */}
        <p className="text-xs text-slate-500">
          {order.formule} • {order.person_count} pers. • {order.boissons?.join(', ') || 'Standard'}
        </p>

        {/* Options (allergies, etc.) */}
        {order.options?.length > 0 && (
          <p className="text-[11px] text-red-500 font-medium">⚠️ {order.options.join(', ')}</p>
        )}

        {/* Notes */}
        {order.notes && (
          <p className="text-[11px] text-blue-500 italic">📝 {order.notes}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {order.status === 'a_preparer' && (
            <Button 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700 h-8"
              onClick={() => handleStatusUpdate(order.id, 'prepare')}
            >
              <Coffee size={14} className="mr-1" /> Préparé
            </Button>
          )}
          {order.status === 'prepare' && (
            <Button 
              size="sm" 
              className="bg-teal-600 hover:bg-teal-700 h-8"
              onClick={() => handleStatusUpdate(order.id, 'en_livraison')}
            >
              <Truck size={14} className="mr-1" /> En livraison
            </Button>
          )}
          {order.status === 'en_livraison' && (
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700 h-8"
              onClick={() => handleStatusUpdate(order.id, 'servi')}
            >
              <CheckCircle size={14} className="mr-1" /> Servi
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-100" data-testid="mobile-breakfast-view">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 pt-12 pb-4 px-4">
        <div className="flex items-center gap-3">
          <Coffee size={24} className="text-white" />
          <h1 className="text-xl font-bold text-white">Petit-déjeuner</h1>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex bg-white border-b border-slate-200 py-3 px-4">
        <div className="flex-1 text-center">
          <div className="text-xl font-extrabold text-amber-500">{stats.toPrepare}</div>
          <div className="text-[11px] text-slate-500 font-medium">À préparer</div>
        </div>
        <div className="w-px bg-slate-200" />
        <div className="flex-1 text-center">
          <div className="text-xl font-extrabold text-teal-500">{stats.prepared + stats.delivering}</div>
          <div className="text-[11px] text-slate-500 font-medium">En cours</div>
        </div>
        <div className="w-px bg-slate-200" />
        <div className="flex-1 text-center">
          <div className="text-xl font-extrabold text-green-500">{stats.served}</div>
          <div className="text-[11px] text-slate-500 font-medium">Servis</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-slate-200">
        <button
          className={`flex-1 py-3 text-center text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'cuisine' 
              ? 'border-amber-500 text-amber-600' 
              : 'border-transparent text-slate-500'
          }`}
          onClick={() => setActiveTab('cuisine')}
        >
          🍳 Cuisine ({cuisineOrders.length})
        </button>
        <button
          className={`flex-1 py-3 text-center text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'livraison' 
              ? 'border-amber-500 text-amber-600' 
              : 'border-transparent text-slate-500'
          }`}
          onClick={() => setActiveTab('livraison')}
        >
          🚚 Livraison ({deliveryOrders.length})
        </button>
        <button
          className={`flex-1 py-3 text-center text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'historique' 
              ? 'border-amber-500 text-amber-600' 
              : 'border-transparent text-slate-500'
          }`}
          onClick={() => setActiveTab('historique')}
        >
          ✅ Servis ({historyOrders.length})
        </button>
      </div>

      {/* Order List */}
      <div className="flex-1 overflow-auto p-4 space-y-2 pb-24">
        {currentOrders.length > 0 ? currentOrders.map(renderOrderCard) : (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="text-5xl mb-3">☕</span>
            <span className="font-semibold text-slate-900">
              {activeTab === 'cuisine' && 'Aucune commande à préparer'}
              {activeTab === 'livraison' && 'Aucune livraison en cours'}
              {activeTab === 'historique' && 'Aucun historique'}
            </span>
          </div>
        )}
      </div>

      {/* FABs */}
      <div className="fixed bottom-6 right-5 flex flex-col items-center gap-2">
        <button className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg">
          <Settings size={18} className="text-white" />
        </button>
        <button className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg">
          <BarChart3 size={18} className="text-white" />
        </button>
        <button className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg">
          <Plus size={22} className="text-white" />
        </button>
      </div>
    </div>
  )
}
