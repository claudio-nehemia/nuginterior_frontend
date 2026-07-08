import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Box } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.ceoNik.length < 3) {
      toast.error('NIK CEO minimal 3 karakter');
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
        toast.success('Pendaftaran perusahaan berhasil! ✨ Silakan tunggu verifikasi oleh Super Admin.');
        navigate('/login');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registrasi gagal, coba lagi nanti 🧊');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative overflow-hidden py-10"
      style={{ backgroundImage: 'url(/interior-bg.png)' }}
    >
      {/* Playful background blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-teal-200/30 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-emerald-200/30 rounded-full blur-[120px] animate-pulse" />
      
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />
      
      <Card className="w-full max-w-[750px] relative z-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border-white/40 bg-white/80 backdrop-blur-xl rounded-[2rem] overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-300 via-emerald-300 to-teal-300" />
        
        <CardHeader className="space-y-2 items-center pt-6 pb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-emerald-400 rounded-[1rem] flex items-center justify-center text-white shadow-[0_8px_20px_-4px_rgba(52,211,153,0.4)] transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <Box size={24} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <CardTitle className="text-xl font-black text-gray-800 tracking-tight">Daftarkan Perusahaan Baru</CardTitle>
            <CardDescription className="text-[10px] font-bold text-gray-500/80 uppercase tracking-widest">Nuginterior Multi-Tenant Platform ✨</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          <form onSubmit={handleRegister} className="space-y-6">
            
            <div className="space-y-6">
              
              {/* Section: Admin Account */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-bold text-teal-600 uppercase tracking-widest border-b border-teal-100 pb-1">
                  Informasi Admin Utama
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">Nama Lengkap</label>
                    <Input 
                      type="text" 
                      name="userName"
                      value={formData.userName}
                      onChange={handleChange}
                      placeholder="Nama Admin" 
                      className="h-9 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-400/20 focus:border-teal-400 transition-all text-xs"
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
                      placeholder="admin@perusahaan.com" 
                      className="h-9 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-400/20 focus:border-teal-400 transition-all text-xs"
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
                      className="h-9 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-400/20 focus:border-teal-400 transition-all text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section: Company Info */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-bold text-teal-600 uppercase tracking-widest border-b border-teal-100 pb-1">
                  Profil Perusahaan
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">Nama Perusahaan</label>
                    <Input 
                      type="text" 
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="PT. Desain Jaya Mandiri" 
                      className="h-9 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-400/20 focus:border-teal-400 transition-all text-xs"
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
                      className="h-9 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-400/20 focus:border-teal-400 transition-all text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">Nama Direktur</label>
                    <Input 
                      type="text" 
                      name="directorName"
                      value={formData.directorName}
                      onChange={handleChange}
                      placeholder="Nama Direktur" 
                      className="h-9 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-400/20 focus:border-teal-400 transition-all text-xs"
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
                      placeholder="NIK CEO" 
                      maxLength={50}
                      className="h-9 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-400/20 focus:border-teal-400 transition-all text-xs"
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
                      placeholder="email@perusahaan.com" 
                      className="h-9 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-400/20 focus:border-teal-400 transition-all text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em] ml-1">Telepon</label>
                    <Input 
                      type="text" 
                      name="companyPhone"
                      value={formData.companyPhone}
                      onChange={handleChange}
                      placeholder="Telepon Kantor" 
                      className="h-9 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-400/20 focus:border-teal-400 transition-all text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Alamat Lengkap Perusahaan</label>
                    <textarea 
                      name="companyAddress"
                      value={formData.companyAddress}
                      onChange={handleChange}
                      placeholder="Alamat kantor pusat perusahaan..." 
                      rows={2}
                      className="w-full p-2 bg-white/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-teal-400/20 focus:border-teal-400 transition-all text-xs text-gray-700 outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-1.5 pt-1">
              <Button 
                type="submit" 
                className="w-full h-10 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-[0_12px_24px_-8px_rgba(52,211,153,0.5)] active:scale-[0.98] disabled:opacity-70"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses Pendaftaran...
                  </span>
                ) : 'Daftarkan Perusahaan'}
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

          </form>
        </CardContent>
      </Card>
      
      {/* Decorative footer text */}
      <div className="absolute bottom-6 text-white/60 text-[10px] font-bold tracking-widest uppercase">
        &copy; 2026 Interior Pro System Multi-Tenant ❤️
      </div>
    </div>
  );
}
