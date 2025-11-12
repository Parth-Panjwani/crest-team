import { ReactNode, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Home,
  Clock,
  FileText,
  Calendar,
  DollarSign,
  Settings,
  Users,
  MessageSquare,
  MoreVertical,
} from "lucide-react"
import { motion } from "framer-motion"
import { store } from "@/lib/store"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

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
  { icon: MessageSquare, label: "Chat", path: "/chat" },
  { icon: Settings, label: "Settings", path: "/settings" },
  // Secondary items (shown in "More" menu)
  { icon: FileText, label: "Notes", path: "/notes" },
  { icon: Calendar, label: "Leave", path: "/leave" },
  { icon: DollarSign, label: "Salary", path: "/salary" },
  { icon: Users, label: "Staff", path: "/staff", adminOnly: true },
]

// Primary items shown in bottom nav (first 4)
const primaryNavItems = navItems.slice(0, 4)
// Secondary items shown in "More" menu
const secondaryNavItems = navItems.slice(4)

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const user = store.getCurrentUser()
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 glass-strong border-r border-glass-border fixed left-0 top-0 h-screen overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-center p-2 rounded-2xl bg-white border-2 border-border shadow-md mb-4 h-[150px]">
            <img
              src="/logo.png"
              alt="Company Logo"
              className="object-contain w-full h-full"
              style={{
                display: "block",
              }}
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
      <main className="flex-1 pb-20 md:pb-6 md:ml-64">{children}</main>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 glass-strong border-t border-glass-border z-50 backdrop-blur-lg"
        style={{
          paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))",
        }}
      >
        <div className="flex items-end justify-around px-2 pb-3 pt-3">
          {/* Primary navigation items */}
          {primaryNavItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <motion.button
                key={item.path}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl min-w-[60px] max-w-[80px] flex-1 transition-all ${
                  isActive ? "bg-primary/20" : ""
                }`}
              >
                <Icon
                  className={`w-5 h-5 mb-1 transition-all ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-all leading-tight text-center ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </motion.button>
            )
          })}

          {/* More menu button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl min-w-[60px] max-w-[80px] flex-1 transition-all ${
              secondaryNavItems.some(
                (item) =>
                  location.pathname === item.path &&
                  (!item.adminOnly || user?.role === "admin")
              )
                ? "bg-primary/20"
                : ""
            }`}
          >
            <MoreVertical
              className={`w-5 h-5 mb-1 transition-all ${
                secondaryNavItems.some(
                  (item) =>
                    location.pathname === item.path &&
                    (!item.adminOnly || user?.role === "admin")
                )
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            />
            <span
              className={`text-[10px] font-medium transition-all leading-tight ${
                secondaryNavItems.some(
                  (item) =>
                    location.pathname === item.path &&
                    (!item.adminOnly || user?.role === "admin")
                )
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              More
            </span>
          </motion.button>
        </div>
      </nav>

      {/* More Menu Sheet */}
      <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
        <SheetContent
          side="bottom"
          className="glass-strong rounded-t-3xl"
          style={{
            paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))",
          }}
        >
          <SheetHeader>
            <SheetTitle className="text-left">More Options</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            {secondaryNavItems
              .filter((item) => !item.adminOnly || user?.role === "admin")
              .map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path

                return (
                  <motion.button
                    key={item.path}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      navigate(item.path)
                      setMoreMenuOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </motion.button>
                )
              })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
