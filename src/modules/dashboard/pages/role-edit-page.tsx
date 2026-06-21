import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from '@/modules/auth/store/auth.store';
import { ArrowLeft, Save, Search, ShieldCheck } from "lucide-react";
import { toast } from 'sonner';

interface Permission {
  id: number;
  name: string;
  display_name: string;
  group: string;
}

interface Divisi {
  id: number;
  nama_divisi: string;
}

export default function RoleEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [roleFormData, setRoleFormData] = useState({ nama_role: '', divisi_id: '' });
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [divisions, setDivisions] = useState<Divisi[]>([]);
  const [allPermissions, setAllPermissions] = useState<Record<string, Permission[]>>({});
  const [permissionSearch, setPermissionSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchDependencies = async () => {
    setIsLoading(true);
    try {
      const [divRes, permRes] = await Promise.all([
        api.get('/divisi').catch(err => {
          console.warn('Divisi fetch failed or forbidden:', err);
          return { data: { data: [] } };
        }),
        api.get('/permissions').catch(err => {
          console.warn('Permissions fetch failed or forbidden:', err);
          return { data: { data: { groups: {} } } };
        })
      ]);
      setDivisions(divRes.data.data || []);
      setAllPermissions(permRes.data.data?.groups || {});

      // If in edit mode, fetch role details
      if (isEditMode) {
        const roleRes = await api.get(`/roles/${id}`);
        const roleData = roleRes.data.data;
        setRoleFormData({
          nama_role: roleData.nama_role,
          divisi_id: roleData.divisi_id?.toString() || ''
        });
        setSelectedPermissions(roleData.permissions?.map((p: Permission) => p.id) || []);
      }
    } catch (err: any) {
      toast.error('Gagal memuat data pendukung');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, [id]);

  const filteredPermissions = useMemo(() => {
    const keyword = permissionSearch.trim().toLowerCase();
    if (!keyword) return allPermissions;
    const result: Record<string, Permission[]> = {};
    Object.entries(allPermissions).forEach(([group, perms]) => {
      const matched = perms.filter((p) => {
        const haystack = `${p.display_name} ${p.name} ${group}`.toLowerCase();
        return haystack.includes(keyword);
      });
      if (matched.length) result[group] = matched;
    });
    return result;
  }, [allPermissions, permissionSearch]);

  const togglePermission = (permId: number) => {
    setSelectedPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleToggleGroup = (groupPerms: Permission[]) => {
    const groupIds = groupPerms.map(p => p.id);
    const allSelected = groupIds.every(id => selectedPermissions.includes(id));
    
    if (allSelected) {
      // Remove all
      setSelectedPermissions(prev => prev.filter(id => !groupIds.includes(id)));
    } else {
      // Add missing
      setSelectedPermissions(prev => {
        const next = [...prev];
        groupIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormData.nama_role.trim()) {
      toast.error('Nama Role wajib diisi');
      return;
    }
    if (!roleFormData.divisi_id) {
      toast.error('Divisi wajib dipilih');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        nama_role: roleFormData.nama_role,
        divisi_id: parseInt(roleFormData.divisi_id)
      };

      let roleId = isEditMode ? parseInt(id!) : 0;

      if (isEditMode) {
        await api.put(`/roles/${id}`, payload);
      } else {
        const res = await api.post('/roles', payload);
        roleId = res.data.data.id;
      }

      // Sync Permissions
      const targetRoleId = isEditMode ? roleId : roleId;
      await api.post(`/roles/${targetRoleId}/permissions`, { permissions: selectedPermissions });

      toast.success(isEditMode ? 'Role berhasil diperbarui' : 'Role berhasil dibuat');

      // Instant Sidebar update logic
      const currentUser = useAuthStore.getState().user;
      const currentUserRoleId = currentUser?.role?.id || currentUser?.role_id;
      
      if (targetRoleId === Number(currentUserRoleId)) {
        const meRes = await api.get('/auth/me');
        useAuthStore.setState({ user: meRes.data.data });
      }

      // Navigate back
      navigate(isEditMode ? `/dashboard/roles/${id}` : '/dashboard/roles');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan role');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-gray-500">Memuat detail form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(isEditMode ? `/dashboard/roles/${id}` : '/dashboard/roles')}
          disabled={isSaving}
          className="h-9 w-9 rounded-xl border-gray-150 text-gray-500 hover:text-teal-600 hover:bg-teal-50 transition-all"
        >
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight">
            {isEditMode ? 'Edit Role & Hak Akses' : 'Tambah Role Baru'}
          </h1>
          <p className="text-xs font-medium text-gray-500">
            {isEditMode ? 'Ubah nama, divisi, dan atur permission role' : 'Tentukan nama role, divisi, dan permission default'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Card */}
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl bg-white overflow-hidden">
          <CardHeader className="px-6 py-5 border-b border-gray-50 shrink-0">
            <CardTitle className="text-sm font-bold text-gray-800 tracking-tight">Informasi Dasar</CardTitle>
            <CardDescription className="text-xs text-gray-500 font-medium">Tentukan nama identitas role dan divisi naungannya</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nama Role</label>
                <Input
                  value={roleFormData.nama_role}
                  onChange={e => setRoleFormData({ ...roleFormData, nama_role: e.target.value })}
                  placeholder="Misal: Marketing Senior, Lead Designer"
                  required
                  disabled={isSaving}
                  className="h-9 rounded-xl text-xs bg-gray-50/50 border-gray-100 focus:ring-teal-400/20 focus:border-teal-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Divisi</label>
                <Select
                  value={roleFormData.divisi_id}
                  onValueChange={v => setRoleFormData({ ...roleFormData, divisi_id: v })}
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs bg-gray-50/50 border-gray-100">
                    <SelectValue placeholder="Pilih Divisi" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {divisions.map(d => (
                      <SelectItem key={d.id} value={d.id.toString()} className="text-xs">
                        {d.nama_divisi}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Card */}
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl bg-white overflow-hidden">
          <CardHeader className="px-6 py-5 border-b border-gray-50 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-gray-800 tracking-tight flex items-center gap-2">
                <ShieldCheck size={16} className="text-teal-500" /> Konfigurasi Hak Akses
              </CardTitle>
              <CardDescription className="text-xs text-gray-500 font-medium">Beri centang pada fitur yang boleh diakses oleh role ini</CardDescription>
            </div>
            
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <Input
                placeholder="Cari permission..."
                value={permissionSearch}
                onChange={e => setPermissionSearch(e.target.value)}
                disabled={isSaving}
                className="pl-8 h-8 bg-gray-50/60 border-gray-100 rounded-lg text-xs focus:ring-teal-400/20 focus:border-teal-400"
              />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
              {Object.keys(filteredPermissions).length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-4">Tidak ada permission yang cocok dengan pencarian.</p>
              ) : (
                Object.entries(filteredPermissions).map(([group, perms]) => {
                  const groupIds = perms.map(p => p.id);
                  const isAllGroupSelected = groupIds.every(id => selectedPermissions.includes(id));
                  
                  return (
                    <div key={group} className="space-y-3 p-4 bg-gray-50/30 rounded-2xl border border-gray-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[9px] font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-2 py-0.5 rounded w-fit border border-teal-100/30">
                          {group}
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleToggleGroup(perms)}
                          disabled={isSaving}
                          className="text-[10px] font-extrabold text-teal-500 hover:text-teal-600 hover:underline transition-colors"
                        >
                          {isAllGroupSelected ? 'Batalkan Semua' : 'Pilih Semua'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {perms.map(p => (
                          <div 
                            key={p.id} 
                            className="flex items-center space-x-2 bg-white p-2.5 rounded-xl border border-gray-100/50 hover:border-teal-100 transition-all"
                          >
                            <Checkbox
                              id={`perm-${p.id}`}
                              checked={selectedPermissions.includes(p.id)}
                              onCheckedChange={() => !isSaving && togglePermission(p.id)}
                              disabled={isSaving}
                              className="h-4 w-4 rounded border-gray-200 data-[state=checked]:bg-teal-400 data-[state=checked]:border-teal-400"
                            />
                            <label 
                              htmlFor={`perm-${p.id}`}
                              className="text-[11px] font-bold text-gray-600 cursor-pointer select-none w-full"
                            >
                              {p.display_name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEditMode ? `/dashboard/roles/${id}` : '/dashboard/roles')}
            disabled={isSaving}
            className="rounded-xl h-9 text-xs px-4 font-bold border-gray-200"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-teal-400 hover:bg-teal-500 text-white font-bold h-9 rounded-xl text-xs px-5 shadow-lg shadow-teal-400/25 flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Menyimpan...
              </>
            ) : (
              <>
                <Save size={13} /> Simpan Role
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
