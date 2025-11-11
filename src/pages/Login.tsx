import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Delete, LogIn } from 'lucide-react';
import { store } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function Login() {
  const [pin, setPin] = useState('');
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin(pin + digit);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleLogin = () => {
    const user = store.login(pin);
    if (user) {
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${user.name}`,
      });
      navigate('/dashboard');
    } else {
      toast({
        title: 'Invalid PIN',
        description: 'Please try again',
        variant: 'destructive',
      });
      setPin('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="glass-strong rounded-3xl p-8 shadow-card">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-4"
            >
              <div className="w-20 h-20 mx-auto rounded-2xl gradient-primary flex items-center justify-center glow-primary">
                <LogIn className="w-10 h-10 text-primary-foreground" />
              </div>
            </motion.div>
            <h1 className="text-3xl font-bold mb-2">Employee Hub</h1>
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
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: pin.length === i ? [1, 1.2, 1] : 1,
                  }}
                  className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${
                    i < pin.length
                      ? 'border-primary bg-primary/20 glow-primary'
                      : 'border-glass-border bg-secondary/30'
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
              <span className="text-sm text-muted-foreground">Remember this device</span>
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
              onClick={() => handleDigit('0')}
              className="h-16 rounded-xl glass-card hover:bg-secondary/70 text-xl font-semibold transition-all"
            >
              0
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogin}
              disabled={pin.length < 4}
              className="h-16 rounded-xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed glow-primary transition-all"
            >
              <LogIn className="w-6 h-6" />
            </motion.button>
          </motion.div>

          {/* Demo Hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs text-muted-foreground"
          >
            Demo PINs: Admin (1234), Employee (5678 or 9012)
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
