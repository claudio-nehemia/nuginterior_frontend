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
import { Search, ClipboardCheck, FileDown, Eye, PenTool, Check, ShieldAlert, Loader2 } from 'lucide-react';
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
}

interface ApprovalMaterialItem {
	id: number;
	category: string;
	item_name: string;
	area: string;
	notes: string;
}

interface ApprovalMaterial {
	id: number;
	order_id: number;
	status: 'pending' | 'completed';
	response_by: string | null;
	response_time: string | null;
	marketing_response_by: string | null;
	marketing_response_time: string | null;
	order?: Order;
	items: ApprovalMaterialItem[];
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
  { value: 'pending', label: 'Pending / Draft' },
  { value: 'completed', label: 'Selesai / Approved' },
];

export default function ApprovalMaterialPage() {
  const navigate = useNavigate();
  const [dataList, setDataList] = useState<ApprovalMaterial[]>([]);
  const [search, setSearch] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState({ response_enabled: true });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [materialsRes, settingsRes] = await Promise.all([
        api.get('/approval-materials'),
        api.get('/settings')
      ]);

      setDataList(materialsRes.data.data || []);
      const s: { key: string; value: string }[] = settingsRes.data.data || [];
      setConfig({
        response_enabled: s.find(x => x.key === 'response_enabled')?.value === 'true',
      });
    } catch {
      toast.error('Gagal memuat data approval material');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResponse = async (orderId: number) => {
    try {
      await api.post(`/approval-materials/${orderId}/response`);
      toast.success('Response approval material berhasil dicatat');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal melakukan response');
    }
  };

  const handleRedirect = async (orderId: number, item?: ApprovalMaterial) => {
    const hasResponse = item && item.response_by;
    if (!hasResponse) {
      if (!config.response_enabled) {
        // Auto response if setting is disabled
        try {
          await api.post(`/approval-materials/${orderId}/response`);
        } catch {
          // ignore
        }
      } else {
        toast.error('Harap lakukan response terlebih dahulu');
        return;
      }
    }
    navigate(`/dashboard/approval-material/${orderId}`);
  };

  const handleExportPDF = async (amId: number, orderNum: string) => {
    try {
      const response = await api.get(`/approval-materials/${amId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `approval_material_${orderNum}.pdf`;
      link.click();
      toast.success('File PDF berhasil didownload');
    } catch {
      toast.error('Gagal mendownload PDF approval material');
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
            <ClipboardCheck size={18} className="text-teal-500" /> Approval Material
          </h1>
          <p className="text-xs font-medium text-gray-500">Form persetujuan jenis bahan baku, finishing, dan aksesoris klien</p>
        </div>
      </div>

      <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
        <div className="px-6 py-4 flex flex-col gap-3 border-b border-gray-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Daftar Proyek Approved Gambar Kerja</h2>
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
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Status Approval</label>
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
              <span className="text-xs font-bold">Memuat data proyek...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
              <ShieldAlert size={28} className="text-gray-300" />
              <span className="text-xs font-bold">Tidak ada proyek yang cocok ditemukan</span>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50/60">
                <TableRow className="border-b border-gray-50 hover:bg-transparent">
                  <TableHead className="w-[80px] text-[10px] font-bold text-gray-400 uppercase tracking-wider py-3.5 pl-6">No</TableHead>
                  <TableHead className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-3.5">Project & Client Info</TableHead>
                  <TableHead className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-3.5 w-[300px]">Items (Bahan/Finishing/Aksesoris)</TableHead>
                  <TableHead className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-3.5">Status</TableHead>
                  <TableHead className="text-[10px] font-bold text-gray-400 uppercase tracking-wider py-3.5 text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item, idx) => {
                  const o = item.order!;
                  const hasResponse = !!item.response_by;
                  const isCompleted = item.status === 'completed';

                  return (
                    <TableRow key={o.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                      <TableCell className="text-xs font-bold text-gray-500 pl-6">{idx + 1}</TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-extrabold text-gray-800 tracking-tight">{o.nama_project}</span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{o.nomor_order}</span>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="px-2 py-0.5 text-[9px] font-extrabold bg-teal-50 text-teal-600 rounded-full capitalize">{o.jenis_interior}</span>
                            <span className="text-[10px] text-gray-500 font-semibold">{o.nama_customer}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {/* Scrollable Items Container (max 3 rows) */}
                        <div className="max-h-[90px] overflow-y-auto pr-2 space-y-1.5 scrollbar-thin scrollbar-thumb-gray-200 text-[11px]">
                          {item.items && item.items.length > 0 ? (
                            item.items.map((it) => (
                              <div key={it.id} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-b-0">
                                <span className="font-semibold text-gray-700">{it.item_name}</span>
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-1.5 py-0.5 rounded">
                                  {it.category.replace('_', ' ')}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Belum disinkronisasi/kosong</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                            <Check size={10} strokeWidth={3} /> Selesai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-orange-50 text-orange-600 rounded-full border border-orange-100">
                            Draft / Pending
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
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
                                {isCompleted ? 'Edit Keterangan' : 'Isi Keterangan'}
                              </Button>

                              {item.id > 0 && (
                                <Button
                                  onClick={() => handleExportPDF(item.id, o.nomor_order)}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 border-gray-100 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-100 rounded-xl text-xs font-bold gap-1 transition-all"
                                >
                                  <FileDown size={12} /> PDF
                                </Button>
                              )}

                              {isCompleted && (
                                <Button
                                  onClick={() => navigate(`/dashboard/approval-material/${o.id}?show=true`)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-gray-500 hover:bg-gray-100 rounded-xl text-xs font-bold gap-1"
                                >
                                  <Eye size={12} /> Show
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
