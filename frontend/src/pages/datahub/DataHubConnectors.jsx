import { useState, useEffect, useCallback } from 'react';
import { 
  Plugs, 
  CheckCircle, 
  XCircle, 
  ArrowsClockwise,
  Gear,
  Play,
  TestTube,
  Clock,
  Warning,
  CaretRight
} from '@phosphor-icons/react';
import { DataHubNav, DataHubBreadcrumb } from '../../components/datahub/DataHubNav';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_BACKEND_URL || '';
const HOTEL_ID = 'test-hotel-001';

const connectorMeta = {
  mews: { 
    icon: '🏨', 
    color: 'violet',
    description: 'Property Management System - Réservations, clients, chambres'
  },
  booking_com: { 
    icon: '🌐', 
    color: 'blue',
    description: 'OTA - Réservations Booking.com avec commission 15%'
  },
  dedge: { 
    icon: '📡', 
    color: 'emerald',
    description: 'Channel Manager - Distribution multi-canaux'
  },
  stripe: { 
    icon: '💳', 
    color: 'violet',
    description: 'Paiements - Transactions et remboursements'
  },
  lighthouse: { 
    icon: '📊', 
    color: 'amber',
    description: 'Rate Shopper - Intelligence concurrentielle'
  }
};

export default function DataHubConnectors() {
  const [connectors, setConnectors] = useState([]);
  const [hotelConnectors, setHotelConnectors] = useState({});
  const [loading, setLoading] = useState(true);
  const [testingConnector, setTestingConnector] = useState(null);
  const [syncingConnector, setSyncingConnector] = useState(null);
  const [configModal, setConfigModal] = useState({ open: false, connector: null });
  const [testResults, setTestResults] = useState({});

  const fetchConnectors = useCallback(async () => {
    try {
      const [availableRes, hotelRes] = await Promise.all([
        fetch(`${API_URL}/api/datahub/connectors/available`),
        fetch(`${API_URL}/api/datahub/hotels/${HOTEL_ID}/connectors`)
      ]);

      if (availableRes.ok) {
        const data = await availableRes.json();
        setConnectors(data.connectors || []);
      }
      if (hotelRes.ok) {
        const data = await hotelRes.json();
        const mapped = {};
        (data.connectors || []).forEach(c => {
          mapped[c.connector_name] = c;
        });
        setHotelConnectors(mapped);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur de chargement des connecteurs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  const handleTestConnection = async (connectorName) => {
    setTestingConnector(connectorName);
    try {
      const res = await fetch(`${API_URL}/api/datahub/hotels/${HOTEL_ID}/connectors/${connectorName}/test`);
      const data = await res.json();
      
      setTestResults(prev => ({ ...prev, [connectorName]: data }));
      
      if (data.success) {
        toast.success(`${connectorName}: Connexion réussie`);
      } else {
        toast.error(`${connectorName}: Échec de connexion`);
      }
    } catch (error) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setTestingConnector(null);
    }
  };

  const handleSync = async (connectorName) => {
    setSyncingConnector(connectorName);
    try {
      const res = await fetch(`${API_URL}/api/datahub/hotels/${HOTEL_ID}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connector_name: connectorName,
          entity_type: 'reservations',
          from_date: new Date().toISOString().split('T')[0],
          to_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
      });

      const data = await res.json();
      
      if (data.status === 'success' || data.status === 'partial') {
        toast.success(`Sync terminé: ${data.processed_records} enregistrements`);
      } else {
        toast.error(`Sync échoué: ${data.errors?.[0]?.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSyncingConnector(null);
    }
  };

  const handleConfigure = async (connector) => {
    setConfigModal({ open: true, connector });
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const config = {
      connector_name: configModal.connector.name,
      api_key: formData.get('api_key'),
      external_hotel_id: formData.get('external_hotel_id'),
      priority: parseInt(formData.get('priority') || '50')
    };

    try {
      const res = await fetch(`${API_URL}/api/datahub/hotels/${HOTEL_ID}/connectors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        toast.success('Configuration sauvegardée');
        setConfigModal({ open: false, connector: null });
        fetchConnectors();
      } else {
        toast.error('Erreur de sauvegarde');
      }
    } catch (error) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const getStatusBadge = (connectorName) => {
    const hotelConfig = hotelConnectors[connectorName];
    const testResult = testResults[connectorName];

    if (syncingConnector === connectorName) {
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 animate-pulse">
          <ArrowsClockwise size={12} className="mr-1 animate-spin" />
          Synchronisation...
        </Badge>
      );
    }

    if (testResult?.success) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
          <CheckCircle size={12} className="mr-1" />
          Connecté
        </Badge>
      );
    }

    if (hotelConfig?.status === 'connected') {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
          <CheckCircle size={12} className="mr-1" />
          Connecté
        </Badge>
      );
    }

    if (hotelConfig?.status === 'error') {
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <XCircle size={12} className="mr-1" />
          Erreur
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-slate-500 dark:text-slate-400">
        <Clock size={12} className="mr-1" />
        Non configuré
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DataHubNav />
        <div className="max-w-[1600px] mx-auto p-4 md:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-64 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DataHubNav />
      
      <main className="max-w-[1600px] mx-auto p-4 md:p-8 lg:p-12">
        <DataHubBreadcrumb items={[{ label: 'Connecteurs' }]} />

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
            Connecteurs
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Gérez vos intégrations avec les systèmes externes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
          {connectors.map((connector) => {
            const meta = connectorMeta[connector.name] || { icon: '🔌', color: 'slate', description: '' };
            const hotelConfig = hotelConnectors[connector.name];
            const isSyncing = syncingConnector === connector.name;
            const isTesting = testingConnector === connector.name;
            
            return (
              <Card 
                key={connector.name}
                data-testid={`connector-card-${connector.name}`}
                className={`
                  bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 
                  hover:border-${meta.color}-300 dark:hover:border-${meta.color}-700 
                  transition-all duration-200 hover:-translate-y-1
                  ${isSyncing ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
                `}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{meta.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{connector.display_name}</CardTitle>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          {connector.type.replace('_', ' ')} • v{connector.version}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(connector.name)}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {meta.description}
                  </p>

                  {testResults[connector.name] && (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs font-mono space-y-1">
                      <p className="text-emerald-600 dark:text-emerald-400">
                        ✓ {testResults[connector.name].message}
                      </p>
                      {testResults[connector.name].features && (
                        <p className="text-slate-500">
                          Features: {testResults[connector.name].features.join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  {hotelConfig?.last_sync_at && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      Dernière sync: {new Date(hotelConfig.last_sync_at).toLocaleString('fr-FR')}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestConnection(connector.name)}
                      disabled={isTesting || isSyncing}
                      data-testid={`test-btn-${connector.name}`}
                      className="flex-1"
                    >
                      {isTesting ? (
                        <ArrowsClockwise size={14} className="mr-1 animate-spin" />
                      ) : (
                        <TestTube size={14} className="mr-1" />
                      )}
                      Tester
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSync(connector.name)}
                      disabled={isTesting || isSyncing}
                      data-testid={`sync-btn-${connector.name}`}
                      className="flex-1"
                    >
                      {isSyncing ? (
                        <ArrowsClockwise size={14} className="mr-1 animate-spin" />
                      ) : (
                        <Play size={14} className="mr-1" />
                      )}
                      Sync
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleConfigure(connector)}
                      data-testid={`config-btn-${connector.name}`}
                    >
                      <Gear size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Configuration Modal */}
      <Dialog open={configModal.open} onOpenChange={(open) => setConfigModal({ open, connector: configModal.connector })}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">
                {configModal.connector && connectorMeta[configModal.connector.name]?.icon}
              </span>
              Configurer {configModal.connector?.display_name}
            </DialogTitle>
            <DialogDescription>
              Entrez les informations de connexion pour ce connecteur
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSaveConfig}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="api_key">Clé API</Label>
                <Input
                  id="api_key"
                  name="api_key"
                  type="password"
                  placeholder="sk_live_..."
                  className="font-mono"
                  data-testid="config-api-key"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="external_hotel_id">ID Hôtel externe</Label>
                <Input
                  id="external_hotel_id"
                  name="external_hotel_id"
                  placeholder="HOTEL-001"
                  data-testid="config-hotel-id"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Priorité (1-100)</Label>
                <Input
                  id="priority"
                  name="priority"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue="50"
                  data-testid="config-priority"
                />
                <p className="text-xs text-slate-500">
                  Plus la priorité est élevée, plus ce connecteur est considéré comme fiable pour la résolution de conflits.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfigModal({ open: false, connector: null })}>
                Annuler
              </Button>
              <Button type="submit" data-testid="save-config-btn">
                Sauvegarder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
