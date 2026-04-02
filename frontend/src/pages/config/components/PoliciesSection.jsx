/**
 * Policies Section (Cancellation & Payment)
 */
import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Save, Shield, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { toast } from 'sonner';
import { 
  getCancellationPolicies, createCancellationPolicy, deleteCancellationPolicy,
  getPaymentPolicies, createPaymentPolicy, deletePaymentPolicy 
} from '../configApi';

const CANCEL_POLICY_TYPES = [
  { value: 'free', label: 'Gratuite' },
  { value: 'flexible', label: 'Flexible' },
  { value: 'moderate', label: 'Modérée' },
  { value: 'strict', label: 'Stricte' },
  { value: 'non_refundable', label: 'Non Remboursable' },
  { value: 'super_strict', label: 'Super Stricte' },
];

const PENALTY_TYPES = [
  { value: 'percentage', label: 'Pourcentage' },
  { value: 'first_night', label: 'Première nuit' },
  { value: 'full_stay', label: 'Séjour complet' },
  { value: 'fixed_amount', label: 'Montant fixe' },
];

const PAYMENT_TIMINGS = [
  { value: 'at_booking', label: 'À la réservation' },
  { value: 'at_arrival', label: 'À l\'arrivée' },
  { value: 'at_departure', label: 'Au départ' },
  { value: 'deposit', label: 'Acompte' },
  { value: 'installments', label: 'Échelonné' },
];

const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Carte bancaire' },
  { value: 'cash', label: 'Espèces' },
  { value: 'bank_transfer', label: 'Virement' },
  { value: 'check', label: 'Chèque' },
  { value: 'voucher', label: 'Bon/Voucher' },
];

const POLICY_TYPE_COLORS = {
  free: 'bg-emerald-100 text-emerald-700',
  flexible: 'bg-blue-100 text-blue-700',
  moderate: 'bg-amber-100 text-amber-700',
  strict: 'bg-orange-100 text-orange-700',
  non_refundable: 'bg-red-100 text-red-700',
  super_strict: 'bg-red-200 text-red-800',
};

