import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/modules/auth/store/auth.store';
import { api } from '@/lib/axios';
import { 
  LayoutDashboard, 
  Settings,
  LogOut,
  Bell,
  ChevronDown,
  CheckCircle,
  Inbox,
  Menu,
} from 'lucide-react';
import { toast } from 'sonner';
import * as LucideIcons from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from 'react';

const iconMap: { [key: string]: React.ComponentType<any> } = {
  LayoutDashboard: LucideIcons.LayoutDashboard,
  Database: LucideIcons.Database,
  Users: LucideIcons.Users,
  Package: LucideIcons.Package,
  Box: LucideIcons.Box,
  Ruler: LucideIcons.Ruler,
  Wallet: LucideIcons.Wallet,
  ShoppingCart: LucideIcons.ShoppingCart,
  ClipboardCheck: LucideIcons.ClipboardCheck,
  Palette: LucideIcons.Palette,
  Calculator: LucideIcons.Calculator,
  FileText: LucideIcons.FileText,
  Coins: LucideIcons.Coins,
  Receipt: LucideIcons.Receipt,
  Settings: LucideIcons.Settings,
  Folder: LucideIcons.Folder,
  Layers: LucideIcons.Layers,
  Building2: LucideIcons.Building2,
};

const getIcon = (name: string) => {
  return iconMap[name] || LucideIcons.Folder;
};

