import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHotel } from '@/context/HotelContext'
import { toast } from 'sonner'
import { 
  QrCode, Plus, Trash2, RefreshCw, Download, Copy, Check,
  Building2, BedDouble, UtensilsCrossed, Sparkles, Dumbbell,
  Car, Coffee, Waves, Settings, Search, Filter, Eye, Printer
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import QRCode from 'react-qr-code'

// ═══════════════════════════════════════════════════════════════════════════════
// ZONE TYPE CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const ZONE_TYPES = {
  room: { label: 'Chambre', icon: BedDouble, color: 'bg-blue-100 text-blue-700' },
  breakfast: { label: 'Petit-déjeuner', icon: Coffee, color: 'bg-amber-100 text-amber-700' },
  restaurant: { label: 'Restaurant', icon: UtensilsCrossed, color: 'bg-orange-100 text-orange-700' },
  spa: { label: 'SPA', icon: Sparkles, color: 'bg-pink-100 text-pink-700' },
  pool: { label: 'Piscine', icon: Waves, color: 'bg-cyan-100 text-cyan-700' },
  gym: { label: 'Salle de sport', icon: Dumbbell, color: 'bg-emerald-100 text-emerald-700' },
  lobby: { label: 'Lobby', icon: Building2, color: 'bg-violet-100 text-violet-700' },
  parking: { label: 'Parking', icon: Car, color: 'bg-slate-100 text-slate-700' },
  custom: { label: 'Personnalisé', icon: Settings, color: 'bg-gray-100 text-gray-700' }
}

