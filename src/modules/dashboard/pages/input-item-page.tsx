import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Eye, Pencil, Trash2, Shield, Megaphone, Loader2, ClipboardList, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface OrderBrief {
  id: number;
  nomor_order: string;
  nama_project: string;
  nama_customer: string;
  nama_perusahaan?: string;
  jenis_interior: string;
  tanggal_masuk_customer?: string;
}

interface DesainFinal {
  id: number;
  order_id: number;
  status: 'pending' | 'uploaded' | 'revision' | 'accepted';
  order?: OrderBrief;
}

interface InputItem {
  id: number;
  desain_final_id: number;
  order_id: number;
  status: 'draft' | 'approved';
  response_time: string | null;
  response_by: string | null;
  marketing_response_time: string | null;
  marketing_response_by: string | null;
  created_at: string;
  updated_at: string;
}

const formatResponseTime = (timeStr: string | null | undefined) => {
  if (!timeStr) return '';
  try {
    const d = new Date(timeStr);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/\./g, ':');
  } catch {
    return '';
  }
};

export default function InputItemPage() {
  const navigate = useNavigate();
  const [desainFinals, setDesainFinals] = useState<DesainFinal[]>([]);
  const [inputItems, setInputItems] = useState<InputItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState({
    response_enabled: false,
    marketing_response_enabled: false,
  });

  // Filter States
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterInterior, setFilterInterior] = useState<string>('all');
  const [filterResponse, setFilterResponse] = useState<string>('all');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dfRes, iiRes, settingsRes] = await Promise.all([
        api.get('/desain-finals'),
        api.get('/input-items'),
        api.get('/settings')
      ]);

      // Filter: only accepted final designs
      const allDFs: DesainFinal[] = dfRes.data.data || [];
      const acceptedDFs = allDFs.filter(df => df.status === 'accepted' && df.order);
      setDesainFinals(acceptedDFs);
      
      setInputItems(iiRes.data.data || []);

      const s: { key: string; value: string }[] = settingsRes.data.data || [];
      setConfig({
        response_enabled: s.find(x => x.key === 'response_enabled')?.value === 'true',
        marketing_response_enabled: s.find(x => x.key === 'marketing_response_enabled')?.value === 'true',
      });
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus rincian item ini?')) return;
    try {
      await api.delete(`/input-items/${id}`);
      toast.success('Rincian item berhasil dihapus');
      fetchData();
    } catch {
      toast.error('Gagal menghapus rincian item');
    }
  };

  const handleResponse = async (dfId: number, role: 'designer' | 'marketing') => {
    try {
      await api.post(`/input-items/desain-final/${dfId}/response/${role}`);
      toast.success(`Berhasil memberikan tanggapan ${role === 'designer' ? 'Desainer' : 'Marketing'}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Gagal memberikan tanggapan ${role}`);
    }
  };

  // Generate unique jenis interior option list dynamically
  const uniqueJenisInterior = Array.from(
    new Set(desainFinals.map(df => df.order?.jenis_interior).filter(Boolean))
  ) as string[];

  const filteredItems = desainFinals.filter(df => {
    const order = df.order!;
    const existingPlan = inputItems.find(ii => ii.desain_final_id === df.id);

    // 1. Text Search Filter
    const project = order.nama_project?.toLowerCase() || '';
    const customer = order.nama_customer?.toLowerCase() || '';
    const searchLower = search.toLowerCase();
    const matchesSearch = project.includes(searchLower) || customer.includes(searchLower);

    // 2. Status Rencana Filter
    let matchesStatus = true;
    const planStatus = existingPlan ? existingPlan.status : 'none'; // 'draft', 'approved', or 'none'
    if (filterStatus !== 'all') {
      matchesStatus = planStatus === filterStatus;
    }

    // 3. Tipe Interior Filter
    let matchesInterior = true;
    if (filterInterior !== 'all') {
      matchesInterior = order.jenis_interior === filterInterior;
    }

    // 4. Status Tanggapan Filter
    let matchesResponse = true;
    const hasDesignerResponse = !!(existingPlan?.response_time && existingPlan.response_by);
    const hasMarketingResponse = !!(existingPlan?.marketing_response_time && existingPlan.marketing_response_by);
    
    if (filterResponse === 'pending_designer') {
      matchesResponse = config.response_enabled && !hasDesignerResponse;
    } else if (filterResponse === 'pending_marketing') {
      matchesResponse = config.marketing_response_enabled && !hasMarketingResponse;
    } else if (filterResponse === 'completed') {
      const needDesigner = config.response_enabled && !hasDesignerResponse;
      const needMarketing = config.marketing_response_enabled && !hasMarketingResponse;
      matchesResponse = !needDesigner && !needMarketing;
    }

    return matchesSearch && matchesStatus && matchesInterior && matchesResponse;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="space-y-0.5">
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <ClipboardList size={22} className="text-teal-500" /> Rencana Input Item
          </h1>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Rancang komposisi produk, finishing, dan aksesoris dari desain final blueprint yang disetujui klien
          </p>
        </div>
      </div>

      {/* Settings Summary Badges */}
      <div className="flex items-center gap-2 bg-teal-50/40 border border-teal-100/40 p-3 rounded-xl">
        <span className="text-[9px] font-bold text-teal-600 uppercase tracking-widest">Rule Response Aktif:</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Shield size={12} className={config.response_enabled ? 'text-emerald-500' : 'text-gray-300'} />
            <span className={`text-[10px] font-bold ${config.response_enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
              Desainer Response {config.response_enabled ? '(Wajib)' : '(Off)'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Megaphone size={12} className={config.marketing_response_enabled ? 'text-purple-500' : 'text-gray-300'} />
            <span className={`text-[10px] font-bold ${config.marketing_response_enabled ? 'text-purple-600' : 'text-gray-400'}`}>
              Marketing Response {config.marketing_response_enabled ? '(Wajib)' : '(Off)'}
            </span>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-800 tracking-tight">Desain Final Terpilih (Accepted)</h2>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <Input
              placeholder="Cari project atau client..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs focus:ring-teal-400/20 focus:border-teal-400"
            />
          </div>
        </div>

        {/* Dynamic Filters Row */}
        <div className="px-6 py-3 bg-gray-50/20 border-b border-gray-50 flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-black uppercase tracking-widest mr-1">
            <Filter size={12} className="text-teal-500" /> Filter Data
          </div>

          {/* Status Rencana Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Status Rencana</span>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-36 bg-white border-gray-200/80 rounded-lg text-[10px] font-bold text-gray-700">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent className="rounded-lg text-[10px] font-bold">
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="none">Belum Dibuat</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Selesai (Approved)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipe Interior Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Tipe Interior</span>
            <Select value={filterInterior} onValueChange={setFilterInterior}>
              <SelectTrigger className="h-8 w-36 bg-white border-gray-200/80 rounded-lg text-[10px] font-bold text-gray-700">
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent className="rounded-lg text-[10px] font-bold">
                <SelectItem value="all">Semua Tipe</SelectItem>
                {uniqueJenisInterior.map(jenis => (
                  <SelectItem key={jenis} value={jenis}>{jenis.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Response Filter */}
          {(config.response_enabled || config.marketing_response_enabled) && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Status Tanggapan</span>
              <Select value={filterResponse} onValueChange={setFilterResponse}>
                <SelectTrigger className="h-8 w-44 bg-white border-gray-200/80 rounded-lg text-[10px] font-bold text-gray-700">
                  <SelectValue placeholder="Semua Tanggapan" />
                </SelectTrigger>
                <SelectContent className="rounded-lg text-[10px] font-bold">
                  <SelectItem value="all">Semua Tanggapan</SelectItem>
                  {config.response_enabled && (
                    <SelectItem value="pending_designer">Menunggu Desainer</SelectItem>
                  )}
                  {config.marketing_response_enabled && (
                    <SelectItem value="pending_marketing">Menunggu Marketing</SelectItem>
                  )}
                  <SelectItem value="completed">Tanggapan Lengkap</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="border-gray-50 hover:bg-transparent">
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest px-6 py-3">Project & Client</TableHead>
                {config.response_enabled && (
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Response Desainer</TableHead>
                )}
                {config.marketing_response_enabled && (
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Response Marketing</TableHead>
                )}
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Status Rencana</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right px-6 py-3">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-400 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-teal-500" />
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-400 text-xs">
                    Tidak ada desain final blueprint yang telah disetujui (accepted).
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map(df => {
                  const order = df.order!;
                  const existingPlan = inputItems.find(ii => ii.desain_final_id === df.id);

                  // Validate response constraints
                  const hasDesignerResponse = !!(existingPlan?.response_time && existingPlan.response_by);
                  const hasMarketingResponse = !!(existingPlan?.marketing_response_time && existingPlan.marketing_response_by);

                  const needDesignerResponse = config.response_enabled && !hasDesignerResponse;
                  const needMarketingResponse = config.marketing_response_enabled && !hasMarketingResponse;
                  const isCreateButtonDisabled = needDesignerResponse || needMarketingResponse;

                  // Reason for disabled
                  let disabledReason = '';
                  if (needDesignerResponse && needMarketingResponse) {
                    disabledReason = 'Menunggu response desainer & marketing';
                  } else if (needDesignerResponse) {
                    disabledReason = 'Menunggu response desainer';
                  } else if (needMarketingResponse) {
                    disabledReason = 'Menunggu response marketing';
                  }

                  return (
                    <TableRow 
                      key={df.id} 
                      className="border-gray-50/50 hover:bg-gray-50/50 transition-colors group cursor-pointer"
                      onClick={() => {
                        if (existingPlan) {
                          navigate(`/dashboard/input-item/${existingPlan.id}`);
                        } else if (!isCreateButtonDisabled) {
                          navigate(`/dashboard/input-item/${df.id}/create`);
                        }
                      }}
                    >
                      <TableCell className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-xs text-gray-800 block">{order.nama_project}</span>
                          <span className="text-[10px] text-gray-400 font-bold block">{order.nama_customer} &bull; {order.nomor_order}</span>
                        </div>
                      </TableCell>

                      {config.response_enabled && (
                        <TableCell className="py-4 text-xs" onClick={(e) => e.stopPropagation()}>
                          {hasDesignerResponse ? (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              ✓ {existingPlan?.response_by?.split('@')[0]} • {formatResponseTime(existingPlan?.response_time)}
                            </span>
                          ) : (
                            <Button
                              onClick={() => handleResponse(df.id, 'designer')}
                              variant="outline"
                              className="h-7 text-[9px] font-black uppercase tracking-wider text-teal-600 border-teal-200 hover:bg-teal-50/50 rounded-lg px-3"
                            >
                              Response
                            </Button>
                          )}
                        </TableCell>
                      )}

                      {config.marketing_response_enabled && (
                        <TableCell className="py-4 text-xs" onClick={(e) => e.stopPropagation()}>
                          {hasMarketingResponse ? (
                            <span className="text-purple-600 font-semibold flex items-center gap-1">
                              ✓ {existingPlan?.marketing_response_by?.split('@')[0]} • {formatResponseTime(existingPlan?.marketing_response_time)}
                            </span>
                          ) : (
                            <Button
                              onClick={() => handleResponse(df.id, 'marketing')}
                              variant="outline"
                              className="h-7 text-[9px] font-black uppercase tracking-wider text-purple-600 border-purple-200 hover:bg-purple-50/50 rounded-lg px-3"
                            >
                              Marketing Response
                            </Button>
                          )} 
                        </TableCell>
                      )}

                      <TableCell className="py-4">
                        {existingPlan ? (
                          existingPlan.status === 'approved' ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-50 text-emerald-600 border-emerald-200">
                              SELESAI
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border bg-amber-50 text-amber-600 border-amber-200">
                              DRAFT
                            </span>
                          )
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border bg-gray-50 text-gray-400 border-gray-200">
                            BELUM DIBUAT
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-right px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          {existingPlan ? (
                            <>
                              <button
                                onClick={() => navigate(`/dashboard/input-item/${existingPlan.id}`)}
                                className="p-1.5 text-gray-400 hover:text-teal-500 hover:bg-teal-50 rounded-md transition-colors"
                                title="Lihat Rincian Item"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => navigate(`/dashboard/input-item/${existingPlan.id}/edit`)}
                                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit Rincian"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(existingPlan.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                title="Hapus Rincian"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <div className="flex flex-col items-end">
                              <Button
                                onClick={() => navigate(`/dashboard/input-item/${df.id}/create`)}
                                disabled={isCreateButtonDisabled}
                                size="sm"
                                className="h-8 font-extrabold text-[10px] px-3.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/10 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
                              >
                                <Plus size={11} className="mr-1" /> Buat Rincian Item
                              </Button>
                              {isCreateButtonDisabled && (
                                <span className="text-[9px] font-bold text-red-500 mt-1 uppercase tracking-wider block">
                                  {disabledReason}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
