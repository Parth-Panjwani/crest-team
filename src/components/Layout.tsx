import { ReactNode } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Home,
  Clock,
  FileText,
  Calendar,
  DollarSign,
  Settings,
  Users,
} from "lucide-react"
import { motion } from "framer-motion"
import { store } from "@/lib/store"

interface LayoutProps {
  children: ReactNode
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  path: string
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: Clock, label: "Attendance", path: "/attendance" },
  { icon: FileText, label: "Notes", path: "/notes" },
  { icon: Calendar, label: "Leave", path: "/leave" },
  { icon: DollarSign, label: "Salary", path: "/salary" },
  { icon: Users, label: "Staff", path: "/staff", adminOnly: true },
  { icon: Settings, label: "Settings", path: "/settings" },
]

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const user = store.getCurrentUser()

  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 glass-strong border-r border-glass-border">
        <div className="p-4">
          <div className="flex items-center justify-center p-4 rounded-2xl bg-white border-2 border-border shadow-md mb-4 min-h-[120px]">
            <img
              src="/logo.png"
              alt="Company Logo"
              className="h-32 w-auto object-contain max-w-full"
              style={{ display: "block" }}
            />
          </div>
          {user && (
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1 capitalize">
                {user.role}
              </p>
            </div>
          )}
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== "admin") {
              return null
            }
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <motion.button
                key={item.path}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </motion.button>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-6">{children}</main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-strong border-t border-glass-border z-50 backdrop-blur-lg">
        <div className="flex items-end justify-around px-1 pb-3 pt-3">
          {navItems
            .filter((item) => !item.adminOnly || user?.role === "admin")
            .map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <motion.button
                  key={item.path}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl min-w-[50px] max-w-[70px] transition-all ${
                    isActive ? "bg-primary/20" : ""
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mb-1.5 transition-all ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium transition-all leading-tight ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.button>
              )
            })}
        </div>
      </nav>
    </div>
  )
}
