import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { store } from "./lib/store";
import { useWebSocket } from "./hooks/useWebSocket";
import FullScreenLoader from "./components/FullScreenLoader";
import { initializeFirebaseClient, requestNotificationPermission, getFCMToken, onForegroundMessage } from "./lib/firebase";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Notes = lazy(() => import("./pages/Notes"));
const Leave = lazy(() => import("./pages/Leave"));
const EmployeeFinance = lazy(() => import("./pages/EmployeeFinance"));
const Settings = lazy(() => import("./pages/Settings"));
const Staff = lazy(() => import("./pages/Staff"));
const Chat = lazy(() => import("./pages/Chat"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Initialize data loading and WebSocket on app startup
const AppInitializer = () => {
  const user = store.getCurrentUser();
  
  // Set up WebSocket for real-time updates - auto-refresh on all CRUD operations
  useWebSocket(user?.id || null, (dataType, data) => {
    console.log(`📡 Real-time update: ${dataType}`, data);
    
    // Handle chat messages separately
    if (dataType === 'chat-message') {
      // Chat messages are handled by the Chat component directly via WebSocket
      // But we can refresh unread count
      if (user) {
        store.getUnreadChatCount(user.id).catch(console.error);
      }
      return;
    }
    
    // Auto-refresh data for all other update types - WebSocket handles all CRUD operations
    store.refreshData().catch((error) => {
      console.error('Failed to refresh data after WebSocket update:', error);
    });
    
    // Handle specific update types that need additional refresh
    if (user) {
      if (dataType === 'notification') {
        store.loadNotifications(user.id).catch((error) => {
          // Silently fail - notifications feature may not be fully implemented
          console.debug('Notifications not available:', error instanceof Error ? error.message : String(error));
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
    
    // Initialize Firebase and automatically enable push notifications
    const initFirebase = async () => {
      try {
        const app = initializeFirebaseClient();
        if (!app) {
          if (import.meta.env.DEV) {
            console.log('ℹ️  Firebase not initialized - push notifications disabled');
          }
          return;
        }

        // Check if permission is already granted
        if ('Notification' in window && Notification.permission === 'granted') {
          // Permission already granted, get and save token
          const token = await getFCMToken();
          if (token && user?.id) {
            await saveFCMToken(user.id, token);
          }
        } else if ('Notification' in window && Notification.permission === 'default') {
          // Permission not yet requested, request it automatically
          const hasPermission = await requestNotificationPermission();
          if (hasPermission) {
            const token = await getFCMToken();
            if (token && user?.id) {
              await saveFCMToken(user.id, token);
            }
          }
        }
        // If permission is 'denied', don't request again (user has explicitly blocked it)
        
        // Set up foreground message listener
        onForegroundMessage((payload) => {
          console.log('📬 Foreground message received:', payload);
          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(payload.notification?.title || 'New Notification', {
              body: payload.notification?.body || '',
              icon: '/logo.png',
              badge: '/logo.png',
            });
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          }
          // Refresh data to show new notifications/messages
          store.refreshData().catch(console.error);
        });
      } catch (error) {
        console.warn('⚠️  Firebase initialization error:', error);
      }
    };

    // Helper function to save FCM token
    const saveFCMToken = async (userId: string, token: string) => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || '';
        const url = apiBase ? `${apiBase}/api/fcm/token` : '/api/fcm/token';
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, token }),
        });
        
        if (response.ok) {
          console.log('✅ FCM token saved successfully');
        } else {
          const errorText = await response.text();
          console.warn('⚠️  Failed to save FCM token:', response.status, errorText);
        }
      } catch (error) {
        console.warn('⚠️  Failed to save FCM token:', error);
        // Don't show as error - this is non-critical
      }
    };
    
    if (user) {
      initFirebase();
    }
    
    // Load all data from MongoDB on app startup
    store.refreshData().catch((error) => {
      console.error('Failed to load data from MongoDB:', error);
      // In local dev, show helpful message
      if (error.message?.includes('Failed to fetch')) {
        console.warn('⚠️ Backend server not available. Please run "npm run dev:server" or "npm run dev:all"');
      }
    });
  }, [user]);
  
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
            <Route path="/chat" element={<Chat />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
