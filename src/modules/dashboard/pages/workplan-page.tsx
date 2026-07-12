import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Search, FileText, FileSpreadsheet, Eye, PenTool, Check, ShieldAlert, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: number;
  nomor_order: string;
  nama_project: string;
  jenis_interior: string;
  nama_customer: string;
  alamat: string;
  tahapan_proyek: string;
  payment_status: string;
  pic_name?: string;
  product_count?: number;
}

interface Workplan {
  id: number;
  order_id: number;
  status: 'belum_isi' | 'sebagian' | 'lengkap';
  response_by: string | null;
  response_time: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  order?: Order;
}

const jenisOptions = [
  { value: 'all', label: 'Semua Service' },
  { value: 'residential', label: 'Residential' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'office', label: 'Office' },
  { value: 'retail', label: 'Retail' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'custom', label: 'Custom' },
];

const statusOptions = [
  { value: 'all', label: 'Semua Status' },
  { value: 'belum_isi', label: 'Belum Isi' },
  { value: 'sebagian', label: 'Sebagian (Draft)' },
  { value: 'lengkap', label: 'Lengkap (Submitted)' },
];

export default function WorkplanPage() {
  const navigate = useNavigate();
  const [dataList, setDataList] = useState<Workplan[]>([]);
  const [search, setSearch] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState({ response_enabled: true });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [workplanRes, settingsRes] = await Promise.all([
        api.get('/workplans'),
        api.get('/settings')
      ]);

      setDataList(workplanRes.data.data || []);
      const s: { key: string; value: string }[] = settingsRes.data.data || [];
      setConfig({
        response_enabled: s.find(x => x.key === 'response_enabled')?.value === 'true',
      });
    } catch {
      toast.error('Gagal memuat data workplan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResponse = async (orderId: number) => {
    try {
      await api.post(`/workplans/${orderId}/response`);
      toast.success('Response workplan berhasil dicatat');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal melakukan response');
    }
  };

  const handleRedirect = async (orderId: number, item: Workplan) => {
    const hasResponse = !!item.response_by;
    if (!hasResponse) {
      if (!config.response_enabled) {
        // Auto-response if setting is disabled
        try {
          await api.post(`/workplans/${orderId}/response`);
        } catch {
          // ignore
        }
      } else {
        toast.error('Harap lakukan response terlebih dahulu');
        return;
      }
    }
    navigate(`/dashboard/workplan/${orderId}`);
  };

  const handleExportExcel = async (wpId: number, orderNum: string) => {
    try {
      const response = await api.get(`/workplans/${wpId}/excel`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Workplan_${orderNum}.xlsx`;
      link.click();
      toast.success('File Excel berhasil didownload');
    } catch {
      toast.error('Gagal mendownload Excel workplan');
    }
  };

  const filteredItems = dataList.filter(item => {
    const order = item.order;
    if (!order) return false;

    const project = order.nama_project?.toLowerCase() || '';
    const customer = order.nama_customer?.toLowerCase() || '';
    const searchLower = search.toLowerCase();
    const matchesSearch = project.includes(searchLower) || customer.includes(searchLower);

    const matchesServiceType =
      serviceTypeFilter === 'all' ||
      order.jenis_interior?.toLowerCase() === serviceTypeFilter.toLowerCase();

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesServiceType && matchesStatus;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <FileText size={18} className="text-teal-500" /> Workplan Proyek
          </h1>
          <p className="text-xs font-medium text-gray-500">Penetapan jadwal, timeline per tahapan, dan durasi pengerjaan lapangan</p>
        </div>
      </div>

      <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
        <div className="px-6 py-4 flex flex-col gap-3 border-b border-gray-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Daftar Proyek Selesai Material Approval</h2>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Service Type */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Service Type</label>
              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600">
                  <SelectValue placeholder="Semua Service" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-lg text-xs">
                  {jenisOptions.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs font-medium">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Status Workplan</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-lg text-xs">
                  {statusOptions.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs font-medium">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
              <Loader2 className="animate-spin text-teal-500" size={24} />
              <span className="text-xs font-bold">Memuat data workplan...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
              <ShieldAlert size={28} className="text-gray-300" />
              <span className="text-xs font-bold">Tidak ada proyek workplan yang cocok</span>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50/60">
                <TableRow className="border-b border-gray-50 hover:bg-transparent">
                  <TableHead className="w-[80px] text-[10px] font-bold text-gray-400 uppercase tracking-wider py-3.5 pl-6">No</TableHead>
                  <TableHead className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-3.5">Project & PIC Info</TableHead>
                  <TableHead className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-3.5">Jumlah Produk</TableHead>
                  <TableHead className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-3.5">Timeline Project</TableHead>
                  <TableHead className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-3.5">Status</TableHead>
                  <TableHead className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-3.5 text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item, idx) => {
                  const o = item.order!;
                  const hasResponse = !!item.response_by;
                  const isLengkap = item.status === 'lengkap';

                  return (
                    <TableRow 
                      key={o.id} 
                      className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors cursor-pointer"
                      onClick={() => handleRedirect(o.id, item)}
                    >
                      <TableCell className="text-xs font-bold text-gray-500 pl-6">{idx + 1}</TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-extrabold text-gray-800 tracking-tight">{o.nama_project}</span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{o.nomor_order}</span>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="px-2 py-0.5 text-[9px] font-extrabold bg-teal-50 text-teal-600 rounded-full capitalize">{o.jenis_interior}</span>
                            <span className="text-[10px] text-gray-500 font-semibold">{o.nama_customer}</span>
                            {o.pic_name && (
                              <span className="text-[9px] font-bold text-gray-400">| PIC: {o.pic_name}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-gray-700">
                        {o.product_count ?? 0} Produk
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 font-semibold">
                        {item.start_date && item.end_date ? (
                          <div className="flex flex-col">
                            <span>{new Date(item.start_date).toLocaleDateString('id-ID')} s/d {new Date(item.end_date).toLocaleDateString('id-ID')}</span>
                            <span className="text-[10px] text-gray-400 font-bold">{item.duration_days} Hari Kerja</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Belum diatur</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.status === 'lengkap' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                            <Check size={10} strokeWidth={3} /> Lengkap
                          </span>
                        ) : item.status === 'sebagian' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-orange-50 text-orange-600 rounded-full border border-orange-100">
                            Sebagian
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-gray-50 text-gray-500 rounded-full border border-gray-100">
                            Belum Isi
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {config.response_enabled && !hasResponse ? (
                            <Button
                              onClick={() => handleResponse(o.id)}
                              size="sm"
                              className="h-8 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold gap-1 shadow-md shadow-teal-500/20"
                            >
                              <PenTool size={12} /> Response
                            </Button>
                          ) : (
                            <>
                              <Button
                                onClick={() => handleRedirect(o.id, item)}
                                size="sm"
                                variant="outline"
                                className="h-8 border-gray-100 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-100 rounded-xl text-xs font-bold gap-1 transition-all"
                              >
                                {item.status === 'belum_isi' ? 'Buat' : isLengkap ? 'Show' : 'Edit Workplan'}
                              </Button>

                              {item.id > 0 && (
                                <Button
                                  onClick={() => handleExportExcel(item.id, o.nomor_order)}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 border-gray-100 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-100 rounded-xl text-xs font-bold gap-1 transition-all"
                                >
                                  <FileSpreadsheet size={12} /> Export Excel
                                </Button>
                              )}

                              {isLengkap && (
                                <Button
                                  onClick={() => navigate(`/dashboard/workplan/${o.id}?show=true`)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-gray-500 hover:bg-gray-100 rounded-xl text-xs font-bold gap-1"
                                >
                                  <Eye size={12} /> Detail
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
