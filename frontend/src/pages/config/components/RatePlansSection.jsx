/**
 * Rate Plans Section
 */
import React, { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2, Save, Link2, Unlink, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { toast } from 'sonner';
import { getRatePlans, getRoomTypes, createRatePlan, updateRatePlan, deleteRatePlan } from '../configApi';

const RATE_TYPES = [
  { value: 'bar', label: 'BAR (Best Available)' },
  { value: 'flexible', label: 'Flexible' },
  { value: 'non_refundable', label: 'Non Remboursable' },
  { value: 'advance_purchase', label: 'Achat anticipé' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'group', label: 'Groupe' },
  { value: 'package', label: 'Package' },
  { value: 'promotional', label: 'Promotionnel' },
  { value: 'member', label: 'Membre' },
  { value: 'last_minute', label: 'Dernière minute' },
];

const MEAL_PLANS = [
  { value: 'room_only', label: 'Hébergement seul' },
  { value: 'breakfast', label: 'Petit-déjeuner inclus' },
  { value: 'half_board', label: 'Demi-pension' },
  { value: 'full_board', label: 'Pension complète' },
  { value: 'all_inclusive', label: 'Tout inclus' },
];

const RATE_TYPE_COLORS = {
  bar: 'bg-violet-100 text-violet-700',
  flexible: 'bg-emerald-100 text-emerald-700',
  non_refundable: 'bg-red-100 text-red-700',
  advance_purchase: 'bg-blue-100 text-blue-700',
  corporate: 'bg-slate-100 text-slate-700',
  group: 'bg-amber-100 text-amber-700',
  package: 'bg-teal-100 text-teal-700',
  promotional: 'bg-orange-100 text-orange-700',
  member: 'bg-pink-100 text-pink-700',
  last_minute: 'bg-yellow-100 text-yellow-700',
};

const initialForm = {
  code: '',
  name: '',
  name_en: '',
  rate_type: 'flexible',
  meal_plan: 'room_only',
  is_derived: false,
  parent_rate_id: '',
  derivation_rule: { method: 'percentage', value: 0, round_to: 1 },
  reference_price: 100,
  includes_breakfast: false,
  is_public: true,
  description: ''
};

export default function RatePlansSection({ hotelId, onUpdate }) {
  const [ratePlans, setRatePlans] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [hotelId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ratesData, typesData] = await Promise.all([
        getRatePlans(hotelId),
        getRoomTypes(hotelId)
      ]);
      setRatePlans(ratesData);
      setRoomTypes(typesData);
    } catch (err) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRate(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const handleEdit = (rate) => {
    setEditingRate(rate);
    setForm({
      code: rate.code,
      name: rate.name,
      name_en: rate.name_en || '',
      rate_type: rate.rate_type,
      meal_plan: rate.meal_plan,
      is_derived: rate.is_derived,
      parent_rate_id: rate.parent_rate_id || '',
      derivation_rule: rate.derivation_rule || { method: 'percentage', value: 0, round_to: 1 },
      reference_price: rate.reference_price,
      includes_breakfast: rate.includes_breakfast,
      is_public: rate.is_public,
      description: rate.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (rate) => {
    if (!window.confirm(`Supprimer le plan "${rate.name}" ?`)) return;
    
    try {
      await deleteRatePlan(hotelId, rate.id);
      toast.success('Plan tarifaire supprimé');
      loadData();
      onUpdate?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSave = async () => {
    if (!form.code || !form.name) {
      toast.error('Code et nom sont requis');
      return;
    }
    
    if (form.is_derived && !form.parent_rate_id) {
      toast.error('Sélectionnez un tarif parent pour un plan dérivé');
      return;
    }

    try {
      setSaving(true);
      if (editingRate) {
        await updateRatePlan(hotelId, editingRate.id, form);
        toast.success('Plan mis à jour');
      } else {
        await createRatePlan(hotelId, form);
        toast.success('Plan créé');
      }
      setShowModal(false);
      loadData();
      onUpdate?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Separate base rates and derived rates
  const baseRates = ratePlans.filter(r => !r.is_derived);
  const derivedRates = ratePlans.filter(r => r.is_derived);

  const getRateTypeLabel = (value) => RATE_TYPES.find(t => t.value === value)?.label || value;
  const getMealPlanLabel = (value) => MEAL_PLANS.find(m => m.value === value)?.label || value;

  const getParentRateName = (parentId) => {
    const parent = ratePlans.find(r => r.id === parentId);
    return parent?.name || 'Inconnu';
  };

  const calculateDerivedPrice = () => {
    if (!form.is_derived || !form.parent_rate_id || !form.derivation_rule) return null;
    
    const parent = ratePlans.find(r => r.id === form.parent_rate_id);
    if (!parent) return null;
    
    const basePrice = parent.reference_price || 100;
    const { method, value, round_to } = form.derivation_rule;
    
    let calculated;
    if (method === 'percentage') {
      calculated = basePrice * (1 + value / 100);
    } else {
      calculated = basePrice + value;
    }
    
    if (round_to > 0) {
      calculated = Math.round(calculated / round_to) * round_to;
    }
    
    return calculated.toFixed(2);
  };

  return (
    <div className="space-y-6" data-testid="rate-plans-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-100 rounded-xl">
            <Tag className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Plans tarifaires</h2>
            <p className="text-sm text-slate-500">Tarifs de base et plans dérivés</p>
          </div>
        </div>
        <Button onClick={handleAdd} data-testid="add-rate-plan-btn">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un plan
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto" />
          </CardContent>
        </Card>
      ) : ratePlans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Tag className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-2">Aucun plan tarifaire configuré</p>
            <p className="text-sm text-slate-400 mb-4">
              Commencez par créer un tarif de base (BAR) puis des plans dérivés.
            </p>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Créer le tarif BAR
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Base Rates */}
          <div>
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
              Tarifs de base ({baseRates.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {baseRates.map(rate => (
                <Card key={rate.id} className="hover:border-violet-300 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono">{rate.code}</Badge>
                          <Badge className={RATE_TYPE_COLORS[rate.rate_type] || 'bg-slate-100'}>
                            {getRateTypeLabel(rate.rate_type)}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-lg">{rate.name}</h4>
                        <p className="text-sm text-slate-500">{getMealPlanLabel(rate.meal_plan)}</p>
                        <div className="mt-3 text-2xl font-bold text-violet-600">
                          {rate.reference_price}€
                          <span className="text-sm font-normal text-slate-400">/nuit réf.</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(rate)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(rate)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Derived Rates */}
          {derivedRates.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
                Plans dérivés ({derivedRates.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {derivedRates.map(rate => (
                  <Card key={rate.id} className="hover:border-violet-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono text-xs">{rate.code}</Badge>
                            <Badge className={`text-xs ${RATE_TYPE_COLORS[rate.rate_type] || 'bg-slate-100'}`}>
                              {getRateTypeLabel(rate.rate_type)}
                            </Badge>
                          </div>
                          <h4 className="font-semibold">{rate.name}</h4>
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                            <Link2 className="h-3 w-3" />
                            <span>Dérivé de: {getParentRateName(rate.parent_rate_id)}</span>
                          </div>
                          {rate.derivation_rule && (
                            <div className="mt-2 text-sm">
                              <span className={rate.derivation_rule.value < 0 ? 'text-emerald-600' : 'text-red-600'}>
                                {rate.derivation_rule.value > 0 ? '+' : ''}{rate.derivation_rule.value}
                                {rate.derivation_rule.method === 'percentage' ? '%' : '€'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(rate)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(rate)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRate ? 'Modifier le plan tarifaire' : 'Nouveau plan tarifaire'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="BAR"
                maxLength={15}
                data-testid="rate-code-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Type de tarif</Label>
              <Select value={form.rate_type} onValueChange={(v) => setForm(f => ({ ...f, rate_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RATE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nom (FR) *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="BAR Flex"
                data-testid="rate-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Nom (EN)</Label>
              <Input
                value={form.name_en}
                onChange={(e) => setForm(f => ({ ...f, name_en: e.target.value }))}
                placeholder="BAR Flex"
              />
            </div>
            <div className="space-y-2">
              <Label>Formule repas</Label>
              <Select value={form.meal_plan} onValueChange={(v) => setForm(f => ({ ...f, meal_plan: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_PLANS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tarif de référence (€)</Label>
              <Input
                type="number"
                value={form.reference_price}
                onChange={(e) => setForm(f => ({ ...f, reference_price: parseFloat(e.target.value) || 0 }))}
                min="0"
                disabled={form.is_derived}
              />
            </div>

            {/* Derivation Section */}
            <div className="col-span-2 p-4 bg-slate-50 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Plan dérivé</Label>
                  <p className="text-sm text-slate-500">Calculé automatiquement à partir d'un tarif parent</p>
                </div>
                <Switch
                  checked={form.is_derived}
                  onCheckedChange={(v) => setForm(f => ({ ...f, is_derived: v }))}
                />
              </div>

              {form.is_derived && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="space-y-2">
                    <Label>Tarif parent *</Label>
                    <Select value={form.parent_rate_id} onValueChange={(v) => setForm(f => ({ ...f, parent_rate_id: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {baseRates.filter(r => r.id !== editingRate?.id).map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Méthode</Label>
                    <Select 
                      value={form.derivation_rule?.method || 'percentage'} 
                      onValueChange={(v) => setForm(f => ({ 
                        ...f, 
                        derivation_rule: { ...f.derivation_rule, method: v } 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                        <SelectItem value="fixed_amount">Montant fixe (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Valeur ({form.derivation_rule?.method === 'percentage' ? '%' : '€'})
                    </Label>
                    <Input
                      type="number"
                      value={form.derivation_rule?.value || 0}
                      onChange={(e) => setForm(f => ({ 
                        ...f, 
                        derivation_rule: { ...f.derivation_rule, value: parseFloat(e.target.value) || 0 } 
                      }))}
                      placeholder="-10"
                    />
                    <p className="text-xs text-slate-500">Négatif = réduction, Positif = majoration</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Arrondi à</Label>
                    <Select 
                      value={String(form.derivation_rule?.round_to || 1)} 
                      onValueChange={(v) => setForm(f => ({ 
                        ...f, 
                        derivation_rule: { ...f.derivation_rule, round_to: parseFloat(v) } 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1€</SelectItem>
                        <SelectItem value="5">5€</SelectItem>
                        <SelectItem value="10">10€</SelectItem>
                        <SelectItem value="0.5">0.50€</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preview */}
                  {form.parent_rate_id && (
                    <div className="col-span-2 p-3 bg-violet-50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-violet-600" />
                        <span className="text-sm">Prix calculé:</span>
                      </div>
                      <span className="font-bold text-lg text-violet-600">
                        {calculateDerivedPrice()}€
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="col-span-2 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.includes_breakfast}
                  onCheckedChange={(v) => setForm(f => ({ ...f, includes_breakfast: v }))}
                />
                <Label>Petit-déjeuner inclus</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_public}
                  onCheckedChange={(v) => setForm(f => ({ ...f, is_public: v }))}
                />
                <Label>Visible sur le moteur de réservation</Label>
              </div>
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description || ''}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description du plan tarifaire..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="save-rate-btn">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
