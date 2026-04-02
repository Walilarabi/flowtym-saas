/**
 * Room Types Section
 */
import React, { useState, useEffect } from 'react';
import { BedDouble, Plus, Edit2, Trash2, Eye, Save, X, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { toast } from 'sonner';
import { getRoomTypes, createRoomType, updateRoomType, deleteRoomType } from '../configApi';

const CATEGORIES = [
  { value: 'standard', label: 'Standard' },
  { value: 'superior', label: 'Supérieure' },
  { value: 'deluxe', label: 'Deluxe' },
  { value: 'premium', label: 'Premium' },
  { value: 'suite', label: 'Suite' },
  { value: 'junior_suite', label: 'Junior Suite' },
  { value: 'executive', label: 'Executive' },
  { value: 'presidential', label: 'Présidentielle' },
];

const VIEWS = [
  { value: 'none', label: 'Sans vue' },
  { value: 'city', label: 'Ville' },
  { value: 'sea', label: 'Mer' },
  { value: 'garden', label: 'Jardin' },
  { value: 'pool', label: 'Piscine' },
  { value: 'mountain', label: 'Montagne' },
  { value: 'courtyard', label: 'Cour' },
  { value: 'park', label: 'Parc' },
];

const BATHROOMS = [
  { value: 'shower', label: 'Douche' },
  { value: 'bathtub', label: 'Baignoire' },
  { value: 'both', label: 'Douche + Baignoire' },
  { value: 'jacuzzi', label: 'Jacuzzi' },
];

const CATEGORY_COLORS = {
  standard: 'bg-slate-100 text-slate-700',
  superior: 'bg-blue-100 text-blue-700',
  deluxe: 'bg-violet-100 text-violet-700',
  premium: 'bg-amber-100 text-amber-700',
  suite: 'bg-emerald-100 text-emerald-700',
  junior_suite: 'bg-teal-100 text-teal-700',
  executive: 'bg-rose-100 text-rose-700',
  presidential: 'bg-purple-100 text-purple-700',
};

const initialForm = {
  code: '',
  name: '',
  name_en: '',
  category: 'standard',
  max_occupancy: 2,
  max_adults: 2,
  max_children: 1,
  base_price: 100,
  size_sqm: null,
  view: 'none',
  bathroom: 'shower',
  equipment: [],
  description: ''
};

export default function RoomTypesSection({ hotelId, onUpdate }) {
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [hotelId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getRoomTypes(hotelId);
      setRoomTypes(data);
    } catch (err) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingType(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setForm({
      code: type.code,
      name: type.name,
      name_en: type.name_en || '',
      category: type.category,
      max_occupancy: type.max_occupancy,
      max_adults: type.max_adults,
      max_children: type.max_children,
      base_price: type.base_price,
      size_sqm: type.size_sqm,
      view: type.view || 'none',
      bathroom: type.bathroom || 'shower',
      equipment: type.equipment || [],
      description: type.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (type) => {
    if (!window.confirm(`Supprimer le type "${type.name}" ?`)) return;
    
    try {
      await deleteRoomType(hotelId, type.id);
      toast.success('Type supprimé');
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

    try {
      setSaving(true);
      if (editingType) {
        await updateRoomType(hotelId, editingType.id, form);
        toast.success('Type mis à jour');
      } else {
        await createRoomType(hotelId, form);
        toast.success('Type créé');
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

  const getCategoryLabel = (value) => CATEGORIES.find(c => c.value === value)?.label || value;

  return (
    <div className="space-y-6" data-testid="room-types-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-100 rounded-xl">
            <BedDouble className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Typologies de chambres</h2>
            <p className="text-sm text-slate-500">Définissez vos catégories de chambres</p>
          </div>
        </div>
        <Button onClick={handleAdd} data-testid="add-room-type-btn">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un type
        </Button>
      </div>

      {/* Room Types Grid */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto" />
          </CardContent>
        </Card>
      ) : roomTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BedDouble className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aucun type de chambre configuré</p>
            <Button className="mt-4" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Créer votre premier type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roomTypes.map((type) => (
            <Card 
              key={type.id} 
              className="hover:border-violet-300 transition-colors"
              data-testid={`room-type-card-${type.code}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {type.code}
                      </Badge>
                      <Badge className={CATEGORY_COLORS[type.category] || CATEGORY_COLORS.standard}>
                        {getCategoryLabel(type.category)}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-lg text-slate-900">{type.name}</h3>
                    {type.name_en && (
                      <p className="text-sm text-slate-500">{type.name_en}</p>
                    )}
                    
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500 flex items-center gap-1">
                          <Users className="h-3 w-3" /> Capacité
                        </span>
                        <span className="font-medium">{type.max_occupancy} pers.</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Tarif base</span>
                        <span className="font-medium block">{type.base_price}€</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Chambres</span>
                        <span className="font-medium block">{type.room_count || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(type)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(type)}
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
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Modifier le type de chambre' : 'Nouveau type de chambre'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="STD"
                maxLength={10}
                data-testid="room-type-code-input"
              />
              <p className="text-xs text-slate-500">2-10 caractères, majuscules</p>
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nom (FR) *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Chambre Standard"
                data-testid="room-type-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Nom (EN)</Label>
              <Input
                value={form.name_en}
                onChange={(e) => setForm(f => ({ ...f, name_en: e.target.value }))}
                placeholder="Standard Room"
              />
            </div>
            <div className="space-y-2">
              <Label>Capacité max</Label>
              <Input
                type="number"
                value={form.max_occupancy}
                onChange={(e) => setForm(f => ({ ...f, max_occupancy: parseInt(e.target.value) || 1 }))}
                min="1"
                max="10"
              />
            </div>
            <div className="space-y-2">
              <Label>Adultes max</Label>
              <Input
                type="number"
                value={form.max_adults}
                onChange={(e) => setForm(f => ({ ...f, max_adults: parseInt(e.target.value) || 1 }))}
                min="1"
                max="10"
              />
            </div>
            <div className="space-y-2">
              <Label>Tarif de base (€)</Label>
              <Input
                type="number"
                value={form.base_price}
                onChange={(e) => setForm(f => ({ ...f, base_price: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="5"
                data-testid="room-type-price-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Surface (m²)</Label>
              <Input
                type="number"
                value={form.size_sqm || ''}
                onChange={(e) => setForm(f => ({ ...f, size_sqm: parseFloat(e.target.value) || null }))}
                min="0"
                placeholder="25"
              />
            </div>
            <div className="space-y-2">
              <Label>Vue</Label>
              <Select value={form.view} onValueChange={(v) => setForm(f => ({ ...f, view: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIEWS.map(v => (
                    <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Salle de bain</Label>
              <Select value={form.bathroom} onValueChange={(v) => setForm(f => ({ ...f, bathroom: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BATHROOMS.map(b => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Équipements (séparés par virgule)</Label>
              <Input
                value={form.equipment?.join(', ') || ''}
                onChange={(e) => setForm(f => ({ 
                  ...f, 
                  equipment: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                }))}
                placeholder="wifi, tv, minibar, coffre, climatisation"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description || ''}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description du type de chambre..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving} data-testid="save-room-type-btn">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
