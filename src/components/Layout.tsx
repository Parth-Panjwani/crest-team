import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Clock, FileText, Calendar, DollarSign, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { store } from '@/lib/store';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: Clock, label: 'Attendance', path: '/attendance' },
  { icon: FileText, label: 'Order Pad', path: '/order-pad' },
  { icon: Calendar, label: 'Leave', path: '/leave' },
  { icon: DollarSign, label: 'Salary', path: '/salary' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = store.getCurrentUser();

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 glass-strong border-r border-glass-border">
        <div className="p-6">
          <h1 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
            Employee Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{user?.name}</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <motion.button
                key={item.path}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-primary/20 text-primary glow-primary'
                    : 'text-muted-foreground hover:bg-secondary/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-6">{children}</main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-strong border-t border-glass-border z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <motion.button
                key={item.path}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleNavClick(item.path)}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors min-w-[60px] ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'glow-primary' : ''}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
