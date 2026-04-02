/**
 * FLOWTYM COMMAND PALETTE
 * CTRL+K - Recherche rapide
 * 
 * Actions:
 * - Rechercher client
 * - Ouvrir chambre
 * - Créer réservation
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Search, User, Bed, Calendar, Settings, FileText, Users,
  BarChart3, Wrench, Star, X, ArrowRight, Hash, Plus
} from 'lucide-react'

const COMMANDS = [
  {
    group: 'Actions rapides',
    items: [
      { id: 'new-reservation', icon: Plus, title: 'Nouvelle réservation', desc: 'Créer une réservation', shortcut: ['N'], action: 'reservation' },
      { id: 'checkin', icon: ArrowRight, title: 'Check-in', desc: 'Enregistrer une arrivée', shortcut: ['C', 'I'], action: 'checkin' },
      { id: 'checkout', icon: ArrowRight, title: 'Check-out', desc: 'Enregistrer un départ', shortcut: ['C', 'O'], action: 'checkout' },
    ]
  },
  {
    group: 'Navigation',
    items: [
      { id: 'go-planning', icon: Calendar, title: 'Planning', desc: 'Voir le planning des chambres', shortcut: ['G', 'P'], path: '/planning' },
      { id: 'go-flowboard', icon: BarChart3, title: 'Flowboard', desc: 'Dashboard global', shortcut: ['G', 'F'], path: '/flowboard' },
      { id: 'go-housekeeping', icon: Wrench, title: 'Housekeeping', desc: 'Gestion du ménage', shortcut: ['G', 'H'], path: '/housekeeping' },
      { id: 'go-channel', icon: Hash, title: 'Channel Manager', desc: 'Gestion des canaux', shortcut: ['G', 'C'], path: '/channel-manager' },
      { id: 'go-clients', icon: Users, title: 'Clients', desc: 'Liste des clients', shortcut: ['G', 'L'], path: '/clients' },
    ]
  },
  {
    group: 'Recherche',
    items: [
      { id: 'search-client', icon: User, title: 'Rechercher un client', desc: 'Trouver un client par nom', shortcut: ['/', 'C'], action: 'search-client' },
      { id: 'search-room', icon: Bed, title: 'Ouvrir une chambre', desc: 'Accéder à une chambre', shortcut: ['/', 'R'], action: 'search-room' },
      { id: 'search-reservation', icon: FileText, title: 'Trouver une réservation', desc: 'Rechercher par numéro', shortcut: ['/', 'B'], action: 'search-reservation' },
    ]
  },
  {
    group: 'Paramètres',
    items: [
      { id: 'settings', icon: Settings, title: 'Paramètres', desc: 'Configuration de l\'hôtel', shortcut: [','], path: '/settings' },
    ]
  },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Flatten commands for keyboard navigation
  const flatCommands = COMMANDS.flatMap(g => g.items)

  // Filter commands based on query
  const filteredGroups = query
    ? COMMANDS.map(group => ({
        ...group,
        items: group.items.filter(item =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.desc.toLowerCase().includes(query.toLowerCase())
        )
      })).filter(g => g.items.length > 0)
    : COMMANDS

  const filteredCommands = filteredGroups.flatMap(g => g.items)

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // CTRL+K or CMD+K to open
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
        setQuery('')
        setActiveIndex(0)
      }

      // Escape to close
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  // Handle navigation within palette
  const handleKeyNavigation = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => Math.min(prev + 1, filteredCommands.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const command = filteredCommands[activeIndex]
      if (command) executeCommand(command)
    }
  }, [filteredCommands, activeIndex])

  // Execute command
  const executeCommand = (command) => {
    setOpen(false)
    setQuery('')
    
    if (command.path) {
      navigate(command.path)
    } else if (command.action) {
      // Handle actions
      switch (command.action) {
        case 'reservation':
          navigate('/planning?new=true')
          break
        case 'checkin':
          navigate('/arrivals')
          break
        case 'checkout':
          navigate('/departures')
          break
        case 'search-client':
          navigate('/clients?search=true')
          break
        case 'search-room':
          navigate('/rooms?search=true')
          break
        case 'search-reservation':
          navigate('/reservations?search=true')
          break
        default:
          break
      }
    }
  }

  if (!open) return null

  return createPortal(
    <div 
      className="ft-command-overlay"
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div className="ft-command-dialog">
        {/* Search Input */}
        <div className="ft-command-input-wrapper">
          <Search size={20} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            className="ft-command-input"
            placeholder="Rechercher une action, un client, une chambre..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyNavigation}
          />
          <div className="ft-command-shortcut">
            <kbd>ESC</kbd>
          </div>
        </div>

        {/* Command List */}
        <div className="ft-command-list">
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
              <div key={group.group} className="ft-command-group">
                <div className="ft-command-group-title">{group.group}</div>
                {group.items.map((item) => {
                  const globalIndex = filteredCommands.indexOf(item)
                  const Icon = item.icon
                  return (
                    <div
                      key={item.id}
                      className={`ft-command-item ${globalIndex === activeIndex ? 'active' : ''}`}
                      onClick={() => executeCommand(item)}
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                    >
                      <div className="ft-command-item-icon">
                        <Icon size={16} />
                      </div>
                      <div className="ft-command-item-text">
                        <div className="ft-command-item-title">{item.title}</div>
                        <div className="ft-command-item-desc">{item.desc}</div>
                      </div>
                      <div className="ft-command-shortcut">
                        {item.shortcut.map((k, i) => (
                          <kbd key={i}>{k}</kbd>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Search size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>Aucun résultat pour "{query}"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '12px 16px', 
          borderTop: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '11px',
          color: 'var(--text-muted)'
        }}>
          <span><kbd>↑</kbd><kbd>↓</kbd> naviguer</span>
          <span><kbd>↵</kbd> sélectionner</span>
          <span><kbd>ESC</kbd> fermer</span>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default CommandPalette
