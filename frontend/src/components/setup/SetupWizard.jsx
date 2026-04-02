import { useState } from 'react'
import { useHotel } from '@/context/HotelContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Building2, MapPin, Star, Plus, Check } from 'lucide-react'

const ROOM_TYPES = [
  { value: 'single', label: 'Simple' },
  { value: 'double', label: 'Double' },
  { value: 'twin', label: 'Twin' },
  { value: 'suite', label: 'Suite' },
  { value: 'family', label: 'Familiale' },
]

export const SetupWizard = () => {
  const { createHotel, createRoom, currentHotel, rooms } = useHotel()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hotelData, setHotelData] = useState({ name: '', address: '', city: '', country: 'France', stars: 3 })
  const [roomData, setRoomData] = useState({ number: '', room_type: 'double', floor: 1, max_occupancy: 2, base_price: 100 })

  const handleCreateHotel = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createHotel(hotelData)
      setStep(2)
    } catch (error) {}
    finally { setLoading(false) }
  }

  const handleAddRoom = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createRoom(roomData)
      setRoomData((prev) => ({ ...prev, number: '' }))
    } catch (error) {}
    finally { setLoading(false) }
  }

  const handleFinish = () => {
    if (rooms.length === 0) { toast.error('Veuillez ajouter au moins une chambre'); return }
    window.location.reload()
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-violet-600' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 1 ? 'bg-violet-600 text-white' : 'bg-slate-200'}`}>
              {step > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <span className="font-medium">Hotel</span>
          </div>
          <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-violet-600' : 'bg-slate-200'}`} />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-violet-600' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 2 ? 'bg-violet-600 text-white' : 'bg-slate-200'}`}>2</div>
            <span className="font-medium">Chambres</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          {step === 1 && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-violet-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Bienvenue sur Flowtym</h1>
                <p className="text-slate-500">Commencez par configurer votre hotel</p>
              </div>
              <form onSubmit={handleCreateHotel} className="space-y-5">
                <div className="space-y-2">
                  <Label>Nom de l'hotel *</Label>
                  <Input value={hotelData.name} onChange={(e) => setHotelData({ ...hotelData, name: e.target.value })} placeholder="Hotel Le Provencal" required data-testid="input-hotel-name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ville</Label>
                    <Input value={hotelData.city} onChange={(e) => setHotelData({ ...hotelData, city: e.target.value })} placeholder="Aix-en-Provence" data-testid="input-hotel-city" />
                  </div>
                  <div className="space-y-2">
                    <Label>Etoiles</Label>
                    <Select value={String(hotelData.stars)} onValueChange={(v) => setHotelData({ ...hotelData, stars: parseInt(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            <div className="flex items-center gap-1">{Array.from({length: n}).map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}</div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700" disabled={loading || !hotelData.name} data-testid="btn-create-hotel">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spinner" /> : 'Continuer'}
                </Button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-emerald-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Ajoutez vos chambres</h1>
                <p className="text-slate-500">Configurez l'inventaire de {currentHotel?.name}</p>
              </div>
              {rooms.length > 0 && (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-2">Chambres ajoutees ({rooms.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {rooms.map((room) => (
                      <span key={room.id} className="px-3 py-1 bg-white border border-slate-200 rounded-md text-sm">{room.number}</span>
                    ))}
                  </div>
                </div>
              )}
              <form onSubmit={handleAddRoom} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Numero *</Label>
                    <Input value={roomData.number} onChange={(e) => setRoomData({ ...roomData, number: e.target.value })} placeholder="101" required data-testid="input-room-number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={roomData.room_type} onValueChange={(v) => setRoomData({ ...roomData, room_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ROOM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="submit" variant="outline" className="flex-1" disabled={loading || !roomData.number} data-testid="btn-add-room">
                    <Plus className="w-4 h-4 mr-2" />Ajouter
                  </Button>
                  <Button type="button" onClick={handleFinish} className="flex-1 bg-violet-600 hover:bg-violet-700" disabled={rooms.length === 0} data-testid="btn-finish-setup">
                    Terminer
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
