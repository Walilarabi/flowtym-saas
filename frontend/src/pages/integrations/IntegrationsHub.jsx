/**
 * Integrations Hub - External PMS & Channel Manager Connections
 * Manage Mews, Medialog, D-Edge and other integrations
 */
import React, { useState, useEffect } from 'react';
import { useHotel } from '@/context/HotelContext';
import {
  Link2, Plug, PlugZap, Plus, Settings, Trash2, RefreshCw, 
  CheckCircle2, XCircle, AlertCircle, Clock, ArrowRightLeft,
  Building, Share2, ChevronRight, ExternalLink, TestTube,
  Activity, Zap, Database, Webhook
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
// Phase 15 - Webhooks sortants
import { WebhookManager } from './components/WebhookManager';

const API_URL = import.meta.env.VITE_API_URL || process.env.REACT_APP_BACKEND_URL || '';

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER LOGOS & INFO
// ═══════════════════════════════════════════════════════════════════════════════

const providerInfo = {
  mews: {
    name: 'Mews',
    logo: '🏨',
    color: 'from-emerald-500 to-teal-500',
    description: 'PMS Cloud nouvelle génération',
    type: 'PMS'
  },
  medialog: {
    name: 'Medialog',
    logo: '🇫🇷',
    color: 'from-blue-500 to-indigo-500',
    description: 'Leader français du PMS hôtelier',
    type: 'PMS'
  },
  'd-edge': {
    name: 'D-Edge',
    logo: '🌐',
    color: 'from-violet-500 to-purple-500',
    description: 'Channel Manager & Distribution',
    type: 'Channel Manager'
  },
  webhook: {
    name: 'Webhook',
    logo: '🔗',
    color: 'from-slate-500 to-slate-600',
    description: 'Intégration personnalisée',
    type: 'Custom'
  },
  rest_api: {
    name: 'API REST',
    logo: '⚡',
    color: 'from-amber-500 to-orange-500',
    description: 'Connexion API générique',
    type: 'Custom'
  }
};

const statusStyles = {
  active: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Actif' },
  inactive: { icon: XCircle, color: 'text-slate-400', bg: 'bg-slate-50', label: 'Inactif' },
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'En attente' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Erreur' },
  testing: { icon: TestTube, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Test' },
  syncing: { icon: RefreshCw, color: 'text-violet-500', bg: 'bg-violet-50', label: 'Sync...' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const IntegrationCard = ({ integration, onTest, onSync, onEdit, onDelete }) => {
  const provider = providerInfo[integration.provider] || providerInfo.rest_api;
  const status = statusStyles[integration.status] || statusStyles.inactive;
  const StatusIcon = status.icon;
  
  return (
    <Card className="hover:shadow-lg transition-all duration-200" data-testid={`integration-${integration.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center text-2xl shadow-lg`}>
              {provider.logo}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{integration.name}</h3>
              <p className="text-sm text-slate-500">{provider.name} • {provider.type}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`${status.bg} ${status.color} border-0`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {status.label}
                </Badge>
                {integration.last_sync && (
                  <span className="text-xs text-slate-400">
                    Sync: {new Date(integration.last_sync).toLocaleString('fr-FR')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onTest(integration)}
              disabled={integration.status === 'syncing'}
            >
              <TestTube className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onSync(integration)}
              disabled={integration.status === 'syncing' || integration.status === 'error'}
            >
              <RefreshCw className={`w-4 h-4 ${integration.status === 'syncing' ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(integration)}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => onDelete(integration)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Synchronisés</p>
            <p className="text-lg font-semibold text-slate-900">{integration.total_synced || 0}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Taux succès</p>
            <p className="text-lg font-semibold text-emerald-600">{(integration.sync_success_rate || 100).toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Direction</p>
            <p className="text-sm font-medium text-slate-700 capitalize">{integration.sync_direction?.replace('_', ' ')}</p>
          </div>
        </div>
        
        {/* Error Display */}
        {integration.last_error && (
          <div className="mt-3 p-2 bg-red-50 rounded-lg">
            <p className="text-xs text-red-600">{integration.last_error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// AVAILABLE INTEGRATION CARD
// ═══════════════════════════════════════════════════════════════════════════════

const AvailableIntegrationCard = ({ integration, onAdd }) => {
  const provider = providerInfo[integration.provider] || providerInfo.rest_api;
  
  return (
    <Card className="hover:shadow-lg hover:border-violet-200 transition-all duration-200 cursor-pointer group" onClick={() => onAdd(integration)}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
            {provider.logo}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">{integration.name}</h3>
              {integration.is_certified && (
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Certifié</Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">{integration.description}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {integration.supported_features?.slice(0, 4).map((feature) => (
                <Badge key={feature} variant="outline" className="text-xs capitalize">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-violet-500 transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION DIALOG
// ═══════════════════════════════════════════════════════════════════════════════

const ConfigureDialog = ({ isOpen, onClose, provider, existingConfig, onSave }) => {
  const [formData, setFormData] = useState({
    name: existingConfig?.name || `Intégration ${provider?.name || ''}`,
    syncDirection: existingConfig?.sync_direction || 'bidirectional',
    syncInterval: existingConfig?.sync_interval_minutes || 15,
    credentials: {},
    endpoints: { base_url: '' },
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  
  useEffect(() => {
    if (provider) {
      setFormData(prev => ({
        ...prev,
        name: existingConfig?.name || `Intégration ${provider.name}`,
      }));
    }
  }, [provider, existingConfig]);
  
  const handleCredentialChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      credentials: { ...prev.credentials, [key]: value }
    }));
  };
  
  const handleSave = () => {
    if (!formData.name) {
      toast.error('Le nom est requis');
      return;
    }
    onSave(formData);
  };
  
  if (!provider) return null;
  
  const credentialFields = {
    mews: ['client_token', 'access_token'],
    medialog: ['api_key', 'hotel_code', 'username', 'password'],
    'd-edge': ['client_id', 'client_secret', 'hotel_id'],
    webhook: ['webhook_url', 'secret_key'],
    rest_api: ['base_url', 'api_key'],
  };
  
  const fields = credentialFields[provider.provider] || ['api_key'];
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${providerInfo[provider.provider]?.color || 'from-slate-500 to-slate-600'} flex items-center justify-center text-xl`}>
              {providerInfo[provider.provider]?.logo || '🔗'}
            </div>
            Configurer {provider.name}
          </DialogTitle>
          <DialogDescription>
            Entrez vos identifiants pour connecter {provider.name} à Flowtym.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l'intégration</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Mews Production"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Direction de sync</Label>
              <Select
                value={formData.syncDirection}
                onValueChange={(val) => setFormData(prev => ({ ...prev, syncDirection: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">Entrant uniquement</SelectItem>
                  <SelectItem value="outbound">Sortant uniquement</SelectItem>
                  <SelectItem value="bidirectional">Bidirectionnel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Intervalle (min)</Label>
              <Select
                value={formData.syncInterval.toString()}
                onValueChange={(val) => setFormData(prev => ({ ...prev, syncInterval: parseInt(val) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 heure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700 mb-3">Identifiants API</h4>
            <div className="space-y-3">
              {fields.map((field) => (
                <div key={field} className="space-y-1">
                  <Label htmlFor={field} className="text-xs capitalize">
                    {field.replace(/_/g, ' ')}
                  </Label>
                  <Input
                    id={field}
                    type={field.includes('password') || field.includes('secret') || field.includes('token') ? 'password' : 'text'}
                    value={formData.credentials[field] || ''}
                    onChange={(e) => handleCredentialChange(field, e.target.value)}
                    placeholder={`Entrez votre ${field.replace(/_/g, ' ')}`}
                  />
                </div>
              ))}
            </div>
          </div>
          
          {testResult && (
            <div className={`p-3 rounded-lg ${testResult.success ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className={`font-medium ${testResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                  {testResult.message}
                </span>
              </div>
              {testResult.response_time_ms && (
                <p className="text-xs text-slate-500 mt-1">Temps de réponse: {testResult.response_time_ms}ms</p>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave}>
            <Plug className="w-4 h-4 mr-2" />
            {existingConfig ? 'Mettre à jour' : 'Connecter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN INTEGRATIONS HUB COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const IntegrationsHub = () => {
  const { currentHotel } = useHotel();
  const [activeIntegrations, setActiveIntegrations] = useState([]);
  const [availableIntegrations, setAvailableIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configDialog, setConfigDialog] = useState({ open: false, provider: null, existing: null });
  const [activeTab, setActiveTab] = useState('active');
  
  useEffect(() => {
    fetchData();
  }, [currentHotel?.id]);
  
  const fetchData = async () => {
    if (!currentHotel?.id) return;
    
    try {
      const token = localStorage.getItem('flowtym_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [activeRes, availableRes] = await Promise.all([
        fetch(`${API_URL}/api/integrations/hotels/${currentHotel.id}`, { headers }),
        fetch(`${API_URL}/api/integrations/available`, { headers }),
      ]);
      
      if (activeRes.ok) {
        setActiveIntegrations(await activeRes.json());
      }
      
      if (availableRes.ok) {
        setAvailableIntegrations(await availableRes.json());
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast.error('Erreur lors du chargement des intégrations');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTest = async (integration) => {
    try {
      const token = localStorage.getItem('flowtym_token');
      const response = await fetch(
        `${API_URL}/api/integrations/hotels/${currentHotel.id}/${integration.id}/test`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Connexion ${integration.name} réussie !`);
      } else {
        toast.error(`Échec: ${result.message}`);
      }
      
      fetchData();
    } catch (error) {
      toast.error('Erreur lors du test');
    }
  };
  
  const handleSync = async (integration) => {
    try {
      const token = localStorage.getItem('flowtym_token');
      await fetch(
        `${API_URL}/api/integrations/hotels/${currentHotel.id}/${integration.id}/sync`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      toast.success('Synchronisation lancée');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la synchronisation');
    }
  };
  
  const handleDelete = async (integration) => {
    if (!confirm(`Supprimer l'intégration "${integration.name}" ?`)) return;
    
    try {
      const token = localStorage.getItem('flowtym_token');
      await fetch(
        `${API_URL}/api/integrations/hotels/${currentHotel.id}/${integration.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      toast.success('Intégration supprimée');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };
  
  const handleSaveConfig = async (formData) => {
    try {
      const token = localStorage.getItem('flowtym_token');
      const isUpdate = !!configDialog.existing;
      
      const body = {
        name: formData.name,
        provider: configDialog.provider.provider,
        integration_type: configDialog.provider.integration_type,
        credentials: formData.credentials,
        endpoints: { base_url: formData.credentials.base_url || `https://api.${configDialog.provider.provider}.com` },
        sync_direction: formData.syncDirection,
        sync_interval_minutes: formData.syncInterval,
        mappings: {},
        settings: {},
        is_active: true,
      };
      
      const url = isUpdate 
        ? `${API_URL}/api/integrations/hotels/${currentHotel.id}/${configDialog.existing.id}`
        : `${API_URL}/api/integrations/hotels/${currentHotel.id}/configure`;
      
      const response = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        toast.success(isUpdate ? 'Intégration mise à jour' : 'Intégration créée');
        setConfigDialog({ open: false, provider: null, existing: null });
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Chargement des intégrations...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6" data-testid="integrations-hub">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Link2 className="w-6 h-6 text-violet-500" />
            Hub d'Intégrations
          </h1>
          <p className="text-sm text-slate-500">
            Connectez Flowtym à vos PMS et Channel Managers externes
          </p>
        </div>
        <Button onClick={() => setActiveTab('available')}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle intégration
        </Button>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <PlugZap className="w-4 h-4" />
            Actives ({activeIntegrations.length})
          </TabsTrigger>
          <TabsTrigger value="available" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Disponibles
          </TabsTrigger>
          {/* Phase 15 - Onglet Webhooks */}
          <TabsTrigger value="webhooks" className="flex items-center gap-2" data-testid="webhooks-tab">
            <Zap className="w-4 h-4" />
            Webhooks
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-6">
          {activeIntegrations.length > 0 ? (
            <div className="grid gap-4">
              {activeIntegrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onTest={handleTest}
                  onSync={handleSync}
                  onEdit={(int) => {
                    const provider = availableIntegrations.find(a => a.provider === int.provider);
                    setConfigDialog({ open: true, provider, existing: int });
                  }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <Card className="py-12">
              <CardContent className="text-center">
                <Plug className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700">Aucune intégration active</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Connectez un PMS ou Channel Manager pour synchroniser vos données
                </p>
                <Button className="mt-4" onClick={() => setActiveTab('available')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une intégration
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="available" className="mt-6">
          {/* PMS Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-500" />
              PMS (Property Management System)
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {availableIntegrations
                .filter(i => i.integration_type === 'pms')
                .map((integration) => (
                  <AvailableIntegrationCard
                    key={integration.provider}
                    integration={integration}
                    onAdd={(int) => setConfigDialog({ open: true, provider: int, existing: null })}
                  />
                ))}
            </div>
          </div>
          
          {/* Channel Manager Section */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-violet-500" />
              Channel Managers
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {availableIntegrations
                .filter(i => i.integration_type === 'channel_manager')
                .map((integration) => (
                  <AvailableIntegrationCard
                    key={integration.provider}
                    integration={integration}
                    onAdd={(int) => setConfigDialog({ open: true, provider: int, existing: null })}
                  />
                ))}
            </div>
          </div>
        </TabsContent>

        {/* Phase 15 - Tab Webhooks Sortants */}
        <TabsContent value="webhooks" className="mt-6">
          <WebhookManager />
        </TabsContent>
      </Tabs>
      
      {/* Configuration Dialog */}
      <ConfigureDialog
        isOpen={configDialog.open}
        onClose={() => setConfigDialog({ open: false, provider: null, existing: null })}
        provider={configDialog.provider}
        existingConfig={configDialog.existing}
        onSave={handleSaveConfig}
      />
    </div>
  );
};

export default IntegrationsHub;
