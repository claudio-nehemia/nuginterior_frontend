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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Search, Pencil, Trash2, ClipboardCheck, Check, Users, Eye, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: number;
  user_id: number;
  name?: string;
  email?: string;
  role?: string;
}

interface Survey {
  id: number;
  order_id: number;
  tanggal_survey: string | null;
  lokasi: string;
  catatan: string;
  status: string;
  surveyor_id: number | null;
  response_by: string | null;
  response_time: string | null;
  marketing_response_by: string | null;
  marketing_response_time: string | null;
  layout_files?: any;
  foto_lokasi?: any;
  mom_file?: string;
  // New resurvey fields
  tanggal_survey_ulang?: string | null;
  survey_ulang_team_ids?: any;
  catatan_ulang?: string;
  temuan_lapangan?: any;
  foto_video_ulang?: any;
  is_contract_deal?: boolean;
  order?: {
    id: number;
    nomor_order: string;
    nama_project: string;
    nama_customer: string;
    nama_perusahaan: string;
    jenis_interior: string;
    tanggal_masuk_customer?: string | null;
    teams?: TeamMember[];
  };
}

const jenisOptions = [
  { value: 'residential', label: 'Residential' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'office', label: 'Office' },
  { value: 'retail', label: 'Retail' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'custom', label: 'Custom' },
];

