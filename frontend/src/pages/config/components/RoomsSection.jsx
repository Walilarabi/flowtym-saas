/**
 * Rooms Section with Excel Import
 */
import React, { useState, useEffect, useRef } from 'react';
import { BedDouble, Plus, Edit2, Trash2, Upload, Download, FileSpreadsheet, Check, AlertCircle, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Checkbox } from '../../../components/ui/checkbox';
import { toast } from 'sonner';
import { 
  getRooms, getRoomTypes, createRoom, updateRoom, deleteRoom,
  downloadRoomTemplate, previewRoomImport, confirmRoomImport 
} from '../configApi';

const STATUS_COLORS = {
  available: 'bg-emerald-100 text-emerald-700',
  occupied: 'bg-blue-100 text-blue-700',
  cleaning: 'bg-amber-100 text-amber-700',
  maintenance: 'bg-orange-100 text-orange-700',
  out_of_order: 'bg-red-100 text-red-700',
  out_of_service: 'bg-slate-100 text-slate-700',
};

const STATUS_LABELS = {
  available: 'Disponible',
  occupied: 'Occupée',
  cleaning: 'Nettoyage',
  maintenance: 'Maintenance',
  out_of_order: 'Hors service',
  out_of_service: 'Fermée',
};

const VIEW_LABELS = {
  none: 'Sans vue',
  city: 'Ville',
  sea: 'Mer',
  garden: 'Jardin',
  pool: 'Piscine',
  mountain: 'Montagne',
  courtyard: 'Cour',
  park: 'Parc',
};

