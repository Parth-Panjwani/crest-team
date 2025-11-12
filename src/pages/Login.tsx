import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Delete, LogIn } from "lucide-react"
import { store } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

export default function Login() {
  const [pin, setPin] = useState("")
  const [remember, setRemember] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleDigit = useCallback((digit: string) => {
    setPin((prev) => {
      if (prev.length < 4) {
        return prev + digit
      }
      return prev
    })
  }, [])

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1))
  }, [])

  const handleLogin = useCallback(async () => {
    try {
      const user = await store.login(pin)
      if (user) {
        toast({
          title: "Welcome back!",
          description: `Logged in as ${user.name}`,
        })
        navigate("/dashboard")
      } else {
        toast({
          title: "Invalid PIN",
          description: "Please check your PIN and try again",
          variant: "destructive",
        })
        setPin("")
      }
    } catch (error: unknown) {
      console.error("Login error:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Cannot connect to database. Please check your connection."
      toast({
        title: "Connection Error",
        description: errorMessage,
        variant: "destructive",
      })
      setPin("")
    }
  }, [pin, navigate, toast])

  // Handle keyboard input for desktop
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key)
      } else if (e.key === "Backspace" || e.key === "Delete") {
        handleDelete()
      } else if (e.key === "Enter" && pin.length === 4) {
        handleLogin()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [pin, handleDigit, handleDelete, handleLogin])

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/30 to-secondary/50 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md my-auto"
      >
        <div className="glass-strong rounded-3xl p-6 md:p-8 shadow-card">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center justify-center p-6 rounded-2xl bg-white border-2 border-border shadow-md w-full max-w-[240px] height-[120px] mx-auto">
                  <img
                    src="/logo.png"
                    alt="Company Logo"
                    className="h-44 w-full object-cover"
                    style={{ display: "block" }}
                    onError={(e) => {
                      console.error("Logo failed to load")
                      ;(e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                </div>
              </div>
            </motion.div>
            <h1 className="text-3xl font-bold mb-2">Shree Panjwani Traders</h1>
            <p className="text-muted-foreground">Enter your PIN to continue</p>
          </div>

          {/* PIN Display */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: pin.length === i ? [1, 1.2, 1] : 1,
                  }}
                  className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${
                    i < pin.length
                      ? "border-primary bg-primary/20"
                      : "border-glass-border bg-secondary/30"
                  }`}
                >
                  {i < pin.length && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3 h-3 rounded-full bg-primary"
                    />
                  )}
                </motion.div>
              ))}
            </div>

            {/* Remember Device */}
            <label className="flex items-center justify-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-glass-border"
              />
              <span className="text-sm text-muted-foreground">
                Remember this device
              </span>
            </label>
          </motion.div>

          {/* Keypad */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-3 gap-3 mb-6"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <motion.button
                key={digit}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleDigit(digit.toString())}
                className="h-16 rounded-xl glass-card hover:bg-secondary/70 text-xl font-semibold transition-all"
              >
                {digit}
              </motion.button>
            ))}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDelete}
              className="h-16 rounded-xl glass-card hover:bg-destructive/20 flex items-center justify-center transition-all"
            >
              <Delete className="w-6 h-6" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDigit("0")}
              className="h-16 rounded-xl glass-card hover:bg-secondary/70 text-xl font-semibold transition-all"
            >
              0
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogin}
              disabled={pin.length < 4}
              className="h-16 rounded-xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              <LogIn className="w-6 h-6" />
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
