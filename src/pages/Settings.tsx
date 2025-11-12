import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { LogOut, Trash2, RefreshCw, Info, Bell, BellOff } from "lucide-react"
import { Layout } from "@/components/Layout"
import { store } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { 
  initializeFirebaseClient, 
  requestNotificationPermission, 
  getFCMToken 
} from "@/lib/firebase"
import { useState, useEffect, useCallback } from "react"

export default function Settings() {
  const user = store.getCurrentUser()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isAdmin = user?.role === "admin"
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null)
  const [isEnabling, setIsEnabling] = useState(false)
  const [hasFCMToken, setHasFCMToken] = useState(false)

  // Check FCM token status function
  const checkFCMTokenStatus = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false
    
    try {
      const apiBase = import.meta.env.VITE_API_URL || ''
      const url = apiBase ? `${apiBase}/api/users/${user.id}` : `/api/users/${user.id}`
      const response = await fetch(url)
      if (response.ok) {
        const userData = await response.json()
        const hasToken = !!userData.fcmToken
        setHasFCMToken(hasToken)
        return hasToken
      }
    } catch (error) {
      // Silently fail - not critical
      console.warn('Failed to check FCM token status:', error)
    }
    return false
  }, [user?.id])

  // Initialize notification status
  useEffect(() => {
    // Check current notification permission status
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
    
    // Check if FCM token is saved
    if (user?.id) {
      checkFCMTokenStatus().then((hasToken) => {
        // Auto-enable notifications if permission is granted but token is missing
        if ('Notification' in window && Notification.permission === 'granted' && !hasToken) {
          // Permission granted but no token, try to get one automatically
          const autoEnable = async () => {
            try {
              const app = initializeFirebaseClient()
              if (app) {
                const token = await getFCMToken()
                if (token) {
                  const apiBase = import.meta.env.VITE_API_URL || ''
                  const url = apiBase ? `${apiBase}/api/fcm/token` : '/api/fcm/token'
                  const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, token }),
                  })
                  if (response.ok) {
                    setHasFCMToken(true)
                  }
                }
              }
            } catch (error) {
              // Silently fail - will retry on next page load
            }
          }
          autoEnable()
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleEnableNotifications = async () => {
    setIsEnabling(true)
    try {
      console.log('🔔 Starting notification enable process...')
      
      // Initialize Firebase
      console.log('1️⃣ Initializing Firebase...')
      const app = initializeFirebaseClient()
      if (!app) {
        console.error('❌ Firebase initialization failed')
        toast({
          title: "Error",
          description: "Firebase is not configured. Please contact administrator.",
          variant: "destructive",
        })
        setIsEnabling(false)
        return
      }
      console.log('✅ Firebase initialized')

      // Request permission
      console.log('2️⃣ Requesting notification permission...')
      const hasPermission = await requestNotificationPermission()
      if (!hasPermission) {
        console.warn('⚠️ Permission denied or not granted')
        const currentPermission = Notification.permission
        setNotificationPermission(currentPermission)
        
        if (currentPermission === 'denied') {
          toast({
            title: "Permission Blocked",
            description: "Notifications are blocked. Please enable them in your browser settings and refresh the page.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Permission Denied",
            description: "Please allow notifications in your browser settings to enable push notifications.",
            variant: "destructive",
          })
        }
        setIsEnabling(false)
        return
      }
      console.log('✅ Permission granted')

      // Get FCM token
      console.log('3️⃣ Getting FCM token...')
      let token: string | null = null
      try {
        // Add timeout to prevent hanging, but cancel it if token succeeds
        let timeoutId: NodeJS.Timeout | null = null
        const tokenPromise = getFCMToken().then((result) => {
          // Cancel timeout if token succeeds
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
          return result
        })
        
        const timeoutPromise = new Promise<null>((resolve) => {
          timeoutId = setTimeout(() => {
            console.warn('⏱️ FCM token request timed out after 10 seconds')
            resolve(null)
          }, 10000)
        })
        
        token = await Promise.race([tokenPromise, timeoutPromise])
        
        // Clean up timeout if still running
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      } catch (error) {
        console.error('❌ Error getting FCM token:', error)
        token = null
      }
      
      if (!token) {
        console.error('❌ Failed to get FCM token')
        toast({
          title: "Error",
          description: "Failed to generate notification token. This may be due to service worker issues or VAPID key problems. Check console for details.",
          variant: "destructive",
        })
        setIsEnabling(false)
        return
      }
      console.log('✅ FCM token obtained:', token.substring(0, 20) + '...')

      // Save token to backend
      if (user?.id) {
        console.log('4️⃣ Saving FCM token to backend...')
        const apiBase = import.meta.env.VITE_API_URL || ''
        const url = apiBase ? `${apiBase}/api/fcm/token` : '/api/fcm/token'
        console.log('📡 API URL:', url)
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, token }),
        })

        if (response.ok) {
          console.log('✅ FCM token saved successfully')
          const result = await response.json()
          console.log('📦 Response:', result)
          
          toast({
            title: "✅ Push Notifications Enabled",
            description: "You will now receive push notifications for important updates.",
          })
          setNotificationPermission('granted')
          setHasFCMToken(true)
          // Refresh token status
          await checkFCMTokenStatus()
        } else {
          const errorText = await response.text()
          console.error('❌ Failed to save token:', response.status, errorText)
          toast({
            title: "Error",
            description: `Failed to save notification token (${response.status}). Please try again.`,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('❌ Error enabling notifications:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to enable notifications. Check console for details.",
        variant: "destructive",
      })
    } finally {
      setIsEnabling(false)
      console.log('🏁 Enable process completed')
    }
  }

  const handleDisableNotifications = async () => {
    if (!user?.id) return

    try {
      const apiBase = import.meta.env.VITE_API_URL || ''
      const url = apiBase ? `${apiBase}/api/fcm/token` : '/api/fcm/token'
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      if (response.ok) {
        toast({
          title: "Push Notifications Disabled",
          description: "You will no longer receive push notifications.",
        })
        setHasFCMToken(false)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disable notifications",
        variant: "destructive",
      })
    }
  }

  const handleLogout = () => {
    store.logout()
    toast({ title: "Logged Out", description: "See you soon!" })
    navigate("/login")
  }

  const handleClearData = () => {
    store.clearAllData()
    toast({
      title: "Data Cleared",
      description: "All local data has been reset",
      variant: "destructive",
    })
    navigate("/login")
  }

  return (
    <Layout>
      <div className="min-h-screen p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and preferences
          </p>
        </motion.div>

        <div className="space-y-4">
          {/* Account Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Account Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-lg font-medium">{user?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold gradient-primary text-primary-foreground">
                  {user?.role === "admin" ? "Administrator" : "Employee"}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Push Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Push Notifications</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/10 border border-glass-border">
                <div className="flex items-center gap-3">
                  {notificationPermission === 'granted' && hasFCMToken ? (
                    <Bell className="w-5 h-5 text-primary" />
                  ) : (
                    <BellOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {notificationPermission === 'granted' && hasFCMToken
                        ? 'Notifications Enabled'
                        : notificationPermission === 'denied'
                        ? 'Notifications Blocked'
                        : 'Notifications Disabled'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {notificationPermission === 'granted' && hasFCMToken
                        ? 'You will receive push notifications for messages, notes, and updates'
                        : notificationPermission === 'denied'
                        ? 'Enable in browser settings to receive notifications'
                        : 'Enable to receive push notifications on your device'}
                    </p>
                  </div>
                </div>
              </div>

              {notificationPermission === 'granted' && hasFCMToken ? (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleDisableNotifications}
                >
                  <BellOff className="w-4 h-4 mr-2" />
                  Disable Notifications
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleEnableNotifications}
                  disabled={isEnabling || notificationPermission === 'denied'}
                >
                  {isEnabling ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Enabling...
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Enable Push Notifications
                    </>
                  )}
                </Button>
              )}

              {notificationPermission === 'denied' && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-destructive">
                    Notifications are blocked. To enable:
                  </p>
                  <ol className="text-xs text-destructive/80 mt-2 ml-4 list-decimal space-y-1">
                    <li>Click the lock/info icon in your browser's address bar</li>
                    <li>Find "Notifications" in the permissions list</li>
                    <li>Change it from "Block" to "Allow"</li>
                    <li>Refresh this page and click "Enable Push Notifications"</li>
                  </ol>
                </div>
              )}

              {/* Troubleshooting section */}
              {isEnabling && (
                <div className="p-3 rounded-xl bg-secondary/10 border border-glass-border">
                  <p className="text-xs text-muted-foreground">
                    If this takes more than 10 seconds, try:
                  </p>
                  <ol className="text-xs text-muted-foreground/80 mt-2 ml-4 list-decimal space-y-1">
                    <li>Check browser console for errors</li>
                    <li>Ensure you're on HTTPS or localhost</li>
                    <li>Try unregistering service workers in DevTools → Application → Service Workers</li>
                    <li>Refresh the page and try again</li>
                  </ol>
                </div>
              )}
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </Button>

              {/* Clear All Data - Admin Only */}
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear All Data?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will delete all attendance records, notes, leave
                        requests, salaries, and reset the app to initial state.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearData}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Clear Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </motion.div>

          {/* App Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold mb-4">App Information</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Version</span>
                <span className="font-mono">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Mode</span>
                <span className="font-mono">PWA</span>
              </div>
              <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
                <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-primary">
                  This is a Progressive Web App. Install it on your device for
                  the best experience!
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  )
}
