import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Search, FileText, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: number;
  user_id: number;
  name?: string;
  email?: string;
  role?: string;
}

interface Order {
  id: number;
  nomor_order: string;
  nama_project: string;
  jenis_interior: string;
  nama_customer: string;
  tanggal_masuk_customer?: string | null;
  telepon_customer: string;
  email_customer: string;
  alamat: string;
  tahapan_proyek: string;
  payment_status: string;
  teams?: TeamMember[];
}

interface Survey {
  id: number;
  order_id: number;
  status: string;
  is_contract_deal?: boolean;
  tanggal_survey_ulang?: string | null;
  catatan_ulang?: string;
  temuan_lapangan?: any;
  foto_video_ulang?: any;
  order?: Order;
}

interface GambarKerjaFile {
  id: number;
  file_path: string;
  original_name: string;
  status: string;
}

interface GambarKerja {
  id: number;
  order_id: number;
  status: 'pending' | 'uploaded' | 'revisi' | 'approved';
  response_by: string | null;
  response_time: string | null;
  marketing_response_by: string | null;
  marketing_response_time: string | null;
  revisi_general?: string;
  files: GambarKerjaFile[];
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
  { value: 'pending', label: 'Pending / Belum Upload' },
  { value: 'uploaded', label: 'Menunggu Review' },
  { value: 'revisi', label: 'Revisi' },
  { value: 'approved', label: 'Approved' },
];

const toTitleCase = (str: string) =>
  str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());

