import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    userName: '',
    userEmail: '',
    userPassword: '',
    companyName: '',
    directorName: '',
    ceoNik: '',
    nib: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNextStep = () => {
    if (!formData.userName.trim()) {
      toast.error('Nama Lengkap wajib diisi');
      return;
    }
    if (!formData.userEmail.trim()) {
      toast.error('Email Login wajib diisi');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.userEmail)) {
      toast.error('Format email login tidak valid');
      return;
    }
    if (!formData.userPassword) {
      toast.error('Password wajib diisi');
      return;
    }
    if (formData.userPassword.length < 8) {
      toast.error('Password minimal 8 karakter');
      return;
    }
    setStep(2);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 2) {
      handleNextStep();
      return;
    }
    if (!formData.companyName.trim()) {
      toast.error('Nama Perusahaan wajib diisi');
      return;
    }
    if (!formData.directorName.trim()) {
      toast.error('Nama Direktur wajib diisi');
      return;
    }
    if (!formData.ceoNik.trim()) {
      toast.error('NIK CEO wajib diisi');
      return;
    }
    if (formData.ceoNik.length < 3) {
      toast.error('NIK CEO minimal 3 karakter');
      return;
    }
    if (!formData.companyEmail.trim()) {
      toast.error('Email Kantor wajib diisi');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.companyEmail)) {
      toast.error('Format email kantor tidak valid');
      return;
    }
    if (!formData.companyPhone.trim()) {
      toast.error('Telepon Kantor wajib diisi');
      return;
    }
    if (!formData.companyAddress.trim()) {
      toast.error('Alamat Lengkap Perusahaan wajib diisi');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/register-company', {
        user_name: formData.userName,
        user_email: formData.userEmail,
        user_password: formData.userPassword,
        company_name: formData.companyName,
        director_name: formData.directorName,
        ceo_nik: formData.ceoNik,
        nib: formData.nib || undefined,
        company_email: formData.companyEmail,
        company_phone: formData.companyPhone,
        company_address: formData.companyAddress,
      });

      if (data.success) {
        toast.success('Pendaftaran perusahaan berhasil! Silakan tunggu verifikasi oleh Super Admin.');
        navigate('/login');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registrasi gagal, coba lagi nanti');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-y-auto">
      {/* Fixed Background Image and Backdrop Blur */}
      <div 
        className="fixed inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: 'url(/interior-bg.png)' }}
      />
      <div className="fixed inset-0 bg-white/30 backdrop-blur-[3px] z-0" />
      
      <div className="min-h-screen w-full flex flex-col items-center justify-center py-6 md:py-10 px-4 relative z-10">
        <Card className="w-full max-w-[600px] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] border-white/50 bg-white/90 backdrop-blur-md rounded-[1.5rem] overflow-hidden my-auto">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-teal-400" />
          
          <CardHeader className="space-y-2 items-center pt-6 pb-4">
            <div className="w-20 h-14 overflow-hidden flex items-center justify-center mb-1 mx-auto">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="text-center">
              <CardTitle className="text-xl font-black text-gray-800 tracking-tight">Daftarkan Perusahaan Baru</CardTitle>
              <CardDescription className="text-[10px] font-bold text-gray-500/80 uppercase tracking-widest">Arsiflow Multi-Tenant Platform</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
              step === 1 
                ? 'bg-teal-500 text-white shadow-sm' 
                : 'bg-teal-50 text-teal-600'
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                step === 1 ? 'bg-white/20 text-white' : 'bg-teal-200 text-teal-700'
              }`}>1</span>
              Akun Admin
            </div>
            <div className="w-8 h-[1px] bg-gray-200" />
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
              step === 2 
                ? 'bg-teal-500 text-white shadow-sm' 
                : 'bg-teal-50 text-teal-600'
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                step === 2 ? 'bg-white/20 text-white' : 'bg-teal-200 text-teal-700'
              }`}>2</span>
              Profil Perusahaan
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            
            {step === 1 ? (
              /* Step 1: Admin Account */
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 pb-2 mb-2">
                  <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider">
                    Informasi Admin Utama
                  </h3>
                  <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Akun ini akan otomatis menjadi Super Admin untuk tenant Anda</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">Nama Lengkap</label>
                    <Input 
                      type="text" 
                      name="userName"
                      value={formData.userName}
                      onChange={handleChange}
                      placeholder="Masukkan nama lengkap Anda" 
                      className="h-10 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-405/20 focus:border-teal-405 text-xs text-gray-700"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">Email Login</label>
                    <Input 
                      type="email" 
                      name="userEmail"
                      value={formData.userEmail}
                      onChange={handleChange}
                      placeholder="contoh: admin@perusahaan.com" 
                      className="h-10 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-405/20 focus:border-teal-405 text-xs text-gray-700"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">Password</label>
                    <Input 
                      type="password" 
                      name="userPassword"
                      value={formData.userPassword}
                      onChange={handleChange}
                      placeholder="Minimal 8 karakter" 
                      className="h-10 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-405/20 focus:border-teal-405 text-xs text-gray-700"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <Button 
                    type="button" 
                    onClick={handleNextStep}
                    className="w-full h-10 bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm rounded-xl transition-all shadow-[0_8px_16px_rgba(31,103,253,0.15)]"
                  >
                    Lanjut ke Profil Perusahaan
                  </Button>
                  <Button 
                    type="button"
                    variant="ghost"
                    onClick={() => navigate('/login')}
                    className="w-full h-9 text-gray-500 font-semibold hover:text-gray-700 transition-colors text-xs"
                  >
                    Kembali ke Halaman Login
                  </Button>
                </div>
              </div>
            ) : (
              /* Step 2: Company Profile */
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 pb-2 mb-2">
                  <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider">
                    Profil Perusahaan
                  </h3>
                  <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Informasi resmi perusahaan untuk kebutuhan kop surat & dokumen</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">Nama Perusahaan</label>
                    <Input 
                      type="text" 
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Contoh: PT. Desain Jaya Mandiri" 
                      className="h-10 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-405/20 focus:border-teal-405 text-xs text-gray-700"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">NIB (Opsional)</label>
                    <Input 
                      type="text" 
                      name="nib"
                      value={formData.nib}
                      onChange={handleChange}
                      placeholder="Nomor Induk Berusaha" 
                      className="h-10 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-405/20 focus:border-teal-405 text-xs text-gray-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">Nama Direktur</label>
                    <Input 
                      type="text" 
                      name="directorName"
                      value={formData.directorName}
                      onChange={handleChange}
                      placeholder="Nama Direktur Utama" 
                      className="h-10 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-405/20 focus:border-teal-405 text-xs text-gray-700"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">NIK CEO</label>
                    <Input 
                      type="text" 
                      name="ceoNik"
                      value={formData.ceoNik}
                      onChange={handleChange}
                      placeholder="Nomor KTP / NIK CEO" 
                      maxLength={50}
                      className="h-10 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-405/20 focus:border-teal-405 text-xs text-gray-700"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">Email Kantor</label>
                    <Input 
                      type="email" 
                      name="companyEmail"
                      value={formData.companyEmail}
                      onChange={handleChange}
                      placeholder="contoh: office@perusahaan.com" 
                      className="h-10 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-405/20 focus:border-teal-405 text-xs text-gray-700"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">Telepon Kantor</label>
                    <Input 
                      type="text" 
                      name="companyPhone"
                      value={formData.companyPhone}
                      onChange={handleChange}
                      placeholder="Contoh: +62 812-3456-789" 
                      className="h-10 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-405/20 focus:border-teal-405 text-xs text-gray-700"
                      required
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Alamat Lengkap Perusahaan</label>
                    <textarea 
                      name="companyAddress"
                      value={formData.companyAddress}
                      onChange={handleChange}
                      placeholder="Masukkan alamat lengkap kantor pusat perusahaan..." 
                      rows={3}
                      className="w-full p-3 bg-white/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-teal-400/20 focus:border-teal-400 transition-all text-xs text-gray-700 outline-none min-h-[80px]"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      type="button" 
                      onClick={() => setStep(1)}
                      variant="outline"
                      className="h-10 border-gray-200 hover:bg-gray-50 text-gray-500 font-bold text-xs rounded-xl"
                    >
                      Kembali
                    </Button>
                    <Button 
                      type="submit" 
                      className="col-span-2 h-10 bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm rounded-xl transition-all shadow-[0_8px_16px_rgba(31,103,253,0.15)] disabled:opacity-70"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2 justify-center">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Mendaftarkan...
                        </span>
                      ) : 'Daftarkan Perusahaan'}
                    </Button>
                  </div>
                  <Button 
                    type="button"
                    variant="ghost"
                    onClick={() => navigate('/login')}
                    className="w-full h-9 text-gray-500 font-semibold hover:text-gray-700 transition-colors text-xs"
                  >
                    Batal & Kembali ke Login
                  </Button>
                </div>
              </div>
            )}

          </form>
        </CardContent>
      </Card>
      
      {/* Decorative footer text */}
      <div className="mt-6 text-white/60 text-[10px] font-bold tracking-widest uppercase">
        &copy; 2026 Arsiflow System Multi-Tenant ❤️
      </div>
    </div>
  </div>
  );
}
