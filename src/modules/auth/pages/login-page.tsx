import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { useAuthStore } from '../store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Box } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@interiorpro.com');
  const [password, setPassword] = useState('password');
  const [isLoading, setIsLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.success) {
        setAuth(data.data.access_token, { email });
        toast.success('Welcome back, Admin! ✨');
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Oops! Login failed 🧊');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative overflow-hidden"
      style={{ backgroundImage: 'url(/interior-bg.png)' }}
    >
      {/* Playful background blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-teal-200/30 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-emerald-200/30 rounded-full blur-[120px] animate-pulse" />
      
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />
      
      <Card className="w-full max-w-[380px] relative z-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border-white/40 bg-white/80 backdrop-blur-xl rounded-[2rem] overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-300 via-emerald-300 to-teal-300" />
        
        <CardHeader className="space-y-3 items-center pt-10 pb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-emerald-400 rounded-[1.25rem] flex items-center justify-center text-white shadow-[0_8px_20px_-4px_rgba(52,211,153,0.4)] transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <Box size={32} strokeWidth={1.5} />
          </div>
          <div className="text-center space-y-0.5">
            <CardTitle className="text-2xl font-black text-gray-800 tracking-tight">Interior Pro</CardTitle>
            <CardDescription className="text-[11px] font-bold text-gray-500/80 uppercase tracking-widest">Management System ✨</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-9 pb-10">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Email Address</label>
              <Input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@interiorpro.com" 
                className="h-10 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-400/20 focus:border-teal-400 transition-all text-xs text-gray-700"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Password</label>
              <Input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="h-10 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-400/20 focus:border-teal-400 transition-all text-xs"
                required
              />
            </div>
            
            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center space-x-2 group cursor-pointer">
                <Checkbox id="remember" className="w-4 h-4 border-gray-200 rounded-md data-[state=checked]:bg-teal-400 data-[state=checked]:border-teal-400 transition-all" />
                <label htmlFor="remember" className="text-xs text-gray-500 font-bold cursor-pointer group-hover:text-gray-700 transition-colors">
                  Keep me signed in
                </label>
              </div>
              <a href="#" className="text-xs font-bold text-teal-500 hover:text-teal-600 transition-colors">Help?</a>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 mt-2 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-[0_12px_24px_-8px_rgba(52,211,153,0.5)] active:scale-[0.98] disabled:opacity-70"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Logging in...
                </span>
              ) : 'Sign In'}
            </Button>

            <div className="text-center pt-4 border-t border-gray-100/50 mt-4">
              <span className="text-xs text-gray-500">Belum memiliki akun? </span>
              <a 
                onClick={() => navigate('/register')} 
                className="text-xs font-bold text-teal-500 hover:text-teal-600 cursor-pointer transition-colors"
              >
                Daftarkan Perusahaan Baru
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Decorative footer text */}
      <div className="absolute bottom-6 text-white/60 text-[10px] font-bold tracking-widest uppercase">
        &copy; 2026 Interior Pro System ❤️
      </div>
    </div>
  );
}
