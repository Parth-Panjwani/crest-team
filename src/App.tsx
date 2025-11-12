import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { store } from "./lib/store";
import { useWebSocket } from "./hooks/useWebSocket";
import FullScreenLoader from "./components/FullScreenLoader";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Notes = lazy(() => import("./pages/Notes"));
const Leave = lazy(() => import("./pages/Leave"));
const EmployeeFinance = lazy(() => import("./pages/EmployeeFinance"));
const Settings = lazy(() => import("./pages/Settings"));
const Staff = lazy(() => import("./pages/Staff"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Initialize data loading and WebSocket on app startup
const AppInitializer = () => {
  const user = store.getCurrentUser();
  
  // Set up WebSocket for real-time updates - auto-refresh on all CRUD operations
  useWebSocket(user?.id || null, (dataType, data) => {
    console.log(`📡 Real-time update: ${dataType}`, data);
    // Auto-refresh data for all update types - WebSocket handles all CRUD operations
    store.refreshData().catch((error) => {
      console.error('Failed to refresh data after WebSocket update:', error);
    });
    
    // Handle specific update types that need additional refresh
    if (user) {
      if (dataType === 'notification') {
        store.loadNotifications(user.id).catch((error) => {
          console.error('Failed to reload notifications:', error);
        });
      } else if (dataType === 'lateApproval' || dataType === 'latePermission') {
        // Refresh attendance data when approvals/permissions change
        store.refreshData().catch((error) => {
          console.error('Failed to refresh data after approval update:', error);
        });
      } else if (dataType === 'attendance') {
        // Attendance updates are already handled by refreshData, but ensure it's called
        store.refreshData().catch((error) => {
          console.error('Failed to refresh data after attendance update:', error);
        });
      }
    }
  });

  useEffect(() => {
    // Clear old localStorage data first
    const oldData = localStorage.getItem('emp-management-data');
    if (oldData) {
      console.log('Clearing old localStorage data...');
      localStorage.removeItem('emp-management-data');
    }
    
    // Load all data from MongoDB on app startup
    store.refreshData().catch((error) => {
      console.error('Failed to load data from MongoDB:', error);
      // In local dev, show helpful message
      if (error.message?.includes('Failed to fetch')) {
        console.warn('⚠️ Backend server not available. Please run "npm run dev:server" or "npm run dev:all"');
      }
    });
  }, []);
  
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppInitializer />
      <BrowserRouter>
        <Suspense fallback={<FullScreenLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/order-pad" element={<Notes />} />
            <Route path="/leave" element={<Leave />} />
            <Route path="/salary" element={<EmployeeFinance />} />
            <Route path="/employee-finance" element={<EmployeeFinance />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
