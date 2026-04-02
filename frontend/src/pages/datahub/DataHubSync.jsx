import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowsClockwise, 
  CheckCircle, 
  XCircle, 
  Warning,
  Clock,
  FunnelSimple,
  CaretDown,
  Play
} from '@phosphor-icons/react';
import { DataHubNav, DataHubBreadcrumb } from '../../components/datahub/DataHubNav';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_BACKEND_URL || '';
const HOTEL_ID = 'test-hotel-001';

export default function DataHubSync() {
  const [syncHistory, setSyncHistory] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const [historyRes, connectorsRes] = await Promise.all([
        fetch(`${API_URL}/api/datahub/hotels/${HOTEL_ID}/sync/history?limit=50`),
        fetch(`${API_URL}/api/datahub/connectors/available`)
      ]);

      if (historyRes.ok) {
        const data = await historyRes.json();
        setSyncHistory(data.syncs || []);
      }
      if (connectorsRes.ok) {
        const data = await connectorsRes.json();
        setConnectors(data.connectors || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleManualSync = async (connectorName) => {
    setSyncing(true);
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
      
      if (data.status === 'success') {
        toast.success(`Sync ${connectorName}: ${data.processed_records} enregistrements`);
        fetchData();
      } else {
        toast.error(`Sync échoué: ${data.status}`);
      }
    } catch (error) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    let success = 0;
    let failed = 0;

    for (const connector of connectors) {
      try {
        const res = await fetch(`${API_URL}/api/datahub/hotels/${HOTEL_ID}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connector_name: connector.name,
            entity_type: 'reservations',
            from_date: new Date().toISOString().split('T')[0],
            to_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          })
        });

        if (res.ok) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    toast.success(`Synchronisation terminée: ${success} réussis, ${failed} échecs`);
    fetchData();
    setSyncing(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            <CheckCircle size={12} className="mr-1" />
            Succès
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <XCircle size={12} className="mr-1" />
            Échec
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <Warning size={12} className="mr-1" />
            Partiel
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock size={12} className="mr-1" />
            {status}
          </Badge>
        );
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DataHubNav />
        <div className="max-w-[1600px] mx-auto p-4 md:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-96 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DataHubNav />
      
      <main className="max-w-[1600px] mx-auto p-4 md:p-8 lg:p-12">
        <DataHubBreadcrumb items={[{ label: 'Synchronisation' }]} />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
              Synchronisation
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Historique et contrôle des synchronisations
            </p>
          </div>

          <div className="flex gap-3">
            <Select value={selectedConnector} onValueChange={setSelectedConnector}>
              <SelectTrigger className="w-[180px]" data-testid="connector-filter">
                <FunnelSimple size={16} className="mr-2" />
                <SelectValue placeholder="Tous les connecteurs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les connecteurs</SelectItem>
                {connectors.map(c => (
                  <SelectItem key={c.name} value={c.name}>{c.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleSyncAll}
              disabled={syncing}
              data-testid="sync-all-btn"
            >
              {syncing ? (
                <ArrowsClockwise size={16} className="mr-2 animate-spin" />
              ) : (
                <Play size={16} className="mr-2" />
              )}
              Tout synchroniser
            </Button>
          </div>
        </div>

        {/* Quick Sync Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {connectors.map(connector => (
            <Card 
              key={connector.name}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer hover:border-violet-300 dark:hover:border-violet-700 transition-all"
              onClick={() => handleManualSync(connector.name)}
              data-testid={`quick-sync-${connector.name}`}
            >
              <CardContent className="p-4 text-center">
                <ArrowsClockwise 
                  size={24} 
                  className={`mx-auto mb-2 text-slate-400 ${syncing ? 'animate-spin' : 'hover:text-violet-600'}`}
                />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {connector.display_name}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sync History Table */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Historique des synchronisations</CardTitle>
          </CardHeader>
          <CardContent>
            {syncHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 dark:border-slate-800">
                      <TableHead>Date/Heure</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Traités</TableHead>
                      <TableHead className="text-right">Erreurs</TableHead>
                      <TableHead className="text-right">Durée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncHistory.map((sync, index) => (
                      <TableRow 
                        key={index}
                        className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        data-testid={`sync-row-${index}`}
                      >
                        <TableCell className="font-mono text-sm">
                          {new Date(sync.started_at).toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {sync.entity_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(sync.status)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {sync.total_records}
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                          {sync.processed_records}
                        </TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-400">
                          {sync.failed_records || 0}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-slate-500">
                          {formatDuration(sync.duration_ms)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <ArrowsClockwise size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-500 dark:text-slate-400">
                  Aucune synchronisation récente
                </p>
                <Button 
                  className="mt-4"
                  onClick={handleSyncAll}
                  data-testid="first-sync-btn"
                >
                  Lancer la première synchronisation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
