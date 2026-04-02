import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useHotel } from '@/context/HotelContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const LANGUAGES = [
  { value: 'fr', label: 'Francais' },
  { value: 'en', label: 'Anglais' },
  { value: 'es', label: 'Espagnol' },
  { value: 'de', label: 'Allemand' },
  { value: 'it', label: 'Italien' },
];

const TAGS = ['VIP', 'Affaires', 'Famille', 'Regulier', 'Groupe'];

export const ClientForm = ({ onSuccess, onCancel, initialData = null }) => {
  const { api } = useAuth();
  const { currentHotel } = useHotel();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    country: initialData?.country || 'France',
    language: initialData?.language || 'fr',
    birth_date: initialData?.birth_date || '',
    company: initialData?.company || '',
    vat_number: initialData?.vat_number || '',
    tags: initialData?.tags || [],
    notes: initialData?.notes || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name) {
      toast.error('Veuillez renseigner le nom et prenom');
      return;
    }
    
    setLoading(true);
    try {
      if (initialData?.id) {
        await api.put(`/hotels/${currentHotel.id}/clients/${initialData.id}`, formData);
        toast.success('Client mis a jour');
      } else {
        await api.post(`/hotels/${currentHotel.id}/clients`, formData);
        toast.success('Client cree avec succes');
      }
      onSuccess?.();
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement du client');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      {/* Identity */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Identite</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Prenom *</Label>
            <Input
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="Jean"
              required
              data-testid="input-client-firstname"
            />
          </div>
          <div className="space-y-2">
            <Label>Nom *</Label>
            <Input
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Dupont"
              required
              data-testid="input-client-lastname"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="jean@email.com"
              data-testid="input-client-email"
            />
          </div>
          <div className="space-y-2">
            <Label>Telephone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+33 6 12 34 56 78"
              data-testid="input-client-phone"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Adresse</h3>
        <div className="space-y-2">
          <Label>Adresse</Label>
          <Input
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="123 Rue de la Paix"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ville</Label>
            <Input
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Paris"
            />
          </div>
          <div className="space-y-2">
            <Label>Pays</Label>
            <Input
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="France"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Langue</Label>
          <Select
            value={formData.language}
            onValueChange={(v) => setFormData({ ...formData, language: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Company */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Entreprise (optionnel)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Societe</Label>
            <Input
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Nom de l'entreprise"
            />
          </div>
          <div className="space-y-2">
            <Label>N TVA</Label>
            <Input
              value={formData.vat_number}
              onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
              placeholder="FR12345678901"
            />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Tags</h3>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                formData.tags.includes(tag)
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              data-testid={`tag-${tag}`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes internes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Notes sur le client..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-violet-600 hover:bg-violet-700"
          disabled={loading}
          data-testid="btn-submit-client"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spinner" />
          ) : initialData ? (
            'Mettre a jour'
          ) : (
            'Creer le client'
          )}
        </Button>
      </div>
    </form>
  );
};