const surveyStatusOptions = [
  { value: 'all', label: 'Semua Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'dijadwalkan', label: 'Dijadwalkan' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'batal', label: 'Batal' },
];

const filledOptions = [
  { value: 'all', label: 'Semua Data' },
  { value: 'filled', label: 'Sudah Terisi' },
  { value: 'empty', label: 'Belum Terisi' },
];

const responseOptions = [
  { value: 'all', label: 'Semua Response' },
  { value: 'none', label: 'Belum Ada' },
  { value: 'response', label: 'Response' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'both', label: 'Response + Marketing' },
];

// Capitalize each word
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

export default function SurveyPage() {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [search, setSearch] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [responseFilter, setResponseFilter] = useState('all');
  const [filledFilter, setFilledFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [config, setConfig] = useState({ response_enabled: true, marketing_response_enabled: true });

  const fetchSurveys = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/surveys');
      setSurveys(res.data.data || []);
    } catch {
      toast.error('Gagal memuat data survey');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
    api.get('/settings').then(res => {
      const s: { key: string; value: string }[] = res.data.data || [];
      setConfig({
        response_enabled: s.find(x => x.key === 'response_enabled')?.value === 'true',
        marketing_response_enabled: s.find(x => x.key === 'marketing_response_enabled')?.value === 'true',
      });
    }).catch(() => {});
  }, []);

  // Complete service type options, plus any extra types from data
  const serviceTypeOptions = (() => {
    const baseMap = new Map(jenisOptions.map(o => [o.value, o.label]));
    const fromData = surveys
      .map(s => s.order?.jenis_interior)
      .filter(Boolean) as string[];
    const extraValues = Array.from(new Set(fromData.filter(v => !baseMap.has(v)))).sort();
    return [
      ...jenisOptions,
      ...extraValues.map(v => ({ value: v, label: toTitleCase(v) })),
    ];
  })();

  const filteredSurveys = surveys.filter(s => {
    const matchesSearch = !search || (
      s.order?.nama_project.toLowerCase().includes(search.toLowerCase()) ||
      s.order?.nama_customer.toLowerCase().includes(search.toLowerCase()) ||
      s.order?.nama_perusahaan?.toLowerCase().includes(search.toLowerCase()) ||
      s.order?.jenis_interior?.toLowerCase().includes(search.toLowerCase())
    );
    const matchesServiceType =
      serviceTypeFilter === 'all' ||
      s.order?.jenis_interior?.toLowerCase() === serviceTypeFilter.toLowerCase();

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

    const responseKey = (() => {
      const hasResponse = !!s.response_by;
      const hasMarketing = !!s.marketing_response_by;
      if (hasResponse && hasMarketing) return 'both';
      if (hasResponse) return 'response';
      if (hasMarketing) return 'marketing';
      return 'none';
    })();
    const matchesResponse = responseFilter === 'all' || responseKey === responseFilter;

    const filled = isSurveyFilled(s);
    const matchesFilled = filledFilter === 'all' || (filledFilter === 'filled' ? filled : !filled);

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

    return matchesSearch && matchesServiceType && matchesStatus && matchesResponse && matchesFilled && matchesDate;
  });

  const handleResponse = async (id: number) => {
    try {
      await api.post(`/surveys/${id}/response`);
      toast.success('Response berhasil');
      fetchSurveys();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal');
    }
  };

  const handleMarketingResponse = async (id: number) => {
    try {
      await api.post(`/surveys/${id}/marketing-response`);
      toast.success('Marketing response berhasil');
      fetchSurveys();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/surveys/${deleteId}`);
      toast.success('Survey berhasil dihapus');
      setDeleteId(null);
      fetchSurveys();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    }
  };

  function isSurveyFilled(s: Survey) {
    const hasLayouts = s.layout_files && (() => {
      try {
        const parsed = typeof s.layout_files === 'string' ? JSON.parse(s.layout_files) : s.layout_files;
        return Array.isArray(parsed) && parsed.length > 0;
      } catch {
        return false;
      }
    })();
    const hasPhotos = s.foto_lokasi && (() => {
      try {
        const parsed = typeof s.foto_lokasi === 'string' ? JSON.parse(s.foto_lokasi) : s.foto_lokasi;
        return Array.isArray(parsed) && parsed.length > 0;
      } catch {
        return false;
      }
    })();
    const hasMom = !!(s.mom_file && s.mom_file.trim() !== '');
    const hasCatatan = !!(s.catatan && s.catatan.trim() !== '');

    return !!(hasLayouts || hasPhotos || hasMom || hasCatatan);
  }

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

  const colSpan = (config.response_enabled || config.marketing_response_enabled) ? 7 : 6;

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <ClipboardCheck size={18} className="text-teal-500" /> Survey
          </h1>
          <p className="text-xs font-medium text-gray-500">Kelola jadwal dan pengukuran survey</p>
        </div>
      </div>

      <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
        <div className="px-6 py-4 flex flex-col gap-3 border-b border-gray-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Daftar Survey</h2>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              {/* Service Type Filter */}
              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger className="h-9 w-full md:w-44 bg-gray-50/50 border-gray-100 rounded-lg text-xs focus:ring-teal-400/20 focus:border-teal-400 font-medium text-gray-600">
                  <SelectValue placeholder="Semua Service Type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-lg text-xs">
                  <SelectItem value="all" className="text-xs font-semibold text-gray-500">
                    Semua Service Type
                  </SelectItem>
                  {serviceTypeOptions.map(type => (
                    <SelectItem key={type.value} value={type.value} className="text-xs font-medium">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <Input
                  placeholder="Cari survey..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs focus:ring-teal-400/20 focus:border-teal-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Status Survey */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Status Survey</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-lg text-xs">
                  {surveyStatusOptions.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs font-medium">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Response Status */}
            {(config.response_enabled || config.marketing_response_enabled) && (
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Response</label>
                <Select value={responseFilter} onValueChange={setResponseFilter}>
                  <SelectTrigger className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600">
                    <SelectValue placeholder="Semua Response" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-100 shadow-lg text-xs">
                    {responseOptions.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-xs font-medium">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Kelengkapan Data */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Kelengkapan</label>
              <Select value={filledFilter} onValueChange={setFilledFilter}>
                <SelectTrigger className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600">
                  <SelectValue placeholder="Semua Data" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-lg text-xs">
                  {filledOptions.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs font-medium">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tanggal Order Awal */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tanggal Order Awal</label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600 w-full"
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
                  className="h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs font-semibold text-gray-600 w-full"
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
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest px-6 py-3">Nama Project</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Nama Perusahaan</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Nama Klien</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Service Type</TableHead>
                {(config.response_enabled || config.marketing_response_enabled) && (
                  <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Response Status</TableHead>
                )}
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest py-3">Team</TableHead>
                <TableHead className="font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right px-6 py-3">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center py-12 text-gray-400 text-xs">Loading...</TableCell>
                </TableRow>
              ) : filteredSurveys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center py-12 text-gray-400 text-xs">Tidak ada survey</TableCell>
                </TableRow>
              ) : (
                filteredSurveys.map(s => {
                  const filled = isSurveyFilled(s);
                  const teams = s.order?.teams ?? [];
                  return (
                    <TableRow key={s.id} className="border-gray-50/50 hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => navigate('/dashboard/survey/' + s.id)}>
                      <TableCell className="px-6 py-3 font-bold text-xs text-gray-700">
                        <div>{s.order?.nama_project || '-'}</div>
                        {s.is_contract_deal && (
                          <div className="mt-1">
                            {!s.tanggal_survey_ulang ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider">
                                Butuh Survey Ulang
                              </span>
                            ) : !isResurveyFilled(s) ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wider">
                                Survey Ulang Dijadwalkan
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider">
                                Survey Ulang Selesai
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-gray-600 py-3">
                        {s.order?.nama_perusahaan || '-'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-gray-600 py-3">
                        {s.order?.nama_customer || '-'}
                      </TableCell>

                      {/* Service Type — title case */}
                      <TableCell className="py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-50 text-teal-600 border border-teal-100">
                          {s.order?.jenis_interior ? toTitleCase(s.order.jenis_interior) : '-'}
                        </span>
                      </TableCell>

                      {(config.response_enabled || config.marketing_response_enabled) && (
                        <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1">
                            {s.response_by ? (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                                <Check size={10} /> {s.response_by.split('@')[0]} • {formatResponseTime(s.response_time)}
                              </div>
                            ) : config.response_enabled ? (
                              <button
                                onClick={() => handleResponse(s.id)}
                                className="px-2 py-0.5 rounded text-[9px] font-bold bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-100"
                              >
                                Response
                              </button>
                            ) : null}
                            {s.marketing_response_by ? (
                              <div className="flex items-center gap-1 text-[10px] text-purple-600 font-bold">
                                <Check size={10} /> {s.marketing_response_by.split('@')[0]} • {formatResponseTime(s.marketing_response_time)}
                              </div>
                            ) : config.marketing_response_enabled ? (
                              <button
                                onClick={() => handleMarketingResponse(s.id)}
                                className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-100"
                              >
                                Marketing
                              </button>
                            ) : null}
                          </div>
                        </TableCell>
                      )}

                      {/* Team — ringkas: jumlah + hover tooltip */}
                      <TableCell className="py-3">
                        {teams.length === 0 ? (
                          <span className="text-gray-400 text-[10px]">-</span>
                        ) : (
                          <div className="relative group/team inline-flex">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-semibold border border-gray-200 cursor-default">
                              <Users size={9} />
                              {teams.length} anggota
                            </span>
                            {/* Tooltip on hover */}
                            <div className="absolute left-0 top-full mt-1.5 z-50 hidden group-hover/team:block min-w-[160px]">
                              <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-2 space-y-1">
                                {teams.map((t, idx) => (
                                  <div key={idx} className="flex items-center justify-between gap-2 px-1">
                                    <span className="text-[10px] font-semibold text-gray-700 truncate max-w-[100px]">
                                      {t.name || '-'}
                                    </span>
                                    <span className="text-[9px] font-medium text-gray-400 shrink-0">
                                      {t.role || '-'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-right px-6 py-3" onClick={(e) => e.stopPropagation()}>
                        {!filled ? (
                          <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            {s.is_contract_deal && (
                              <Button
                                onClick={() => navigate(`/dashboard/survey/${s.id}?tab=survey_ulang`)}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-3 py-1.5 h-8 rounded-lg text-[10px] transition-all shadow-[0_4px_12px_rgba(245,158,11,0.25)] flex items-center gap-1.5"
                              >
                                {!s.tanggal_survey_ulang ? (
                                  <>
                                    <Calendar size={11} />
                                    Atur Survey Ulang
                                  </>
                                ) : (
                                  <>
                                    <ClipboardCheck size={11} />
                                    Hasil Survey Ulang
                                  </>
                                )}
                              </Button>
                            )}
                            <button
                              onClick={() => navigate(`/dashboard/survey/${s.id}`)}
                              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                              title="Detail"
                            >
                              <Eye size={14} />
                            </button>
                            {(!config.response_enabled || !!s.response_by) ? (
                              <Button
                                onClick={() => navigate(`/dashboard/survey/${s.id}/edit`)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold px-3 py-1.5 h-8 rounded-lg text-xs transition-all shadow-[0_4px_12px_rgba(16,185,129,0.25)]"
                              >
                                Create
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-xs font-semibold">-</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            {s.is_contract_deal && (
                              <Button
                                onClick={() => navigate(`/dashboard/survey/${s.id}?tab=survey_ulang`)}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-3 py-1.5 h-8 rounded-lg text-[10px] transition-all shadow-[0_4px_12px_rgba(245,158,11,0.25)] flex items-center gap-1.5"
                              >
                                {!s.tanggal_survey_ulang ? (
                                  <>
                                    <Calendar size={11} />
                                    Atur Survey Ulang
                                  </>
                                ) : (
                                  <>
                                    <ClipboardCheck size={11} />
                                    Hasil Survey Ulang
                                  </>
                                )}
                              </Button>
                            )}
                            <button
                              onClick={() => navigate(`/dashboard/survey/${s.id}`)}
                              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                              title="Detail"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => navigate(`/dashboard/survey/${s.id}/edit`)}
                              className="p-1.5 text-gray-400 hover:text-teal-500 hover:bg-teal-50 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteId(s.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                              title="Hapus"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl p-6 border-0 shadow-2xl max-w-[360px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-gray-800">Hapus Survey</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium text-gray-500 mt-1">
              Apakah Anda yakin ingin menghapus survey ini?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2">
            <AlertDialogCancel className="rounded-lg font-bold h-9 text-xs border-gray-200 text-gray-600 hover:bg-gray-50">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-lg font-bold h-9 text-xs bg-red-400 hover:bg-red-500 text-white shadow-lg shadow-red-400/30"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}