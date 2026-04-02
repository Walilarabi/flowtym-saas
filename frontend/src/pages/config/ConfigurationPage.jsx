/**
 * Flowtym Configuration Module - Main Component
 * 
 * Central configuration hub for hotel management
 */
import React, { useState, useEffect } from 'react';
import { Building2, BedDouble, Tag, FileText, Users, Settings, Upload, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useHotel } from '../../context/HotelContext';

// Sub-components
import HotelProfileSection from './components/HotelProfileSection';
import RoomTypesSection from './components/RoomTypesSection';
import RoomsSection from './components/RoomsSection';
import RatePlansSection from './components/RatePlansSection';
import PoliciesSection from './components/PoliciesSection';
import UsersSection from './components/UsersSection';
import SettingsSection from './components/SettingsSection';

import { getConfigurationSummary } from './configApi';

const CONFIG_SECTIONS = [
  { id: 'profile', label: 'Profil Hôtel', icon: Building2, description: 'Informations générales' },
  { id: 'room-types', label: 'Typologies', icon: BedDouble, description: 'Catégories de chambres' },
  { id: 'rooms', label: 'Chambres', icon: BedDouble, description: 'Inventaire physique' },
  { id: 'rates', label: 'Plans Tarifaires', icon: Tag, description: 'Tarifs et dérivations' },
  { id: 'policies', label: 'Conditions', icon: FileText, description: 'Annulation et paiement' },
  { id: 'users', label: 'Utilisateurs', icon: Users, description: 'Accès et rôles' },
  { id: 'settings', label: 'Paramètres', icon: Settings, description: 'Taxes et segments' },
];

export default function ConfigurationPage() {
  const { user } = useAuth();
  const { currentHotel } = useHotel();
  const [activeSection, setActiveSection] = useState('profile');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Get hotelId from context or user
  const hotelId = currentHotel?.id || user?.hotel_id;

  useEffect(() => {
    if (hotelId) {
      loadSummary(hotelId);
    }
  }, [hotelId]);

  const loadSummary = async (id) => {
    // Verify auth token exists before making API call
    const token = localStorage.getItem('flowtym_token');
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const data = await getConfigurationSummary(id);
      setSummary(data);
    } catch (err) {
      // Only show error if user is authenticated
      if (localStorage.getItem('flowtym_token')) {
        console.error('Failed to load summary:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshSummary = () => {
    if (hotelId) loadSummary(hotelId);
  };

  const renderSection = () => {
    if (!hotelId) return null;
    
    const props = { hotelId, onUpdate: refreshSummary };
    
    switch (activeSection) {
      case 'profile':
        return <HotelProfileSection {...props} />;
      case 'room-types':
        return <RoomTypesSection {...props} />;
      case 'rooms':
        return <RoomsSection {...props} />;
      case 'rates':
        return <RatePlansSection {...props} />;
      case 'policies':
        return <PoliciesSection {...props} />;
      case 'users':
        return <UsersSection {...props} />;
      case 'settings':
        return <SettingsSection {...props} />;
      default:
        return <HotelProfileSection {...props} />;
    }
  };

  const getChecklistStatus = (id) => {
    if (!summary?.checklist) return null;
    switch (id) {
      case 'profile': return summary.checklist.profile;
      case 'room-types': return summary.checklist.room_types;
      case 'rooms': return summary.checklist.rooms;
      case 'rates': return summary.checklist.rate_plans;
      case 'policies': return summary.checklist.policies;
      case 'users': return summary.checklist.users;
      case 'settings': return summary.checklist.taxes;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="configuration-page">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Configuration
              </h1>
              <p className="text-slate-500 mt-1">
                Paramétrez votre établissement en quelques étapes
              </p>
            </div>
            
            {/* Progress indicator */}
            {summary && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-slate-500">Progression</div>
                  <div className="text-2xl font-bold text-violet-600">
                    {summary.completion_percentage}%
                  </div>
                </div>
                <div className="w-32">
                  <Progress value={summary.completion_percentage} className="h-2" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-72 flex-shrink-0">
            <Card className="sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                  Sections
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {CONFIG_SECTIONS.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    const isComplete = getChecklistStatus(section.id);
                    
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        data-testid={`nav-${section.id}`}
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all
                          ${isActive 
                            ? 'bg-violet-50 text-violet-700 border border-violet-200' 
                            : 'hover:bg-slate-50 text-slate-700'
                          }
                        `}
                      >
                        <div className={`
                          p-2 rounded-lg 
                          ${isActive ? 'bg-violet-100' : 'bg-slate-100'}
                        `}>
                          <Icon className={`h-4 w-4 ${isActive ? 'text-violet-600' : 'text-slate-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{section.label}</div>
                          <div className="text-xs text-slate-500 truncate">{section.description}</div>
                        </div>
                        {isComplete !== null && (
                          isComplete ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                          )
                        )}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            {summary && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                    Résumé
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Types de chambres</span>
                    <span className="font-medium">{summary.room_types}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chambres</span>
                    <span className="font-medium">{summary.rooms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Plans tarifaires</span>
                    <span className="font-medium">{summary.rate_plans}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Utilisateurs</span>
                    <span className="font-medium">{summary.users}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto" />
                  <p className="mt-4 text-slate-500">Chargement...</p>
                </CardContent>
              </Card>
            ) : (
              renderSection()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
