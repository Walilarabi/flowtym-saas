import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { toast } from 'sonner'

const HotelContext = createContext(null)

export const useHotel = () => {
  const context = useContext(HotelContext)
  if (!context) {
    throw new Error('useHotel must be used within a HotelProvider')
  }
  return context
}

export const HotelProvider = ({ children }) => {
  const { api, user, updateUser } = useAuth()
  const [hotels, setHotels] = useState([])
  const [currentHotel, setCurrentHotel] = useState(null)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchHotels = useCallback(async () => {
    try {
      const response = await api.get('/hotels')
      setHotels(response.data)
      if (response.data.length > 0) {
        const userHotel = user?.hotel_id 
          ? response.data.find(h => h.id === user.hotel_id)
          : response.data[0]
        setCurrentHotel(userHotel || response.data[0])
      }
    } catch (error) {
      console.error('Failed to fetch hotels:', error)
    } finally {
      setLoading(false)
    }
  }, [api, user?.hotel_id])

  const fetchRooms = useCallback(async () => {
    if (!currentHotel) return
    try {
      const response = await api.get(`/hotels/${currentHotel.id}/rooms`)
      setRooms(response.data)
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
    }
  }, [api, currentHotel])

  useEffect(() => {
    fetchHotels()
  }, [fetchHotels])

  useEffect(() => {
    if (currentHotel) {
      fetchRooms()
    }
  }, [currentHotel, fetchRooms])

  const createHotel = async (hotelData) => {
    try {
      const response = await api.post('/hotels', hotelData)
      setHotels((prev) => [...prev, response.data])
      setCurrentHotel(response.data)
      updateUser({ hotel_id: response.data.id })
      toast.success('Hotel cree avec succes')
      return response.data
    } catch (error) {
      toast.error('Erreur lors de la creation de l\'hotel')
      throw error
    }
  }

  const switchHotel = (hotel) => {
    setCurrentHotel(hotel)
    setRooms([])
  }

  const createRoom = async (roomData) => {
    if (!currentHotel) return
    try {
      const response = await api.post(`/hotels/${currentHotel.id}/rooms`, roomData)
      setRooms((prev) => [...prev, response.data])
      toast.success('Chambre creee avec succes')
      return response.data
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la creation de la chambre')
      throw error
    }
  }

  const value = {
    hotels,
    currentHotel,
    rooms,
    loading,
    fetchHotels,
    fetchRooms,
    createHotel,
    switchHotel,
    createRoom,
  }

  return <HotelContext.Provider value={value}>{children}</HotelContext.Provider>
}
