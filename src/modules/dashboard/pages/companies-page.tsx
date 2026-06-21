import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, CheckCircle2, XCircle, Clock, Save, Edit3, User, Globe, Phone, MapPin, Receipt } from 'lucide-react';
import { toast } from 'sonner';

interface Company {
  id: number;
  name: string;
  director_name: string;
  ceo_nik: string;
  nib: string;
  logo: string;
  address: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
  email: string;
  phone: string;
  status: 'pending' | 'verified' | 'rejected';
  created_at: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [myCompany, setMyCompany] = useState<Company | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    director_name: '',
    ceo_nik: '',
    nib: '',
    logo: '',
    address: '',
    bank_name: '',
    bank_account: '',
    bank_holder: '',
    email: '',
    phone: '',
  });

  // Extract auth info
  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (data.success) {
          const user = data.data;
          const isSuper = user.company_id === 1 && user.role?.nama_role === 'Super Admin';
          setIsSuperAdmin(isSuper);
          
          if (isSuper) {
            fetchCompanies();
          } else {
            fetchMyCompany(user.company_id);
          }
        }
      } catch (err) {
        toast.error('Gagal mengambil data user');
      } finally {
        setIsLoading(false);
      }
    };
    checkRole();
  }, []);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/companies');
      if (data.success) {
        setCompanies(data.data);
      }
    } catch (err) {
      toast.error('Gagal mengambil data perusahaan');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyCompany = async (companyId: number) => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/companies/${companyId}`);
      if (data.success) {
        setMyCompany(data.data);
        initializeEditForm(data.data);
      }
    } catch (err) {
      toast.error('Gagal mengambil data profil perusahaan');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeEditForm = (company: Company) => {
    setEditForm({
      name: company.name || '',
      director_name: company.director_name || '',
      ceo_nik: company.ceo_nik || '',
      nib: company.nib || '',
      logo: company.logo || '',
      address: company.address || '',
      bank_name: company.bank_name || '',
      bank_account: company.bank_account || '',
      bank_holder: company.bank_holder || '',
      email: company.email || '',
      phone: company.phone || '',
    });
  };

  const handleVerify = async (id: number) => {
    try {
      const { data } = await api.put(`/companies/${id}/verify`);
      if (data.success) {
        toast.success('Perusahaan berhasil diverifikasi! Defaults telah di-seed ✨');
        fetchCompanies();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memverifikasi perusahaan');
    }
  };

  const handleReject = async (id: number) => {
    try {
      const { data } = await api.put(`/companies/${id}/reject`);
      if (data.success) {
        toast.success('Pendaftaran perusahaan telah ditolak');
        fetchCompanies();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menolak pendaftaran');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myCompany) return;
    try {
      const { data } = await api.put(`/companies/${myCompany.id}`, editForm);
      if (data.success) {
        toast.success('Profil perusahaan berhasil diperbarui! ✨');
        setMyCompany(data.data);
        setIsEditing(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui profil');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ─── VIEW 1: SUPER ADMIN (MANAGE ALL TENANTS) ───
  if (isSuperAdmin) {
    const pending = companies.filter(c => c.status === 'pending');
    const verified = companies.filter(c => c.status === 'verified');
    const rejected = companies.filter(c => c.status === 'rejected');

    return (
      <div className="space-y-6 p-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
              <Building2 className="text-teal-500" /> Manajemen Perusahaan
            </h1>
            <p className="text-xs text-gray-500">Kelola dan verifikasi pendaftaran tenant multi-company</p>
          </div>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="bg-white/80 border border-gray-100 p-1 rounded-xl h-11 shadow-sm">
            <TabsTrigger value="pending" className="rounded-lg text-xs font-bold gap-2 px-4 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600">
              <Clock size={14} /> Menunggu Verifikasi ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="verified" className="rounded-lg text-xs font-bold gap-2 px-4 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600">
              <CheckCircle2 size={14} /> Terverifikasi ({verified.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="rounded-lg text-xs font-bold gap-2 px-4 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600">
              <XCircle size={14} /> Ditolak ({rejected.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <Card className="border-gray-100/80 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-white pb-3">
                <CardTitle className="text-sm font-bold text-gray-800">Permintaan Pendaftaran Pending</CardTitle>
                <CardDescription className="text-xs">Daftar tenant perusahaan baru yang membutuhkan persetujuan Super Admin.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {pending.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">Tidak ada permintaan pending 📭</div>
                ) : (
                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead className="text-xs font-bold">Perusahaan</TableHead>
                        <TableHead className="text-xs font-bold">CEO / Direktur</TableHead>
                        <TableHead className="text-xs font-bold">Email & Telp</TableHead>
                        <TableHead className="text-xs font-bold">Alamat</TableHead>
                        <TableHead className="text-xs font-bold text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pending.map((c) => (
                        <TableRow key={c.id} className="hover:bg-gray-50/30">
                          <TableCell className="font-bold text-xs text-gray-800">
                            <div>{c.name}</div>
                            {c.nib && <div className="text-[10px] text-gray-400 font-normal">NIB: {c.nib}</div>}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium text-gray-700">{c.director_name}</div>
                            <div className="text-[10px] text-gray-400">NIK: {c.ceo_nik}</div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div>{c.email}</div>
                            <div className="text-[10px] text-gray-400">{c.phone}</div>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500 max-w-[200px] truncate">{c.address}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button 
                                size="sm" 
                                className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold h-8 rounded-lg"
                                onClick={() => handleVerify(c.id)}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-rose-100 text-rose-500 hover:bg-rose-50 text-[11px] font-bold h-8 rounded-lg"
                                onClick={() => handleReject(c.id)}
                              >
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verified" className="mt-4">
            <Card className="border-gray-100/80 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-white pb-3">
                <CardTitle className="text-sm font-bold text-gray-800">Perusahaan Terverifikasi</CardTitle>
                <CardDescription className="text-xs">Perusahaan yang terdaftar aktif dan memiliki data workspace terisolasi.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {verified.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">Tidak ada perusahaan terverifikasi 🏢</div>
                ) : (
                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead className="text-xs font-bold w-12">ID</TableHead>
                        <TableHead className="text-xs font-bold">Perusahaan</TableHead>
                        <TableHead className="text-xs font-bold">Direktur</TableHead>
                        <TableHead className="text-xs font-bold">Email & Telp</TableHead>
                        <TableHead className="text-xs font-bold">Bank Info</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {verified.map((c) => (
                        <TableRow key={c.id} className="hover:bg-gray-50/30">
                          <TableCell className="font-bold text-xs text-gray-500">#{c.id}</TableCell>
                          <TableCell className="font-bold text-xs text-gray-800">
                            <div>{c.name}</div>
                            {c.nib && <div className="text-[10px] text-gray-400 font-normal">NIB: {c.nib}</div>}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-gray-700">{c.director_name}</TableCell>
                          <TableCell className="text-xs">
                            <div>{c.email}</div>
                            <div className="text-[10px] text-gray-400">{c.phone}</div>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {c.bank_name ? (
                              <div>{c.bank_name} - {c.bank_account} <span className="text-[10px] block">a.n. {c.bank_holder}</span></div>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejected" className="mt-4">
            <Card className="border-gray-100/80 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-white pb-3">
                <CardTitle className="text-sm font-bold text-gray-800">Pendaftaran Ditolak</CardTitle>
                <CardDescription className="text-xs">Daftar pendaftaran tenant yang tidak disetujui.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {rejected.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">Tidak ada pendaftaran ditolak 🚫</div>
                ) : (
                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead className="text-xs font-bold">Perusahaan</TableHead>
                        <TableHead className="text-xs font-bold">Direktur</TableHead>
                        <TableHead className="text-xs font-bold">Email & Telp</TableHead>
                        <TableHead className="text-xs font-bold">Alamat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rejected.map((c) => (
                        <TableRow key={c.id} className="hover:bg-gray-50/30">
                          <TableCell className="font-bold text-xs text-gray-800">{c.name}</TableCell>
                          <TableCell className="text-xs text-gray-700">{c.director_name}</TableCell>
                          <TableCell className="text-xs">
                            <div>{c.email}</div>
                            <div className="text-[10px] text-gray-400">{c.phone}</div>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">{c.address}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ─── VIEW 2: NORMAL TENANT ADMIN (EDIT PROFILE) ───
  return (
    <div className="max-w-[800px] mx-auto space-y-6 p-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <Building2 className="text-teal-500" /> Profil Perusahaan
          </h1>
          <p className="text-xs text-gray-500">Kelola identitas utama, legalitas, dan informasi rekening bank perusahaan Anda</p>
        </div>
        {!isEditing && (
          <Button 
            onClick={() => setIsEditing(true)} 
            className="bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs gap-2 rounded-xl h-9"
          >
            <Edit3 size={14} /> Edit Profil
          </Button>
        )}
      </div>

      {!isEditing ? (
        // Read-only Details View
        <Card className="border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-300 to-emerald-300" />
          <CardHeader className="pt-8 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-emerald-400 rounded-2xl flex items-center justify-center text-white shadow-md">
                <Building2 size={32} />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-gray-800">{myCompany?.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    {myCompany?.status}
                  </span>
                  {myCompany?.nib && (
                    <span className="text-[10px] font-medium text-gray-400">
                      NIB: {myCompany.nib}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-2 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Core Information */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-teal-600 uppercase tracking-widest border-b border-teal-50 pb-1 flex items-center gap-1.5">
                  <User size={14} /> Legalitas & Pimpinan
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-400 font-medium">Direktur Utama</span>
                    <span className="text-gray-700 font-bold">{myCompany?.director_name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-400 font-medium">NIK CEO</span>
                    <span className="text-gray-700 font-bold">{myCompany?.ceo_nik}</span>
                  </div>
                  {myCompany?.nib && (
                    <div className="flex justify-between py-1 border-b border-gray-50">
                      <span className="text-gray-400 font-medium">NIB</span>
                      <span className="text-gray-700 font-bold">{myCompany?.nib}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Contacts */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-teal-600 uppercase tracking-widest border-b border-teal-50 pb-1 flex items-center gap-1.5">
                  <Globe size={14} /> Kontak Kantor
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-400 font-medium">Email Kantor</span>
                    <span className="text-gray-700 font-bold">{myCompany?.email}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-400 font-medium">Nomor Telepon</span>
                    <span className="text-gray-700 font-bold">{myCompany?.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2 text-xs">
              <h3 className="text-xs font-bold text-teal-600 uppercase tracking-widest border-b border-teal-50 pb-1 flex items-center gap-1.5">
                <MapPin size={14} /> Alamat Kantor
              </h3>
              <p className="text-gray-600 bg-gray-50/50 p-3 rounded-xl border border-gray-100/50 leading-relaxed">
                {myCompany?.address}
              </p>
            </div>

            {/* Bank Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-teal-600 uppercase tracking-widest border-b border-teal-50 pb-1 flex items-center gap-1.5">
                <Receipt size={14} /> Informasi Rekening Bank (Invoice / BAST)
              </h3>
              {myCompany?.bank_name ? (
                <div className="bg-gradient-to-br from-teal-50/30 to-emerald-50/30 border border-teal-100/50 rounded-xl p-4 grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-teal-600 uppercase block tracking-wider mb-0.5">Nama Bank</span>
                    <span className="font-bold text-gray-700">{myCompany.bank_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-teal-600 uppercase block tracking-wider mb-0.5">Nomor Rekening</span>
                    <span className="font-bold text-gray-700">{myCompany.bank_account}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-teal-600 uppercase block tracking-wider mb-0.5">Atas Nama</span>
                    <span className="font-bold text-gray-700">{myCompany.bank_holder}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
                  Belum melengkapi informasi rekening bank. Silakan edit profil untuk menambahkan.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        // Form Edit Mode
        <form onSubmit={handleUpdate}>
          <Card className="border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-300 to-emerald-300" />
            <CardHeader className="pt-8 pb-4">
              <CardTitle className="text-lg font-bold text-gray-800">Edit Profil Perusahaan</CardTitle>
              <CardDescription className="text-xs">Ubah data identitas resmi dan informasi invoice perusahaan Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left section: Legal */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-teal-600 uppercase tracking-widest border-b border-teal-50 pb-1 flex items-center gap-1.5">
                    Legalitas & Kontak
                  </h3>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Nama Perusahaan</label>
                    <Input 
                      type="text" 
                      name="name" 
                      value={editForm.name} 
                      onChange={handleChange} 
                      className="h-10 bg-white/50 border-gray-100 rounded-xl text-xs"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Nama Direktur</label>
                      <Input 
                        type="text" 
                        name="director_name" 
                        value={editForm.director_name} 
                        onChange={handleChange} 
                        className="h-10 bg-white/50 border-gray-100 rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">NIK CEO</label>
                      <Input 
                        type="text" 
                        name="ceo_nik" 
                        value={editForm.ceo_nik} 
                        onChange={handleChange} 
                        maxLength={16}
                        className="h-10 bg-white/50 border-gray-100 rounded-xl text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Email Perusahaan</label>
                      <Input 
                        type="email" 
                        name="email" 
                        value={editForm.email} 
                        onChange={handleChange} 
                        className="h-10 bg-white/50 border-gray-100 rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Telepon</label>
                      <Input 
                        type="text" 
                        name="phone" 
                        value={editForm.phone} 
                        onChange={handleChange} 
                        className="h-10 bg-white/50 border-gray-100 rounded-xl text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">NIB</label>
                    <Input 
                      type="text" 
                      name="nib" 
                      value={editForm.nib} 
                      onChange={handleChange} 
                      className="h-10 bg-white/50 border-gray-100 rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Right section: Bank & Address */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-teal-600 uppercase tracking-widest border-b border-teal-50 pb-1 flex items-center gap-1.5">
                    Informasi Bank & Alamat
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Nama Bank</label>
                    <Input 
                      type="text" 
                      name="bank_name" 
                      value={editForm.bank_name} 
                      onChange={handleChange} 
                      placeholder="e.g. Bank Central Asia"
                      className="h-10 bg-white/50 border-gray-100 rounded-xl text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Nomor Rekening</label>
                      <Input 
                        type="text" 
                        name="bank_account" 
                        value={editForm.bank_account} 
                        onChange={handleChange} 
                        className="h-10 bg-white/50 border-gray-100 rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Nama Pemegang Rekening</label>
                      <Input 
                        type="text" 
                        name="bank_holder" 
                        value={editForm.bank_holder} 
                        onChange={handleChange} 
                        className="h-10 bg-white/50 border-gray-100 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Alamat Kantor</label>
                    <textarea 
                      name="address" 
                      value={editForm.address} 
                      onChange={handleChange} 
                      rows={4}
                      className="w-full p-3 bg-white/50 border border-gray-100 rounded-xl text-xs text-gray-700 outline-none focus:ring-2 focus:ring-teal-400/20 focus:border-teal-400 transition-all"
                      required
                    />
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsEditing(false)}
                  className="h-10 text-gray-500 font-semibold hover:text-gray-700 transition-colors text-xs rounded-xl"
                >
                  Batal
                </Button>
                <Button 
                  type="submit"
                  className="bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs gap-2 rounded-xl h-10 px-5 shadow-[0_8px_16px_-6px_rgba(20,184,166,0.4)]"
                >
                  <Save size={14} /> Simpan Perubahan
                </Button>
              </div>

            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