export default function GambarKerjaPage() {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [gambarKerjas, setGambarKerjas] = useState<GambarKerja[]>([]);
  const [search, setSearch] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [responseFilter, setResponseFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState({ response_enabled: true, marketing_response_enabled: true });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [surveyRes, gkRes, settingsRes] = await Promise.all([
        api.get('/surveys'),
        api.get('/gambar-kerja'),
        api.get('/settings')
      ]);

      setSurveys(surveyRes.data.data || []);
      setGambarKerjas(gkRes.data.data || []);

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

  function isResurveyFilled(s: Survey) {
    const hasPhotos = s.foto_video_ulang && (() => {
      try {
        const parsed = typeof s.foto_video_ulang === 'string' ? JSON.parse(s.foto_video_ulang) : s.foto_video_ulang;
        return Array.isArray(parsed) && parsed.length > 0;
      } catch {
        return false;
      }
    })();
    const hasTemuan = s.temuan_lapangan && (() => {
      try {
        const parsed = typeof s.temuan_lapangan === 'string' ? JSON.parse(s.temuan_lapangan) : s.temuan_lapangan;
        return Array.isArray(parsed) && parsed.length > 0;
      } catch {
        return false;
      }
    })();
    const hasCatatan = !!(s.catatan_ulang && s.catatan_ulang.trim() !== '');

    return !!(hasPhotos || hasTemuan || hasCatatan);
  }

  // Filter only surveys where contract is DEAL and resurvey is completed
  const eligibleSurveys = surveys.filter(s => s.is_contract_deal && s.tanggal_survey_ulang && isResurveyFilled(s) && s.order);

  const getGambarKerjaForOrder = (orderId: number) => {
    return gambarKerjas.find(g => g.order_id === orderId);
  };

  const filteredItems = eligibleSurveys.filter(s => {
    const project = s.order?.nama_project?.toLowerCase() || '';
    const customer = s.order?.nama_customer?.toLowerCase() || '';
    const searchLower = search.toLowerCase();
    const matchesSearch = project.includes(searchLower) || customer.includes(searchLower);

    const matchesServiceType =
      serviceTypeFilter === 'all' ||
      s.order?.jenis_interior?.toLowerCase() === serviceTypeFilter.toLowerCase();

    const gk = getGambarKerjaForOrder(s.order!.id);
    const statusKey = gk?.status || 'pending';
    const matchesStatus = statusFilter === 'all' || statusKey === statusFilter;

    const responseKey = gk?.response_by ? 'done' : 'waiting';
    const matchesResponse = responseFilter === 'all' || responseKey === responseFilter;

    return matchesSearch && matchesServiceType && matchesStatus && matchesResponse;
  });

  const handleResponse = async (orderId: number) => {
    try {
      await api.post(`/gambar-kerja/${orderId}/response`);
      toast.success('Response gambar kerja berhasil dicatat');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal melakukan response');
    }
  };

  const handleRedirect = async (orderId: number, existingGk?: GambarKerja) => {
    if (!existingGk || !existingGk.response_by) {
      if (!config.response_enabled) {
        // Automatically initialize if response is disabled
        try {
          await api.post(`/gambar-kerja/${orderId}/response`);
        } catch {
          // ignore or handle
        }
      } else {
        toast.error('Harap lakukan response terlebih dahulu');
        return;
      }
    }
    navigate(`/dashboard/gambar-kerja/${orderId}`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <FileText size={18} className="text-teal-500 animate-pulse" /> Gambar Kerja
          </h1>
          <p className="text-xs font-medium text-gray-500">Kelola dan review berkas cetak gambar kerja lapangan</p>
        </div>
      </div>

      <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
        <div className="px-6 py-4 flex flex-col gap-3 border-b border-gray-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Daftar Proyek Selesai Survey Ulang</h2>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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

            {/* Status Gambar Kerja */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Status Gambar Kerja</label>
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

            {/* Response Status */}
            {config.response_enabled && (
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Response</label>
                <Select value={responseFilter} onValueChange={setResponseFilter}>
                  <SelectTrigger className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600">
                    <SelectValue placeholder="Semua Response" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-100 shadow-lg text-xs">
                    <SelectItem value="all" className="text-xs font-medium">Semua Response</SelectItem>
                    <SelectItem value="waiting" className="text-xs font-medium">Menunggu</SelectItem>
                    <SelectItem value="done" className="text-xs font-medium">Sudah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-50 hover:bg-transparent">
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest px-6 py-3">Nama Project</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Klien / Customer</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Service Type</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Status Dokumen</TableHead>
                {config.response_enabled && (
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Responded By</TableHead>
                )}
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right px-6 py-3">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-400 text-xs">Loading...</TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-400 text-xs">Tidak ada proyek siap gambar kerja</TableCell>
                </TableRow>
              ) : (
                filteredItems.map(s => {
                  const gk = getGambarKerjaForOrder(s.order!.id);
                  const isResponded = !!gk?.response_by;

                  return (
                    <TableRow key={s.id} className="border-gray-50/50 hover:bg-gray-50/50 transition-colors group">
                      <TableCell className="px-6 py-3.5 font-bold text-xs text-gray-700">
                        <div>{s.order?.nama_project}</div>
                        <span className="font-mono text-[9px] text-gray-400 font-semibold mt-0.5 block">{s.order?.nomor_order}</span>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-gray-600 py-3.5">
                        {s.order?.nama_customer}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-50 text-teal-600 border border-teal-100">
                          {s.order?.jenis_interior ? toTitleCase(s.order.jenis_interior) : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5">
                        {!gk ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-gray-50 text-gray-400 border border-gray-200 uppercase tracking-wider">
                            Pending
                          </span>
                        ) : gk.status === 'approved' ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider">
                            Approved
                          </span>
                        ) : gk.status === 'revisi' ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider">
                            Revisi
                          </span>
                        ) : gk.status === 'uploaded' ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wider">
                            Menunggu Review
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-wider">
                            Pending
                          </span>
                        )}
                      </TableCell>
                      {config.response_enabled && (
                        <TableCell className="py-3.5 text-xs text-gray-600 font-semibold">
                          {isResponded ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px]">
                              <Check size={12} strokeWidth={2.5} /> {gk.response_by?.split('@')[0]}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-amber-500 font-bold text-[10px]">
                              <AlertCircle size={12} /> Menunggu
                            </div>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right px-6 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          {config.response_enabled && !isResponded ? (
                            <Button
                              onClick={() => handleResponse(s.order!.id)}
                              className="bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-[10px] h-7 px-3 rounded-lg shadow-sm"
                            >
                              Response
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleRedirect(s.order!.id, gk)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] h-7 px-3 rounded-lg shadow-sm"
                            >
                              {gk && gk.status !== 'pending' ? 'Detail' : 'Upload'}
                            </Button>
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
