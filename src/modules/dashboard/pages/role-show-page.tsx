import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Pencil, ShieldCheck, Users, ChevronLeft, ChevronRight, UserCheck } from "lucide-react";
import { toast } from 'sonner';

interface Permission {
  id: number;
  name: string;
  display_name: string;
  group: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role_id: number | null;
  divisi_name: string;
}

interface RoleDetail {
  id: number;
  nama_role: string;
  divisi_id: number;
  divisi?: { id: number; nama_divisi: string };
  permissions: Permission[];
  permissions_grouped: Record<string, Permission[]>;
  users: User[];
  created_at?: string;
  updated_at?: string;
}

export default function RoleShowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchRoleDetail = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/roles/${id}`);
      setRole(res.data.data);
    } catch (err: any) {
      toast.error('Gagal memuat detail role');
      navigate('/dashboard/roles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRoleDetail();
    }
  }, [id]);

  const users = role?.users || [];
  const totalPages = Math.max(1, Math.ceil(users.length / itemsPerPage));

  // Reset pagination if user list size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [users.length]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return users.slice(start, start + itemsPerPage);
  }, [users, currentPage]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-gray-500">Memuat detail role...</p>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="text-center py-8">
        <p className="text-sm font-bold text-gray-500">Role tidak ditemukan</p>
        <Button onClick={() => navigate('/dashboard/roles')} className="mt-4 bg-teal-400 hover:bg-teal-50 text-white hover:text-teal-600">
          Kembali ke Daftar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/dashboard/roles')}
            className="h-9 w-9 rounded-xl border-gray-150 text-gray-500 hover:text-teal-600 hover:bg-teal-50 transition-all"
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
              Detail Role: <span className="text-teal-600">{role.nama_role}</span>
            </h1>
            <p className="text-xs font-medium text-gray-500">Lihat hak akses dan pengguna yang ditugaskan</p>
          </div>
        </div>
        
        <Button 
          onClick={() => navigate(`/dashboard/roles/${role.id}/edit`)} 
          className="bg-teal-400 hover:bg-teal-500 text-white font-bold h-9 rounded-xl text-xs px-4 flex items-center gap-1.5 shadow-md shadow-teal-400/20 w-fit"
        >
          <Pencil size={13} /> Edit Role & Permissions
        </Button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Metadata & Users Table) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Nama Role</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                      <ShieldCheck size={16} />
                    </div>
                    <span className="font-extrabold text-sm text-gray-800">{role.nama_role}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Divisi</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <UserCheck size={16} />
                    </div>
                    <span className="font-extrabold text-sm text-gray-800">{role.divisi?.nama_divisi || '-'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Jumlah Pengguna</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Users size={16} />
                    </div>
                    <span className="font-extrabold text-sm text-gray-800">{users.length} Orang</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Users Card */}
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl bg-white overflow-hidden">
            <CardHeader className="px-6 py-5 border-b border-gray-50">
              <CardTitle className="text-sm font-bold text-gray-800 tracking-tight">Daftar Pengguna</CardTitle>
              <CardDescription className="text-xs text-gray-500 font-medium">Pengguna yang sedang ditugaskan dengan role ini</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-50 hover:bg-transparent">
                    <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest px-6 py-3">Nama</TableHead>
                    <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest">Email</TableHead>
                    <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest">Divisi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-gray-400 text-xs italic">
                        Tidak ada pengguna yang ditugaskan ke role ini
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((u) => (
                      <TableRow key={u.id} className="border-gray-50 hover:bg-gray-50/50">
                        <TableCell className="font-bold text-xs text-gray-700 px-6 py-3">{u.name}</TableCell>
                        <TableCell className="text-xs text-gray-500">{u.email}</TableCell>
                        <TableCell className="text-xs text-gray-500 font-medium">{u.divisi_name || role.divisi?.nama_divisi || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {users.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50 bg-gray-50/30">
                  <div className="text-[11px] font-semibold text-gray-500">
                    Menampilkan <span className="text-gray-800">{Math.min(users.length, (currentPage - 1) * itemsPerPage + 1)}</span> - <span className="text-gray-800">{Math.min(users.length, currentPage * itemsPerPage)}</span> dari <span className="text-gray-800">{users.length}</span> user
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-8 rounded-lg text-xs font-bold border-gray-200"
                    >
                      <ChevronLeft size={14} className="mr-1" /> Sebelum
                    </Button>
                    <div className="text-xs font-bold text-gray-600 px-2">
                      Halaman {currentPage} dari {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 rounded-lg text-xs font-bold border-gray-200"
                    >
                      Berikut <ChevronRight size={14} className="ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Permissions badges grouped by category) */}
        <div>
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl bg-white overflow-hidden h-full flex flex-col">
            <CardHeader className="px-6 py-5 border-b border-gray-50 shrink-0">
              <CardTitle className="text-sm font-bold text-gray-800 tracking-tight flex items-center gap-2">
                <ShieldCheck size={16} className="text-teal-500" /> Hak Akses Aktif
              </CardTitle>
              <CardDescription className="text-xs text-gray-500 font-medium">Permissions yang diaktifkan untuk role ini</CardDescription>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto flex-1 max-h-[600px] space-y-5">
              {(!role.permissions || role.permissions.length === 0) ? (
                <p className="text-xs text-gray-400 italic text-center py-4">Belum ada permissions yang diset untuk role ini.</p>
              ) : (
                Object.entries(role.permissions_grouped || {}).map(([group, perms]) => (
                  <div key={group} className="space-y-2">
                    <h4 className="text-[9px] font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-2.5 py-1 rounded w-fit border border-teal-100/50">
                      {group}
                    </h4>
                    <div className="flex flex-wrap gap-1.5 pl-0.5">
                      {perms.map((p) => (
                        <span 
                          key={p.id} 
                          className="px-2.5 py-1 bg-white hover:bg-gray-50 rounded-lg text-[10px] font-bold text-gray-600 border border-gray-150 transition-colors shadow-sm"
                        >
                          {p.display_name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
