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

import { Search, Palette, Eye, Pencil, Plus, Check, AlertCircle } from 'lucide-react';
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
  order?: Order;
}

interface MoodboardFile {
  id: number;
  file_path: string;
  file_type: 'kasar' | 'final';
  original_name: string;
}

interface Moodboard {
  id: number;
  order_id: number;
  status: 'pending' | 'approved' | 'revisi';
  response_by: string | null;
  response_time: string | null;
  marketing_response_by: string | null;
  marketing_response_time: string | null;
  files: MoodboardFile[];
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

export default function MoodboardPage() {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [moodboards, setMoodboards] = useState<Moodboard[]>([]);
  const [search, setSearch] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [responseFilter, setResponseFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState({ response_enabled: true, marketing_response_enabled: true });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [surveyRes, mbRes, settingsRes] = await Promise.all([
        api.get('/surveys'),
        api.get('/moodboards'),
        api.get('/settings')
      ]);

      setSurveys(surveyRes.data.data || []);
      setMoodboards(mbRes.data.data || []);

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

  // Filter only finished surveys
  const finishedSurveys = surveys.filter(s => s.status === 'selesai' && s.order);

  const serviceTypeOptions = (() => {
    const baseMap = new Map(jenisOptions.map(o => [o.value, o.label]));
    const fromData = finishedSurveys
      .map(s => s.order?.jenis_interior)
      .filter(Boolean) as string[];
    const extraValues = Array.from(new Set(fromData.filter(v => !baseMap.has(v)))).sort();
    return [
      ...jenisOptions,
      ...extraValues.map(v => ({ value: v, label: toTitleCase(v) })),
    ];
  })();

  const getMoodboardForOrder = (orderId: number) => {
    return moodboards.find(m => m.order_id === orderId);
  };

  const filteredItems = finishedSurveys.filter(s => {
    const project = s.order?.nama_project?.toLowerCase() || '';
    const customer = s.order?.nama_customer?.toLowerCase() || '';
    const searchLower = search.toLowerCase();
    const matchesSearch = project.includes(searchLower) || customer.includes(searchLower);

    const matchesServiceType =
      serviceTypeFilter === 'all' ||
      s.order?.jenis_interior?.toLowerCase() === serviceTypeFilter.toLowerCase();

    const mb = getMoodboardForOrder(s.order!.id);
    const statusKey = (() => {
      if (!mb) return 'pending';
      const kasarCount = mb.files?.filter(f => f.file_type === 'kasar').length || 0;
      if (kasarCount === 0) return 'pending';
      if (mb.status === 'approved') return 'accepted';
      if (mb.status === 'revisi') return 'revision';
      return 'uploaded';
    })();
    const matchesStatus = statusFilter === 'all' || statusKey === statusFilter;

    const responseKey = mb?.response_by ? 'done' : 'waiting';
    const matchesResponse = responseFilter === 'all' || responseKey === responseFilter;

    let matchesDate = true;
    if (startDate || endDate) {
      const orderDate = s.order?.tanggal_masuk_customer;
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

    return matchesSearch && matchesServiceType && matchesStatus && matchesResponse && matchesDate;
  });

  const handleResponse = async (orderId: number) => {
    try {
      await api.post(`/orders/${orderId}/moodboard/response`);
      toast.success('Response moodboard berhasil dicatat');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal melakukan response');
    }
  };

  const handleCreateRedirect = async (orderId: number, existingMb?: Moodboard) => {
    if (!existingMb) {
      // If response_enabled is false, we can initialize it automatically on click
      try {
        await api.post(`/orders/${orderId}/moodboard/response`);
        navigate(`/dashboard/moodboard/${orderId}/create`);
      } catch (err: any) {
        const errMsg = err.response?.data?.message || err.message || 'Gagal menginisialisasi moodboard';
        toast.error(errMsg);
      }
    } else {
      navigate(`/dashboard/moodboard/${orderId}/create`);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <Palette size={18} className="text-teal-500 animate-pulse" /> Moodboard
          </h1>
          <p className="text-xs font-medium text-gray-500">Kelola dan kembangkan konsep desain visual proyek</p>
        </div>
      </div>

      <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
        <div className="px-6 py-4 flex flex-col gap-3 border-b border-gray-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Daftar Proyek Selesai Survey</h2>
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

            {/* Status Moodboard */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Status Moodboard</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-lg text-xs">
                  <SelectItem value="all" className="text-xs font-medium">Semua Status</SelectItem>
                  <SelectItem value="pending" className="text-xs font-medium">Pending</SelectItem>
                  <SelectItem value="uploaded" className="text-xs font-medium">Uploaded</SelectItem>
                  <SelectItem value="accepted" className="text-xs font-medium">Accepted</SelectItem>
                  <SelectItem value="revision" className="text-xs font-medium">Revision</SelectItem>
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

            {/* Tanggal Order Awal */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tanggal Order Awal</label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600"
              />
            </div>

            {/* Tanggal Order Akhir */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tanggal Order Akhir</label>
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
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-red-500 hover:text-red-600 px-1.5 py-0.5 rounded bg-gray-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-50 hover:bg-transparent">
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest px-6 py-3">Project & Client</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Status Moodboard</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Designer Assigned</TableHead>
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
                  <TableCell colSpan={(config.response_enabled || config.marketing_response_enabled) ? 5 : 4} className="text-center py-12 text-gray-400 text-xs">Tidak ada proyek yang selesai survey</TableCell>
                </TableRow>
              ) : (
                filteredItems.map(s => {
                  const order = s.order!;
                  const mb = getMoodboardForOrder(order.id);
                  
                  // Compute visual status
                  let statusLabel = 'pending';
                  let badgeStyle = 'bg-amber-50 text-amber-600 border-amber-200';
                  
                  if (mb) {
                    const kasarCount = mb.files?.filter(f => f.file_type === 'kasar').length || 0;
                    if (kasarCount === 0) {
                      statusLabel = 'pending';
                      badgeStyle = 'bg-amber-50 text-amber-600 border-amber-200';
                    } else if (mb.status === 'approved') {
                      statusLabel = 'accepted';
                      badgeStyle = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                    } else if (mb.status === 'revisi') {
                      statusLabel = 'revision';
                      badgeStyle = 'bg-red-50 text-red-600 border-red-200';
                    } else {
                      statusLabel = 'uploaded';
                      badgeStyle = 'bg-blue-50 text-blue-600 border-blue-200';
                    }
                  }

                  // Find Designer
                  const teams = order.teams || [];
                  const designer = teams.find(t => t.role === 'Desainer' || t.role?.toLowerCase() === 'desainer' || t.role?.toLowerCase() === 'designer');

                  // Check response status
                  const isAwaitingResponse = config.response_enabled && (!mb || !mb.response_by);

                  return (
                    <TableRow key={s.id} className="border-gray-50/50 hover:bg-gray-50/50 transition-colors group">
                      {/* Project & Client */}
                      <TableCell className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-xs text-gray-800 block">{order.nama_project}</span>
                          <span className="text-[10px] text-gray-400 font-bold block">{order.nama_customer} &bull; {order.nomor_order}</span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${badgeStyle}`}>
                          {statusLabel.toUpperCase()}
                        </span>
                      </TableCell>

                      {/* Designer Assigned */}
                      <TableCell className="py-4">
                        {designer ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-[9px] font-bold">
                              {designer.name ? designer.name[0].toUpperCase() : 'D'}
                            </div>
                            <span className="text-xs font-semibold text-gray-700">{designer.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[10px] font-medium">-</span>
                        )}
                      </TableCell>

                      {/* Response Status */}
                      {(config.response_enabled || config.marketing_response_enabled) && (
                        <TableCell className="py-4">
                          <div className="space-y-1.5">
                            {/* Designer Response */}
                            {config.response_enabled && (
                              mb?.response_by ? (
                                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                                  <Check size={10} className="stroke-[3]" /> {mb.response_by.split('@')[0]} • {formatResponseTime(mb.response_time)}
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleResponse(order.id)}
                                  className="px-2 py-0.5 rounded text-[9px] font-bold bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-100 transition-colors"
                                >
                                  Response Desainer
                                </button>
                              )
                            )}

                            {/* Marketing Response */}
                            {config.marketing_response_enabled && (
                              mb?.marketing_response_by ? (
                                <div className="flex items-center gap-1 text-[10px] text-purple-600 font-bold">
                                  <Check size={10} className="stroke-[3]" /> {mb.marketing_response_by.split('@')[0]} • {formatResponseTime(mb.marketing_response_time)}
                                </div>
                              ) : (
                                <span className="text-[9px] text-gray-400 font-semibold italic block">
                                  Belum disetujui Marketing
                                </span>
                              )
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Actions */}
                      <TableCell className="text-right px-6 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          {/* Show Detail Button if moodboard exists */}
                          {mb && (
                            <button
                              onClick={() => navigate(`/dashboard/moodboard/${order.id}`)}
                              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                              title="Show Detail"
                            >
                              <Eye size={14} />
                            </button>
                          )}

                          {/* Create/Edit Button */}
                          {isAwaitingResponse ? (
                            <span className="text-gray-400 text-[10px] font-semibold italic flex items-center gap-1">
                              <AlertCircle size={10} /> Awaiting Response
                            </span>
                          ) : (
                            <Button
                              onClick={() => handleCreateRedirect(order.id, mb)}
                              size="sm"
                              className={`h-8 font-extrabold text-[10px] px-3.5 rounded-lg transition-all ${
                                mb && mb.files?.filter(f => f.file_type === 'kasar').length > 0
                                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'
                                  : 'bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/10'
                              }`}
                            >
                              {mb && mb.files?.filter(f => f.file_type === 'kasar').length > 0 ? (
                                <>
                                  <Pencil size={11} className="mr-1" /> Edit Design
                                </>
                              ) : (
                                <>
                                  <Plus size={11} className="mr-1" /> Upload Design
                                </>
                              )}
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
