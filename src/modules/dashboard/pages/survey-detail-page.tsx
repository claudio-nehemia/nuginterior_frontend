import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, Pencil, Calendar, MapPin, User, FileText, Check, 
  Download, Users, ClipboardCheck, Layout, Image, FileDigit,
  Plus, X, Search, Trash2, Upload, Loader2, Play, Film, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: string;
}

interface Pengukuran {
  id: number;
  jenis_pengukuran_id: number | null;
  nama_pengukuran: string;
  nama_custom: string;
  checked: boolean;
  notes: string;
  panjang: number;
  lebar: number;
  tinggi: number;
  has_lebar: boolean;
  has_tinggi: boolean;
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
  marketing_response_by: string | null;
  layout_files?: any;
  foto_lokasi?: any;
  mom_file?: string;
  mom_files?: any;
  // New resurvey fields
  tanggal_survey_ulang?: string | null;
  survey_ulang_team_ids?: any;
  catatan_ulang?: string;
  temuan_lapangan?: any;
  foto_video_ulang?: any;
  is_contract_deal?: boolean;
  surveyor?: {
    name: string;
    email: string;
    role?: string;
  };
  survey_ulang_team?: {
    id: number;
    name: string;
    email: string;
    role?: string;
  }[];
  order?: {
    id: number;
    nomor_order: string;
    nama_project: string;
    nama_customer: string;
    nama_perusahaan: string;
    jenis_interior: string;
    alamat?: string;
    teams?: TeamMember[];
  };
  pengukuran?: Pengukuran[];
}

const statusBadgeMap: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600 border-amber-200',
  dijadwalkan: 'bg-blue-50 text-blue-600 border-blue-200',
  selesai: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  batal: 'bg-red-50 text-red-600 border-red-200',
};

const toTitleCase = (str: string) =>
  str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());

