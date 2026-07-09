import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, API_BASE_URL } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Settings, Shield, Megaphone, Clock, Building, User, MapPin, CreditCard, Mail, Phone, Upload, ArrowUp, ArrowDown, Trash2, Plus, AlertCircle, CheckCircle2, GripVertical, Eye, EyeOff, Folder, PlusCircle, Database, Users, Box, Ruler, Palette, Calculator, FileText, Receipt, ShoppingCart, Coins, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

interface SettingItem {
  id: number;
  key: string;
  value: string;
  description: string;
}

const iconMap: { [key: string]: React.ComponentType<any> } = {
  Folder: Folder,
  Database: Database,
  ShoppingCart: ShoppingCart,
  Coins: Coins,
  Settings: Settings,
  Users: Users,
  Box: Box,
  Ruler: Ruler,
  Palette: Palette,
  Calculator: Calculator,
  FileText: FileText,
  Receipt: Receipt,
  ClipboardCheck: ClipboardCheck,
};

export default function SettingsPage() {
  const { refreshSidebar } = useOutletContext<{ refreshSidebar?: () => void }>() || {};
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'response' | 'company' | 'stages' | 'sidebar' | 'deadlines' | 'notifications' | 'platform'>('response');

  // State for Company Profile Form
  const [companyProfile, setCompanyProfile] = useState({
    company_name: '',
    company_director: '',
    company_logo: '',
    company_address: '',
    company_bank_name: '',
    company_bank_account: '',
    company_bank_holder: '',
    company_email: '',
    company_phone: '',
  });

  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // State for Project Stage Deadlines
  const [deadlines, setDeadlines] = useState<{ [key: string]: number }>({
    survey: 3,
    moodboard: 5,
    estimasi: 3,
    cm_fee: 3,
    desain_final: 5,
    input_item: 3,
    rab: 4,
    kontrak: 5,
    invoice: 3,
    survey_ulang: 3,
    gambar_kerja: 7,
    approval_material: 5,
    workplan: 5,
    operations: 14,
  });
  const [isSavingDeadlines, setIsSavingDeadlines] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  // State for Notification Settings
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [notificationConfig, setNotificationConfig] = useState<any>({
    always_notified_roles: [],
    rules: {}
  });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  const notificationTriggers = [
    { code: 'assign_order', label: 'Assign Order (Tim Baru Ditugaskan)', desc: 'Mengirim notifikasi ketika anggota tim baru ditugaskan ke dalam proyek.' },
    { code: 'moodboard', label: 'Tahap Moodboard (Survey Selesai)', desc: 'Mengirim notifikasi saat survey selesai dan proyek berlanjut ke tahap moodboard.' },
    { code: 'estimasi', label: 'Tahap Estimasi', desc: 'Mengirim notifikasi ketika proyek memasuki tahapan estimasi biaya.' },
    { code: 'commitment_fee', label: 'Tahap Commitment Fee', desc: 'Mengirim notifikasi ketika proyek memasuki tahapan verifikasi commitment fee.' },
    { code: 'desain_final', label: 'Tahap Desain Final', desc: 'Mengirim notifikasi ketika proyek memasuki tahapan pengerjaan desain final 3D.' },
    { code: 'input_item', label: 'Tahap Input Item', desc: 'Mengirim notifikasi ketika proyek memasuki tahapan input item oleh desainer/tim.' },
    { code: 'rab', label: 'Tahap RAB', desc: 'Mengirim notifikasi ketika proyek memasuki tahapan penyusunan Rencana Anggaran Biaya.' },
    { code: 'kontrak', label: 'Tahap Kontrak', desc: 'Mengirim notifikasi ketika proyek memasuki tahapan draf dan penandatanganan kontrak.' },
    { code: 'invoice', label: 'Tahap Invoice', desc: 'Mengirim notifikasi ketika proyek memasuki tahapan penerbitan invoice Down Payment.' },
    { code: 'setup_survey_ulang', label: 'Setup Survey Ulang', desc: 'Mengirim notifikasi ketika proyek masuk tahapan survey ulang dan tim perlu dikonfigurasikan.' },
    { code: 'upload_survey_ulang', label: 'Upload Hasil Survey Ulang', desc: 'Mengirim notifikasi ketika PM telah men-set up jadwal/tim survey ulang dan hasilnya harus diunggah.' },
    { code: 'gambar_kerja', label: 'Tahap Gambar Kerja', desc: 'Mengirim notifikasi ketika proyek memasuki tahapan gambar kerja CAD.' },
    { code: 'approval_material', label: 'Tahap Approval Material & Workplan', desc: 'Mengirim notifikasi ketika proyek memasuki tahapan persetujuan material fisik dan workplan.' },
    { code: 'project_management', label: 'Tahap Project Management / Operations', desc: 'Mengirim notifikasi ketika proyek memasuki tahapan operasional lapangan.' }
  ];

  const fetchNotificationSettings = async () => {
    setIsLoading(true);
    try {
      const rolesRes = await api.get('/roles');
      setRolesList(rolesRes.data.data || []);
      const settingsRes = await api.get('/settings');
      const data = settingsRes.data.data || [];
      const configItem = data.find((item: any) => item.key === 'notification_settings');
      if (configItem) {
        setNotificationConfig(JSON.parse(configItem.value));
      }
    } catch (e) {
      toast.error('Gagal memuat konfigurasi notifikasi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingNotifications(true);
    try {
      const payload = {
        value: JSON.stringify(notificationConfig),
      };
      await api.put('/settings/notification_settings', payload);
      toast.success('Konfigurasi notifikasi berhasil disimpan');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan konfigurasi notifikasi');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleToggleGlobalRole = (roleName: string) => {
    setNotificationConfig((prev: any) => {
      const current = prev.always_notified_roles || [];
      const updated = current.includes(roleName)
        ? current.filter((r: string) => r !== roleName)
        : [...current, roleName];
      return { ...prev, always_notified_roles: updated };
    });
  };

  const handleAddRoleToTrigger = (eventCode: string, roleName: string) => {
    if (!roleName) return;
    setNotificationConfig((prev: any) => {
      const rules = { ...prev.rules };
      const eventRule = rules[eventCode] || { name: '', roles: [] };
      const exists = eventRule.roles.some((r: any) => r.role_name === roleName);
      if (exists) {
        toast.info(`Peran ${roleName} sudah terdaftar pada event ini`);
        return prev;
      }
      const updatedRoles = [...eventRule.roles, { role_name: roleName, team_only: true }];
      rules[eventCode] = { ...eventRule, roles: updatedRoles };
      return { ...prev, rules };
    });
  };

  const handleRemoveRoleFromTrigger = (eventCode: string, roleName: string) => {
    setNotificationConfig((prev: any) => {
      const rules = { ...prev.rules };
      const eventRule = rules[eventCode] || { name: '', roles: [] };
      const updatedRoles = eventRule.roles.filter((r: any) => r.role_name !== roleName);
      rules[eventCode] = { ...eventRule, roles: updatedRoles };
      return { ...prev, rules };
    });
  };

  const handleToggleTeamOnly = (eventCode: string, roleName: string) => {
    setNotificationConfig((prev: any) => {
      const rules = { ...prev.rules };
      const eventRule = rules[eventCode] || { name: '', roles: [] };
      const updatedRoles = eventRule.roles.map((r: any) => 
        r.role_name === roleName ? { ...r, team_only: !r.team_only } : r
      );
      rules[eventCode] = { ...eventRule, roles: updatedRoles };
      return { ...prev, rules };
    });
  };

  // Stage Templates state
  const [stageTemplates, setStageTemplates] = useState<any[]>([]);
  const [policy, setPolicy] = useState('split_equally');
  const [isSavingStages, setIsSavingStages] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Sidebar configuration states
  const [sidebarConfig, setSidebarConfig] = useState<any[]>([]);
  const [isSavingSidebar, setIsSavingSidebar] = useState(false);
  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);
  const [draggedMenuIndex, setDraggedMenuIndex] = useState<{ catIdx: number; itemIdx: number } | null>(null);

  const fetchSidebarConfig = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/settings');
      const data = res.data.data || [];
      const configItem = data.find((item: any) => item.key === 'sidebar_configuration');
      if (configItem) {
        setSidebarConfig(JSON.parse(configItem.value));
      } else {
        const defaultJSON = `[{"id":"master_data","name":"Master Data","icon":"Database","items":[{"code":"divisi","name":"Divisi","icon":"Database","path":"/dashboard/divisi","permission":"divisi.index","visible":true},{"code":"roles","name":"Role & User","icon":"Users","path":"/dashboard/roles","permission":"role.index","visible":true},{"code":"produk","name":"Produk","icon":"Package","path":"/dashboard/produk","permission":"produk.index","visible":true},{"code":"item","name":"Item","icon":"Box","path":"/dashboard/item","permission":"item.index","visible":true},{"code":"pengukuran","name":"Jenis Pengukuran","icon":"Ruler","path":"/dashboard/pengukuran","permission":"jenis_pengukuran.index","visible":true},{"code":"termin","name":"Termin","icon":"Wallet","path":"/dashboard/termin","permission":"termin.index","visible":true}]},{"id":"operations","name":"Operations","icon":"ShoppingCart","items":[{"code":"order","name":"Order","icon":"ShoppingCart","path":"/dashboard/order","permission":"order.index","visible":true},{"code":"survey","name":"Survey","icon":"ClipboardCheck","path":"/dashboard/survey","permission":"survey.index","visible":true},{"code":"moodboard","name":"Moodboard","icon":"Palette","path":"/dashboard/moodboard","permission":"moodboard.index","visible":true},{"code":"estimasi","name":"Estimasi","icon":"Calculator","path":"/dashboard/estimasi","permission":"moodboard.index","visible":true},{"code":"desain_final","name":"Desain Final","icon":"Palette","path":"/dashboard/desain-final","permission":"moodboard.index","visible":true},{"code":"input_item","name":"Input Item","icon":"ClipboardCheck","path":"/dashboard/input-item","permission":"input_item.index","visible":true},{"code":"gambar_kerja","name":"Gambar Kerja","icon":"FileText","path":"/dashboard/gambar-kerja","permission":"moodboard.index","visible":true},{"code":"approval_material","name":"Approval Material","icon":"ClipboardCheck","path":"/dashboard/approval-material","permission":"moodboard.index","visible":true},{"code":"workplan","name":"Workplan","icon":"FileText","path":"/dashboard/workplan","permission":"workplan.index","visible":true},{"code":"project_management","name":"Project Management","icon":"ClipboardCheck","path":"/dashboard/project-management","permission":"workplan.index","visible":true},{"code":"log_task","name":"Log Task","icon":"ClipboardCheck","path":"/dashboard/log-tasks","permission":"log_task.index","visible":true}]},{"id":"finance","name":"Finance","icon":"Coins","items":[{"code":"commitment_fee","name":"Commitment Fee","icon":"Wallet","path":"/dashboard/commitment-fee","permission":"moodboard.index","visible":true},{"code":"rab","name":"RAB","icon":"Coins","path":"/dashboard/rab","permission":"rab.index","visible":true},{"code":"kontrak","name":"Kontrak","icon":"FileText","path":"/dashboard/kontrak","permission":"contract.index","visible":true},{"code":"invoice","name":"Invoice","icon":"Receipt","path":"/dashboard/invoice","permission":"invoice.index","visible":true}]}]`;
        setSidebarConfig(JSON.parse(defaultJSON));
      }
    } catch {
      toast.error('Gagal memuat konfigurasi sidebar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSidebar = async () => {
    setIsSavingSidebar(true);
    try {
      const payload = {
        value: JSON.stringify(sidebarConfig),
      };
      await api.put('/settings/sidebar_configuration', payload);
      toast.success('Konfigurasi sidebar berhasil disimpan');
      await fetchSidebarConfig();
      if (refreshSidebar) {
        refreshSidebar();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan konfigurasi sidebar');
    } finally {
      setIsSavingSidebar(false);
    }
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newConfig = [...sidebarConfig];
    if (direction === 'up' && index > 0) {
      const temp = newConfig[index];
      newConfig[index] = newConfig[index - 1];
      newConfig[index - 1] = temp;
    } else if (direction === 'down' && index < newConfig.length - 1) {
      const temp = newConfig[index];
      newConfig[index] = newConfig[index + 1];
      newConfig[index + 1] = temp;
    }
    setSidebarConfig(newConfig);
  };

  const moveMenu = (catIdx: number, itemIdx: number, direction: 'up' | 'down') => {
    const newConfig = [...sidebarConfig];
    const category = { ...newConfig[catIdx] };
    const items = [...category.items];
    if (direction === 'up' && itemIdx > 0) {
      const temp = items[itemIdx];
      items[itemIdx] = items[itemIdx - 1];
      items[itemIdx - 1] = temp;
    } else if (direction === 'down' && itemIdx < items.length - 1) {
      const temp = items[itemIdx];
      items[itemIdx] = items[itemIdx + 1];
      items[itemIdx + 1] = temp;
    }
    category.items = items;
    newConfig[catIdx] = category;
    setSidebarConfig(newConfig);
  };

  const updateCategory = (catIdx: number, fields: Partial<any>) => {
    setSidebarConfig(prev => prev.map((cat, idx) => {
      if (idx !== catIdx) return cat;
      const updatedCat = { ...cat, ...fields };
      if (fields.name && cat.id.startsWith('custom_')) {
        updatedCat.id = 'custom_' + generateCodeFromName(fields.name);
      }
      return updatedCat;
    }));
  };

  const deleteCategory = (catIdx: number) => {
    const categoryToDelete = sidebarConfig[catIdx];
    const itemsToMove = categoryToDelete.items || [];
    let newConfig = sidebarConfig.filter((_, idx) => idx !== catIdx);
    
    if (itemsToMove.length > 0 && newConfig.length > 0) {
      const firstCat = { ...newConfig[0] };
      firstCat.items = [...(firstCat.items || []), ...itemsToMove];
      newConfig[0] = firstCat;
      toast.info(`Menu dari "${categoryToDelete.name}" dipindahkan ke "${firstCat.name}"`);
    } else if (itemsToMove.length > 0) {
      toast.error('Tidak dapat menghapus kategori terakhir karena masih memiliki menu');
      return;
    }
    setSidebarConfig(newConfig);
  };

  const addCategory = () => {
    const defaultName = `Kategori Baru ${sidebarConfig.length + 1}`;
    setSidebarConfig(prev => [
      ...prev,
      {
        id: `custom_${generateCodeFromName(defaultName)}`,
        name: defaultName,
        icon: 'Folder',
        items: []
      }
    ]);
  };

  const updateMenu = (catIdx: number, itemIdx: number, fields: Partial<any>) => {
    setSidebarConfig(prev => {
      const newConfig = [...prev];
      const category = { ...newConfig[catIdx] };
      const items = [...category.items];
      items[itemIdx] = { ...items[itemIdx], ...fields };
      category.items = items;
      newConfig[catIdx] = category;
      return newConfig;
    });
  };

  const moveMenuToCategory = (srcCatIdx: number, itemIdx: number, destCatId: string) => {
    setSidebarConfig(prev => {
      const newConfig = [...prev];
      const srcCategory = { ...newConfig[srcCatIdx] };
      const srcItems = [...srcCategory.items];
      const [itemToMove] = srcItems.splice(itemIdx, 1);
      srcCategory.items = srcItems;
      newConfig[srcCatIdx] = srcCategory;

      const destCatIdx = newConfig.findIndex(c => c.id === destCatId);
      if (destCatIdx !== -1) {
        const destCategory = { ...newConfig[destCatIdx] };
        destCategory.items = [...(destCategory.items || []), itemToMove];
        newConfig[destCatIdx] = destCategory;
      }
      return newConfig;
    });
  };

  const handleCatDragStart = (e: React.DragEvent, index: number) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'SELECT' ||
      target.closest('input') ||
      target.closest('button') ||
      target.closest('select')
    ) {
      e.preventDefault();
      return;
    }
    setDraggedCatIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCatDragEnd = () => {
    setDraggedCatIndex(null);
  };

  const handleCatDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedCatIndex === null || draggedCatIndex === targetIndex) return;

    const newConfig = [...sidebarConfig];
    const draggedItem = newConfig[draggedCatIndex];
    newConfig.splice(draggedCatIndex, 1);
    newConfig.splice(targetIndex, 0, draggedItem);

    setSidebarConfig(newConfig);
    setDraggedCatIndex(null);
  };

  const handleMenuDragStart = (e: React.DragEvent, catIdx: number, itemIdx: number) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'SELECT' ||
      target.closest('input') ||
      target.closest('button') ||
      target.closest('select')
    ) {
      e.preventDefault();
      return;
    }
    setDraggedMenuIndex({ catIdx, itemIdx });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleMenuDragEnd = () => {
    setDraggedMenuIndex(null);
  };

  const handleMenuDrop = (e: React.DragEvent, targetCatIdx: number, targetItemIdx: number) => {
    e.preventDefault();
    if (draggedMenuIndex === null) return;
    const { catIdx: srcCatIdx, itemIdx: srcItemIdx } = draggedMenuIndex;

    if (srcCatIdx !== targetCatIdx) return;
    if (srcItemIdx === targetItemIdx) return;

    const newConfig = [...sidebarConfig];
    const category = { ...newConfig[srcCatIdx] };
    const items = [...category.items];
    const draggedItem = items[srcItemIdx];
    items.splice(srcItemIdx, 1);
    items.splice(targetItemIdx, 0, draggedItem);
    category.items = items;
    newConfig[srcCatIdx] = category;

    setSidebarConfig(newConfig);
    setDraggedMenuIndex(null);
  };

  const availableIcons = [
    'Folder',
    'Database',
    'ShoppingCart',
    'Coins',
    'Layers',
    'Settings',
    'Users',
    'Box',
    'Ruler',
    'Palette',
    'Calculator',
    'FileText',
    'Receipt',
    'ClipboardCheck'
  ];

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/settings');
      const data: SettingItem[] = res.data.data || [];
      setSettings(data);

      const profile = {
        company_name: '',
        company_director: '',
        company_logo: '',
        company_address: '',
        company_bank_name: '',
        company_bank_account: '',
        company_bank_holder: '',
        company_email: '',
        company_phone: '',
      };

      const newDeadlines = {
        survey: 3,
        moodboard: 5,
        estimasi: 3,
        cm_fee: 3,
        desain_final: 5,
        input_item: 3,
        rab: 4,
        kontrak: 5,
        invoice: 3,
        survey_ulang: 3,
        gambar_kerja: 7,
        approval_material: 5,
        workplan: 5,
        operations: 14,
      };

      data.forEach(item => {
        if (item.key in profile) {
          profile[item.key as keyof typeof profile] = item.value;
        }
        if (item.key === 'workplan_stage_deletion_policy') {
          setPolicy(item.value);
        }
        if (item.key.startsWith('deadline_stage_')) {
          const stageName = item.key.replace('deadline_stage_', '');
          if (stageName in newDeadlines) {
            newDeadlines[stageName as keyof typeof newDeadlines] = parseInt(item.value, 10) || 0;
          }
        }
      });
      setCompanyProfile(profile);
      setDeadlines(newDeadlines);
    } catch {
      toast.error('Gagal memuat settings');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStageTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/settings/workplan-stages');
      const stages = (res.data.data || []).map((t: any) => ({
        ...t,
        code: t.code || t.name
          .toLowerCase()
          .replace(/dan/g, '_')
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, ''),
      }));
      setStageTemplates(stages);
    } catch {
      toast.error('Gagal memuat templat tahapan');
    } finally {
      setIsLoading(false);
    }
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const newTemplates = [...stageTemplates];
    if (direction === 'up' && index > 0) {
      const temp = newTemplates[index];
      newTemplates[index] = newTemplates[index - 1];
      newTemplates[index - 1] = temp;
    } else if (direction === 'down' && index < newTemplates.length - 1) {
      const temp = newTemplates[index];
      newTemplates[index] = newTemplates[index + 1];
      newTemplates[index + 1] = temp;
    }
    setStageTemplates(newTemplates);
  };

  const generateCodeFromName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/dan/g, '_')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const deleteStage = (index: number) => {
    setStageTemplates(prev => prev.filter((_, i) => i !== index));
  };

  const addStage = () => {
    const defaultName = `Tahap Baru ${stageTemplates.length + 1}`;
    setStageTemplates(prev => [
      ...prev,
      {
        id: 0,
        code: generateCodeFromName(defaultName),
        name: defaultName,
        percentage: 0,
      }
    ]);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'SELECT' ||
      target.closest('input') ||
      target.closest('button') ||
      target.closest('select')
    ) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newTemplates = [...stageTemplates];
    const draggedItem = newTemplates[draggedIndex];
    newTemplates.splice(draggedIndex, 1);
    newTemplates.splice(targetIndex, 0, draggedItem);

    setStageTemplates(newTemplates);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSaveStages = async () => {
    const totalPct = stageTemplates.reduce((sum, item) => sum + (parseFloat(item.percentage) || 0), 0);
    const roundedTotal = Math.round(totalPct * 100) / 100;
    if (roundedTotal !== 100) {
      toast.error('Gagal menyimpan: Total persentase harus tepat 100%');
      return;
    }

    setIsSavingStages(true);
    try {
      const payload = stageTemplates.map((t) => ({
        id: t.id || 0,
        code: t.code,
        name: t.name,
        percentage: parseFloat(t.percentage) || 0,
      }));
      await api.put('/settings/workplan-stages', payload);
      await api.put('/settings/workplan_stage_deletion_policy', { value: policy });

      toast.success('Templat tahapan berhasil disimpan');
      await fetchSettings();
      await fetchStageTemplates();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan templat tahapan');
    } finally {
      setIsSavingStages(false);
    }
  };

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (data.success) {
          const u = data.data;
          const isSuper = u.company_id === 1 && u.role?.nama_role === 'Super Admin';
          setIsSuperAdmin(isSuper);
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    };
    checkRole();
    fetchSettings();
  }, []);

  const toggleSetting = async (key: string) => {
    const current = settings.find(s => s.key === key);
    if (!current) return;
    const newValue = current.value === 'true' ? 'false' : 'true';
    try {
      await api.put(`/settings/${key}`, { value: newValue });
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s));
      toast.success('Setting berhasil diperbarui');
    } catch {
      toast.error('Gagal mengupdate setting');
    }
  };

  const isEnabled = (key: string) => settings.find(s => s.key === key)?.value === 'true';

  const handleSaveCompanyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);
    try {
      const promises = Object.entries(companyProfile).map(([key, value]) =>
        api.put(`/settings/${key}`, { value })
      );
      await Promise.all(promises);
      toast.success('Profil perusahaan berhasil disimpan');
      await fetchSettings();
    } catch {
      toast.error('Gagal menyimpan profil perusahaan');
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleSaveDeadlines = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDeadlines(true);
    try {
      const promises = Object.entries(deadlines).map(([stage, val]) =>
        api.put(`/settings/deadline_stage_${stage}`, { value: String(val) })
      );
      await Promise.all(promises);
      toast.success('Batas waktu tahapan proyek berhasil disimpan');
      await fetchSettings();
    } catch {
      toast.error('Gagal menyimpan batas waktu tahapan proyek');
    } finally {
      setIsSavingDeadlines(false);
    }
  };

  const stagesList = [
    { code: 'survey', label: 'Survey', desc: 'Batas waktu penyelesaian tahap survey awal.' },
    { code: 'moodboard', label: 'Moodboard', desc: 'Batas waktu penyelesaian pembuatan moodboard desain.' },
    { code: 'estimasi', label: 'Estimasi', desc: 'Batas waktu estimasi kasar biaya proyek.' },
    { code: 'cm_fee', label: 'Commitment Fee', desc: 'Batas waktu pembayaran & verifikasi commitment fee.' },
    { code: 'desain_final', label: 'Desain Final', desc: 'Batas waktu penyelesaian desain 3D detail.' },
    { code: 'input_item', label: 'Input Item', desc: 'Batas waktu desainer memasukkan spesifikasi item.' },
    { code: 'rab', label: 'RAB', desc: 'Batas waktu penyusunan Rencana Anggaran Biaya.' },
    { code: 'kontrak', label: 'Kontrak', desc: 'Batas waktu penandatanganan kontrak proyek.' },
    { code: 'invoice', label: 'Invoice', desc: 'Batas waktu penerbitan dan pembayaran Down Payment (DP).' },
    { code: 'survey_ulang', label: 'Survey Ulang', desc: 'Batas waktu survey ukur detail setelah kontrak.' },
    { code: 'gambar_kerja', label: 'Gambar Kerja', desc: 'Batas waktu pembuatan gambar kerja detail (CAD).' },
    { code: 'approval_material', label: 'Approval Material', desc: 'Batas waktu persetujuan material fisik oleh klien.' },
    { code: 'workplan', label: 'Workplan', desc: 'Batas waktu penyusunan rencana kerja lapangan (timeline).' },
    { code: 'operations', label: 'Operations', desc: 'Batas waktu eksekusi pekerjaan di lapangan hingga BAST.' }
  ];

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const url = res.data?.data?.url;
      if (!url) {
        throw new Error('URL logo tidak ditemukan');
      }
      setCompanyProfile(prev => ({ ...prev, company_logo: url }));
      toast.success('Logo berhasil diunggah');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Gagal mengunggah logo';
      toast.error(msg);
    } finally {
      setLogoUploading(false);
    }
  };

  const settingCards = [
    {
      key: 'response_enabled',
      title: 'Response (Regular)',
      description: 'Tombol response muncul di Survey dan Moodboard. User yang memiliki permission bisa memberikan response.',
      icon: Shield,
      color: 'teal',
    },
    {
      key: 'marketing_response_enabled',
      title: 'Marketing Response',
      description: 'Tombol marketing response muncul di Survey dan Moodboard. Marketing bisa memberikan response terpisah.',
      icon: Megaphone,
      color: 'purple',
    },
    {
      key: 'invoice_deadline_enabled',
      title: 'Deadline Invoice',
      description: 'Aktifkan tenggat waktu (deadline) pembayaran untuk masing-masing invoice. Jika aktif, kolom input tanggal jatuh tempo akan muncul.',
      icon: Clock,
      color: 'amber',
    },
    {
      key: 'workflow_rab_approval_required',
      title: 'Persetujuan RAB Klien (Kontrak)',
      description: 'Menentukan apakah pembuatan Kontrak harus menunggu persetujuan (approval) RAB dari klien di sistem. Jika dimatikan, admin bisa langsung membuat draf kontrak kapan saja.',
      icon: Shield,
      color: 'teal',
    },
    {
      key: 'finance_tax_enabled',
      title: 'PPN (Pajak Pertambahan Nilai)',
      description: 'Menentukan apakah sistem otomatis menambahkan PPN 11% pada setiap RAB dan Invoice yang terbit.',
      icon: Coins,
      color: 'amber',
    },
    {
      key: 'finance_auto_invoice',
      title: 'Otomatis Terbitkan Invoice',
      description: 'Jika aktif, sistem otomatis men-generate seluruh invoice tagihan termin begitu kontrak disetujui (deal). Jika mati, harus diterbitkan manual.',
      icon: Receipt,
      color: 'purple',
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      <div className="space-y-0.5">
        <h1 className="text-lg font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
          <Settings size={18} className="text-teal-500" /> Settings
        </h1>
        <p className="text-xs font-medium text-gray-500">Konfigurasi sistem dan profil perusahaan</p>
      </div>

      {/* Premium Tab Switcher */}
      <div className="flex gap-2 p-1 bg-gray-105 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('response')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'response'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Response Configuration
        </button>
        <button
          onClick={() => setActiveTab('company')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'company'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Company Profile
        </button>
        <button
          onClick={() => {
            setActiveTab('stages');
            fetchStageTemplates();
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'stages'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Stage Templates
        </button>
        <button
          onClick={() => {
            setActiveTab('sidebar');
            fetchSidebarConfig();
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'sidebar'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sidebar Navigasi
        </button>
        <button
          onClick={() => {
            setActiveTab('deadlines');
            fetchSettings();
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'deadlines'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Project Stage Deadlines
        </button>
        <button
          onClick={() => {
            setActiveTab('notifications');
            fetchNotificationSettings();
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'notifications'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Notifications
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => {
              setActiveTab('platform');
              fetchSettings();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'platform'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-750'
            }`}
          >
            Platform Settings
          </button>
        )}
      </div>

      {activeTab === 'notifications' ? (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
          <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-800 tracking-tight">Global Subscribers (Selalu Dapat Notifikasi)</h2>
                <p className="text-[10px] font-medium text-gray-400 mt-0.5">Role yang dipilih di bawah ini akan selalu menerima seluruh notifikasi proyek (misal: Kepala Marketing & Project Manager)</p>
              </div>
              <button
                onClick={handleSaveNotifications}
                disabled={isSavingNotifications}
                className="bg-teal-400 hover:bg-teal-500 text-white font-bold h-8 rounded-lg text-xs px-4 transition-colors disabled:opacity-50"
              >
                {isSavingNotifications ? 'Menyimpan...' : 'Simpan Semua'}
              </button>
            </div>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4">
                {rolesList.map((role) => {
                  const isChecked = (notificationConfig.always_notified_roles || []).includes(role.nama_role);
                  return (
                    <label key={role.id} className="flex items-center gap-2 p-3.5 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100/50 transition-colors border border-gray-100">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleGlobalRole(role.nama_role)}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-xs font-bold text-gray-700">{role.nama_role}</span>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800 tracking-tight ml-1">Aturan Notifikasi Per Event</h2>
            </div>
            {notificationTriggers.map((trigger) => {
              const rule = notificationConfig.rules?.[trigger.code] || { name: trigger.label, roles: [] };
              const currentRoles = rule.roles || [];

              return (
                <Card key={trigger.code} className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/50">
                    <div>
                      <h3 className="text-xs font-bold text-gray-850">{trigger.label}</h3>
                      <p className="text-[10px] font-medium text-gray-400 mt-0.5">{trigger.desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          handleAddRoleToTrigger(trigger.code, e.target.value);
                          e.target.value = '';
                        }}
                        className="h-8 rounded-lg text-[10px] font-bold border border-gray-200 bg-white px-2.5 py-1 focus:ring-1 focus:ring-teal-400 outline-none"
                      >
                        <option value="">+ Tambah Role Penerima</option>
                        {rolesList.map((role) => (
                          <option key={role.id} value={role.nama_role}>{role.nama_role}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    {currentRoles.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-xs font-medium">Belum ada role penerima untuk event ini. Notifikasi hanya akan dikirim ke Global Subscribers.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentRoles.map((r: any) => (
                          <div key={r.role_name} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-gray-800">{r.role_name}</span>
                              <span className="text-[10px] text-gray-400 mt-0.5">
                                {r.team_only ? 'Hanya dikirim ke anggota tim proyek' : 'Dikirim ke semua user dengan role ini'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-gray-500">Hanya Tim:</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleTeamOnly(trigger.code, r.role_name)}
                                  className={`relative w-9 h-5 rounded-full transition-all duration-300 ${
                                    r.team_only ? 'bg-teal-400' : 'bg-gray-200'
                                  }`}
                                >
                                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${
                                    r.team_only ? 'left-[18px]' : 'left-0.5'
                                  }`} />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveRoleFromTrigger(trigger.code, r.role_name)}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : activeTab === 'response' ? (
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white animate-in slide-in-from-left duration-300">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Response Configuration</h2>
            <p className="text-[10px] font-medium text-gray-400 mt-0.5">Aktifkan atau nonaktifkan fitur response secara global</p>
          </div>
          <CardContent className="p-0 divide-y divide-gray-50">
            {isLoading ? (
              <div className="text-center py-12 text-gray-400 text-xs">Loading...</div>
            ) : (
              settingCards.map((card) => {
                const enabled = isEnabled(card.key);
                return (
                  <div key={card.key} className="flex items-center justify-between px-6 py-5 group hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        card.color === 'teal'
                          ? 'bg-teal-50 text-teal-500'
                          : card.color === 'purple'
                          ? 'bg-purple-50 text-purple-500'
                          : 'bg-amber-50 text-amber-500'
                      }`}>
                        <card.icon size={18} strokeWidth={2} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-800">{card.title}</h3>
                        <p className="text-[10px] font-medium text-gray-400 mt-0.5 max-w-md">{card.description}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSetting(card.key)}
                      className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0 ${enabled ? 'bg-teal-500' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                        enabled ? 'left-[22px]' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      ) : activeTab === 'platform' && isSuperAdmin ? (
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white animate-in slide-in-from-right duration-300">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Platform Settings</h2>
            <p className="text-[10px] font-medium text-gray-400 mt-0.5">Konfigurasi khusus platform multi-tenant (Hanya Super Admin)</p>
          </div>
          <CardContent className="p-0 divide-y divide-gray-50">
            <div className="flex items-center justify-between px-6 py-5 group hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-teal-50 text-teal-500">
                  <Clock size={18} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-800">Masa Berlaku Default Perusahaan Baru (Hari)</h3>
                  <p className="text-[10px] font-medium text-gray-400 mt-0.5 max-w-md">Tentukan jumlah hari masa berlaku akun default saat sebuah perusahaan mendaftar baru di sistem.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min="1"
                  value={settings.find(s => s.key === 'default_active_days')?.value || '4'}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setSettings(prev => {
                      const existing = prev.find(s => s.key === 'default_active_days');
                      if (existing) {
                        return prev.map(s => s.key === 'default_active_days' ? { ...s, value: val } : s);
                      } else {
                        return [...prev, { id: 0, key: 'default_active_days', value: val, description: 'Masa berlaku akun default untuk perusahaan baru (hari)' }];
                      }
                    });
                    try {
                      await api.put(`/settings/default_active_days`, { value: val });
                      toast.success('Masa aktif default berhasil disimpan');
                    } catch {
                      toast.error('Gagal menyimpan masa aktif default');
                    }
                  }}
                  className="w-16 h-8 text-center text-xs font-bold border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400"
                />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hari</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : activeTab === 'company' ? (
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white animate-in slide-in-from-right duration-300">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">Company Profile Settings</h2>
            <p className="text-[10px] font-medium text-gray-400 mt-0.5">Atur informasi resmi perusahaan untuk dokumen cetak, PDF, dan ekspor</p>
          </div>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12 text-gray-400 text-xs">Loading...</div>
            ) : (
              <form onSubmit={handleSaveCompanyProfile} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Side: General Info & Logo */}
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-gray-750 block mb-1.5">Logo Perusahaan</label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center overflow-hidden shrink-0 relative group">
                          {companyProfile.company_logo ? (
                            <img
                              src={companyProfile.company_logo.startsWith('http')
                                ? companyProfile.company_logo
                                : `${API_BASE_URL}${companyProfile.company_logo}`}
                              alt="Logo"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Building className="text-gray-300" size={24} />
                          )}
                          {logoUploading && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="text-[10px] text-white font-bold animate-pulse">Uploading...</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors cursor-pointer text-[10px] font-bold">
                            <Upload size={12} />
                            Choose Logo File
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                              disabled={logoUploading}
                            />
                          </label>
                          <p className="text-[10px] text-gray-400 font-medium">PNG/JPG with transparent background recommended.</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-750 block mb-1">Nama Perusahaan</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400"><Building size={14} /></span>
                        <input
                          type="text"
                          required
                          value={companyProfile.company_name}
                          onChange={(e) => setCompanyProfile(p => ({ ...p, company_name: e.target.value }))}
                          className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-colors bg-white font-medium"
                          placeholder="Contoh: PT. ARSIFLOW INDONESIA"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-750 block mb-1">Nama Direktur / Perwakilan</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400"><User size={14} /></span>
                        <input
                          type="text"
                          required
                          value={companyProfile.company_director}
                          onChange={(e) => setCompanyProfile(p => ({ ...p, company_director: e.target.value }))}
                          className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-colors bg-white font-medium"
                          placeholder="Contoh: Super Admin"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-750 block mb-1">Alamat Kantor Perusahaan</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400"><MapPin size={14} /></span>
                        <textarea
                          required
                          value={companyProfile.company_address}
                          onChange={(e) => setCompanyProfile(p => ({ ...p, company_address: e.target.value }))}
                          className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-colors bg-white font-medium min-h-[72px]"
                          placeholder="Alamat lengkap kantor..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Bank Info & Contact */}
                  <div className="space-y-6">
                    <div className="bg-teal-50/30 p-4 rounded-2xl border border-teal-100/50 space-y-4">
                      <h3 className="text-xs font-bold text-teal-800 tracking-tight flex items-center gap-1.5">
                        <CreditCard size={14} /> Rincian Rekening Bank Resmi
                      </h3>
                      
                      <div>
                        <label className="text-[10px] font-bold text-teal-800 block mb-1">Nama Bank</label>
                        <input
                          type="text"
                          required
                          value={companyProfile.company_bank_name}
                          onChange={(e) => setCompanyProfile(p => ({ ...p, company_bank_name: e.target.value }))}
                          className="w-full px-3 py-2 text-xs border border-teal-100 rounded-xl focus:border-teal-500 focus:outline-none transition-colors bg-white font-medium text-gray-800"
                          placeholder="Contoh: BANK CENTRAL ASIA (BCA)"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-teal-800 block mb-1">Nomor Rekening</label>
                        <input
                          type="text"
                          required
                          value={companyProfile.company_bank_account}
                          onChange={(e) => setCompanyProfile(p => ({ ...p, company_bank_account: e.target.value }))}
                          className="w-full px-3 py-2 text-xs border border-teal-100 rounded-xl focus:border-teal-500 focus:outline-none transition-colors bg-white font-medium text-gray-800"
                          placeholder="Contoh: 123-456-7890"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-teal-800 block mb-1">Nama Pemilik Rekening (Atas Nama)</label>
                        <input
                          type="text"
                          required
                          value={companyProfile.company_bank_holder}
                          onChange={(e) => setCompanyProfile(p => ({ ...p, company_bank_holder: e.target.value }))}
                          className="w-full px-3 py-2 text-xs border border-teal-100 rounded-xl focus:border-teal-500 focus:outline-none transition-colors bg-white font-medium text-gray-800"
                          placeholder="Contoh: PT. ARSIFLOW INDONESIA"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-755 block mb-1">Email Perusahaan</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400"><Mail size={14} /></span>
                        <input
                          type="email"
                          value={companyProfile.company_email}
                          onChange={(e) => setCompanyProfile(p => ({ ...p, company_email: e.target.value }))}
                          className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-colors bg-white font-medium"
                          placeholder="Contoh: finance@arsiflow.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-755 block mb-1">Nomor Telepon Perusahaan</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400"><Phone size={14} /></span>
                        <input
                          type="text"
                          value={companyProfile.company_phone}
                          onChange={(e) => setCompanyProfile(p => ({ ...p, company_phone: e.target.value }))}
                          className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-colors bg-white font-medium"
                          placeholder="Contoh: +62 812-0000-0000"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-50">
                  <button
                    type="submit"
                    disabled={isSavingCompany || logoUploading}
                    className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs shadow-md shadow-teal-500/10 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingCompany ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ) : activeTab === 'stages' ? (
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white animate-in slide-in-from-right duration-300">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-800 tracking-tight">Manajemen Templat Tahapan Workplan</h2>
              <p className="text-[10px] font-medium text-gray-400 mt-0.5">Kelola nama tahapan default, urutan pengerjaan, dan bobot persentase progress.</p>
            </div>
            <button
              onClick={addStage}
              className="px-3.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-600 font-bold text-xs flex items-center gap-1 transition-colors"
            >
              <Plus size={14} /> Tambah Tahap
            </button>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Policy Setting Dropdown */}
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-150/50 max-w-xl space-y-2">
              <label className="text-xs font-bold text-gray-750 block">Kebijakan Redistribusi Persentase Tahapan</label>
              <p className="text-[10px] font-medium text-gray-400">Pilih bagaimana persentase tahapan didistribusikan jika ada tahapan yang dilewati/dihapus dari produk di halaman workplan.</p>
              <select
                value={policy}
                onChange={(e) => setPolicy(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none bg-white font-semibold text-gray-700"
              >
                <option value="split_equally">Bagi rata ke seluruh tahapan aktif lainnya</option>
                <option value="transfer_to_next">Dilimpahkan ke tahapan aktif selanjutnya</option>
                <option value="transfer_to_previous">Dilimpahkan ke tahapan aktif sebelumnya</option>
              </select>
            </div>

            {/* Stage Templates List Table */}
            {isLoading ? (
              <div className="text-center py-12 text-gray-400 text-xs">Loading...</div>
            ) : (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="py-2.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[120px]">Urutan</th>
                      <th className="py-2.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Tahapan</th>
                      <th className="py-2.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[180px]">Bobot Persentase (%)</th>
                      <th className="py-2.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[80px] text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stageTemplates.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400 text-xs font-semibold">Belum ada templat tahapan. Tambah baru di atas.</td>
                      </tr>
                    ) : (
                      stageTemplates.map((t, idx) => (
                        <tr
                          key={idx}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, idx)}
                          onDragEnd={handleDragEnd}
                          className={`transition-all duration-150 ${
                            draggedIndex === idx
                              ? 'opacity-40 bg-teal-50/50 border-2 border-dashed border-teal-200'
                              : 'hover:bg-gray-50/30'
                          }`}
                        >
                          {/* Re-ordering buttons */}
                          <td className="py-2 px-4 flex items-center gap-1.5 select-none">
                            <span
                              className="text-gray-400 cursor-grab active:cursor-grabbing hover:text-teal-500 transition-colors p-1"
                              title="Tarik untuk mengatur urutan"
                            >
                              <GripVertical size={14} />
                            </span>
                            <span className="text-xs font-extrabold text-gray-400 w-4">{idx + 1}</span>
                            <div className="flex flex-col gap-0.5">
                              <button
                                disabled={idx === 0}
                                onClick={() => moveStage(idx, 'up')}
                                className="p-0.5 hover:bg-gray-100 text-gray-500 rounded disabled:opacity-30"
                              >
                                <ArrowUp size={10} />
                              </button>
                              <button
                                disabled={idx === stageTemplates.length - 1}
                                onClick={() => moveStage(idx, 'down')}
                                className="p-0.5 hover:bg-gray-100 text-gray-500 rounded disabled:opacity-30"
                              >
                                <ArrowDown size={10} />
                              </button>
                            </div>
                          </td>

                          {/* Name */}
                          <td className="py-2 px-4">
                            <input
                              type="text"
                              required
                              value={t.name}
                              onChange={(e) => {
                                const newName = e.target.value;
                                const newCode = generateCodeFromName(newName);
                                setStageTemplates(prev => prev.map((item, i) => i === idx ? { ...item, name: newName, code: newCode } : item));
                              }}
                              placeholder="e.g. Potong Kayu"
                              className="w-full px-2 py-1 text-xs border border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none font-semibold text-gray-700 bg-white"
                            />
                          </td>

                          {/* Percentage */}
                          <td className="py-2 px-4">
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                required
                                min="0"
                                max="100"
                                step="any"
                                value={t.percentage}
                                onChange={(e) => setStageTemplates(prev => prev.map((item, i) => i === idx ? { ...item, percentage: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 } : item))}
                                placeholder="0"
                                className="w-full pl-2 pr-6 py-1 text-xs border border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none font-extrabold text-gray-700 bg-white"
                              />
                              <span className="absolute right-2 text-xs font-bold text-gray-400">%</span>
                            </div>
                          </td>

                          {/* Delete */}
                          <td className="py-2 px-4 text-center">
                            <button
                              onClick={() => deleteStage(idx)}
                              className="p-1 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Total progress calculation footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 gap-4 mt-4">
              <div className="flex items-center gap-2">
                {(() => {
                  const total = stageTemplates.reduce((sum, item) => sum + (parseFloat(item.percentage) || 0), 0);
                  const rounded = Math.round(total * 100) / 100;
                  const isValid = rounded === 100;

                  return (
                    <>
                      {isValid ? (
                        <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
                      ) : (
                        <AlertCircle className="text-red-500 shrink-0" size={18} />
                      )}
                      <div>
                        <span className="text-xs font-extrabold text-gray-700">
                          Total Persentase: <span className={isValid ? 'text-emerald-600' : 'text-red-500'}>{rounded}%</span>
                        </span>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                          {isValid ? 'Konfigurasi persentase valid untuk disimpan.' : 'Bobot persentase dari seluruh tahapan harus berjumlah tepat 100%.'}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <button
                onClick={handleSaveStages}
                disabled={
                  isSavingStages ||
                  (Math.round(stageTemplates.reduce((sum, item) => sum + (parseFloat(item.percentage) || 0), 0) * 100) / 100 !== 100)
                }
                className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs shadow-md shadow-teal-500/10 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isSavingStages ? 'Menyimpan...' : 'Simpan Templat'}
              </button>
            </div>
          </CardContent>
        </Card>
      ) : activeTab === 'sidebar' ? (
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white animate-in slide-in-from-right duration-300">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-800 tracking-tight">Manajemen Kategori & Menu Sidebar</h2>
              <p className="text-[10px] font-medium text-gray-400 mt-0.5">Atur urutan kategori, ikon, ubah label menu, atau pindahkan menu antar kategori secara dinamis.</p>
            </div>
            <button
              type="button"
              onClick={addCategory}
              className="px-3.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-600 font-bold text-xs flex items-center gap-1 transition-colors"
            >
              <PlusCircle size={14} /> Tambah Kategori
            </button>
          </div>

          <CardContent className="p-6 space-y-6">
            {isLoading ? (
              <div className="text-center py-12 text-gray-400 text-xs">Loading...</div>
            ) : (
              <div className="space-y-6">
                {sidebarConfig.map((cat, catIdx) => {
                  const CatIcon = iconMap[cat.icon] || Folder;
                  return (
                    <div
                      key={cat.id}
                      draggable={true}
                      onDragStart={(e) => handleCatDragStart(e, catIdx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleCatDrop(e, catIdx)}
                      onDragEnd={handleCatDragEnd}
                      className={`p-5 rounded-2xl border transition-all duration-150 ${
                        draggedCatIndex === catIdx
                          ? 'opacity-40 bg-teal-50/20 border-dashed border-teal-200 shadow-inner'
                          : 'bg-white border-gray-150/80 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-md'
                      }`}
                    >
                      {/* Category Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100/70 gap-3">
                        <div className="flex items-center gap-2.5 flex-1">
                          {/* Drag handle */}
                          <div 
                            className="text-gray-400 cursor-grab active:cursor-grabbing hover:text-teal-500 transition-colors p-1 shrink-0"
                            title="Tarik untuk mengatur urutan kategori"
                          >
                            <GripVertical size={16} />
                          </div>
                          
                          {/* Category Order Buttons */}
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button
                              type="button"
                              disabled={catIdx === 0}
                              onClick={() => moveCategory(catIdx, 'up')}
                              className="p-0.5 hover:bg-gray-100 text-gray-500 rounded disabled:opacity-30"
                              title="Pindahkan ke atas"
                            >
                              <ArrowUp size={10} />
                            </button>
                            <button
                              type="button"
                              disabled={catIdx === sidebarConfig.length - 1}
                              onClick={() => moveCategory(catIdx, 'down')}
                              className="p-0.5 hover:bg-gray-100 text-gray-500 rounded disabled:opacity-30"
                              title="Pindahkan ke bawah"
                            >
                              <ArrowDown size={10} />
                            </button>
                          </div>

                          {/* Category Icon Indicator */}
                          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                            <CatIcon size={16} />
                          </div>

                          {/* Category Name Input */}
                          <input
                            type="text"
                            required
                            value={cat.name}
                            onChange={(e) => updateCategory(catIdx, { name: e.target.value })}
                            placeholder="Nama Kategori (contoh: Master Data)"
                            className="text-xs font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-teal-500 focus:outline-none py-0.5 px-1 w-full max-w-[200px]"
                          />
                        </div>

                        {/* Category Settings Controls */}
                        <div className="flex items-center gap-3 shrink-0">
                          {/* Select Icon */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ikon:</span>
                            <select
                              value={cat.icon}
                              onChange={(e) => updateCategory(catIdx, { icon: e.target.value })}
                              className="px-2 py-1 text-[11px] border border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none bg-white font-semibold text-gray-600"
                            >
                              {availableIcons.map((ic) => (
                                <option key={ic} value={ic}>{ic}</option>
                              ))}
                            </select>
                          </div>

                          {/* Delete Category */}
                          <button
                            type="button"
                            onClick={() => deleteCategory(catIdx)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Hapus Kategori"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Category Menus Table */}
                      <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                              <th className="py-2 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[100px]">Urutan</th>
                              <th className="py-2 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Menu</th>
                              <th className="py-2 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Permission Key</th>
                              <th className="py-2 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[160px]">Pindahkan Kategori</th>
                              <th className="py-2 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[90px] text-center">Tampilkan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 bg-white">
                            {(cat.items || []).length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-6 text-center text-gray-400 text-xs font-semibold">
                                  Belum ada menu di kategori ini. Silakan pindahkan menu dari kategori lain ke sini.
                                </td>
                              </tr>
                            ) : (
                              cat.items.map((menu: any, itemIdx: number) => {
                                const isDragged = draggedMenuIndex?.catIdx === catIdx && draggedMenuIndex?.itemIdx === itemIdx;
                                return (
                                  <tr
                                    key={menu.code}
                                    draggable={true}
                                    onDragStart={(e) => handleMenuDragStart(e, catIdx, itemIdx)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleMenuDrop(e, catIdx, itemIdx)}
                                    onDragEnd={handleMenuDragEnd}
                                    className={`transition-all duration-150 ${
                                      isDragged
                                        ? 'opacity-40 bg-teal-50/40 border-2 border-dashed border-teal-100'
                                        : 'hover:bg-gray-50/20'
                                    }`}
                                  >
                                    {/* Grip / Arrows */}
                                    <td className="py-2 px-3 flex items-center gap-1">
                                      <div
                                        className="text-gray-400 cursor-grab active:cursor-grabbing hover:text-teal-500 transition-colors p-1"
                                        title="Tarik untuk mengatur urutan menu"
                                      >
                                        <GripVertical size={13} />
                                      </div>
                                      <div className="flex flex-col gap-0.2 shrink-0">
                                        <button
                                          type="button"
                                          disabled={itemIdx === 0}
                                          onClick={() => moveMenu(catIdx, itemIdx, 'up')}
                                          className="p-0.5 hover:bg-gray-150 text-gray-500 rounded disabled:opacity-20"
                                          title="Geser ke atas"
                                        >
                                          <ArrowUp size={8} />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={itemIdx === cat.items.length - 1}
                                          onClick={() => moveMenu(catIdx, itemIdx, 'down')}
                                          className="p-0.5 hover:bg-gray-150 text-gray-500 rounded disabled:opacity-20"
                                          title="Geser ke bawah"
                                        >
                                          <ArrowDown size={8} />
                                        </button>
                                      </div>
                                      <span className="text-[10px] font-extrabold text-gray-400 w-3 text-right">{itemIdx + 1}</span>
                                    </td>

                                    {/* Name Input */}
                                    <td className="py-2 px-3">
                                      <input
                                        type="text"
                                        required
                                        value={menu.name}
                                        onChange={(e) => updateMenu(catIdx, itemIdx, { name: e.target.value })}
                                        className="w-full px-2 py-0.5 text-xs border border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none font-semibold text-gray-700 bg-white"
                                      />
                                    </td>

                                    {/* Permission Key (Read Only) */}
                                    <td className="py-2 px-3">
                                      <code className="px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded text-[9px] font-bold text-gray-400 tracking-wider">
                                        {menu.permission || 'public'}
                                      </code>
                                    </td>

                                    {/* Move to another category */}
                                    <td className="py-2 px-3">
                                      <select
                                        value={cat.id}
                                        onChange={(e) => moveMenuToCategory(catIdx, itemIdx, e.target.value)}
                                        className="w-full px-2 py-0.5 text-[11px] border border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none bg-white font-semibold text-gray-600"
                                      >
                                        {sidebarConfig.map((c) => (
                                          <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                      </select>
                                    </td>

                                    {/* Toggle Visibility */}
                                    <td className="py-2 px-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => updateMenu(catIdx, itemIdx, { visible: menu.visible === false ? true : false })}
                                        className={`p-1 rounded-lg transition-all ${
                                          menu.visible === false
                                            ? 'text-gray-300 hover:text-gray-400 hover:bg-gray-50'
                                            : 'text-teal-600 bg-teal-50 hover:bg-teal-100'
                                        }`}
                                        title={menu.visible === false ? 'Klik untuk Tampilkan' : 'Klik untuk Sembunyikan'}
                                      >
                                        {menu.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Save Sidebar settings footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 gap-4 mt-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-teal-500 shrink-0" size={18} />
                <div>
                  <span className="text-xs font-extrabold text-gray-700">Konfigurasi Siap Disimpan</span>
                  <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                    Pastikan semua kategori memiliki nama yang unik dan minimal terdapat satu kategori aktif.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveSidebar}
                disabled={isSavingSidebar || sidebarConfig.length === 0}
                className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs shadow-md shadow-teal-500/10 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isSavingSidebar ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl bg-white animate-in slide-in-from-right duration-300">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-800 tracking-tight flex items-center gap-2">
                <Clock size={16} className="text-teal-500" /> Pengaturan Batas Waktu Tahapan Proyek (Deadlines)
              </h2>
              <p className="text-[10px] font-medium text-gray-400 mt-0.5">Tentukan batas waktu (dalam hari) untuk menyelesaikan setiap tahapan proyek. Sistem akan memantau keterlambatan secara otomatis.</p>
            </div>
          </div>
          <CardContent className="p-6 space-y-6">
            {isLoading ? (
              <div className="text-center py-12 text-gray-400 text-xs">Loading...</div>
            ) : (
              <form onSubmit={handleSaveDeadlines} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stagesList.map((stg) => (
                    <div 
                      key={stg.code} 
                      className="p-4 rounded-xl border border-gray-100 hover:border-teal-200 hover:bg-teal-50/5 transition-all flex items-center justify-between group"
                    >
                      <div className="space-y-1 pr-4">
                        <span className="text-xs font-bold text-gray-800 group-hover:text-teal-600 transition-colors">
                          {stg.label}
                        </span>
                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                          {stg.desc}
                        </p>
                      </div>
                      <div className="relative flex items-center shrink-0 w-24">
                        <input
                          type="number"
                          required
                          min="1"
                          max="365"
                          value={deadlines[stg.code] ?? 3}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setDeadlines(prev => ({
                              ...prev,
                              [stg.code]: isNaN(val) ? 0 : val
                            }));
                          }}
                          className="w-full pl-3 pr-8 py-1.5 text-xs font-extrabold text-gray-700 bg-white border border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none"
                        />
                        <span className="absolute right-3 text-[10px] font-bold text-gray-400">Hari</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-50">
                  <button
                    type="submit"
                    disabled={isSavingDeadlines}
                    className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs shadow-md shadow-teal-500/10 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingDeadlines ? 'Saving...' : 'Save Deadlines'}
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
