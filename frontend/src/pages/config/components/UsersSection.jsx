/**
 * Users Section - Complete User Management with Mobile Roles
 */
import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit2, Trash2, Save, Shield, Mail, Phone, Building, 
  Smartphone, Monitor, Eye, EyeOff, Key, RefreshCw 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { toast } from 'sonner';
import { getConfigUsers, getAvailableRoles, createConfigUser, updateConfigUser, deleteConfigUser } from '../configApi';

const ROLE_COLORS = {
  admin: 'bg-violet-100 text-violet-700',
  reception: 'bg-blue-100 text-blue-700',
  revenue_manager: 'bg-emerald-100 text-emerald-700',
  housekeeping: 'bg-amber-100 text-amber-700',
  housekeeper: 'bg-orange-100 text-orange-700',
  maintenance: 'bg-red-100 text-red-700',
  breakfast: 'bg-yellow-100 text-yellow-700',
  spa: 'bg-pink-100 text-pink-700',
  restaurant: 'bg-indigo-100 text-indigo-700',
  accounting: 'bg-slate-100 text-slate-700',
  readonly: 'bg-gray-100 text-gray-700',
};

const DEPARTMENTS = [
  { value: 'management', label: 'Direction' },
  { value: 'front_office', label: 'Front Office' },
  { value: 'revenue', label: 'Revenue Management' },
  { value: 'sales', label: 'Commercial' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'food_beverage', label: 'F&B / Restaurant' },
  { value: 'spa', label: 'SPA & Bien-être' },
  { value: 'accounting', label: 'Comptabilité' },
  { value: 'it', label: 'IT' },
];

const initialForm = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  role: 'reception',
  department: 'front_office',
  phone: '',
  job_title: '',
  language: 'fr'
};

