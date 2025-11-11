import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { store } from '@/lib/store';

export default function Salary() {
  const user = store.getCurrentUser();
  const isAdmin = user?.role === 'admin';
  const [selectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const users = store.getAllUsers().filter(u => u.role === 'employee');
  const currentSalary = isAdmin ? null : store.getSalary(user?.id || '', selectedMonth);

  return (
    <Layout>
      <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold mb-2">Salary</h1>
          <p className="text-muted-foreground">
            {new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </motion.div>

        {!isAdmin ? (
          // Employee View
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-strong rounded-3xl p-8 shadow-card"
          >
            {currentSalary ? (
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary glow-primary mb-4">
                    <DollarSign className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h2 className="text-sm text-muted-foreground mb-2">Total Pay</h2>
                  <p className="text-5xl font-bold gradient-primary bg-clip-text text-transparent">
                    ₹{currentSalary.finalPay.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center py-3 border-b border-glass-border">
                    <span className="text-muted-foreground">Base Pay</span>
                    <span className="font-semibold">₹{currentSalary.base.toLocaleString()}</span>
                  </div>
                  {currentSalary.type === 'hourly' && (
                    <div className="flex justify-between items-center py-3 border-b border-glass-border">
                      <span className="text-muted-foreground">Hours Worked</span>
                      <span className="font-semibold">{currentSalary.hours}h</span>
                    </div>
                  )}
                  {currentSalary.adjustments !== 0 && (
                    <div className="flex justify-between items-center py-3 border-b border-glass-border">
                      <span className="text-muted-foreground">Adjustments</span>
                      <span className={`font-semibold ${
                        currentSalary.adjustments > 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {currentSalary.adjustments > 0 ? '+' : ''}₹{currentSalary.adjustments.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {currentSalary.note && (
                    <div className="py-3">
                      <span className="text-sm text-muted-foreground block mb-1">Note</span>
                      <p className="text-foreground">{currentSalary.note}</p>
                    </div>
                  )}
                </div>

                <div className={`text-center py-4 rounded-2xl ${
                  currentSalary.paid
                    ? 'bg-success/20 text-success'
                    : 'bg-warning/20 text-warning'
                }`}>
                  <span className="font-semibold">
                    {currentSalary.paid ? '✓ Paid' : 'Pending Payment'}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No Salary Information</h3>
                <p className="text-muted-foreground">
                  Salary details for this month will be available soon
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          // Admin View (Simplified - UI only)
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-6 mb-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Payout</p>
                  <p className="text-2xl font-bold">₹0</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pending</p>
                  <p className="text-2xl font-bold text-warning">₹0</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Avg Hours</p>
                  <p className="text-2xl font-bold">0h</p>
                </div>
              </div>
            </div>

            {users.map((employee) => (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-6"
              >
                <h3 className="text-lg font-semibold mb-4">{employee.name}</h3>
                <div className="text-center py-8 text-muted-foreground">
                  Salary management UI - Configure in settings
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
