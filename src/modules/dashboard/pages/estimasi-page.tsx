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
import { Search, Calculator, Eye, Check, AlertCircle } from 'lucide-react';
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
  teams?: TeamMember[];
}

interface MoodboardFile {
  id: number;
  file_path: string;
  file_type: 'kasar' | 'final';
  original_name: string;
}

interface EstimasiFile {
  id: number;
  moodboard_file_id: number;
  file_path: string;
  original_name: string;
}

interface Estimasi {
  id: number;
  estimated_cost: string;
  response_by: string | null;
  response_time: string | null;
  pm_response_by: string | null;
  pm_response_time: string | null;
  files: EstimasiFile[];
}

interface Moodboard {
  id: number;
  order_id: number;
  status: 'pending' | 'approved' | 'revisi';
  response_by: string | null;
  files: MoodboardFile[];
  estimasi?: Estimasi;
  order?: Order;
}

const jenisOptions = [
  { value: 'residential', label: 'Residential' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'office', label: 'Office' },
  { value: 'retail', label: 'Retail' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'custom', label: 'Custom' },
];

const toTitleCase = (str: string) =>
  str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());

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

export default function EstimasiPage() {
  const navigate = useNavigate();
  const [moodboards, setMoodboards] = useState<Moodboard[]>([]);
  const [search, setSearch] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [moodboardStatusFilter, setMoodboardStatusFilter] = useState('all');
  const [rabStatusFilter, setRabStatusFilter] = useState('all');
  const [responseFilter, setResponseFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState({ response_enabled: true, marketing_response_enabled: true });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [mbRes, settingsRes] = await Promise.all([
        api.get('/moodboards'),
        api.get('/settings')
      ]);

      setMoodboards(mbRes.data.data || []);

      const s: { key: string; value: string }[] = settingsRes.data.data || [];
      setConfig({
        response_enabled: s.find(x => x.key === 'response_enabled')?.value === 'true',
        marketing_response_enabled: s.find(x => x.key === 'marketing_response_enabled')?.value === 'true',
      });
    } catch {
      toast.error('Gagal memuat data estimasi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter moodboards that have at least one rough design file uploaded
  const activeMoodboards = moodboards.filter(m => {
    const hasRoughFiles = m.files?.some(f => f.file_type === 'kasar');
    return hasRoughFiles && m.order;
  });

  const serviceTypeOptions = (() => {
    const baseMap = new Map(jenisOptions.map(o => [o.value, o.label]));
    const fromData = activeMoodboards
      .map(m => m.order?.jenis_interior)
      .filter(Boolean) as string[];
    const extraValues = Array.from(new Set(fromData.filter(v => !baseMap.has(v)))).sort();
    return [
      ...jenisOptions,
      ...extraValues.map(v => ({ value: v, label: toTitleCase(v) })),
    ];
  })();

  const filteredItems = activeMoodboards.filter(m => {
    const project = m.order?.nama_project?.toLowerCase() || '';
    const customer = m.order?.nama_customer?.toLowerCase() || '';
    const searchLower = search.toLowerCase();
    const matchesSearch = project.includes(searchLower) || customer.includes(searchLower);

    const matchesServiceType =
      serviceTypeFilter === 'all' ||
      m.order?.jenis_interior?.toLowerCase() === serviceTypeFilter.toLowerCase();

    const matchesMoodboardStatus =
      moodboardStatusFilter === 'all' || m.status === moodboardStatusFilter;

    const kasarCount = m.files?.filter(f => f.file_type === 'kasar').length || 0;
    const rabCount = m.estimasi?.files?.length || 0;
    const rabKey = rabCount === 0 ? 'none' : (rabCount < kasarCount ? 'partial' : 'complete');
    const matchesRab = rabStatusFilter === 'all' || rabKey === rabStatusFilter;

    const responseKey = m.estimasi?.response_by ? 'done' : 'waiting';
    const matchesResponse = responseFilter === 'all' || responseKey === responseFilter;

    let matchesDate = true;
    if (startDate || endDate) {
      const orderDate = m.order?.tanggal_masuk_customer;
      if (!orderDate) {
        matchesDate = false;
      } else {
        try {
          const isoDate = new Date(orderDate).toISOString().split('T')[0];
          if (startDate && isoDate < startDate) matchesDate = false;
          if (endDate && isoDate > endDate) matchesDate = false;
        } catch {
          matchesDate = false;
        }
      }
    }

    return matchesSearch && matchesServiceType && matchesMoodboardStatus && matchesRab && matchesResponse && matchesDate;
  });

  const handleResponseEstimasi = async (moodboardId: number) => {
    try {
      await api.post(`/moodboards/${moodboardId}/estimasi/response`);
      toast.success('Response estimator berhasil dicatat');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal melakukan response estimasi');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <Calculator size={18} className="text-teal-500 animate-pulse" /> Estimasi
          </h1>
          <p className="text-xs font-medium text-gray-500">Kelola dan input Rencana Anggaran Biaya (RAB) proyek</p>
        </div>
      </div>

      <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
        <div className="px-6 py-4 flex flex-col gap-3 border-b border-gray-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Daftar Estimasi RAB Proyek</h2>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Service Type */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Service Type</label>
              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600">
                  <SelectValue placeholder="Semua Service" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-lg text-xs">
                  <SelectItem value="all" className="text-xs font-medium">Semua Service</SelectItem>
                  {serviceTypeOptions.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs font-medium">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Moodboard Status */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Status Moodboard</label>
              <Select value={moodboardStatusFilter} onValueChange={setMoodboardStatusFilter}>
                <SelectTrigger className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-lg text-xs">
                  <SelectItem value="all" className="text-xs font-medium">Semua Status</SelectItem>
                  <SelectItem value="pending" className="text-xs font-medium">Pending</SelectItem>
                  <SelectItem value="approved" className="text-xs font-medium">Approved</SelectItem>
                  <SelectItem value="revisi" className="text-xs font-medium">Revisi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* RAB Completion */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">RAB Completion</label>
              <Select value={rabStatusFilter} onValueChange={setRabStatusFilter}>
                <SelectTrigger className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600">
                  <SelectValue placeholder="Semua RAB" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-lg text-xs">
                  <SelectItem value="all" className="text-xs font-medium">Semua RAB</SelectItem>
                  <SelectItem value="none" className="text-xs font-medium">Belum Ada</SelectItem>
                  <SelectItem value="partial" className="text-xs font-medium">Sebagian</SelectItem>
                  <SelectItem value="complete" className="text-xs font-medium">Lengkap</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Response */}
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

            {/* Tanggal Order */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tanggal Order</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600"
                />
                <div className="relative">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600"
                  />
                  {(startDate || endDate) && (
                    <button
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-red-500 hover:text-red-600 px-1.5 py-0.5 rounded bg-gray-50"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-50 hover:bg-transparent">
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest px-6 py-3">Project & Client</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Moodboard Status</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">RAB Completion</TableHead>
                {(config.response_enabled || config.marketing_response_enabled) && (
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Response Status</TableHead>
                )}
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right px-6 py-3">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={(config.response_enabled || config.marketing_response_enabled) ? 5 : 4} className="text-center py-12 text-gray-400 text-xs">Loading...</TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={(config.response_enabled || config.marketing_response_enabled) ? 5 : 4} className="text-center py-12 text-gray-400 text-xs">Tidak ada data estimasi aktif</TableCell>
                </TableRow>
              ) : (
                filteredItems.map(m => {
                  const order = m.order!;
                  
                  // Compute Moodboard status style
                  let mbStatusBadge = 'bg-amber-50 text-amber-600 border-amber-200';
                  if (m.status === 'approved') mbStatusBadge = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                  if (m.status === 'revisi') mbStatusBadge = 'bg-red-50 text-red-600 border-red-200';

                  // Compute RAB Completion details
                  const kasarCount = m.files?.filter(f => f.file_type === 'kasar').length || 0;
                  const rabCount = m.estimasi?.files?.length || 0;

                  let rabStatus = 'BELUM ADA';
                  let rabStyle = 'bg-red-50 text-red-600 border-red-100';

                  if (rabCount > 0) {
                    if (rabCount < kasarCount) {
                      rabStatus = `${rabCount}/${kasarCount} TERISI`;
                      rabStyle = 'bg-amber-50 text-amber-600 border-amber-100';
                    } else {
                      rabStatus = 'LENGKAP';
                      rabStyle = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                    }
                  }

                  const isAwaitingResponse = config.response_enabled && (!m.estimasi || !m.estimasi.response_by);

                  return (
                    <TableRow 
                      key={m.id} 
                      className={`border-gray-50/50 hover:bg-gray-50/50 transition-colors group ${!isAwaitingResponse ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (!isAwaitingResponse) {
                          navigate(`/dashboard/estimasi/${m.id}`);
                        }
                      }}
                    >
                      {/* Project & Client */}
                      <TableCell className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-xs text-gray-800 block">{order.nama_project}</span>
                          <span className="text-[10px] text-gray-400 font-bold block">{order.nama_customer} &bull; {order.nomor_order}</span>
                        </div>
                      </TableCell>

                      {/* Moodboard Status */}
                      <TableCell className="py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${mbStatusBadge}`}>
                          {m.status.toUpperCase()}
                        </span>
                      </TableCell>

                      {/* RAB Completion */}
                      <TableCell className="py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${rabStyle}`}>
                          {rabStatus}
                        </span>
                      </TableCell>

                      {/* Response Status */}
                      {(config.response_enabled || config.marketing_response_enabled) && (
                        <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1.5">
                            {/* Estimator Response */}
                            {config.response_enabled && (
                              m.estimasi?.response_by ? (
                                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                                  <Check size={10} className="stroke-[3]" /> {m.estimasi.response_by.split('@')[0]} • {formatResponseTime(m.estimasi.response_time)}
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleResponseEstimasi(m.id)}
                                  className="px-2 py-0.5 rounded text-[9px] font-bold bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-100 transition-colors"
                                >
                                  Response Estimasi
                                </button>
                              )
                            )}

                            {/* PM / Marketing Response */}
                            {config.marketing_response_enabled && (
                              m.estimasi?.pm_response_by ? (
                                <div className="flex items-center gap-1 text-[10px] text-purple-600 font-bold">
                                  <Check size={10} className="stroke-[3]" /> {m.estimasi.pm_response_by.split('@')[0]} • {formatResponseTime(m.estimasi.pm_response_time)}
                                </div>
                              ) : (
                                <span className="text-[9px] text-gray-400 font-semibold italic block">
                                  Belum disetujui PM
                                </span>
                              )
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Action */}
                      <TableCell className="text-right px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          {isAwaitingResponse ? (
                            <span className="text-gray-400 text-[10px] font-semibold italic flex items-center gap-1">
                              <AlertCircle size={10} /> Awaiting Response
                            </span>
                          ) : (
                            <Button
                              onClick={() => navigate(`/dashboard/estimasi/${m.id}`)}
                              size="sm"
                              className="h-8 font-extrabold text-[10px] px-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg shadow-lg shadow-teal-500/10"
                            >
                              <Eye size={11} className="mr-1" /> Kelola RAB
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
