/**
 * Settings Section - Advanced Configuration
 */
import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Save, Percent, Users2, Clock, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { toast } from 'sonner';
import { getAdvancedSettings, updateAdvancedSettings, addTaxRule, removeTaxRule } from '../configApi';

const TAX_TYPES = [
  { value: 'vat', label: 'TVA' },
  { value: 'city_tax', label: 'Taxe de séjour' },
  { value: 'service', label: 'Service' },
  { value: 'tourism', label: 'Taxe tourisme' },
  { value: 'local', label: 'Taxe locale' },
];

const TAX_APPLIES_TO = [
  { value: 'room', label: 'Hébergement' },
  { value: 'breakfast', label: 'Petit-déjeuner' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'spa', label: 'Spa' },
  { value: 'all', label: 'Tout' },
];

const SEGMENT_CATEGORIES = [
  { value: 'transient', label: 'Individuel' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'group', label: 'Groupe' },
  { value: 'ota', label: 'OTA' },
  { value: 'direct', label: 'Direct' },
  { value: 'wholesale', label: 'Wholesale' },
];

export default function SettingsSection({ hotelId, onUpdate }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxForm, setTaxForm] = useState({
    code: '',
    name: '',
    tax_type: 'vat',
    rate: 10,
    applies_to: 'room',
    is_included: true
  });

  useEffect(() => {
    loadData();
  }, [hotelId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAdvancedSettings(hotelId);
      setSettings(data);
    } catch (err) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateAdvancedSettings(hotelId, settings);
      toast.success('Paramètres mis à jour');
      onUpdate?.();
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTax = async () => {
    if (!taxForm.code || !taxForm.name) {
      toast.error('Code et nom sont requis');
      return;
    }
    
    try {
      await addTaxRule(hotelId, taxForm);
      toast.success('Taxe ajoutée');
      setShowTaxModal(false);
      setTaxForm({
        code: '',
        name: '',
        tax_type: 'vat',
        rate: 10,
        applies_to: 'room',
        is_included: true
      });
      loadData();
      onUpdate?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemoveTax = async (taxId) => {
    if (!window.confirm('Supprimer cette taxe ?')) return;
    
    try {
      await removeTaxRule(hotelId, taxId);
      toast.success('Taxe supprimée');
      loadData();
      onUpdate?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getTaxTypeLabel = (value) => TAX_TYPES.find(t => t.value === value)?.label || value;
  const getAppliesToLabel = (value) => TAX_APPLIES_TO.find(t => t.value === value)?.label || value;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="settings-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-100 rounded-xl">
            <Settings className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Paramètres avancés</h2>
            <p className="text-sm text-slate-500">Taxes, segments et règles métier</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} data-testid="save-settings-btn">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>

      {/* Taxes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Taxes et prélèvements
              </CardTitle>
              <CardDescription>Configurez les taxes applicables</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowTaxModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(!settings?.taxes || settings.taxes.length === 0) ? (
            <div className="text-center py-8 text-slate-500">
              <Percent className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p>Aucune taxe configurée</p>
              <Button variant="link" onClick={() => setShowTaxModal(true)}>
                Ajouter une taxe
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {settings.taxes.map((tax, idx) => (
                <div key={tax.id || idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">{tax.code}</Badge>
                    <div>
                      <div className="font-medium">{tax.name}</div>
                      <div className="text-sm text-slate-500">
                        {getTaxTypeLabel(tax.tax_type)} - {getAppliesToLabel(tax.applies_to)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-violet-600">{tax.rate}%</div>
                      <div className="text-xs text-slate-400">
                        {tax.is_included ? 'Inclus' : 'En sus'}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleRemoveTax(tax.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Règles de réservation
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Délai minimum de réservation (heures)</Label>
            <Input
              type="number"
              value={settings?.min_booking_advance_hours || 0}
              onChange={(e) => handleChange('min_booking_advance_hours', parseInt(e.target.value) || 0)}
              min="0"
            />
            <p className="text-xs text-slate-500">0 = réservation le jour même autorisée</p>
          </div>
          <div className="space-y-2">
            <Label>Délai maximum de réservation (jours)</Label>
            <Input
              type="number"
              value={settings?.max_booking_advance_days || 365}
              onChange={(e) => handleChange('max_booking_advance_days', parseInt(e.target.value) || 365)}
              min="1"
              max="730"
            />
          </div>
          <div className="space-y-2">
            <Label>Heure d'arrivée par défaut</Label>
            <Input
              type="time"
              value={settings?.default_arrival_time || '15:00'}
              onChange={(e) => handleChange('default_arrival_time', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Heure de départ par défaut</Label>
            <Input
              type="time"
              value={settings?.default_departure_time || '11:00'}
              onChange={(e) => handleChange('default_departure_time', e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Réservation le jour même</Label>
              <p className="text-xs text-slate-500">Autoriser les check-in le jour même</p>
            </div>
            <Switch
              checked={settings?.allow_same_day_booking !== false}
              onCheckedChange={(v) => handleChange('allow_same_day_booking', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Overbooking</Label>
              <p className="text-xs text-slate-500">Autoriser la surréservation</p>
            </div>
            <Switch
              checked={settings?.overbooking_allowed || false}
              onCheckedChange={(v) => handleChange('overbooking_allowed', v)}
            />
          </div>
          {settings?.overbooking_allowed && (
            <div className="space-y-2">
              <Label>Pourcentage d'overbooking max</Label>
              <Input
                type="number"
                value={settings?.overbooking_percentage || 0}
                onChange={(e) => handleChange('overbooking_percentage', parseFloat(e.target.value) || 0)}
                min="0"
                max="20"
                step="0.5"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Règles de tarification</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Arrondi des prix à (€)</Label>
            <Select 
              value={String(settings?.round_prices_to || 1)} 
              onValueChange={(v) => handleChange('round_prices_to', parseFloat(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.01">0.01€ (centimes)</SelectItem>
                <SelectItem value="0.5">0.50€</SelectItem>
                <SelectItem value="1">1€</SelectItem>
                <SelectItem value="5">5€</SelectItem>
                <SelectItem value="10">10€</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Prix minimum plancher (€)</Label>
            <Input
              type="number"
              value={settings?.min_price_floor || 0}
              onChange={(e) => handleChange('min_price_floor', parseFloat(e.target.value) || 0)}
              min="0"
            />
            <p className="text-xs text-slate-500">Empêche les tarifs en dessous de ce seuil</p>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications automatiques
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email de confirmation</Label>
              <p className="text-xs text-slate-500">Envoyer automatiquement après réservation</p>
            </div>
            <Switch
              checked={settings?.auto_confirmation_email !== false}
              onCheckedChange={(v) => handleChange('auto_confirmation_email', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Email de rappel</Label>
              <p className="text-xs text-slate-500">Envoyer un rappel avant l'arrivée</p>
            </div>
            <Switch
              checked={settings?.auto_reminder_email !== false}
              onCheckedChange={(v) => handleChange('auto_reminder_email', v)}
            />
          </div>
          {settings?.auto_reminder_email !== false && (
            <div className="space-y-2 pl-4 border-l-2 border-violet-200">
              <Label>Jours avant l'arrivée</Label>
              <Input
                type="number"
                value={settings?.reminder_days_before || 3}
                onChange={(e) => handleChange('reminder_days_before', parseInt(e.target.value) || 3)}
                min="1"
                max="14"
                className="w-32"
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <Label>Journal d'audit</Label>
              <p className="text-xs text-slate-500">Enregistrer toutes les modifications</p>
            </div>
            <Switch
              checked={settings?.enable_audit_log !== false}
              onCheckedChange={(v) => handleChange('enable_audit_log', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Customer Segments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users2 className="h-4 w-4" />
            Segments clients
          </CardTitle>
          <CardDescription>
            Catégorisez vos clients pour l'analyse et le reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {SEGMENT_CATEGORIES.map(segment => (
              <div key={segment.value} className="p-3 bg-slate-50 rounded-lg text-center">
                <Badge variant="secondary">{segment.label}</Badge>
                <div className="text-xs text-slate-400 mt-1">{segment.value}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-4">
            Les segments sont utilisés pour analyser les performances par source de réservation.
          </p>
        </CardContent>
      </Card>

      {/* Tax Modal */}
      <Dialog open={showTaxModal} onOpenChange={setShowTaxModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une taxe</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={taxForm.code}
                onChange={(e) => setTaxForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="TVA10"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={taxForm.tax_type} onValueChange={(v) => setTaxForm(f => ({ ...f, tax_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Nom *</Label>
              <Input
                value={taxForm.name}
                onChange={(e) => setTaxForm(f => ({ ...f, name: e.target.value }))}
                placeholder="TVA 10% Hébergement"
              />
            </div>
            <div className="space-y-2">
              <Label>Taux (%)</Label>
              <Input
                type="number"
                value={taxForm.rate}
                onChange={(e) => setTaxForm(f => ({ ...f, rate: parseFloat(e.target.value) || 0 }))}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div className="space-y-2">
              <Label>S'applique à</Label>
              <Select value={taxForm.applies_to} onValueChange={(v) => setTaxForm(f => ({ ...f, applies_to: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_APPLIES_TO.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch
                checked={taxForm.is_included}
                onCheckedChange={(v) => setTaxForm(f => ({ ...f, is_included: v }))}
              />
              <Label>Prix TTC (taxe incluse dans le prix affiché)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaxModal(false)}>Annuler</Button>
            <Button onClick={handleAddTax}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
