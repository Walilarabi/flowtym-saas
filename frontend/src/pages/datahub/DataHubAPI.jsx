import { useState } from 'react';
import { 
  Key, 
  Plus, 
  Copy, 
  Trash,
  Eye,
  EyeSlash,
  Warning,
  Rocket,
  ShieldCheck,
  Globe
} from '@phosphor-icons/react';
import { DataHubNav, DataHubBreadcrumb } from '../../components/datahub/DataHubNav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';

export default function DataHubAPI() {
  const [apiKeys, setApiKeys] = useState([
    {
      id: 'key-1',
      name: 'Production API Key',
      key: 'fth_live_' + 'x'.repeat(32),
      created_at: '2025-01-15',
      last_used: '2025-03-24',
      status: 'active',
      requests_today: 1247,
      requests_month: 45892
    },
    {
      id: 'key-2',
      name: 'Development Key',
      key: 'fth_test_' + 'x'.repeat(32),
      created_at: '2025-02-20',
      last_used: '2025-03-23',
      status: 'active',
      requests_today: 89,
      requests_month: 2341
    }
  ]);
  
  const [showKey, setShowKey] = useState({});
  const [createModal, setCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  const handleCreateKey = () => {
    const newKey = {
      id: `key-${Date.now()}`,
      name: newKeyName || 'New API Key',
      key: 'fth_live_' + Math.random().toString(36).substring(2, 34),
      created_at: new Date().toISOString().split('T')[0],
      last_used: null,
      status: 'active',
      requests_today: 0,
      requests_month: 0
    };

    setApiKeys(prev => [...prev, newKey]);
    setCreateModal(false);
    setNewKeyName('');
    toast.success('Clé API créée avec succès');
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    toast.success('Clé copiée dans le presse-papiers');
  };

  const handleRevokeKey = (id) => {
    setApiKeys(prev => prev.filter(k => k.id !== id));
    toast.success('Clé API révoquée');
  };

  const toggleShowKey = (id) => {
    setShowKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskKey = (key) => {
    return key.substring(0, 12) + '•'.repeat(20) + key.substring(key.length - 4);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DataHubNav />
      
      <main className="max-w-[1600px] mx-auto p-4 md:p-8 lg:p-12">
        <DataHubBreadcrumb items={[{ label: 'API & Marketplace' }]} />

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
            API & Marketplace
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Gérez vos clés API et préparez l'accès partenaires
          </p>
        </div>

        {/* Coming Soon Banner */}
        <Card className="mb-8 bg-gradient-to-br from-violet-500 to-violet-700 text-white border-0">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Rocket size={32} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-1">Marketplace Flowtym - Bientôt disponible</h3>
                <p className="text-violet-100">
                  Ouvrez votre hôtel aux partenaires technologiques avec notre API Marketplace. 
                  Connectez des services tiers et créez de nouvelles opportunités de revenus.
                </p>
              </div>
              <Badge className="bg-white/20 text-white border-0">
                Phase 2
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Security Card */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-6 text-center">
              <ShieldCheck size={40} className="mx-auto text-emerald-500 mb-3" weight="duotone" />
              <h4 className="font-semibold text-lg mb-1">Sécurité OAuth2</h4>
              <p className="text-sm text-slate-500">
                Authentification sécurisée avec tokens JWT et scopes granulaires
              </p>
            </CardContent>
          </Card>

          {/* Rate Limiting Card */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-6 text-center">
              <Warning size={40} className="mx-auto text-amber-500 mb-3" weight="duotone" />
              <h4 className="font-semibold text-lg mb-1">Rate Limiting</h4>
              <p className="text-sm text-slate-500">
                Protection contre les abus avec limites configurables par clé
              </p>
            </CardContent>
          </Card>

          {/* Global Access Card */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-6 text-center">
              <Globe size={40} className="mx-auto text-blue-500 mb-3" weight="duotone" />
              <h4 className="font-semibold text-lg mb-1">Accès Global</h4>
              <p className="text-sm text-slate-500">
                API disponible 24/7 avec CDN global et haute disponibilité
              </p>
            </CardContent>
          </Card>
        </div>

        {/* API Keys Section */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Clés API</CardTitle>
              <CardDescription>Gérez vos clés d'accès à l'API Flowtym</CardDescription>
            </div>
            <Button onClick={() => setCreateModal(true)} data-testid="create-api-key-btn">
              <Plus size={16} className="mr-2" />
              Nouvelle clé
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <div 
                  key={apiKey.id}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
                  data-testid={`api-key-${apiKey.id}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Key size={16} className="text-violet-500" />
                        <span className="font-medium">{apiKey.name}</span>
                        <Badge 
                          className={apiKey.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' 
                            : 'bg-red-100 text-red-700'
                          }
                        >
                          {apiKey.status === 'active' ? 'Actif' : 'Révoqué'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2">
                        <code className="font-mono text-sm flex-1 select-all">
                          {showKey[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleShowKey(apiKey.id)}
                          data-testid={`toggle-key-${apiKey.id}`}
                        >
                          {showKey[apiKey.id] ? <EyeSlash size={16} /> : <Eye size={16} />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyKey(apiKey.key)}
                          data-testid={`copy-key-${apiKey.id}`}
                        >
                          <Copy size={16} />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-slate-500 text-xs">Aujourd'hui</p>
                        <p className="font-semibold">{apiKey.requests_today.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-500 text-xs">Ce mois</p>
                        <p className="font-semibold">{apiKey.requests_month.toLocaleString()}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleRevokeKey(apiKey.id)}
                        data-testid={`revoke-key-${apiKey.id}`}
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-3 text-xs text-slate-500">
                    <span>Créée le {apiKey.created_at}</span>
                    {apiKey.last_used && <span>• Dernière utilisation: {apiKey.last_used}</span>}
                  </div>
                </div>
              ))}

              {apiKeys.length === 0 && (
                <div className="text-center py-12">
                  <Key size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                  <p className="text-slate-500">Aucune clé API créée</p>
                  <Button className="mt-4" onClick={() => setCreateModal(true)}>
                    Créer votre première clé
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Create Key Modal */}
      <Dialog open={createModal} onOpenChange={setCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle clé API</DialogTitle>
            <DialogDescription>
              Créez une nouvelle clé d'accès à l'API Flowtym
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key_name">Nom de la clé</Label>
              <Input
                id="key_name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Ex: Production, Development, Partner XYZ"
                data-testid="new-key-name-input"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateKey} data-testid="confirm-create-key">
              Créer la clé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