export default function UsersSection({ hotelId, onUpdate }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadData();
  }, [hotelId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        getConfigUsers(hotelId),
        getAvailableRoles()
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    setForm(initialForm);
    setShowPassword(false);
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setForm({
      email: user.email,
      password: '', // Ne pas afficher le mot de passe existant
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      department: user.department || 'front_office',
      phone: user.phone || '',
      job_title: user.job_title || '',
      language: user.language || 'fr'
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Désactiver l'utilisateur "${user.full_name}" ?`)) return;
    
    try {
      await deleteConfigUser(hotelId, user.id);
      toast.success('Utilisateur désactivé');
      loadData();
      onUpdate?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSave = async () => {
    if (!form.email || !form.first_name || !form.last_name) {
      toast.error('Email, prénom et nom sont requis');
      return;
    }
    
    // Pour la création, le mot de passe est obligatoire
    if (!editingUser && !form.password) {
      toast.error('Le mot de passe est obligatoire pour un nouvel utilisateur');
      return;
    }
    
    if (form.password && form.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    try {
      setSaving(true);
      
      const payload = { ...form };
      // Ne pas envoyer le mot de passe si vide (en mode édition)
      if (!payload.password) {
        delete payload.password;
      }
      
      if (editingUser) {
        await updateConfigUser(hotelId, editingUser.id, payload);
        toast.success('Utilisateur mis à jour');
      } else {
        await createConfigUser(hotelId, payload);
        toast.success('Utilisateur créé');
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

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(f => ({ ...f, password }));
    setShowPassword(true);
  };

  const getRoleInfo = (code) => roles.find(r => r.code === code) || { name: code };
  const getDepartmentLabel = (value) => DEPARTMENTS.find(d => d.value === value)?.label || value;

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  // Filtrer les utilisateurs selon l'onglet
  const filteredUsers = users.filter(u => {
    if (activeTab === 'desktop') return !u.is_mobile_role;
    if (activeTab === 'mobile') return u.is_mobile_role;
    return true;
  });

  // Séparer les rôles desktop et mobile
  const desktopRoles = roles.filter(r => !r.is_mobile);
  const mobileRoles = roles.filter(r => r.is_mobile);

  return (
    <div className="space-y-6" data-testid="users-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-100 rounded-xl">
            <Users className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Utilisateurs & Accès</h2>
            <p className="text-sm text-slate-500">Gestion des comptes et des rôles mobile/desktop</p>
          </div>
        </div>
        <Button onClick={handleAdd} data-testid="add-user-btn">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un utilisateur
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-3xl font-bold text-slate-900">{users.length}</div>
            <div className="text-sm text-slate-500">Total utilisateurs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Monitor className="w-5 h-5 text-blue-500" />
              <span className="text-3xl font-bold text-blue-600">
                {users.filter(u => !u.is_mobile_role).length}
              </span>
            </div>
            <div className="text-sm text-slate-500">Desktop</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-500" />
              <span className="text-3xl font-bold text-emerald-600">
                {users.filter(u => u.is_mobile_role).length}
              </span>
            </div>
            <div className="text-sm text-slate-500">Mobile</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-3xl font-bold text-amber-600">
              {users.filter(u => !u.is_active).length}
            </div>
            <div className="text-sm text-slate-500">Inactifs</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Tous ({users.length})</TabsTrigger>
          <TabsTrigger value="desktop">
            <Monitor className="w-4 h-4 mr-1" />
            Desktop ({users.filter(u => !u.is_mobile_role).length})
          </TabsTrigger>
          <TabsTrigger value="mobile">
            <Smartphone className="w-4 h-4 mr-1" />
            Mobile ({users.filter(u => u.is_mobile_role).length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Users Table */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto" />
          </CardContent>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">Aucun utilisateur trouvé</p>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un utilisateur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Identifiant</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Département</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => {
                const roleInfo = getRoleInfo(user.role);
                return (
                  <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className={user.is_mobile_role ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'}>
                            {getInitials(user.first_name, user.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-slate-500">{user.job_title || '-'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[user.role] || 'bg-slate-100'}>
                        {roleInfo.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.is_mobile_role ? (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          <Smartphone className="w-3 h-3 mr-1" />
                          Mobile
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-700">
                          <Monitor className="w-3 h-3 mr-1" />
                          Desktop
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-600">
                        <Building className="h-3 w-3" />
                        <span className="text-sm">{getDepartmentLabel(user.department)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(user)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Roles Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Desktop Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="h-4 w-4 text-blue-500" />
              Rôles Desktop
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {desktopRoles.map(role => (
                <div key={role.code} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={ROLE_COLORS[role.code] || 'bg-slate-100'}>{role.name}</Badge>
                  </div>
                  <p className="text-sm text-slate-500">{role.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mobile Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-emerald-500" />
              Rôles Mobile (terrain)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mobileRoles.map(role => (
                <div key={role.code} className="p-3 bg-emerald-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={ROLE_COLORS[role.code] || 'bg-slate-100'}>{role.name}</Badge>
                  </div>
                  <p className="text-sm text-slate-500">{role.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
            </DialogTitle>
            <DialogDescription>
              {editingUser 
                ? 'Modifiez les informations. Laissez le mot de passe vide pour ne pas le changer.'
                : 'Créez un compte avec identifiant et mot de passe.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Nom & Prénom */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom *</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))}
                  placeholder="Marie"
                  data-testid="user-firstname-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))}
                  placeholder="Dupont"
                  data-testid="user-lastname-input"
                />
              </div>
            </div>

            {/* Email (Identifiant) */}
            <div className="space-y-2">
              <Label>Email (Identifiant de connexion) *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="marie.dupont@hotel.com"
                  className="pl-9"
                  data-testid="user-email-input"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <Label>
                Mot de passe {!editingUser && '*'}
                {editingUser && <span className="text-slate-400 font-normal"> (laisser vide pour ne pas changer)</span>}
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={editingUser ? '••••••••' : 'Minimum 6 caractères'}
                    className="pl-9 pr-10"
                    data-testid="user-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button type="button" variant="outline" onClick={generatePassword} title="Générer un mot de passe">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              {form.password && (
                <p className="text-xs text-slate-500">
                  Force: {form.password.length < 8 ? '🔴 Faible' : form.password.length < 12 ? '🟡 Moyen' : '🟢 Fort'}
                </p>
              )}
            </div>

            {/* Rôle */}
            <div className="space-y-2">
              <Label>Rôle *</Label>
              <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger data-testid="user-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Monitor className="w-3 h-3" /> Desktop
                  </div>
                  {desktopRoles.map(r => (
                    <SelectItem key={r.code} value={r.code}>
                      <span className="flex items-center gap-2">
                        {r.name}
                      </span>
                    </SelectItem>
                  ))}
                  <div className="border-t my-1" />
                  <div className="px-2 py-1 text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Smartphone className="w-3 h-3" /> Mobile (terrain)
                  </div>
                  {mobileRoles.map(r => (
                    <SelectItem key={r.code} value={r.code}>
                      <span className="flex items-center gap-2">
                        {r.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Département & Fonction */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Département</Label>
                <Select value={form.department} onValueChange={(v) => setForm(f => ({ ...f, department: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fonction</Label>
                <Input
                  value={form.job_title}
                  onChange={(e) => setForm(f => ({ ...f, job_title: e.target.value }))}
                  placeholder="Réceptionniste, Gouvernante..."
                />
              </div>
            </div>

            {/* Téléphone & Langue */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
              <div className="space-y-2">
                <Label>Langue</Label>
                <Select value={form.language} onValueChange={(v) => setForm(f => ({ ...f, language: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">🇫🇷 Français</SelectItem>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="es">🇪🇸 Español</SelectItem>
                    <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                    <SelectItem value="it">🇮🇹 Italiano</SelectItem>
                    <SelectItem value="pt">🇵🇹 Português</SelectItem>
                    <SelectItem value="ar">🇸🇦 العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="save-user-btn">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
