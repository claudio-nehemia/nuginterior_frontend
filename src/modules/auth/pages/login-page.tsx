import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { useAuthStore } from '../store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen w-full relative overflow-y-auto">
      {/* Fixed Background Image and Backdrop Blur */}
      <div 
        className="fixed inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: 'url(/interior-bg.png)' }}
      />
      <div className="fixed inset-0 bg-white/30 backdrop-blur-[3px] z-0" />
      
      <div className="min-h-screen w-full flex flex-col items-center justify-center py-6 md:py-10 px-4 relative z-10">
        <Card className="w-full max-w-[330px] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] border-white/50 bg-white/90 backdrop-blur-md rounded-[1.5rem] overflow-hidden my-auto">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-teal-400" />
          
          <CardHeader className="space-y-2 items-center pt-8 pb-3">
            <div className="w-20 h-14 overflow-hidden flex items-center justify-center mb-1 mx-auto">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="text-center space-y-0.5">
              <CardTitle className="text-xl font-black text-gray-800 tracking-tight">Arsiflow</CardTitle>
              <CardDescription className="text-[10px] font-bold text-gray-500/80 uppercase tracking-widest">Management System</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-8">
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Email Address</label>
                <Input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hello@arsiflow.com" 
                  className="h-9 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-400/20 focus:border-teal-400 transition-all text-xs text-gray-700"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Password</label>
                <Input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="h-9 bg-white/50 border-gray-100 rounded-xl focus:ring-teal-400/20 focus:border-teal-400 transition-all text-xs"
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
                className="w-full h-10 mt-1 bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm rounded-xl transition-all shadow-[0_12px_24px_-8px_rgba(31,103,253,0.3)] active:scale-[0.98] disabled:opacity-70"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Logging in...
                  </span>
                ) : 'Sign In'}
              </Button>

              <div className="text-center pt-3 border-t border-gray-100/50 mt-3">
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
        <div className="mt-6 text-white/60 text-[10px] font-bold tracking-widest uppercase">
          &copy; 2026 Arsiflow System ❤️
        </div>
      </div>
    </div>
  );
}
