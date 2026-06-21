import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Eye, ShieldCheck, User as UserIcon, Search, Trash2 } from "lucide-react";
import { toast } from 'sonner';

interface Permission {
  id: number;
  name: string;
  display_name: string;
  group: string;
}

interface Role {
  id: number;
  nama_role: string;
  divisi_id: number;
  divisi?: { id: number; nama_divisi: string };
  permissions?: Permission[];
  users?: User[];
}

interface User {
  id: number;
  name: string;
  email: string;
  role_id: number | null;
  role: { nama_role: string } | null;
  divisi_name: string;
}

interface Divisi {
  id: number;
  nama_divisi: string;
}

export default function RolesUsersPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [divisions, setDivisions] = useState<Divisi[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // User Form states
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userFormData, setUserFormData] = useState({ name: '', email: '', password: '', role_id: '' });

  // Delete states
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'user' | 'role'; id: number } | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivisiId, setFilterDivisiId] = useState('');
  const [filterRoleId, setFilterRoleId] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'users') {
        const res = await api.get('/users');
        setUsers(res.data.data || []);
      } else {
        const res = await api.get('/roles');
        setRoles(res.data.data || []);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        toast.error('Sesi Anda telah berakhir, silakan login kembali');
      } else {
        toast.error(`Gagal memuat data ${activeTab}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [roleRes, divRes] = await Promise.all([
        api.get('/roles').catch(err => {
          console.warn('Roles fetch failed or forbidden:', err);
          return { data: { data: [] } };
        }),
        api.get('/divisi').catch(err => {
          console.warn('Divisi fetch failed or forbidden:', err);
          return { data: { data: [] } };
        })
      ]);
      setRoles(roleRes.data.data || []);
      setDivisions(divRes.data.data || []);
    } catch (err) {
      console.error('Dependencies fetch failed', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchDependencies();
  }, [activeTab]);

  // USER HANDLERS
  const handleOpenUserForm = (user?: User) => {
    if (user) {
      setEditingUserId(user.id);
      setUserFormData({ 
        name: user.name, 
        email: user.email, 
        password: '', 
        role_id: user.role_id?.toString() || '' 
      });
    } else {
      setEditingUserId(null);
      setUserFormData({ name: '', email: '', password: '', role_id: '' });
    }
    setIsUserFormOpen(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: userFormData.name,
        email: userFormData.email,
        role_id: userFormData.role_id ? parseInt(userFormData.role_id) : null
      };
      if (userFormData.password || !editingUserId) {
        payload.password = userFormData.password;
      }
      
      if (editingUserId) {
        await api.put(`/users/${editingUserId}`, payload);
        toast.success('User berhasil diperbarui');
      } else {
        await api.post('/users', payload);
        toast.success('User berhasil ditambahkan');
      }
      setIsUserFormOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan user');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'user') {
        await api.delete(`/users/${deleteTarget.id}`);
        toast.success('User berhasil dihapus');
      } else {
        await api.delete(`/roles/${deleteTarget.id}`);
        toast.success('Role berhasil dihapus');
      }
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    }
  };

  const filteredUsers = useMemo(() => {
    let result = users;
    const kw = searchQuery.trim().toLowerCase();
    if (kw) {
      result = result.filter(u => u.name.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw) || (u.role?.nama_role || '').toLowerCase().includes(kw));
    }
    if (filterRoleId) {
      result = result.filter(u => u.role_id === Number(filterRoleId));
    }
    if (filterDivisiId) {
      result = result.filter(u => {
        const userRole = roles.find(r => r.id === u.role_id);
        return userRole?.divisi_id === Number(filterDivisiId);
      });
    }
    return result;
  }, [users, searchQuery, filterRoleId, filterDivisiId, roles]);

  const filteredRoles = useMemo(() => {
    let result = roles;
    const kw = searchQuery.trim().toLowerCase();
    if (kw) {
      result = result.filter(r => r.nama_role.toLowerCase().includes(kw) || (r.divisi?.nama_divisi || '').toLowerCase().includes(kw));
    }
    if (filterDivisiId) {
      result = result.filter(r => r.divisi_id === Number(filterDivisiId));
    }
    return result;
  }, [roles, searchQuery, filterDivisiId]);

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="space-y-0.5">
        <h1 className="text-lg font-extrabold text-gray-800 tracking-tight">Role & User Management</h1>
        <p className="text-xs font-medium text-gray-500">Kelola pengguna dan hak akses sistem</p>
      </div>

      <div className="flex bg-white rounded-lg p-1 w-fit shadow-sm border border-gray-100">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'users' ? 'bg-teal-50 text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserIcon size={13} /> Users
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'roles' ? 'bg-teal-50 text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShieldCheck size={13} /> Roles
        </button>
      </div>

      <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
        <div className="px-6 py-4 flex flex-col gap-3 border-b border-gray-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">
              Daftar {activeTab === 'users' ? 'Users' : 'Roles'}
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <Input
                  placeholder={`Cari ${activeTab}...`}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 bg-gray-50/50 border-gray-100 rounded-lg text-xs focus:ring-teal-400/20 focus:border-teal-400"
                />
              </div>
              {activeTab === 'users' ? (
                <Button onClick={() => handleOpenUserForm()} className="bg-teal-400 hover:bg-teal-500 text-white font-bold h-8 rounded-lg text-xs px-3">
                  <Plus size={13} className="mr-1.5" /> Tambah User
                </Button>
              ) : (
                <Button onClick={() => navigate('/dashboard/roles/create')} className="bg-teal-400 hover:bg-teal-500 text-white font-bold h-8 rounded-lg text-xs px-3">
                  <Plus size={13} className="mr-1.5" /> Tambah Role
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={filterDivisiId} onValueChange={v => setFilterDivisiId(v === '__all__' ? '' : v)}>
              <SelectTrigger className="h-8 w-40 rounded-lg text-[10px] font-bold"><SelectValue placeholder="Semua Divisi" /></SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="__all__">Semua Divisi</SelectItem>
                {divisions.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nama_divisi}</SelectItem>)}
              </SelectContent>
            </Select>
            {activeTab === 'users' && (
              <Select value={filterRoleId} onValueChange={v => setFilterRoleId(v === '__all__' ? '' : v)}>
                <SelectTrigger className="h-8 w-40 rounded-lg text-[10px] font-bold"><SelectValue placeholder="Semua Role" /></SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="__all__">Semua Role</SelectItem>
                  {roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.nama_role}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {activeTab === 'users' ? (
                <TableRow className="border-gray-50 hover:bg-transparent">
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest px-6 py-3">Nama</TableHead>
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest">Email</TableHead>
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest">Role</TableHead>
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest">Divisi</TableHead>
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right px-6">Aksi</TableHead>
                </TableRow>
              ) : (
                <TableRow className="border-gray-50 hover:bg-transparent">
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest px-6 py-3">Nama Role</TableHead>
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest">Divisi</TableHead>
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right px-6">Aksi</TableHead>
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-400 text-xs">Loading data...</TableCell>
                </TableRow>
              ) : activeTab === 'users' ? (
                filteredUsers.map(u => (
                  <TableRow key={u.id} className="border-gray-50 hover:bg-gray-50/50 group">
                    <TableCell className="font-bold text-xs text-gray-700 px-6 py-3">{u.name}</TableCell>
                    <TableCell className="text-xs text-gray-500">{u.email}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 bg-teal-50 text-teal-600 rounded-full text-[9px] font-black uppercase tracking-tighter">
                        {u.role?.nama_role || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 font-medium">{u.divisi_name || '-'}</TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => u.role_id && navigate(`/dashboard/roles/${u.role_id}`)} className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-teal-600 transition-colors"><Eye size={12} /> Show Role</button>
                        <button onClick={() => handleOpenUserForm(u)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => setDeleteTarget({ type: 'user', id: u.id })} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                filteredRoles.map(r => (
                  <TableRow key={r.id} className="border-gray-50 hover:bg-gray-50/50 group">
                    <TableCell className="font-bold text-xs text-gray-700 px-6 py-3">{r.nama_role}</TableCell>
                    <TableCell className="text-xs text-gray-500 font-medium">{r.divisi?.nama_divisi || '-'}</TableCell>
                    <TableCell className="text-right px-6">
                       <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => navigate(`/dashboard/roles/${r.id}`)} className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-teal-600 transition-colors"><Eye size={12} /> Detail</button>
                          <button onClick={() => navigate(`/dashboard/roles/${r.id}/edit`)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => setDeleteTarget({ type: 'role', id: r.id })} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={13} /></button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Add/Edit User */}
      <Dialog open={isUserFormOpen} onOpenChange={setIsUserFormOpen}>
        <DialogContent className="sm:max-w-[380px] rounded-2xl p-5 border-0 shadow-2xl">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-base font-bold tracking-tight text-gray-800">
              {editingUserId ? 'Edit User' : 'Tambah User'}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-gray-500">
              {editingUserId ? 'Ubah informasi pengguna ini' : 'Tambahkan pengguna baru ke dalam sistem'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUserSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nama</label>
              <Input
                value={userFormData.name}
                onChange={e => setUserFormData({...userFormData, name: e.target.value})}
                required className="h-9 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Email</label>
              <Input
                type="email" value={userFormData.email}
                onChange={e => setUserFormData({...userFormData, email: e.target.value})}
                required className="h-9 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                Password {editingUserId && <span className="normal-case text-gray-400">(Kosongkan jika tidak ganti)</span>}
              </label>
              <Input
                type="password" value={userFormData.password}
                onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                required={!editingUserId} minLength={8} className="h-9 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Role</label>
              <Select value={userFormData.role_id} onValueChange={v => setUserFormData({...userFormData, role_id: v})}>
                <SelectTrigger className="h-9 rounded-lg text-sm">
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.nama_role} {r.divisi?.nama_divisi ? `(${r.divisi.nama_divisi})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsUserFormOpen(false)} className="rounded-lg flex-1 h-9 text-xs">Batal</Button>
              <Button type="submit" className="rounded-lg bg-teal-400 hover:bg-teal-500 text-white flex-1 h-9 text-xs">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>



      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl p-6 border-0 shadow-2xl max-w-[360px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-gray-800">Hapus {deleteTarget?.type === 'user' ? 'User' : 'Role'}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium text-gray-500 mt-1">Apakah Anda yakin? Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2">
            <AlertDialogCancel className="rounded-lg font-bold h-9 text-xs border-gray-200 text-gray-600 hover:bg-gray-50">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-lg font-bold h-9 text-xs bg-red-400 hover:bg-red-500 text-white shadow-lg shadow-red-400/30">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