export default function RoomsSection({ hotelId, onUpdate }) {
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterFloor, setFilterFloor] = useState('all');
  
  // Import state
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [hotelId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roomsData, typesData] = await Promise.all([
        getRooms(hotelId),
        getRoomTypes(hotelId)
      ]);
      setRooms(roomsData);
      setRoomTypes(typesData);
    } catch (err) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (roomTypes.length === 0) {
      toast.error('Créez d\'abord au moins un type de chambre');
      return;
    }
    setEditingRoom(null);
    setForm({
      room_number: '',
      room_type_id: roomTypes[0]?.id || '',
      floor: 1,
      view: 'none',
      bathroom: 'shower',
      is_accessible: false,
      notes: ''
    });
    setShowModal(true);
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setForm({
      room_number: room.room_number,
      room_type_id: room.room_type_id,
      floor: room.floor,
      view: room.view || 'none',
      bathroom: room.bathroom || 'shower',
      is_accessible: room.is_accessible || false,
      notes: room.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (room) => {
    if (!window.confirm(`Supprimer la chambre ${room.room_number} ?`)) return;
    
    try {
      await deleteRoom(hotelId, room.id);
      toast.success('Chambre supprimée');
      loadData();
      onUpdate?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSave = async () => {
    if (!form.room_number || !form.room_type_id) {
      toast.error('Numéro et type sont requis');
      return;
    }

    try {
      setSaving(true);
      if (editingRoom) {
        await updateRoom(hotelId, editingRoom.id, form);
        toast.success('Chambre mise à jour');
      } else {
        await createRoom(hotelId, form);
        toast.success('Chambre créée');
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

  // Excel Import Functions
  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadRoomTemplate(hotelId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_chambres_flowtym.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Template téléchargé');
    } catch (err) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportFile(file);
    setImportLoading(true);
    
    try {
      const preview = await previewRoomImport(hotelId, file);
      setImportPreview(preview);
    } catch (err) {
      toast.error(err.message);
      setImportFile(null);
      setImportPreview(null);
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importFile) return;
    
    try {
      setImportLoading(true);
      const result = await confirmRoomImport(hotelId, importFile, updateExisting);
      toast.success(result.message);
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview(null);
      loadData();
      onUpdate?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImportLoading(false);
    }
  };

  // Filtering
  const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);
  
  const filteredRooms = rooms.filter(r => {
    if (filterType !== 'all' && r.room_type_id !== filterType) return false;
    if (filterFloor !== 'all' && r.floor !== parseInt(filterFloor)) return false;
    return true;
  });

  // Group by floor for display
  const roomsByFloor = filteredRooms.reduce((acc, room) => {
    const floor = room.floor;
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {});

  return (
    <div className="space-y-6" data-testid="rooms-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-100 rounded-xl">
            <BedDouble className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Inventaire des chambres</h2>
            <p className="text-sm text-slate-500">{rooms.length} chambre{rooms.length > 1 ? 's' : ''} configurée{rooms.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)} data-testid="import-rooms-btn">
            <Upload className="h-4 w-4 mr-2" />
            Importer Excel
          </Button>
          <Button onClick={handleAdd} data-testid="add-room-btn">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-slate-400" />
            <div className="flex items-center gap-2">
              <Label className="text-sm">Type:</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {roomTypes.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Étage:</Label>
              <Select value={filterFloor} onValueChange={setFilterFloor}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {floors.map(f => (
                    <SelectItem key={f} value={String(f)}>Étage {f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm text-slate-500 ml-auto">
              {filteredRooms.length} chambre{filteredRooms.length > 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Rooms Grid */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto" />
          </CardContent>
        </Card>
      ) : rooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BedDouble className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">Aucune chambre configurée</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setShowImportModal(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importer depuis Excel
              </Button>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter manuellement
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(roomsByFloor).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([floor, floorRooms]) => (
            <Card key={floor}>
              <CardHeader className="py-3 bg-slate-50 border-b">
                <CardTitle className="text-sm font-medium">
                  Étage {floor} <span className="text-slate-400 font-normal">({floorRooms.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {floorRooms.sort((a, b) => a.room_number.localeCompare(b.room_number)).map(room => (
                    <div
                      key={room.id}
                      className="group relative p-3 bg-white border rounded-lg hover:border-violet-300 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => handleEdit(room)}
                      data-testid={`room-card-${room.room_number}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-lg">{room.room_number}</span>
                        <Badge className={`text-xs ${STATUS_COLORS[room.status] || STATUS_COLORS.available}`}>
                          {STATUS_LABELS[room.status] || 'Disponible'}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-500">{room.room_type_name || room.room_type_code}</div>
                      {room.view && room.view !== 'none' && (
                        <div className="text-xs text-slate-400 mt-1">Vue {VIEW_LABELS[room.view]}</div>
                      )}
                      {room.is_accessible && (
                        <Badge variant="outline" className="text-xs mt-2">PMR</Badge>
                      )}
                      <button
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                        onClick={(e) => { e.stopPropagation(); handleDelete(room); }}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? `Modifier chambre ${editingRoom.room_number}` : 'Nouvelle chambre'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Numéro *</Label>
              <Input
                value={form.room_number || ''}
                onChange={(e) => setForm(f => ({ ...f, room_number: e.target.value }))}
                placeholder="101"
                data-testid="room-number-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={form.room_type_id} onValueChange={(v) => setForm(f => ({ ...f, room_type_id: v }))}>
                <SelectTrigger data-testid="room-type-select">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Étage</Label>
              <Input
                type="number"
                value={form.floor || 1}
                onChange={(e) => setForm(f => ({ ...f, floor: parseInt(e.target.value) || 1 }))}
                min="-5"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label>Vue</Label>
              <Select value={form.view || 'none'} onValueChange={(v) => setForm(f => ({ ...f, view: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VIEW_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox
                id="accessible"
                checked={form.is_accessible || false}
                onCheckedChange={(v) => setForm(f => ({ ...f, is_accessible: v }))}
              />
              <Label htmlFor="accessible" className="cursor-pointer">Chambre accessible PMR</Label>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notes</Label>
              <Input
                value={form.notes || ''}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Remarques..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="save-room-btn">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={(open) => {
        setShowImportModal(open);
        if (!open) {
          setImportFile(null);
          setImportPreview(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importer des chambres depuis Excel
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Step 1: Download template */}
            <div className="p-4 bg-slate-50 rounded-lg border border-dashed">
              <h3 className="font-medium mb-2">1. Télécharger le template</h3>
              <p className="text-sm text-slate-500 mb-3">
                Utilisez notre modèle Excel pour préparer vos données.
              </p>
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger le template
              </Button>
            </div>

            {/* Step 2: Upload file */}
            <div className="p-4 bg-slate-50 rounded-lg border border-dashed">
              <h3 className="font-medium mb-2">2. Importer votre fichier</h3>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".xlsx,.xls"
                className="hidden"
              />
              {!importFile ? (
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Sélectionner un fichier Excel
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                  <span className="font-medium">{importFile.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setImportFile(null);
                    setImportPreview(null);
                  }}>
                    Changer
                  </Button>
                </div>
              )}
            </div>

            {/* Preview */}
            {importLoading && (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto" />
                <p className="mt-2 text-slate-500">Analyse en cours...</p>
              </div>
            )}

            {importPreview && (
              <div className="space-y-4">
                <h3 className="font-medium">3. Aperçu de l'import</h3>
                
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-emerald-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-emerald-600">{importPreview.new_rooms_count}</div>
                    <div className="text-sm text-slate-600">Nouvelles</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-amber-600">{importPreview.update_count}</div>
                    <div className="text-sm text-slate-600">Existantes</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">{importPreview.error_count}</div>
                    <div className="text-sm text-slate-600">Erreurs</div>
                  </div>
                </div>

                {/* By type */}
                {Object.keys(importPreview.by_type || {}).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Par type:</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(importPreview.by_type).map(([type, count]) => (
                        <Badge key={type} variant="outline">{type}: {count}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {importPreview.errors?.length > 0 && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Erreurs ({importPreview.error_count})
                    </h4>
                    <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                      {importPreview.errors.slice(0, 10).map((err, idx) => (
                        <div key={idx} className="text-red-600">
                          Ligne {err.row}: {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Update existing option */}
                {importPreview.update_count > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
                    <Checkbox
                      id="update-existing"
                      checked={updateExisting}
                      onCheckedChange={setUpdateExisting}
                    />
                    <Label htmlFor="update-existing" className="cursor-pointer text-sm">
                      Mettre à jour les {importPreview.update_count} chambre(s) existante(s)
                    </Label>
                  </div>
                )}

                {/* Types info */}
                <div className="text-sm text-slate-500">
                  Types disponibles: {importPreview.room_types_available?.join(', ')}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportModal(false)}>Annuler</Button>
            <Button 
              onClick={handleConfirmImport} 
              disabled={!importPreview?.can_proceed || importLoading}
              data-testid="confirm-import-btn"
            >
              <Check className="h-4 w-4 mr-2" />
              Importer {importPreview?.new_rooms_count || 0} chambre(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
