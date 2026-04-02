/**
 * Hotel Profile Section
 */
import React, { useState, useEffect } from 'react';
import { Building2, Save, MapPin, Phone, Mail, Globe, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { toast } from 'sonner';
import { getHotelProfile, updateHotelProfile } from '../configApi';

const CURRENCIES = [
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'Dollar US ($)' },
  { value: 'GBP', label: 'Livre Sterling (£)' },
  { value: 'CHF', label: 'Franc Suisse (CHF)' },
];

const TIMEZONES = [
  { value: 'Europe/Paris', label: 'Paris (UTC+1/+2)' },
  { value: 'Europe/London', label: 'Londres (UTC+0/+1)' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+1/+2)' },
  { value: 'Europe/Madrid', label: 'Madrid (UTC+1/+2)' },
  { value: 'Europe/Rome', label: 'Rome (UTC+1/+2)' },
  { value: 'Europe/Zurich', label: 'Zurich (UTC+1/+2)' },
];

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
];

export default function HotelProfileSection({ hotelId, onUpdate }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [hotelId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getHotelProfile(hotelId);
      setProfile(data);
    } catch (err) {
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      address: { ...(prev.address || {}), [field]: value }
    }));
  };

  const handleContactChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      contact: { ...(prev.contact || {}), [field]: value }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateHotelProfile(hotelId, profile);
      toast.success('Profil mis à jour');
      onUpdate?.();
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

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
    <div className="space-y-6" data-testid="hotel-profile-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-100 rounded-xl">
            <Building2 className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Profil Hôtel</h2>
            <p className="text-sm text-slate-500">Informations générales de votre établissement</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} data-testid="save-profile-btn">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations de base</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Nom de l'hôtel *</Label>
            <Input
              value={profile?.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Grand Hôtel Paris"
              data-testid="hotel-name-input"
            />
          </div>
          <div className="space-y-2">
            <Label>Raison sociale</Label>
            <Input
              value={profile?.legal_name || ''}
              onChange={(e) => handleChange('legal_name', e.target.value)}
              placeholder="SAS Grand Hôtel"
            />
          </div>
          <div className="space-y-2">
            <Label>Classement</Label>
            <Select value={String(profile?.stars || 3)} onValueChange={(v) => handleChange('stars', parseInt(v))}>
              <SelectTrigger data-testid="stars-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map(s => (
                  <SelectItem key={s} value={String(s)}>{s} étoile{s > 1 ? 's' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type d'établissement</Label>
            <Select value={profile?.hotel_type || 'hotel'} onValueChange={(v) => handleChange('hotel_type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hotel">Hôtel</SelectItem>
                <SelectItem value="residence">Résidence</SelectItem>
                <SelectItem value="boutique">Boutique Hôtel</SelectItem>
                <SelectItem value="resort">Resort</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Description</Label>
            <Textarea
              value={profile?.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Description de votre établissement..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Adresse
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <div className="col-span-2 space-y-2">
            <Label>Adresse</Label>
            <Input
              value={profile?.address?.street || ''}
              onChange={(e) => handleAddressChange('street', e.target.value)}
              placeholder="123 Avenue des Champs-Élysées"
            />
          </div>
          <div className="space-y-2">
            <Label>Code postal</Label>
            <Input
              value={profile?.address?.postal_code || ''}
              onChange={(e) => handleAddressChange('postal_code', e.target.value)}
              placeholder="75008"
            />
          </div>
          <div className="space-y-2">
            <Label>Ville</Label>
            <Input
              value={profile?.address?.city || ''}
              onChange={(e) => handleAddressChange('city', e.target.value)}
              placeholder="Paris"
            />
          </div>
          <div className="space-y-2">
            <Label>Pays</Label>
            <Input
              value={profile?.address?.country_name || 'France'}
              onChange={(e) => handleAddressChange('country_name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Région</Label>
            <Input
              value={profile?.address?.region || ''}
              onChange={(e) => handleAddressChange('region', e.target.value)}
              placeholder="Île-de-France"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" /> Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input
              value={profile?.contact?.phone || ''}
              onChange={(e) => handleContactChange('phone', e.target.value)}
              placeholder="+33 1 23 45 67 89"
            />
          </div>
          <div className="space-y-2">
            <Label>Fax</Label>
            <Input
              value={profile?.contact?.fax || ''}
              onChange={(e) => handleContactChange('fax', e.target.value)}
              placeholder="+33 1 23 45 67 90"
            />
          </div>
          <div className="space-y-2">
            <Label>Email général</Label>
            <Input
              type="email"
              value={profile?.contact?.email || ''}
              onChange={(e) => handleContactChange('email', e.target.value)}
              placeholder="contact@hotel.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Email réservations</Label>
            <Input
              type="email"
              value={profile?.contact?.email_reservations || ''}
              onChange={(e) => handleContactChange('email_reservations', e.target.value)}
              placeholder="reservations@hotel.com"
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Site web</Label>
            <Input
              value={profile?.contact?.website || ''}
              onChange={(e) => handleContactChange('website', e.target.value)}
              placeholder="https://www.hotel.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> Paramètres régionaux
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Devise</Label>
            <Select value={profile?.currency || 'EUR'} onValueChange={(v) => handleChange('currency', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fuseau horaire</Label>
            <Select value={profile?.timezone || 'Europe/Paris'} onValueChange={(v) => handleChange('timezone', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Langue par défaut</Label>
            <Select value={profile?.default_language || 'fr'} onValueChange={(v) => handleChange('default_language', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(l => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Operational */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Horaires
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Heure de check-in</Label>
            <Input
              type="time"
              value={profile?.check_in_time || '15:00'}
              onChange={(e) => handleChange('check_in_time', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Heure de check-out</Label>
            <Input
              type="time"
              value={profile?.check_out_time || '11:00'}
              onChange={(e) => handleChange('check_out_time', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Frais early check-in (€)</Label>
            <Input
              type="number"
              value={profile?.early_check_in_fee || 0}
              onChange={(e) => handleChange('early_check_in_fee', parseFloat(e.target.value))}
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Frais late check-out (€)</Label>
            <Input
              type="number"
              value={profile?.late_check_out_fee || 0}
              onChange={(e) => handleChange('late_check_out_fee', parseFloat(e.target.value))}
              min="0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tax Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations fiscales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>SIRET</Label>
            <Input
              value={profile?.siret || ''}
              onChange={(e) => handleChange('siret', e.target.value)}
              placeholder="123 456 789 00010"
            />
          </div>
          <div className="space-y-2">
            <Label>N° TVA intracommunautaire</Label>
            <Input
              value={profile?.vat_number || ''}
              onChange={(e) => handleChange('vat_number', e.target.value)}
              placeholder="FR12345678901"
            />
          </div>
          <div className="space-y-2">
            <Label>Taux TVA hébergement (%)</Label>
            <Input
              type="number"
              value={profile?.default_vat_rate || 10}
              onChange={(e) => handleChange('default_vat_rate', parseFloat(e.target.value))}
              min="0"
              max="30"
              step="0.1"
            />
          </div>
          <div className="space-y-2">
            <Label>Taxe de séjour (€/personne/nuit)</Label>
            <Input
              type="number"
              value={profile?.city_tax_per_night || 0}
              onChange={(e) => handleChange('city_tax_per_night', parseFloat(e.target.value))}
              min="0"
              step="0.01"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
