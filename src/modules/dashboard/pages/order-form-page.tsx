import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ShoppingCart, Search, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserItem { id: number; name: string; email: string; role?: { id: number; nama_role: string } }
interface TeamMember { user_id: number }

const jenisOptions = [
  { value: 'residential', label: 'Residential' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'office', label: 'Office' },
  { value: 'retail', label: 'Retail' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'custom', label: 'Custom' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];



export default function OrderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [users, setUsers] = useState<UserItem[]>([]);
  const [teamIds, setTeamIds] = useState<number[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    nama_project: '',
    jenis_interior: 'residential',
    nama_customer: '',
    telepon_customer: '',
    email_customer: '',
    nama_perusahaan: '',
    customer_additional_info: '',
    nomor_unit: '',
    alamat: '',
    catatan: '',
    tanggal_masuk_customer: new Date().toISOString().split('T')[0],
    priority_level: 'medium',
    tanggal_survey: '',
    // edit-only
    project_status: 'pending',
    tahapan_proyek: 'survey',
    payment_status: 'not_start',
    pic_id: '',
    termin_id: '',
    harga_kontrak: '',
    nomor_kontrak: '',
    tanggal_kontrak: '',
    tanggal_mulai: '',
    tanggal_selesai: '',
  });

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data.data || [])).catch(() => {});

    if (isEdit) {
      api.get(`/orders/${id}`).then(r => {
        const d = r.data.data;
        setForm({
          nama_project: d.nama_project || '',
          jenis_interior: d.jenis_interior || 'residential',
          nama_customer: d.nama_customer || '',
          telepon_customer: d.telepon_customer || '',
          email_customer: d.email_customer || '',
          nama_perusahaan: d.nama_perusahaan || '',
          customer_additional_info: d.customer_additional_info || '',
          nomor_unit: d.nomor_unit || '',
          alamat: d.alamat || '',
          catatan: d.catatan || '',
          tanggal_masuk_customer: d.tanggal_masuk_customer?.split('T')[0] || '',
          priority_level: d.priority_level || 'medium',
          tanggal_survey: d.tanggal_survey || '',
          project_status: d.project_status || 'pending',
          tahapan_proyek: d.tahapan_proyek || 'survey',
          payment_status: d.payment_status || 'not_start',
          pic_id: d.pic_id ? String(d.pic_id) : '',
          termin_id: d.termin_id ? String(d.termin_id) : '',
          harga_kontrak: d.harga_kontrak && d.harga_kontrak !== '0' ? d.harga_kontrak : '',
          nomor_kontrak: d.nomor_kontrak || '',
          tanggal_kontrak: d.tanggal_kontrak?.split('T')[0] || '',
          tanggal_mulai: d.tanggal_mulai?.split('T')[0] || '',
          tanggal_selesai: d.tanggal_selesai?.split('T')[0] || '',
        });
        if (d.teams) {
          setTeamIds(d.teams.map((t: TeamMember) => t.user_id));
        }
      }).catch(() => toast.error('Gagal memuat data order'));
    }
  }, [id]);

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleTeam = (userId: number) => {
    setTeamIds(prev => prev.includes(userId) ? prev.filter(i => i !== userId) : [...prev, userId]);
  };

  const filteredUsers = teamSearch
    ? users.filter(u =>
        u.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(teamSearch.toLowerCase()) ||
        (u.role?.nama_role || '').toLowerCase().includes(teamSearch.toLowerCase())
      )
    : users;

  const selectedUsers = useMemo(() => users.filter(u => teamIds.includes(u.id)), [users, teamIds]);

  // Required role validation
  const teamValidation = useMemo(() => {
    const selectedRoles = selectedUsers.map(u => u.role?.nama_role || '').filter(Boolean);
    const hasKepalaMarketing = selectedRoles.some(r => r === 'Kepala Marketing');
    const hasDrafterOrSurveyor = selectedRoles.some(r => r === 'Drafter' || r === 'Surveyor');
    const hasDesainer = selectedRoles.some(r => r === 'Desainer');
    const hasProjectManager = selectedRoles.some(r => r === 'Project Manager');
    return {
      kepalaMarketing: hasKepalaMarketing,
      drafterSurveyor: hasDrafterOrSurveyor,
      desainer: hasDesainer,
      projectManager: hasProjectManager,
      isValid: hasKepalaMarketing && hasDrafterOrSurveyor && hasDesainer && hasProjectManager,
    };
  }, [selectedUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamValidation.isValid) {
      const missing: string[] = [];
      if (!teamValidation.kepalaMarketing) missing.push('Kepala Marketing');
      if (!teamValidation.drafterSurveyor) missing.push('Drafter/Surveyor');
      if (!teamValidation.desainer) missing.push('Desainer');
      if (!teamValidation.projectManager) missing.push('Project Manager');
      toast.error(`Tim belum lengkap: ${missing.join(', ')} wajib diassign`);
      return;
    }

    setIsSaving(true);

    const payload: Record<string, any> = {
      nama_project: form.nama_project,
      jenis_interior: form.jenis_interior,
      nama_customer: form.nama_customer,
      telepon_customer: form.telepon_customer,
      email_customer: form.email_customer,
      nama_perusahaan: form.nama_perusahaan,
      customer_additional_info: form.customer_additional_info,
      nomor_unit: form.nomor_unit,
      alamat: form.alamat,
      catatan: form.catatan,
      tanggal_masuk_customer: form.tanggal_masuk_customer,
      priority_level: form.priority_level,
      tanggal_survey: form.tanggal_survey,
    };

    if (isEdit) {
      payload.project_status = form.project_status;
      payload.tahapan_proyek = form.tahapan_proyek;
      payload.payment_status = form.payment_status;
      payload.pic_id = form.pic_id ? Number(form.pic_id) : null;
      payload.termin_id = form.termin_id ? Number(form.termin_id) : null;
      payload.harga_kontrak = form.harga_kontrak ? Number(form.harga_kontrak) : 0;
      payload.nomor_kontrak = form.nomor_kontrak;
      payload.tanggal_kontrak = form.tanggal_kontrak;
      payload.tanggal_mulai = form.tanggal_mulai;
      payload.tanggal_selesai = form.tanggal_selesai;
    }

    try {
      if (isEdit) {
        await api.put(`/orders/${id}`, payload);
        await api.post(`/orders/${id}/teams`, { user_ids: teamIds });
        toast.success('Order berhasil diupdate');
      } else {
        const res = await api.post('/orders', payload);
        const newId = res.data?.data?.id;
        if (newId && teamIds.length > 0) {
          await api.post(`/orders/${newId}/teams`, { user_ids: teamIds });
        }
        toast.success('Order berhasil dibuat');
      }
      navigate('/dashboard/order');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan order');
    } finally {
      setIsSaving(false);
    }
  };

  const labelCls = "text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1";
  const inputCls = "h-9 bg-white border-teal-200 rounded-lg text-sm focus:ring-teal-400/20 focus:border-teal-400 text-gray-700 font-medium";

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/dashboard/order')} className="p-2 text-gray-400 hover:text-teal-500 hover:bg-teal-50 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="space-y-0.5">
          <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
            <ShoppingCart size={18} className="text-teal-500" />
            {isEdit ? 'Edit Order' : 'Tambah Order'}
          </h1>
          <p className="text-xs font-medium text-gray-500">{isEdit ? 'Update informasi order proyek' : 'Buat order proyek baru'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Card: Informasi Customer */}
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Informasi Customer</h2>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Nama Project *</label>
                <Input value={form.nama_project} onChange={e => handleChange('nama_project', e.target.value)} placeholder="Nama project" className={inputCls} required />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Jenis Interior *</label>
                <Select value={form.jenis_interior} onValueChange={v => handleChange('jenis_interior', v)}>
                  <SelectTrigger className="h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-lg">{jenisOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Nama Customer *</label>
                <Input value={form.nama_customer} onChange={e => handleChange('nama_customer', e.target.value)} placeholder="Nama customer" className={inputCls} required />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Telepon Customer</label>
                <Input value={form.telepon_customer} onChange={e => handleChange('telepon_customer', e.target.value)} placeholder="08xxxxxxxxxx" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Email Customer</label>
                <Input type="email" value={form.email_customer} onChange={e => handleChange('email_customer', e.target.value)} placeholder="email@example.com" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Nama Perusahaan</label>
                <Input value={form.nama_perusahaan} onChange={e => handleChange('nama_perusahaan', e.target.value)} placeholder="Nama perusahaan" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Nomor Unit</label>
                <Input value={form.nomor_unit} onChange={e => handleChange('nomor_unit', e.target.value)} placeholder="Nomor unit properti" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Priority</label>
                <Select value={form.priority_level} onValueChange={v => handleChange('priority_level', v)}>
                  <SelectTrigger className="h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-lg">{priorityOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Tanggal Masuk Customer</label>
                <Input type="date" value={form.tanggal_masuk_customer} onChange={e => handleChange('tanggal_masuk_customer', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Tanggal Survey</label>
                <Input type="date" value={form.tanggal_survey} onChange={e => handleChange('tanggal_survey', e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Alamat</label>
              <textarea value={form.alamat} onChange={e => handleChange('alamat', e.target.value)} placeholder="Alamat proyek" className="w-full min-h-[72px] p-3 bg-white border border-teal-200 rounded-lg text-sm focus:ring-teal-400/20 focus:border-teal-400 text-gray-700 font-medium resize-none" />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Info Tambahan Customer</label>
              <textarea value={form.customer_additional_info} onChange={e => handleChange('customer_additional_info', e.target.value)} placeholder="Informasi tambahan" className="w-full min-h-[72px] p-3 bg-white border border-teal-200 rounded-lg text-sm focus:ring-teal-400/20 focus:border-teal-400 text-gray-700 font-medium resize-none" />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Catatan</label>
              <textarea value={form.catatan} onChange={e => handleChange('catatan', e.target.value)} placeholder="Catatan internal" className="w-full min-h-[72px] p-3 bg-white border border-teal-200 rounded-lg text-sm focus:ring-teal-400/20 focus:border-teal-400 text-gray-700 font-medium resize-none" />
            </div>
          </CardContent>
        </Card>



        {/* Card: Tim Proyek */}
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-800 tracking-tight">Tim Proyek</h2>
              <p className="text-[10px] font-medium text-gray-400 mt-0.5">{teamIds.length} anggota dipilih</p>
            </div>
          </div>
          <CardContent className="p-6 space-y-4">
            {/* Required Role Validation */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Kepala Marketing', ok: teamValidation.kepalaMarketing },
                { label: 'Drafter / Surveyor', ok: teamValidation.drafterSurveyor },
                { label: 'Desainer', ok: teamValidation.desainer },
                { label: 'Project Manager', ok: teamValidation.projectManager },
              ].map(req => (
                <div key={req.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                  req.ok
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : 'bg-red-50 text-red-500 border-red-100'
                }`}>
                  {req.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {req.label}
                  <span className="text-[9px] font-medium opacity-70">{req.ok ? '✓' : 'wajib'}</span>
                </div>
              ))}
            </div>

            {/* Selected Members (chips) */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.map(user => (
                  <span key={user.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-100">
                    {user.name}
                    {user.role && <span className="text-[9px] font-medium text-teal-500">({user.role.nama_role})</span>}
                    <button type="button" onClick={() => toggleTeam(user.id)} className="ml-0.5 p-0.5 rounded-full hover:bg-teal-200/50 transition-colors">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <Input
                placeholder="Cari anggota tim..."
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
                className="pl-8 h-9 bg-gray-50/50 border-gray-100 rounded-lg text-xs focus:ring-teal-400/20 focus:border-teal-400"
              />
            </div>

            {/* User List */}
            <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
              {filteredUsers.length === 0 ? (
                <p className="text-center py-4 text-xs text-gray-400">Tidak ada user ditemukan</p>
              ) : filteredUsers.map(user => (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    teamIds.includes(user.id) ? 'bg-teal-50/50 border border-teal-100' : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <Checkbox
                    checked={teamIds.includes(user.id)}
                    onCheckedChange={() => toggleTeam(user.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-700">{user.name}</div>
                    <div className="text-[10px] text-gray-400">{user.email}</div>
                  </div>
                  {user.role && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-50 text-gray-500 border border-gray-100 shrink-0">
                      {user.role.nama_role}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate('/dashboard/order')} className="rounded-lg font-bold h-9 text-xs border-gray-200 text-gray-600 hover:bg-gray-50">
            Batal
          </Button>
          <Button type="submit" disabled={isSaving} className="rounded-lg font-bold h-9 text-xs bg-teal-400 hover:bg-teal-500 text-white shadow-lg shadow-teal-400/30">
            {isSaving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