export default function SurveyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setPageTitle } = useOutletContext<{ setPageTitle: (title: string | null) => void }>();
  const [searchParams] = useSearchParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'survey_awal' | 'survey_ulang'>(() => {
    return (searchParams.get('tab') === 'survey_ulang') ? 'survey_ulang' : 'survey_awal';
  });

  // Resurvey Scheduling states
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [resurveyDate, setResurveyDate] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<any[]>([]);
  const [searchTeam, setSearchTeam] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Resurvey Results states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [notesUlang, setNotesUlang] = useState('');
  const [temuanRows, setTemuanRows] = useState<{ item: string; notes: string }[]>([]);
  const [fotoVideoFiles, setFotoVideoFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // AI Survey Brief states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleGenerateAiSummary = async () => {
    setIsAiLoading(true);
    try {
      const res = await api.get(`/surveys/${id}/ai-summary`);
      setAiSummary(res.data?.data?.summary || '');
      setIsAiModalOpen(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memproses brief desain AI. Pastikan OpenAI API Key sudah diatur.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const getFileUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/api$/, '');
    return `${base}${url}`;
  };

  const loadSurveyDetails = () => {
    setIsLoading(true);
    api.get(`/surveys/${id}`)
      .then(res => {
        setSurvey(res.data.data);
      })
      .catch(() => {
        toast.error('Gagal memuat detail survey');
        navigate('/dashboard/survey');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadSurveyDetails();
  }, [id, navigate]);

  useEffect(() => {
    const title = survey?.order?.nama_project || 'Detail Survey';
    setPageTitle(title);
    return () => setPageTitle(null);
  }, [setPageTitle, survey?.order?.nama_project]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'survey_ulang') {
      setActiveTab('survey_ulang');
    } else if (tabParam === 'survey_awal') {
      setActiveTab('survey_awal');
    }
  }, [searchParams]);

  // Handle scheduling modals
  const openScheduleModal = () => {
    setResurveyDate(survey?.tanggal_survey_ulang ? survey.tanggal_survey_ulang.split('T')[0] : '');
    setSelectedTeam(survey?.survey_ulang_team || []);
    setScheduleModalOpen(true);
    setSearchTeam('');
    setRoleFilter('all');
    api.get('/users').then(r => setAllUsers(r.data.data || [])).catch(() => {});
  };

  const handleSaveSchedule = async () => {
    if (!resurveyDate) {
      toast.error('Silakan tentukan tanggal survey ulang');
      return;
    }
    if (!survey) return;
    setIsSaving(true);
    
    const payload = {
      order_id: survey.order_id,
      tanggal_survey: survey.tanggal_survey ? survey.tanggal_survey.split('T')[0] : null,
      lokasi: survey.lokasi,
      catatan: survey.catatan,
      status: survey.status,
      surveyor_id: survey.surveyor_id,
      layout_files: survey.layout_files,
      foto_lokasi: survey.foto_lokasi,
      mom_file: survey.mom_file,
      mom_files: survey.mom_files,
      pengukuran: survey.pengukuran?.map(p => ({
        jenis_pengukuran_id: p.jenis_pengukuran_id,
        nama_custom: p.nama_custom,
        checked: p.checked,
        notes: p.notes,
        panjang: p.panjang,
        lebar: p.lebar,
        tinggi: p.tinggi,
        has_lebar: p.has_lebar,
        has_tinggi: p.has_tinggi,
      })) || [],
      // Resurvey fields
      tanggal_survey_ulang: resurveyDate,
      survey_ulang_team_ids: selectedTeam.map(t => t.id),
      catatan_ulang: survey.catatan_ulang || '',
      temuan_lapangan: survey.temuan_lapangan || [],
      foto_video_ulang: survey.foto_video_ulang || [],
    };

    try {
      await api.put(`/surveys/${survey.id}`, payload);
      toast.success('Jadwal survey ulang berhasil disimpan');
      setScheduleModalOpen(false);
      // reload details
      const res = await api.get(`/surveys/${survey.id}`);
      setSurvey(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan jadwal');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle upload results modal
  const openUploadModal = () => {
    setNotesUlang(survey?.catatan_ulang || '');
    let existingTemuan = [];
    if (survey?.temuan_lapangan) {
      try {
        existingTemuan = typeof survey.temuan_lapangan === 'string' 
          ? JSON.parse(survey.temuan_lapangan) 
          : survey.temuan_lapangan;
      } catch {
        existingTemuan = [];
      }
    }
    setTemuanRows(existingTemuan.length > 0 ? existingTemuan : [{ item: '', notes: '' }]);
    
    let existingFiles = [];
    if (survey?.foto_video_ulang) {
      try {
        existingFiles = typeof survey.foto_video_ulang === 'string'
          ? JSON.parse(survey.foto_video_ulang)
          : survey.foto_video_ulang;
      } catch {
        existingFiles = [];
      }
    }
    setFotoVideoFiles(existingFiles);
    setUploadModalOpen(true);
  };

  const handleSaveUpload = async () => {
    if (!survey) return;
    setIsSaving(true);
    
    const payload = {
      order_id: survey.order_id,
      tanggal_survey: survey.tanggal_survey ? survey.tanggal_survey.split('T')[0] : null,
      lokasi: survey.lokasi,
      catatan: survey.catatan,
      status: survey.status,
      surveyor_id: survey.surveyor_id,
      layout_files: survey.layout_files,
      foto_lokasi: survey.foto_lokasi,
      mom_file: survey.mom_file,
      mom_files: survey.mom_files,
      pengukuran: survey.pengukuran?.map(p => ({
        jenis_pengukuran_id: p.jenis_pengukuran_id,
        nama_custom: p.nama_custom,
        checked: p.checked,
        notes: p.notes,
        panjang: p.panjang,
        lebar: p.lebar,
        tinggi: p.tinggi,
        has_lebar: p.has_lebar,
        has_tinggi: p.has_tinggi,
      })) || [],
      // Resurvey fields
      tanggal_survey_ulang: survey.tanggal_survey_ulang ? survey.tanggal_survey_ulang.split('T')[0] : null,
      survey_ulang_team_ids: survey.survey_ulang_team?.map((t: any) => t.id) || [],
      catatan_ulang: notesUlang,
      temuan_lapangan: temuanRows.filter(r => r.item.trim()),
      foto_video_ulang: fotoVideoFiles,
    };

    try {
      await api.put(`/surveys/${survey.id}`, payload);
      toast.success('Hasil survey ulang berhasil disimpan');
      setUploadModalOpen(false);
      // reload
      const res = await api.get(`/surveys/${survey.id}`);
      setSurvey(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan hasil survey ulang');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('image', files[i]);
        const res = await api.post('/upload', formData, { 
          headers: { 'Content-Type': 'multipart/form-data' } 
        });
        const url = res.data?.data?.url;
        if (url) urls.push(url);
      }
      setFotoVideoFiles(p => [...p, ...urls]);
      toast.success(`${files.length} file berhasil diunggah`);
    } catch {
      toast.error('Gagal mengunggah file. Pastikan server aktif.');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleUserInTeam = (user: any) => {
    if (selectedTeam.some(t => t.id === user.id)) {
      setSelectedTeam(prev => prev.filter(t => t.id !== user.id));
    } else {
      setSelectedTeam(prev => [...prev, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role?.nama_role || ''
      }]);
    }
  };

  // Parse filters for role dropdown
  const rolesList = Array.from(
    new Set(
      allUsers
        .map(u => u.role?.nama_role)
        .filter((r): r is string => typeof r === 'string' && r.trim() !== '')
    )
  );

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTeam.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTeam.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role?.nama_role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-gray-500 font-semibold text-xs">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent animate-spin rounded-full mr-2" />
        Memuat detail survey...
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="text-center py-12 text-gray-400 text-xs font-semibold">
        Data survey tidak ditemukan
      </div>
    );
  }

  // Parse Files helper
  const parseFiles = (field: any): string[] => {
    if (!field) return [];
    try {
      const parsed = typeof field === 'string' ? JSON.parse(field) : field;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const layoutFiles = parseFiles(survey.layout_files);
  const fotoLokasi = parseFiles(survey.foto_lokasi);
  const momFiles = parseFiles(survey.mom_files);
  const fotoVideoUlang = parseFiles(survey.foto_video_ulang);

  let temuanLapangan: { item: string; notes: string }[] = [];
  if (survey.temuan_lapangan) {
    try {
      temuanLapangan = typeof survey.temuan_lapangan === 'string' 
        ? JSON.parse(survey.temuan_lapangan)
        : survey.temuan_lapangan;
    } catch {
      temuanLapangan = [];
    }
  }

  if (momFiles.length === 0 && survey.mom_file) {
    momFiles.push(survey.mom_file);
  }

  const checkedPengukuran = survey.pengukuran?.filter(p => p.checked) || [];

  const isSurveyFilled = !!(
    layoutFiles.length > 0 || 
    fotoLokasi.length > 0 || 
    momFiles.length > 0 || 
    survey.catatan?.trim()
  );

  const isResurveyFilled = !!(
    fotoVideoUlang.length > 0 ||
    temuanLapangan.length > 0 ||
    survey.catatan_ulang?.trim()
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-700 max-w-[1600px] mx-auto pb-8">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/survey')}
            className="p-2 text-gray-400 hover:text-teal-500 hover:bg-teal-50 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="space-y-0.5">
            <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
              <ClipboardCheck size={18} className="text-teal-500" />
              Detail Survey Proyek
            </h1>
            <p className="text-xs font-medium text-gray-500">
              {survey.order?.nama_project || 'Tanpa Nama Proyek'} - {survey.order?.nama_customer || '-'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'survey_ulang' && survey.is_contract_deal && (
            <Button
              onClick={survey.tanggal_survey_ulang ? openUploadModal : openScheduleModal}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-9 px-4 rounded-xl text-xs gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Upload size={13} />
              {survey.tanggal_survey_ulang ? 'Upload Hasil' : 'Atur Jadwal & Tim'}
            </Button>
          )}
          <Button
            onClick={handleGenerateAiSummary}
            disabled={isAiLoading}
            variant="outline"
            className="border-teal-200 text-teal-600 hover:bg-teal-50/50 hover:text-teal-700 h-9 px-4 rounded-xl text-xs font-bold gap-1.5"
          >
            {isAiLoading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <ClipboardCheck size={13} />
            )}
            {isAiLoading ? 'Memproses...' : 'AI Brief Desain'}
          </Button>
          <Button
            onClick={() => navigate(`/dashboard/survey/${survey.id}/edit`)}
            className="bg-teal-500 hover:bg-teal-600 text-white font-bold h-9 px-4 rounded-xl text-xs gap-1.5 shadow-lg shadow-teal-500/20"
          >
            <Pencil size={13} />
            Edit Survey Awal
          </Button>
        </div>
      </div>

      {/* Tabs Layout Selector */}
      <div className="flex border-b border-gray-100/80 gap-1.5 pb-0.5">
        <button
          onClick={() => setActiveTab('survey_awal')}
          className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all ${
            activeTab === 'survey_awal'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Survey Awal
        </button>
        <button
          onClick={() => setActiveTab('survey_ulang')}
          className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'survey_ulang'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Survey Ulang
          {survey.is_contract_deal ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          ) : (
            <span className="inline-flex px-1.5 py-0.5 text-[8px] bg-gray-100 text-gray-400 rounded-full font-black uppercase tracking-wider">Locked</span>
          )}
        </button>
      </div>

      {/* Tab Contents: Survey Awal */}
      {activeTab === 'survey_awal' && (
        <>
          {/* Unfilled Survey Warning Banner */}
          {!isSurveyFilled && (
            <Card className="border border-dashed border-amber-200 bg-amber-50/30 rounded-2xl overflow-hidden shadow-none">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-amber-800">Formulir Survey Belum Diisi</h3>
                  <p className="text-xs font-medium text-amber-600">
                    Detail pengukuran, layout, foto lokasi, dan Minutes of Meeting belum diinputkan untuk jadwal survey ini.
                  </p>
                </div>
                <Button
                  onClick={() => navigate(`/dashboard/survey/${survey.id}/edit`)}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-9 px-5 rounded-xl text-xs gap-1.5 shadow-lg shadow-amber-500/10 shrink-0"
                >
                  <ClipboardCheck size={14} />
                  Input Data Survey Sekarang
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Main Grid Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left column - main details (span 2) */}
            <div className="lg:col-span-2 space-y-5">
              {/* General Information Card */}
              <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-800 tracking-tight">Informasi Proyek & Survey</h2>
                  <Badge className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${statusBadgeMap[survey.status] || 'bg-gray-50 text-gray-600'}`}>
                    {survey.status}
                  </Badge>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                    <div className="space-y-1">
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Nama Project</span>
                      <p className="text-xs font-bold text-gray-700">{survey.order?.nama_project || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Nama Perusahaan</span>
                      <p className="text-xs font-bold text-gray-700">{survey.order?.nama_perusahaan || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Nama Klien / Customer</span>
                      <p className="text-xs font-semibold text-gray-600">{survey.order?.nama_customer || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Jenis Interior / Service Type</span>
                      <div>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-50 text-teal-600 border border-teal-100 mt-0.5">
                          {survey.order?.jenis_interior ? toTitleCase(survey.order.jenis_interior) : '-'}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-50/50 md:col-span-2 my-1" />

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-teal-50 text-teal-500 shrink-0">
                        <Calendar size={15} />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block">Tanggal Survey</span>
                        <p className="text-xs font-bold text-gray-700">
                          {survey.tanggal_survey 
                            ? new Date(survey.tanggal_survey).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                            : '-'
                          }
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-teal-50 text-teal-500 shrink-0">
                        <User size={15} />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block">Surveyor</span>
                        <p className="text-xs font-bold text-gray-700">{survey.surveyor?.name || '-'}</p>
                        {survey.surveyor?.email && <p className="text-[9px] font-semibold text-gray-400">{survey.surveyor.email}</p>}
                      </div>
                    </div>

                    <div className="flex items-start gap-3 md:col-span-2">
                      <div className="p-2 rounded-xl bg-teal-50 text-teal-500 shrink-0">
                        <MapPin size={15} />
                      </div>
                      <div className="space-y-0.5 w-full">
                        <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block">Lokasi Survey</span>
                        <p className="text-xs font-bold text-gray-700 leading-relaxed">{survey.lokasi || '-'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Feedback & Notes Card */}
              <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                  <FileText size={15} className="text-teal-500" />
                  <h2 className="text-sm font-bold text-gray-800 tracking-tight">Feedback / Catatan Survey</h2>
                </div>
                <CardContent className="p-6">
                  {survey.catatan?.trim() ? (
                    <p className="text-xs text-gray-600 font-medium whitespace-pre-wrap leading-relaxed">
                      {survey.catatan}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic text-center py-2">Tidak ada catatan survey</p>
                  )}
                </CardContent>
              </Card>

              {/* Documents Tabs/Sections (Layout Files, Location Photos, MoM) */}
              <div className="space-y-5">
                {/* Layout Files Card */}
                <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
                  <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                    <Layout size={15} className="text-teal-500" />
                    <h2 className="text-sm font-bold text-gray-800 tracking-tight">Layout Files / Denah</h2>
                  </div>
                  <CardContent className="p-6">
                    {layoutFiles.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-4">Belum ada file denah layout yang diunggah</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {layoutFiles.map((url, idx) => {
                          const filename = url.substring(url.lastIndexOf('/') + 1);
                          const isImg = /\.(jpg|jpeg|png|webp)$/i.test(url);
                          return (
                            <div key={idx} className="relative group border border-gray-100 rounded-xl p-2.5 bg-white flex items-center gap-3 shadow-[0_2px_8px_rgb(0,0,0,0.01)] hover:border-teal-200 transition-all">
                              {isImg ? (
                                <img src={getFileUrl(url)} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-gray-50" />
                              ) : (
                                <div className="w-10 h-10 bg-teal-50 text-teal-600 flex items-center justify-center rounded-lg border border-teal-100 font-black text-[9px] uppercase">
                                  {filename.split('.').pop() || 'FILE'}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-gray-700 truncate">{filename}</p>
                                <a
                                  href={getFileUrl(url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-teal-600 hover:underline mt-0.5"
                                >
                                  <Download size={10} /> Unduh File
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Foto Lokasi Card */}
                <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
                  <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                    <Image size={15} className="text-teal-500" />
                    <h2 className="text-sm font-bold text-gray-800 tracking-tight">Foto Kondisi Lokasi</h2>
                  </div>
                  <CardContent className="p-6">
                    {fotoLokasi.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-4">Belum ada foto lokasi yang diunggah</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {fotoLokasi.map((url, idx) => (
                          <a 
                            key={idx} 
                            href={getFileUrl(url)} 
                            target="_blank" 
                            rel="noreferrer"
                            className="group relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50 aspect-video block shadow-sm hover:scale-[1.02] hover:border-teal-200 transition-all duration-300"
                          >
                            <img 
                              src={getFileUrl(url)} 
                              alt={`Foto Lokasi ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:brightness-95 transition-all"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                              Lihat Fullscreen
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Minutes of Meeting Card */}
                <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
                  <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                    <FileDigit size={15} className="text-teal-500" />
                    <h2 className="text-sm font-bold text-gray-800 tracking-tight">Minutes of Meeting (MoM)</h2>
                  </div>
                  <CardContent className="p-6">
                    {momFiles.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-4">Belum ada dokumen Minutes of Meeting (MoM) yang diunggah</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {momFiles.map((url, idx) => {
                          const filename = url.substring(url.lastIndexOf('/') + 1);
                          return (
                            <div key={idx} className="relative group border border-gray-100 rounded-xl p-2.5 bg-white flex items-center gap-3 shadow-[0_2px_8px_rgb(0,0,0,0.01)] hover:border-teal-200 transition-all">
                              <div className="w-10 h-10 bg-teal-50 text-teal-600 flex items-center justify-center rounded-lg border border-teal-100 font-black text-[9px] uppercase shrink-0">
                                {filename.split('.').pop() || 'DOC'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-gray-700 truncate">{filename}</p>
                                <a
                                  href={getFileUrl(url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-teal-600 hover:underline mt-0.5"
                                >
                                  <Download size={10} /> Unduh Dokumen
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right column - sidebar info (span 1) */}
            <div className="space-y-5">
              {/* Response Verification Status Card */}
              {(survey.response_by || survey.marketing_response_by) && (
                <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50">
                    <h2 className="text-sm font-bold text-gray-800 tracking-tight">Verifikasi & Respon</h2>
                  </div>
                  <CardContent className="p-6 space-y-3">
                    {survey.response_by && (
                      <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <Check size={12} strokeWidth={3} />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600">Response Verification</span>
                          <p className="text-xs font-bold text-gray-700">{survey.response_by}</p>
                        </div>
                      </div>
                    )}
                    {survey.marketing_response_by && (
                      <div className="p-3.5 rounded-xl bg-purple-50/40 border border-purple-100 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                          <Check size={12} strokeWidth={3} />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-black uppercase tracking-wider text-purple-600">Marketing Verification</span>
                          <p className="text-xs font-bold text-gray-700">{survey.marketing_response_by}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Team Members List Card */}
              <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                  <Users size={15} className="text-teal-500" />
                  <h2 className="text-sm font-bold text-gray-800 tracking-tight">Tim Surveyor & Project</h2>
                </div>
                <CardContent className="p-6">
                  {survey.order?.teams && survey.order.teams.length > 0 ? (
                    <div className="space-y-3">
                      {survey.order.teams.map((t) => (
                        <div key={t.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50/50 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 font-bold flex items-center justify-center text-xs shrink-0">
                            {t.name ? t.name.split(' ').map(x => x[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-700 truncate">{t.name}</p>
                            <p className="text-[9px] font-medium text-gray-400 uppercase tracking-widest truncate">{t.role || 'Member'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic text-center py-2">Tidak ada tim yang ditugaskan</p>
                  )}
                </CardContent>
              </Card>

              {/* Measurements Card */}
              <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                  <ClipboardCheck size={15} className="text-teal-500" />
                  <h2 className="text-sm font-bold text-gray-800 tracking-tight">Hasil Pengukuran Detail</h2>
                </div>
                <CardContent className="p-6">
                  {checkedPengukuran.length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-4">Belum ada item pengukuran yang diuji</p>
                  ) : (
                    <div className="space-y-4">
                      {checkedPengukuran.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="p-3.5 rounded-xl border border-teal-100 bg-teal-50/10 space-y-2.5 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-gray-700">
                              {item.nama_pengukuran}
                            </span>
                            {item.jenis_pengukuran_id === null && (
                              <Badge className="bg-amber-50 text-amber-600 border border-amber-100 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">
                                Custom
                              </Badge>
                            )}
                          </div>

                          {/* Dimensions grid */}
                          <div className="grid grid-cols-3 gap-2 border-t border-b border-gray-100/60 py-2 text-center bg-white/50 rounded-lg">
                            <div>
                              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Panjang</span>
                              <span className="text-xs font-bold text-teal-600">{item.panjang || 0}</span>
                            </div>
                            <div>
                              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Lebar</span>
                              <span className="text-xs font-bold text-gray-600">
                                {item.has_lebar ? item.lebar : <span className="text-gray-300 italic text-[10px] font-medium">-</span>}
                              </span>
                            </div>
                            <div>
                              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">Tinggi</span>
                              <span className="text-xs font-bold text-gray-600">
                                {item.has_tinggi ? item.tinggi : <span className="text-gray-300 italic text-[10px] font-medium">-</span>}
                              </span>
                            </div>
                          </div>

                          {item.notes?.trim() && (
                            <div className="space-y-0.5">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider block">Catatan Item</span>
                              <p className="text-[10px] font-medium text-gray-500 leading-normal">{item.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Tab Contents: Survey Ulang */}
      {activeTab === 'survey_ulang' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {!survey.is_contract_deal ? (
            <Card className="border border-dashed border-gray-200 bg-gray-50/50 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-none min-h-[350px]">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-4 border border-gray-200">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-sm font-extrabold text-gray-700">Survey Ulang Terkunci</h3>
              <p className="text-xs text-gray-400 mt-1.5 max-w-sm leading-relaxed">
                Jadwal dan pengisian survey ulang hanya dapat diakses setelah dokumen kontrak proyek ini ditandatangani dan berstatus <strong>DEAL</strong>.
              </p>
            </Card>
          ) : !survey.tanggal_survey_ulang ? (
            <Card className="border border-dashed border-teal-100 bg-teal-50/10 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-none min-h-[350px]">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-500 flex items-center justify-center mb-4 border border-teal-100">
                <Calendar size={24} />
              </div>
              <h3 className="text-sm font-extrabold text-gray-800">Jadwalkan Survey Ulang</h3>
              <p className="text-xs text-gray-500 mt-1.5 max-w-sm leading-relaxed">
                Kontrak proyek telah DEAL. Silakan tentukan tanggal survey ulang dan tim surveyor yang ditugaskan ke lapangan.
              </p>
              <Button
                onClick={openScheduleModal}
                className="mt-5 bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-xs h-9 px-6 rounded-xl shadow-lg shadow-teal-500/25 transition-all"
              >
                Atur Jadwal & Tim Sekarang
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left Column (Details) */}
              <div className="lg:col-span-2 space-y-5">
                {/* Scheduling and Team Card */}
                <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
                  <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-800 tracking-tight">Jadwal & Tim Survey Ulang</h2>
                    <Button
                      variant="outline"
                      onClick={openScheduleModal}
                      className="h-8 px-3 text-[10px] font-bold border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Ubah Jadwal/Tim
                    </Button>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-teal-50 text-teal-500 shrink-0">
                          <Calendar size={16} />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block">Tanggal Survey Ulang</span>
                          <p className="text-xs font-bold text-gray-700">
                            {new Date(survey.tanggal_survey_ulang).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-teal-50 text-teal-500 shrink-0">
                          <Users size={16} />
                        </div>
                        <div className="space-y-1 w-full">
                          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block">Anggota Tim Lapangan</span>
                          {survey.survey_ulang_team && survey.survey_ulang_team.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2 pt-1">
                              {survey.survey_ulang_team.map((t: any) => (
                                <div key={t.id} className="flex items-center justify-between p-2 bg-gray-50/50 border border-gray-100 rounded-xl">
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-700 truncate">{t.name}</p>
                                    <p className="text-[9px] font-medium text-gray-400 truncate">{t.email}</p>
                                  </div>
                                  <Badge className="bg-teal-50 text-teal-600 border border-teal-100 hover:bg-teal-50 shrink-0 text-[8px] font-black uppercase tracking-wider scale-90">
                                    {t.role || 'Member'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">Belum ada tim yang ditugaskan</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* General Notes Hasil Card */}
                <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
                  <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                    <FileText size={15} className="text-teal-500" />
                    <h2 className="text-sm font-bold text-gray-800 tracking-tight">Catatan Umum Survey Ulang</h2>
                  </div>
                  <CardContent className="p-6">
                    {survey.catatan_ulang?.trim() ? (
                      <p className="text-xs text-gray-600 font-medium whitespace-pre-wrap leading-relaxed">
                        {survey.catatan_ulang}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic text-center py-2">Belum ada catatan hasil survey ulang</p>
                    )}
                  </CardContent>
                </Card>

                {/* Temuan Lapangan Card */}
                <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
                  <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                    <AlertCircle size={15} className="text-teal-500" />
                    <h2 className="text-sm font-bold text-gray-800 tracking-tight">Temuan Lapangan</h2>
                  </div>
                  <CardContent className="p-6">
                    {temuanLapangan.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-2">Tidak ada temuan lapangan khusus</p>
                    ) : (
                      <div className="space-y-3">
                        {temuanLapangan.map((t, idx) => (
                          <div key={idx} className="p-3 bg-red-50/20 border border-red-100 rounded-xl space-y-1">
                            <h4 className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              {t.item}
                            </h4>
                            {t.notes && t.notes.trim() !== '' && (
                              <p className="text-xs text-gray-600 font-medium pl-3 leading-relaxed">
                                {t.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Foto & Video Card */}
                <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
                  <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                    <Image size={15} className="text-teal-500" />
                    <h2 className="text-sm font-bold text-gray-800 tracking-tight">Foto & Video Survey Ulang</h2>
                  </div>
                  <CardContent className="p-6">
                    {fotoVideoUlang.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-4">Belum ada foto/video hasil yang diunggah</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {fotoVideoUlang.map((url, idx) => {
                          const filename = url.substring(url.lastIndexOf('/') + 1);
                          const isImg = /\.(jpg|jpeg|png|webp)$/i.test(url);
                          const isVideo = /\.(mp4|mov|avi|webm)$/i.test(url);

                          if (isImg) {
                            return (
                              <a 
                                key={idx} 
                                href={getFileUrl(url)} 
                                target="_blank" 
                                rel="noreferrer"
                                className="group relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50 aspect-video block shadow-sm hover:scale-[1.02] hover:border-teal-200 transition-all duration-300"
                              >
                                <img 
                                  src={getFileUrl(url)} 
                                  alt={`Foto Survey Ulang ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:brightness-95 transition-all"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                                  Buka Foto
                                </div>
                              </a>
                            );
                          } else if (isVideo) {
                            return (
                              <a 
                                key={idx} 
                                href={getFileUrl(url)} 
                                target="_blank" 
                                rel="noreferrer"
                                className="group relative overflow-hidden rounded-xl border border-gray-100 bg-gray-800 aspect-video flex flex-col items-center justify-center text-white shadow-sm hover:scale-[1.02] hover:border-teal-200 transition-all duration-300"
                              >
                                <Film size={24} className="text-teal-400 group-hover:scale-110 transition-transform mb-1" />
                                <span className="text-[8px] font-bold text-gray-300 truncate max-w-[80px] px-1">{filename}</span>
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity gap-1">
                                  <Play size={10} fill="white" /> Putar Video
                                </div>
                              </a>
                            );
                          } else {
                            return (
                              <a 
                                key={idx} 
                                href={getFileUrl(url)} 
                                target="_blank" 
                                rel="noreferrer"
                                className="group relative border border-gray-100 rounded-xl p-2.5 bg-white flex items-center gap-3 shadow-sm hover:border-teal-200 transition-all"
                              >
                                <div className="w-10 h-10 bg-teal-50 text-teal-600 flex items-center justify-center rounded-lg border border-teal-100 font-black text-[9px] uppercase">
                                  FILE
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-bold text-gray-700 truncate">{filename}</p>
                                  <span className="text-[8px] font-extrabold text-teal-600 hover:underline">Unduh File</span>
                                </div>
                              </a>
                            );
                          }
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column (Status & Actions) */}
              <div className="space-y-5">
                <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50">
                    <h2 className="text-sm font-bold text-gray-800 tracking-tight">Status Survey Ulang</h2>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isResurveyFilled ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                        {isResurveyFilled ? <Check size={14} strokeWidth={3} /> : '!'}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-700">
                          {isResurveyFilled ? 'Hasil Survey Diupload' : 'Menunggu Hasil Lapangan'}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {isResurveyFilled ? 'Semua temuan & berkas terdokumentasi' : 'Jadwal diatur, menanti surveyor mengisi form'}
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={openUploadModal}
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-xs h-9 rounded-xl shadow-lg shadow-teal-500/25 transition-all"
                    >
                      {isResurveyFilled ? 'Edit Hasil Survey Ulang' : 'Upload Hasil Survey Ulang'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: SCHEDULE SURVEY ULANG ────────────────────────────────── */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="max-w-md rounded-2xl border-0 shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-50">
            <DialogTitle className="text-sm font-extrabold text-gray-800 flex items-center gap-2">
              <Calendar size={16} className="text-teal-500" />
              Atur Jadwal & Tim Survey Ulang
            </DialogTitle>
            <p className="text-[10px] font-medium text-gray-400 mt-1">
              Tentukan tanggal pelaksanaan re-survey lapangan dan tugaskan personel.
            </p>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4 max-h-[400px] overflow-y-auto">
            {/* Datepicker */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                Tanggal Survey Ulang <span className="text-red-400">*</span>
              </label>
              <Input
                type="date"
                value={resurveyDate}
                onChange={e => setResurveyDate(e.target.value)}
                className="h-10 bg-gray-50 border-gray-200 rounded-xl text-xs font-semibold focus:ring-teal-400/20"
                required
              />
            </div>

            {/* Selected Team Badges */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                Tim yang Ditugaskan ({selectedTeam.length})
              </label>
              {selectedTeam.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic">Belum ada tim terpilih. Pilih di bawah.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedTeam.map(t => (
                    <Badge key={t.id} className="bg-teal-50 border border-teal-100 text-teal-600 hover:bg-teal-100 text-[9px] font-semibold flex items-center gap-1 rounded-full px-2 py-0.5 shadow-none">
                      {t.name}
                      <button type="button" onClick={() => toggleUserInTeam(t)} className="text-teal-400 hover:text-teal-600">&times;</button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Team Picker Search & Filter */}
            <div className="space-y-2 border-t border-gray-50 pt-4">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Cari & Filter User</span>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                  <Input
                    placeholder="Cari user..."
                    value={searchTeam}
                    onChange={e => setSearchTeam(e.target.value)}
                    className="pl-8 h-8 bg-gray-50 border-gray-100 rounded-lg text-xs"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="h-8 px-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold text-gray-600 outline-none"
                >
                  <option value="all">Semua Role</option>
                  {rolesList.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Users list */}
              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50 max-h-[160px] overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <p className="text-center py-4 text-[10px] text-gray-400 italic">Tidak ada user ditemukan</p>
                ) : (
                  filteredUsers.map(u => {
                    const isChecked = selectedTeam.some(t => t.id === u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleUserInTeam(u)}
                        className={`flex items-center justify-between px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${isChecked ? 'bg-teal-50/40 hover:bg-teal-50/60' : 'hover:bg-gray-50'}`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-gray-700 truncate">{u.name}</p>
                          <p className="text-[9px] text-gray-400 truncate">{u.email} &bull; {u.role?.nama_role || 'No Role'}</p>
                        </div>
                        <Checkbox checked={isChecked} onCheckedChange={() => {}} />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-gray-50 bg-white flex-row justify-end gap-2 rounded-b-2xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => setScheduleModalOpen(false)}
              className="h-9 rounded-xl font-bold text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveSchedule}
              disabled={isSaving || !resurveyDate}
              className="h-9 rounded-xl font-bold text-xs bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/20 px-5 disabled:opacity-40"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Jadwal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: UPLOAD RESULTS (HASIL) SURVEY ULANG ─────────────────── */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-0 shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-50">
            <DialogTitle className="text-sm font-extrabold text-gray-800 flex items-center gap-2">
              <ClipboardCheck size={16} className="text-teal-500" />
              Upload Hasil Survey Ulang
            </DialogTitle>
            <p className="text-[10px] font-medium text-gray-400 mt-1">
              Isi catatan umum, data temuan lapangan dinamis, serta berkas media foto/video dari lokasi.
            </p>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5 max-h-[450px] overflow-y-auto">
            {/* General notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                Catatan Umum / General Notes
              </label>
              <textarea
                value={notesUlang}
                onChange={e => setNotesUlang(e.target.value)}
                placeholder="Masukkan simpulan hasil pengecekan lokasi ulang..."
                className="w-full min-h-[70px] p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:ring-teal-400/20 text-gray-700 font-medium resize-none outline-none"
              />
            </div>

            {/* Temuan Lapangan (Dinamic rows) */}
            <div className="space-y-3 border-t border-gray-50 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Temuan Lapangan</span>
                <Button
                  type="button"
                  onClick={() => setTemuanRows(p => [...p, { item: '', notes: '' }])}
                  className="h-7 px-2 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 text-[10px] font-bold gap-1 shadow-none"
                >
                  <Plus size={11} /> Tambah
                </Button>
              </div>

              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                {temuanRows.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-gray-50/50 p-2 rounded-xl border border-gray-100/60">
                    <div className="flex-1">
                      <Input
                        placeholder="Nama/deskripsi temuan lapangan (contoh: Void Tangga / Atap Bocor)"
                        value={row.item}
                        onChange={e => setTemuanRows(prev => prev.map((r, i) => i === idx ? { ...r, item: e.target.value, notes: '' } : r))}
                        className="h-8 bg-white border-gray-100 text-xs w-full"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setTemuanRows(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Foto & Video Files Upload */}
            <div className="space-y-3 border-t border-gray-50 pt-4">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Foto & Video Hasil Lapangan</span>
              
              <div className="border-2 border-dashed border-teal-100 rounded-xl p-5 bg-teal-50/5 hover:bg-teal-50/10 transition-colors flex flex-col items-center justify-center relative cursor-pointer group">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={e => handleFileUpload(e.target.files)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                {isUploading ? (
                  <div className="flex flex-col items-center gap-1">
                    <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                    <p className="text-[10px] font-bold text-teal-600">Mengunggah file...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-center pointer-events-none">
                    <Upload className="text-teal-400 group-hover:scale-115 transition-transform" size={20} />
                    <p className="text-[11px] font-bold text-gray-700">Tarik berkas atau klik untuk mengunggah</p>
                    <p className="text-[9px] text-gray-400">Menerima semua format foto dan video</p>
                  </div>
                )}
              </div>

              {/* Media Previews */}
              {fotoVideoFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {fotoVideoFiles.map((url, idx) => {
                    const name = url.substring(url.lastIndexOf('/') + 1);
                    const isImg = /\.(jpg|jpeg|png|webp)$/i.test(url);
                    const isVideo = /\.(mp4|mov|avi|webm)$/i.test(url);
                    return (
                      <div key={idx} className="relative group border border-gray-100 rounded-lg overflow-hidden aspect-video bg-gray-50 flex items-center justify-center">
                        {isImg ? (
                          <img src={getFileUrl(url)} alt="Uploaded item" className="w-full h-full object-cover" />
                        ) : isVideo ? (
                          <div className="flex flex-col items-center justify-center text-teal-600">
                            <Film size={16} />
                            <span className="text-[8px] font-bold text-gray-400 truncate max-w-[60px] pt-0.5">{name}</span>
                          </div>
                        ) : (
                          <span className="text-[8px] font-bold text-gray-400">File</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setFotoVideoFiles(p => p.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-gray-50 bg-white flex-row justify-end gap-2 rounded-b-2xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUploadModalOpen(false)}
              className="h-9 rounded-xl font-bold text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveUpload}
              disabled={isSaving}
              className="h-9 rounded-xl font-bold text-xs bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/20 px-5"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Hasil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Brief Modal */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="rounded-2xl p-6 border-0 shadow-2xl max-w-[650px] w-[95%]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
              <ClipboardCheck className="text-teal-500 h-5 w-5" />
              Rekomendasi Brief Desain AI
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[400px] overflow-y-auto border border-teal-50/50 bg-teal-50/5 p-4 rounded-xl">
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-600">
              {aiSummary}
            </pre>
          </div>
          <DialogFooter className="mt-5 gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAiModalOpen(false)}
              className="rounded-xl font-bold h-9 text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Tutup
            </Button>
            <Button
              onClick={() => {
                if (aiSummary) {
                  navigator.clipboard.writeText(aiSummary);
                  toast.success('Brief desain berhasil disalin ke clipboard');
                }
              }}
              className="bg-teal-500 hover:bg-teal-600 text-white font-bold h-9 px-4 rounded-xl text-xs gap-1.5 shadow-lg shadow-teal-500/20"
            >
              Salin Brief
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