const QR_TYPES = {
  housekeeping: { label: 'Housekeeping', description: 'Suivi nettoyage avec chrono' },
  satisfaction: { label: 'Satisfaction', description: 'Enquête client multi-langues' }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const QRCodeManager = () => {
  const { api } = useAuth()
  const { currentHotel } = useHotel()
  
  // State
  const [loading, setLoading] = useState(true)
  const [zones, setZones] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  
  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showQRDialog, setShowQRDialog] = useState(false)
  const [showBatchDialog, setShowBatchDialog] = useState(false)
  const [selectedZone, setSelectedZone] = useState(null)
  
  // Create form
  const [form, setForm] = useState({
    name: '',
    zone_type: 'room',
    room_number: '',
    floor: 1,
    description: '',
    qr_types: ['housekeeping', 'satisfaction']
  })
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FETCH DATA
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const fetchZones = async () => {
    if (!currentHotel) return
    setLoading(true)
    try {
      const res = await api.get(`/qrcodes/hotels/${currentHotel.id}/zones`)
      setZones(res.data)
    } catch (err) {
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchZones()
  }, [currentHotel])
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Le nom est obligatoire')
      return
    }
    
    try {
      await api.post(`/qrcodes/hotels/${currentHotel.id}/zones`, form)
      toast.success('QR Code créé')
      setShowCreateDialog(false)
      setForm({
        name: '',
        zone_type: 'room',
        room_number: '',
        floor: 1,
        description: '',
        qr_types: ['housekeeping', 'satisfaction']
      })
      fetchZones()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur')
    }
  }
  
  const handleDelete = async (zoneId) => {
    if (!confirm('Supprimer ce QR Code ?')) return
    
    try {
      await api.delete(`/qrcodes/hotels/${currentHotel.id}/zones/${zoneId}`)
      toast.success('QR Code supprimé')
      fetchZones()
    } catch (err) {
      toast.error('Erreur lors de la suppression')
    }
  }
  
  const handleBatchCreate = async () => {
    try {
      const res = await api.post(`/qrcodes/hotels/${currentHotel.id}/zones/batch`, {
        zone_type: 'room',
        qr_types: ['housekeeping', 'satisfaction']
      })
      toast.success(`${res.data.created_count} QR Codes créés`)
      setShowBatchDialog(false)
      fetchZones()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur')
    }
  }
  
  const handleRegenerate = async (zoneId) => {
    if (!confirm('Régénérer le token ? L\'ancien QR code ne fonctionnera plus.')) return
    
    try {
      await api.post(`/qrcodes/hotels/${currentHotel.id}/zones/${zoneId}/regenerate-token`)
      toast.success('Token régénéré')
      fetchZones()
    } catch (err) {
      toast.error('Erreur')
    }
  }
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('URL copiée')
  }
  
  const openQRDialog = (zone) => {
    setSelectedZone(zone)
    setShowQRDialog(true)
  }
  
  const printQR = (zone) => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${zone.name}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
            h1 { margin-bottom: 10px; }
            .qr { margin: 20px 0; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <h1>${zone.name}</h1>
          ${zone.room_number ? `<p>Chambre ${zone.room_number}</p>` : ''}
          <div class="qr">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(zone.qr_url)}" />
          </div>
          <p>Scannez pour noter votre expérience</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FILTERED ZONES
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const filteredZones = zones.filter(z => {
    if (filterType !== 'all' && z.zone_type !== filterType) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!z.name.toLowerCase().includes(q) && !(z.room_number || '').toLowerCase().includes(q)) return false
    }
    return true
  })
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  
  return (
    <div className="space-y-6" data-testid="qr-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
            <QrCode className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Générateur de QR Codes</h2>
            <p className="text-sm text-slate-500">{zones.length} QR codes actifs</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBatchDialog(true)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Génération en masse
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Créer un QR Code
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex gap-3 bg-white rounded-lg border border-slate-200 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Type de zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(ZONE_TYPES).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full spinner" />
        </div>
      ) : filteredZones.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          Aucun QR Code trouvé
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredZones.map(zone => {
            const typeConfig = ZONE_TYPES[zone.zone_type] || ZONE_TYPES.custom
            const Icon = typeConfig.icon
            
            return (
              <div key={zone.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeConfig.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">{zone.name}</h3>
                      <p className="text-xs text-slate-500">
                        {zone.room_number ? `Chambre ${zone.room_number}` : typeConfig.label}
                      </p>
                    </div>
                  </div>
                  <Badge className={zone.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                    {zone.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
                
                {/* QR Types */}
                <div className="flex gap-2 mb-4">
                  {zone.qr_types?.map(type => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {QR_TYPES[type]?.label || type}
                    </Badge>
                  ))}
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openQRDialog(zone)}>
                    <Eye className="w-3 h-3 mr-1" />
                    Voir
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => printQR(zone)}>
                    <Printer className="w-3 h-3 mr-1" />
                    Imprimer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(zone.qr_url)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(zone.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* CREATE DIALOG */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer un QR Code</DialogTitle>
            <DialogDescription>
              Créez un QR Code pour une zone spécifique de l'hôtel.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Type de zone *</Label>
              <Select value={form.zone_type} onValueChange={v => setForm({...form, zone_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ZONE_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label>Nom *</Label>
              <Input
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Ex: Chambre 201, Restaurant Le Jardin..."
              />
            </div>
            
            {form.zone_type === 'room' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Numéro de chambre</Label>
                  <Input
                    value={form.room_number}
                    onChange={e => setForm({...form, room_number: e.target.value})}
                    placeholder="201"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Étage</Label>
                  <Input
                    type="number"
                    value={form.floor}
                    onChange={e => setForm({...form, floor: parseInt(e.target.value) || 1})}
                  />
                </div>
              </div>
            )}
            
            <div className="grid gap-2">
              <Label>Description (optionnel)</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Notes additionnelles..."
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Types de QR Code</Label>
              <div className="space-y-2">
                {Object.entries(QR_TYPES).map(([key, config]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={form.qr_types.includes(key)}
                      onCheckedChange={checked => {
                        if (checked) {
                          setForm({...form, qr_types: [...form.qr_types, key]})
                        } else {
                          setForm({...form, qr_types: form.qr_types.filter(t => t !== key)})
                        }
                      }}
                    />
                    <span className="text-sm font-medium">{config.label}</span>
                    <span className="text-xs text-slate-500">— {config.description}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
            <Button onClick={handleCreate}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* QR VIEW DIALOG */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedZone?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedZone && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-lg border-2 border-dashed border-violet-200">
                <QRCode value={selectedZone.qr_url} size={200} />
              </div>
              
              <div className="text-center">
                <p className="text-sm text-slate-500 break-all">{selectedZone.qr_url}</p>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => copyToClipboard(selectedZone.qr_url)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copier l'URL
                </Button>
                <Button onClick={() => printQR(selectedZone)}>
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimer
                </Button>
              </div>
              
              <Button
                variant="ghost"
                className="text-amber-600"
                onClick={() => {
                  handleRegenerate(selectedZone.id)
                  setShowQRDialog(false)
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Régénérer le token
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* BATCH DIALOG */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Génération en masse</DialogTitle>
            <DialogDescription>
              Créer automatiquement un QR Code pour chaque chambre de l'hôtel qui n'en a pas encore.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-slate-600">
              Cette action va créer des QR Codes pour toutes les chambres sans QR Code existant.
              Chaque QR Code inclura les fonctionnalités Housekeeping et Satisfaction.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDialog(false)}>Annuler</Button>
            <Button onClick={handleBatchCreate}>Générer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default QRCodeManager