export default function DashboardLayout() {
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [sidebarConfig, setSidebarConfig] = useState<any[]>([]);
  const [loadingSidebar, setLoadingSidebar] = useState(true);
  const [openCategories, setOpenCategories] = useState<{ [key: string]: boolean }>({});

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [activeCompanies, setActiveCompanies] = useState<any[]>([]);
  const [currentCompanyFilter, setCurrentCompanyFilter] = useState<string>(localStorage.getItem('company_filter') || 'all');

  useEffect(() => {
    if (user?.company_id === 1 && user?.role?.nama_role === 'Super Admin') {
      api.get('/companies').then(res => {
        if (res.data.success) {
          const verifiedOnly = (res.data.data || []).filter((c: any) => c.status === 'verified');
          setActiveCompanies(verifiedOnly);
        }
      }).catch(err => {
        console.error("Failed to fetch active companies", err);
      });
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
      const countRes = await api.get('/notifications/unread-count');
      setUnreadCount(countRes.data.data?.unread_count || 0);
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000); // check every 15s
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAsRead = async (id: number, link?: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      await fetchNotifications();
      if (link) {
        navigate(link);
      }
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.put('/notifications/read-all');
      await fetchNotifications();
      toast.success("Semua notifikasi ditandai dibaca");
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin}m lalu`;
    if (diffHr < 24) return `${diffHr}j lalu`;
    if (diffDay < 7) return `${diffDay}h lalu`;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const toggleCategory = (catId: string) => {
    setOpenCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const fallbackTitle = location.pathname
    .split('/')
    .pop()
    ?.replace('-', ' ')
    .replace(/\b\w/g, l => l.toUpperCase()) || 'Dashboard';

  useEffect(() => {
    if (!user || !user.name) {
      api.get('/auth/me').then(res => {
        useAuthStore.setState({ user: res.data.data });
      }).catch(() => {});
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  ];

  const hasPermission = (perm: string) => {
    return user?.permissions?.includes(perm) || false;
  };

  const fetchSidebarConfig = () => {
    api.get('/sidebar')
      .then(res => {
        const valueStr = res.data?.data?.value || '[]';
        try {
          const parsed = JSON.parse(valueStr);
          setSidebarConfig(parsed);
          
          // Initialize open states for categories to true by default
          const initialOpen: { [key: string]: boolean } = {};
          parsed.forEach((cat: any) => {
            initialOpen[cat.id] = true;
          });
          setOpenCategories(initialOpen);
        } catch (e) {
          console.error("Failed to parse sidebar configuration", e);
        }
      })
      .catch(err => {
        console.error("Failed to fetch sidebar configuration", err);
      })
      .finally(() => {
        setLoadingSidebar(false);
      });
  };

  useEffect(() => {
    fetchSidebarConfig();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFB]">
      {/* Backdrop overlay for mobile */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-56 bg-white border-r border-gray-100 flex flex-col fixed inset-y-0 z-40 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-transform duration-300 transform lg:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-14 flex items-center px-5 justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-lg shadow-teal-400/10 rotate-3 border border-gray-100/50 bg-white">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-extrabold text-base text-gray-800 tracking-tight">Interior Pro</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-bold text-xs transition-all duration-300 ${
                    isActive 
                      ? 'bg-teal-400 text-white shadow-lg shadow-teal-400/30 translate-x-0.5' 
                      : 'text-gray-500 hover:bg-teal-50 hover:text-teal-600'
                  }`}
                >
                  <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                  {item.name}
                </Link>
              )
            })}
          </div>

          {loadingSidebar ? (
            <div className="text-center py-4 text-gray-400 text-[10px] font-semibold">Loading menu...</div>
          ) : (
            sidebarConfig.map((cat: any) => {
              const allowedItems = (cat.items || []).filter((item: any) => {
                if (item.visible === false) return false;
                return !item.permission || hasPermission(item.permission);
              });

              if (allowedItems.length === 0) return null;

              const CatIcon = getIcon(cat.icon);
              const isOpen = openCategories[cat.id] ?? true;

              return (
                <div key={cat.id} className="space-y-1 animate-in fade-in duration-200">
                  <button 
                    onClick={() => toggleCategory(cat.id)}
                    className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <CatIcon size={16} />
                      {cat.name}
                    </div>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-teal-500' : ''}`} />
                  </button>
                  
                  {isOpen && (
                    <div className="mt-1 space-y-0.5 ml-1.5 pl-3 border-l-2 border-teal-50/50">
                      {allowedItems.map((item: any) => {
                        const isActive = location.pathname.startsWith(item.path);
                        const ItemIcon = getIcon(item.icon);
                        return (
                          <Link
                            key={item.code}
                            to={item.path}
                            onClick={() => setIsMobileSidebarOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                              isActive 
                                ? 'text-teal-600 bg-teal-50/50 font-bold' 
                                : 'text-gray-400 hover:text-gray-700 hover:translate-x-0.5'
                            }`}
                          >
                            <ItemIcon size={14} strokeWidth={isActive ? 2.5 : 2} />
                            {item.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Settings */}
          {hasPermission('setting.index') && (
            <div className="space-y-1">
              <Link
                to="/dashboard/settings"
                onClick={() => setIsMobileSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-bold text-xs transition-all duration-300 ${
                  location.pathname.startsWith('/dashboard/settings')
                    ? 'bg-teal-400 text-white shadow-lg shadow-teal-400/30 translate-x-0.5' 
                    : 'text-gray-500 hover:bg-teal-50 hover:text-teal-600'
                }`}
              >
                <Settings size={16} strokeWidth={location.pathname.startsWith('/dashboard/settings') ? 2.5 : 2} />
                Settings
              </Link>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-50">
           <button 
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-50 hover:text-red-500 transition-all"
           >
             <LogOut size={16} />
             Sign Out
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-56 ml-0 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-sm shadow-gray-200/10">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 text-gray-500 hover:text-teal-500 hover:bg-teal-50 rounded-lg lg:hidden transition-colors outline-none"
            >
              <Menu size={18} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-sm font-extrabold text-gray-800 tracking-tight leading-none">
                {pageTitle || fallbackTitle}
              </h2>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 hidden sm:block">Overview & Insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-5">
            {user?.company_id === 1 && user?.role?.nama_role === 'Super Admin' && (
              <div className="flex items-center gap-1.5 sm:gap-2 mr-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden sm:inline">Tenant:</span>
                <select
                  value={currentCompanyFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrentCompanyFilter(val);
                    if (val === 'all') {
                      localStorage.removeItem('company_filter');
                    } else {
                      localStorage.setItem('company_filter', val);
                    }
                    window.location.reload();
                  }}
                  className="bg-gray-50 border border-gray-100 rounded-lg py-1 px-2 text-[11px] sm:text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400 cursor-pointer transition-all max-w-[120px] sm:max-w-none"
                >
                  <option value="all">Semua Perusahaan</option>
                  {activeCompanies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-teal-500 hover:bg-teal-50 transition-all relative outline-none">
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl shadow-2xl border-gray-100 overflow-hidden bg-white z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between bg-gray-55/30">
                  <div className="text-xs font-extrabold text-gray-800">Notifikasi</div>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllAsRead} 
                      className="text-[10px] font-bold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle size={12} /> Tandai Semua Dibaca
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                      <Inbox size={28} strokeWidth={1.5} className="text-gray-300" />
                      <div className="text-[10px] font-bold">Tidak ada notifikasi</div>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.id} 
                        onClick={() => handleMarkAsRead(n.id, n.link)}
                        className={`p-3.5 flex flex-col gap-1 cursor-pointer transition-all hover:bg-gray-50/50 ${
                          !n.is_read ? 'bg-teal-50/10 border-l-2 border-teal-500' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className={`text-[11px] font-bold text-gray-800 leading-snug ${!n.is_read ? 'text-teal-950 font-extrabold' : ''}`}>
                            {n.title}
                          </div>
                          <span className="text-[9px] font-semibold text-gray-400 whitespace-nowrap">
                            {formatTime(n.created_at)}
                          </span>
                        </div>
                        <div className="text-[10px] font-semibold text-gray-500 leading-relaxed">
                          {n.message}
                        </div>
                        {n.nama_project && (
                          <div className="text-[8px] font-bold text-teal-650 uppercase tracking-wider mt-1.5">
                            {n.nama_project} ({n.nomor_order})
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="h-6 w-[1px] bg-gray-100" />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 outline-none group">
                <div className="text-right hidden lg:block">
                  <div className="text-xs font-bold text-gray-800 leading-tight group-hover:text-teal-600 transition-colors">{user?.name || 'Admin User'}</div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{user?.role?.nama_role || 'Administrator'}</div>
                </div>
                <Avatar className="h-8 w-8 rounded-lg shadow-inner border-2 border-white ring-1 ring-gray-100 transition-transform group-hover:scale-105">
                  <AvatarFallback className="bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-600 font-bold text-[10px]">
                    {user?.name ? user.name.split(' ').map((x: string) => x[0]).join('').substring(0, 2).toUpperCase() : 'AU'}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-xl shadow-2xl border-gray-100">
                <DropdownMenuItem className="rounded-lg py-2 px-3 font-semibold text-xs text-gray-600 cursor-pointer">
                  <Settings className="mr-2 h-3.5 w-3.5" /> Account Settings
                </DropdownMenuItem>
                <div className="h-[1px] bg-gray-50 my-0.5 mx-2" />
                <DropdownMenuItem onClick={handleLogout} className="rounded-lg py-2 px-3 font-semibold text-xs text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                  <LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 max-w-[1600px] mx-auto w-full">
          <Outlet context={{ setPageTitle, refreshSidebar: fetchSidebarConfig }} />
        </div>
      </main>
    </div>
  );
}