export default function PoliciesSection({ hotelId, onUpdate }) {
  const [cancelPolicies, setCancelPolicies] = useState([]);
  const [paymentPolicies, setPaymentPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cancellation');
  
  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cancelForm, setCancelForm] = useState({
    code: '',
    name: '',
    policy_type: 'flexible',
    rules: [{ days_before_arrival: 1, penalty_type: 'first_night', penalty_value: 0 }],
    allow_modifications: true,
    terms_short: ''
  });
  const [paymentForm, setPaymentForm] = useState({
    code: '',
    name: '',
    timing: 'at_arrival',
    deposit_percentage: 0,
    accepted_methods: ['credit_card', 'cash'],
    requires_card_guarantee: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [hotelId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cancelData, paymentData] = await Promise.all([
        getCancellationPolicies(hotelId),
        getPaymentPolicies(hotelId)
      ]);
      setCancelPolicies(cancelData);
      setPaymentPolicies(paymentData);
    } catch (err) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Cancellation Policy Handlers
  const handleAddCancel = () => {
    setCancelForm({
      code: '',
      name: '',
      policy_type: 'flexible',
      rules: [{ days_before_arrival: 1, penalty_type: 'first_night', penalty_value: 0 }],
      allow_modifications: true,
      terms_short: ''
    });
    setShowCancelModal(true);
  };

  const handleSaveCancel = async () => {
    if (!cancelForm.code || !cancelForm.name) {
      toast.error('Code et nom sont requis');
      return;
    }
    
    try {
      setSaving(true);
      await createCancellationPolicy(hotelId, cancelForm);
      toast.success('Politique créée');
      setShowCancelModal(false);
      loadData();
      onUpdate?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCancel = async (policy) => {
    if (!window.confirm(`Supprimer "${policy.name}" ?`)) return;
    
    try {
      await deleteCancellationPolicy(hotelId, policy.id);
      toast.success('Politique supprimée');
      loadData();
      onUpdate?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Payment Policy Handlers
  const handleAddPayment = () => {
    setPaymentForm({
      code: '',
      name: '',
      timing: 'at_arrival',
      deposit_percentage: 0,
      accepted_methods: ['credit_card', 'cash'],
      requires_card_guarantee: false
    });
    setShowPaymentModal(true);
  };

  const handleSavePayment = async () => {
    if (!paymentForm.code || !paymentForm.name) {
      toast.error('Code et nom sont requis');
      return;
    }
    
    try {
      setSaving(true);
      await createPaymentPolicy(hotelId, paymentForm);
      toast.success('Politique créée');
      setShowPaymentModal(false);
      loadData();
      onUpdate?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (policy) => {
    if (!window.confirm(`Supprimer "${policy.name}" ?`)) return;
    
    try {
      await deletePaymentPolicy(hotelId, policy.id);
      toast.success('Politique supprimée');
      loadData();
      onUpdate?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getPolicyTypeLabel = (value) => CANCEL_POLICY_TYPES.find(t => t.value === value)?.label || value;
  const getTimingLabel = (value) => PAYMENT_TIMINGS.find(t => t.value === value)?.label || value;

  return (
    <div className="space-y-6" data-testid="policies-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-100 rounded-xl">
            <FileText className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Conditions</h2>
            <p className="text-sm text-slate-500">Politiques d'annulation et de paiement</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="cancellation" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Annulation ({cancelPolicies.length})
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Paiement ({paymentPolicies.length})
          </TabsTrigger>
        </TabsList>

        {/* Cancellation Tab */}
        <TabsContent value="cancellation" className="mt-4">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto" />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={handleAddCancel} data-testid="add-cancel-policy-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une politique
                </Button>
              </div>
              
              {cancelPolicies.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 mb-4">Aucune politique d'annulation</p>
                    <Button onClick={handleAddCancel}>Créer votre première politique</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cancelPolicies.map(policy => (
                    <Card key={policy.id} className="hover:border-violet-300 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="font-mono">{policy.code}</Badge>
                              <Badge className={POLICY_TYPE_COLORS[policy.policy_type] || 'bg-slate-100'}>
                                {getPolicyTypeLabel(policy.policy_type)}
                              </Badge>
                            </div>
                            <h4 className="font-semibold">{policy.name}</h4>
                            {policy.terms_short && (
                              <p className="text-sm text-slate-500 mt-1">{policy.terms_short}</p>
                            )}
                            <div className="mt-2 text-xs text-slate-400">
                              {policy.allow_modifications ? 'Modifications autorisées' : 'Modifications interdites'}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteCancel(policy)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment" className="mt-4">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto" />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={handleAddPayment} data-testid="add-payment-policy-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une politique
                </Button>
              </div>
              
              {paymentPolicies.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 mb-4">Aucune politique de paiement</p>
                    <Button onClick={handleAddPayment}>Créer votre première politique</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentPolicies.map(policy => (
                    <Card key={policy.id} className="hover:border-violet-300 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="font-mono">{policy.code}</Badge>
                            </div>
                            <h4 className="font-semibold">{policy.name}</h4>
                            <p className="text-sm text-slate-500 mt-1">
                              {getTimingLabel(policy.timing)}
                            </p>
                            {policy.deposit_percentage > 0 && (
                              <div className="mt-2 text-sm">
                                <span className="text-violet-600 font-medium">
                                  {policy.deposit_percentage}% d'acompte
                                </span>
                              </div>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {policy.accepted_methods?.map(method => (
                                <Badge key={method} variant="secondary" className="text-xs">
                                  {PAYMENT_METHODS.find(m => m.value === method)?.label || method}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeletePayment(policy)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancellation Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle politique d'annulation</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={cancelForm.code}
                onChange={(e) => setCancelForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="FLEX"
                maxLength={15}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={cancelForm.policy_type} onValueChange={(v) => setCancelForm(f => ({ ...f, policy_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANCEL_POLICY_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Nom *</Label>
              <Input
                value={cancelForm.name}
                onChange={(e) => setCancelForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Flexible - Annulation gratuite 24h avant"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Résumé des conditions</Label>
              <Input
                value={cancelForm.terms_short}
                onChange={(e) => setCancelForm(f => ({ ...f, terms_short: e.target.value }))}
                placeholder="Annulation gratuite jusqu'à 24h avant l'arrivée"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch
                checked={cancelForm.allow_modifications}
                onCheckedChange={(v) => setCancelForm(f => ({ ...f, allow_modifications: v }))}
              />
              <Label>Autoriser les modifications</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>Annuler</Button>
            <Button onClick={handleSaveCancel} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle politique de paiement</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={paymentForm.code}
                onChange={(e) => setPaymentForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="PAY_ARR"
                maxLength={15}
              />
            </div>
            <div className="space-y-2">
              <Label>Moment du paiement</Label>
              <Select value={paymentForm.timing} onValueChange={(v) => setPaymentForm(f => ({ ...f, timing: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TIMINGS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Nom *</Label>
              <Input
                value={paymentForm.name}
                onChange={(e) => setPaymentForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Paiement à l'arrivée"
              />
            </div>
            <div className="space-y-2">
              <Label>Acompte (%)</Label>
              <Input
                type="number"
                value={paymentForm.deposit_percentage}
                onChange={(e) => setPaymentForm(f => ({ ...f, deposit_percentage: parseFloat(e.target.value) || 0 }))}
                min="0"
                max="100"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={paymentForm.requires_card_guarantee}
                onCheckedChange={(v) => setPaymentForm(f => ({ ...f, requires_card_guarantee: v }))}
              />
              <Label>Garantie CB requise</Label>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Modes de paiement acceptés</Label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map(method => (
                  <Badge
                    key={method.value}
                    variant={paymentForm.accepted_methods?.includes(method.value) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      setPaymentForm(f => ({
                        ...f,
                        accepted_methods: f.accepted_methods?.includes(method.value)
                          ? f.accepted_methods.filter(m => m !== method.value)
                          : [...(f.accepted_methods || []), method.value]
                      }));
                    }}
                  >
                    {method.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Annuler</Button>
            <Button onClick={handleSavePayment} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
