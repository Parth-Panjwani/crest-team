import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { useAutoRefresh } from "@/hooks/useAutoRefresh"
import { useStore } from "@/hooks/useStore"
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  HandCoins,
  ShoppingBag,
  X,
  Check,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  User,
} from "lucide-react"
import { Layout } from "@/components/Layout"
import { store, User as UserType, PendingAdvance, PendingStorePurchase, Salary as SalaryType } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { RefreshButton } from '@/components/RefreshButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function EmployeeFinance() {
  // Subscribe to store updates to force re-renders when data changes
  useStore();
  
  const user = store.getCurrentUser()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isAdmin = user?.role === "admin"
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  
  const [employees, setEmployees] = useState<UserType[]>([])
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false)
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false)
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<UserType | null>(null)
  const [selectedSalary, setSelectedSalary] = useState<SalaryType | null>(null)
  
  const [advanceForm, setAdvanceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: "",
  })
  
  const [purchaseForm, setPurchaseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: "",
  })
  
  const [salaryForm, setSalaryForm] = useState({
    type: "fixed" as "fixed" | "hourly",
    base: 0,
    hours: 0,
    adjustments: 0,
    paid: false,
    note: "",
  })

  const loadData = useCallback(() => {
    if (isAdmin) {
      const allEmployees = store.getAllUsers().filter(u => u.role === "employee")
      setEmployees(allEmployees)
    } else {
      if (user) {
        setEmployees([user])
      }
    }
  }, [isAdmin, user])

  useEffect(() => {
    if (!user) {
      navigate("/login")
      return
    }
    loadData()
  }, [user, navigate, selectedMonth, loadData])

  // Auto-refresh every 2 seconds
  useAutoRefresh(loadData, 2000)

  const getEmployeeData = (emp: UserType) => {
    const pendingAdvances = store.getPendingAdvances(emp.id)
    const pendingPurchases = store.getPendingStorePurchases(emp.id)
    const salary = store.getSalary(emp.id, selectedMonth)
    
    // Calculate totals - include both pending and already deducted items
    const pendingAdvanceTotal = pendingAdvances.reduce((sum, a) => sum + a.amount, 0)
    const pendingPurchaseTotal = pendingPurchases.reduce((sum, p) => sum + p.amount, 0)
    const totalPendingDeductions = pendingAdvanceTotal + pendingPurchaseTotal
    
    // If salary exists, use its deductions; otherwise use pending
    const salaryDeductions = salary 
      ? (salary.advances?.reduce((sum, a) => sum + a.amount, 0) || 0) +
        (salary.storePurchases?.reduce((sum, p) => sum + p.amount, 0) || 0)
      : 0
    
    const totalDeductions = salary ? salaryDeductions : totalPendingDeductions
    
    const baseSalary = emp.baseSalary || 0
    const calculatedPay = salary 
      ? (salary.type === "hourly" ? salary.base * salary.hours : salary.base)
      : baseSalary
    const finalPay = calculatedPay + (salary?.adjustments || 0) - totalDeductions
    
    return {
      pendingAdvances,
      pendingPurchases,
      salary,
      totalPendingDeductions,
      calculatedPay,
      totalDeductions,
      finalPay,
      baseSalary,
      pendingAdvanceTotal,
      pendingPurchaseTotal,
    }
  }

  const handleAddAdvance = (emp: UserType) => {
    if (advanceForm.amount <= 0 || !advanceForm.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    store.addPendingAdvance(
      emp.id,
      advanceForm.date,
      advanceForm.amount,
      advanceForm.description
    )
    
    toast({
      title: "Advance Recorded",
      description: `₹${advanceForm.amount.toLocaleString()} advance recorded for ${emp.name}`,
    })
    
    setAdvanceForm({
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      description: "",
    })
    setIsAdvanceDialogOpen(false)
    setSelectedEmployee(null)
    loadData()
  }

  const handleAddPurchase = (emp: UserType) => {
    if (purchaseForm.amount <= 0 || !purchaseForm.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    store.addPendingStorePurchase(
      emp.id,
      purchaseForm.date,
      purchaseForm.amount,
      purchaseForm.description
    )
    
    toast({
      title: "Purchase Recorded",
      description: `₹${purchaseForm.amount.toLocaleString()} purchase recorded for ${emp.name}`,
    })
    
    setPurchaseForm({
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      description: "",
    })
    setIsPurchaseDialogOpen(false)
    setSelectedEmployee(null)
    loadData()
  }

  const handleDeleteAdvance = (advanceId: string) => {
    store.deletePendingAdvance(advanceId)
    toast({
      title: "Advance Deleted",
      description: "Advance record has been removed",
      variant: "destructive",
    })
    loadData()
  }

  const handleDeletePurchase = (purchaseId: string) => {
    store.deletePendingStorePurchase(purchaseId)
    toast({
      title: "Purchase Deleted",
      description: "Purchase record has been removed",
      variant: "destructive",
    })
    loadData()
  }

  const handleEditSalary = (emp: UserType) => {
    const salary = store.getSalary(emp.id, selectedMonth)
    if (salary) {
      setSelectedSalary(salary)
      setSalaryForm({
        type: salary.type,
        base: salary.base,
        hours: salary.hours,
        adjustments: salary.adjustments,
        paid: salary.paid,
        note: salary.note || "",
      })
    } else {
      setSelectedSalary(null)
      setSalaryForm({
        type: "fixed",
        base: emp.baseSalary || 0,
        hours: 0,
        adjustments: 0,
        paid: false,
        note: "",
      })
    }
    setSelectedEmployee(emp)
    setIsSalaryDialogOpen(true)
  }

  const handleCreateOrUpdateSalary = (emp: UserType) => {
    const existingSalary = store.getSalary(emp.id, selectedMonth)
    const pendingAdvances = store.getPendingAdvances(emp.id)
    const pendingPurchases = store.getPendingStorePurchases(emp.id)
    
    // If editing, merge existing deducted items with new pending items
    const advances = existingSalary?.advances ? [...existingSalary.advances] : []
    const storePurchases = existingSalary?.storePurchases ? [...existingSalary.storePurchases] : []
    
    // Add any new pending items that aren't already in the salary
    const existingAdvanceIds = advances.map(a => a.id)
    const existingPurchaseIds = storePurchases.map(p => p.id)
    
    pendingAdvances.forEach(advance => {
      if (!existingAdvanceIds.includes(advance.id)) {
        advances.push({
          id: advance.id,
          date: advance.date,
          amount: advance.amount,
          description: advance.description,
        })
      }
    })
    
    pendingPurchases.forEach(purchase => {
      if (!existingPurchaseIds.includes(purchase.id)) {
        storePurchases.push({
          id: purchase.id,
          date: purchase.date,
          amount: purchase.amount,
          description: purchase.description,
        })
      }
    })
    
    const totalDeductions = advances.reduce((sum, a) => sum + a.amount, 0) +
                           storePurchases.reduce((sum, p) => sum + p.amount, 0)
    
    const calcPay = salaryForm.type === "hourly" 
      ? salaryForm.base * salaryForm.hours 
      : salaryForm.base
    const finalPay = calcPay + salaryForm.adjustments - totalDeductions
    
    const salary: SalaryType = {
      id: existingSalary?.id || Date.now().toString(),
      userId: emp.id,
      month: selectedMonth,
      type: salaryForm.type,
      base: salaryForm.base,
      hours: salaryForm.type === "hourly" ? salaryForm.hours : 0,
      calcPay,
      adjustments: salaryForm.adjustments,
      advances,
      storePurchases,
      totalDeductions,
      finalPay,
      paid: salaryForm.paid,
      paidDate: salaryForm.paid && !existingSalary?.paidDate ? new Date().toISOString() : existingSalary?.paidDate,
      note: salaryForm.note || undefined,
    }

    store.updateSalary(salary)
    
    // Mark newly added pending items as deducted
    const newAdvanceIds = advances.map(a => a.id)
    const newPurchaseIds = storePurchases.map(p => p.id)
    
    pendingAdvances.forEach(advance => {
      if (newAdvanceIds.includes(advance.id)) {
        const pendingAdvance = store.getPendingAdvances(emp.id).find(a => a.id === advance.id)
        if (pendingAdvance && !pendingAdvance.deducted) {
          store.markAdvanceAsDeducted(advance.id, salary.id)
        }
      }
    })
    
    pendingPurchases.forEach(purchase => {
      if (newPurchaseIds.includes(purchase.id)) {
        const pendingPurchase = store.getPendingStorePurchases(emp.id).find(p => p.id === purchase.id)
        if (pendingPurchase && !pendingPurchase.deducted) {
          store.markStorePurchaseAsDeducted(purchase.id, salary.id)
        }
      }
    })
    
    toast({
      title: existingSalary ? "Salary Updated" : "Salary Created",
      description: `Salary record ${existingSalary ? 'updated' : 'created'} successfully. Deductions applied.`,
    })
    
    setIsSalaryDialogOpen(false)
    setSelectedEmployee(null)
    setSelectedSalary(null)
    setSalaryForm({
      type: "fixed",
      base: 0,
      hours: 0,
      adjustments: 0,
      paid: false,
      note: "",
    })
    loadData()
  }

  if (!user) {
    return null
  }

  return (
    <Layout>
      <div className="min-h-screen p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Employee Finance</h1>
            </div>
            <RefreshButton onRefresh={loadData} />
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <p className="text-muted-foreground">
                Track salary, advances, and purchases for each employee
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 rounded-xl border border-glass-border bg-card text-foreground text-sm md:text-base"
              />
            </div>
          </div>
        </motion.div>

        {/* Employee Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp, index) => {
            const data = getEmployeeData(emp)
            return (
              <motion.div
                key={emp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card rounded-2xl p-6 hover:shadow-card transition-all"
                whileHover={{ scale: 1.01, y: -2 }}
              >
                {/* Employee Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{emp.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Base Salary */}
                <div className="mb-4 p-3 bg-secondary/30 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Base Salary</span>
                    <span className="font-semibold">₹{data.baseSalary.toLocaleString()}</span>
                  </div>
                  {data.salary && data.salary.type === "hourly" && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Hours: {data.salary.hours}h</span>
                      <span>Rate: ₹{data.salary.base}/h</span>
                    </div>
                  )}
                </div>

                {/* Pending Advances */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <HandCoins className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Advances</span>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEmployee(emp)
                          setIsAdvanceDialogOpen(true)
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {data.pendingAdvances.length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-6">No advances</p>
                    ) : (
                      data.pendingAdvances.slice(0, 2).map((advance) => (
                        <div key={advance.id} className="flex items-center justify-between p-2 bg-card/50 rounded-lg text-xs">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{advance.description}</p>
                            <p className="text-muted-foreground">{new Date(advance.date).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-destructive">₹{advance.amount.toLocaleString()}</span>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAdvance(advance.id)}
                                className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {data.pendingAdvances.length > 2 && (
                      <p className="text-xs text-muted-foreground pl-6">
                        +{data.pendingAdvances.length - 2} more
                      </p>
                    )}
                  </div>
                  {data.pendingAdvances.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-glass-border">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Total Advances:</span>
                        <span className="font-semibold text-destructive">
                          ₹{data.pendingAdvances.reduce((sum, a) => sum + a.amount, 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pending Purchases */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-accent" />
                      <span className="text-sm font-medium">Store Purchases</span>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEmployee(emp)
                          setIsPurchaseDialogOpen(true)
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {data.pendingPurchases.length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-6">No purchases</p>
                    ) : (
                      data.pendingPurchases.slice(0, 2).map((purchase) => (
                        <div key={purchase.id} className="flex items-center justify-between p-2 bg-card/50 rounded-lg text-xs">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{purchase.description}</p>
                            <p className="text-muted-foreground">{new Date(purchase.date).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-destructive">₹{purchase.amount.toLocaleString()}</span>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePurchase(purchase.id)}
                                className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {data.pendingPurchases.length > 2 && (
                      <p className="text-xs text-muted-foreground pl-6">
                        +{data.pendingPurchases.length - 2} more
                      </p>
                    )}
                  </div>
                  {data.pendingPurchases.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-glass-border">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Total Purchases:</span>
                        <span className="font-semibold text-destructive">
                          ₹{data.pendingPurchases.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Salary Summary */}
                <div className="mt-4 p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Final Pay</span>
                    <span className="text-2xl font-bold text-primary">
                      ₹{data.finalPay.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="space-y-1.5 text-xs mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Calculated:</span>
                      <span className="font-medium">₹{data.calculatedPay.toLocaleString()}</span>
                    </div>
                    {data.salary && data.salary.adjustments !== 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Adjustments:</span>
                        <span className={`font-medium ${data.salary.adjustments > 0 ? 'text-success' : 'text-destructive'}`}>
                          {data.salary.adjustments > 0 ? '+' : ''}₹{data.salary.adjustments.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Deductions:</span>
                      <span className="font-medium text-destructive">
                        -₹{data.totalDeductions.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {data.salary && (
                    <div className="flex items-center justify-between pt-3 border-t border-primary/20">
                      <div className="flex items-center gap-2">
                        {data.salary.paid ? (
                          <>
                            <Check className="w-4 h-4 text-success" />
                            <span className="text-xs font-medium text-success">Paid</span>
                            {data.salary.paidDate && (
                              <span className="text-xs text-muted-foreground">
                                on {new Date(data.salary.paidDate).toLocaleDateString()}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 text-warning" />
                            <span className="text-xs font-medium text-warning">Pending</span>
                          </>
                        )}
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSalary(emp)}
                          className="h-7 text-xs"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {!data.salary && isAdmin && (
                    <Button
                      onClick={() => handleEditSalary(emp)}
                      className="w-full mt-3 gradient-primary text-sm"
                      size="sm"
                    >
                      <Plus className="w-3 h-3 mr-2" />
                      Create Salary
                    </Button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Add Advance Dialog */}
        <Dialog open={isAdvanceDialogOpen} onOpenChange={setIsAdvanceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Advance for {selectedEmployee?.name}</DialogTitle>
              <DialogDescription>
                Record money borrowed. This will be deducted from salary.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={advanceForm.date}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={advanceForm.amount || ""}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  type="text"
                  value={advanceForm.description}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, description: e.target.value })}
                  placeholder="e.g., Emergency loan, Advance payment"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAdvanceDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => selectedEmployee && handleAddAdvance(selectedEmployee)} 
                className="gradient-primary"
              >
                Record Advance
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Purchase Dialog */}
        <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Store Purchase for {selectedEmployee?.name}</DialogTitle>
              <DialogDescription>
                Record items purchased from store. This will be deducted from salary.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={purchaseForm.date}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={purchaseForm.amount || ""}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  type="text"
                  value={purchaseForm.description}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, description: e.target.value })}
                  placeholder="e.g., Groceries, Stationery, etc."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPurchaseDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => selectedEmployee && handleAddPurchase(selectedEmployee)} 
                className="gradient-primary"
              >
                Record Purchase
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Salary Dialog */}
        <Dialog open={isSalaryDialogOpen} onOpenChange={setIsSalaryDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedSalary ? "Edit" : "Create"} Salary for {selectedEmployee?.name}
              </DialogTitle>
              <DialogDescription>
                {selectedSalary 
                  ? "Update salary information for this employee."
                  : "Create salary record. Pending advances and purchases will be automatically included."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Salary Type</Label>
                <Select
                  value={salaryForm.type}
                  onValueChange={(value: "fixed" | "hourly") =>
                    setSalaryForm({ ...salaryForm, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Pay (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salaryForm.base || ""}
                    onChange={(e) =>
                      setSalaryForm({
                        ...salaryForm,
                        base: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                {salaryForm.type === "hourly" && (
                  <div className="space-y-2">
                    <Label>Hours</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={salaryForm.hours || ""}
                      onChange={(e) =>
                        setSalaryForm({
                          ...salaryForm,
                          hours: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Adjustments (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={salaryForm.adjustments || ""}
                  onChange={(e) =>
                    setSalaryForm({
                      ...salaryForm,
                      adjustments: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Positive for bonus, negative for deduction"
                />
              </div>

              {(() => {
                const pendingAdvances = selectedEmployee ? store.getPendingAdvances(selectedEmployee.id) : []
                const pendingPurchases = selectedEmployee ? store.getPendingStorePurchases(selectedEmployee.id) : []
                
                // If editing, include already deducted items from salary
                const existingAdvances = selectedSalary?.advances || []
                const existingPurchases = selectedSalary?.storePurchases || []
                
                // Combine existing deducted items with new pending items
                const allAdvances = [...existingAdvances]
                const allPurchases = [...existingPurchases]
                const existingAdvanceIds = existingAdvances.map(a => a.id)
                const existingPurchaseIds = existingPurchases.map(p => p.id)
                
                pendingAdvances.forEach(advance => {
                  if (!existingAdvanceIds.includes(advance.id)) {
                    allAdvances.push({
                      id: advance.id,
                      date: advance.date,
                      amount: advance.amount,
                      description: advance.description,
                    })
                  }
                })
                
                pendingPurchases.forEach(purchase => {
                  if (!existingPurchaseIds.includes(purchase.id)) {
                    allPurchases.push({
                      id: purchase.id,
                      date: purchase.date,
                      amount: purchase.amount,
                      description: purchase.description,
                    })
                  }
                })
                
                const totalDeductions = allAdvances.reduce((sum, a) => sum + a.amount, 0) +
                                       allPurchases.reduce((sum, p) => sum + p.amount, 0)
                const calcPay = salaryForm.type === "hourly" ? salaryForm.base * salaryForm.hours : salaryForm.base
                const finalPay = calcPay + salaryForm.adjustments - totalDeductions
                
                return (
                  <div className="p-4 bg-secondary/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Calculated Pay:</span>
                      <span className="font-semibold">₹{calcPay.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Adjustments:</span>
                      <span className={`font-semibold ${salaryForm.adjustments > 0 ? 'text-success' : salaryForm.adjustments < 0 ? 'text-destructive' : ''}`}>
                        {salaryForm.adjustments > 0 ? '+' : ''}₹{salaryForm.adjustments.toLocaleString()}
                      </span>
                    </div>
                    {totalDeductions > 0 && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Deductions:</span>
                          <span className="font-semibold text-destructive">
                            -₹{totalDeductions.toLocaleString()}
                          </span>
                        </div>
                        <div className="pl-2 text-xs text-muted-foreground">
                          <p>• Advances: ₹{allAdvances.reduce((sum, a) => sum + a.amount, 0).toLocaleString()}</p>
                          <p>• Purchases: ₹{allPurchases.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</p>
                        </div>
                      </>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-glass-border">
                      <span className="text-sm font-semibold">Final Pay:</span>
                      <span className="text-xl font-bold text-primary">
                        ₹{finalPay.toLocaleString()}
                      </span>
                    </div>
                    {pendingAdvances.length > 0 || pendingPurchases.length > 0 ? (
                      <div className="mt-2 pt-2 border-t border-glass-border">
                        <p className="text-xs text-primary font-medium mb-1">
                          {pendingAdvances.length} pending advance{pendingAdvances.length !== 1 ? 's' : ''} and {pendingPurchases.length} pending purchase{pendingPurchases.length !== 1 ? 's' : ''} will be included
                        </p>
                      </div>
                    ) : selectedSalary && (selectedSalary.advances?.length > 0 || selectedSalary.storePurchases?.length > 0) ? (
                      <div className="mt-2 pt-2 border-t border-glass-border">
                        <p className="text-xs text-muted-foreground">
                          {selectedSalary.advances?.length || 0} advance{(selectedSalary.advances?.length || 0) !== 1 ? 's' : ''} and {selectedSalary.storePurchases?.length || 0} purchase{(selectedSalary.storePurchases?.length || 0) !== 1 ? 's' : ''} already deducted
                        </p>
                      </div>
                    ) : null}
                  </div>
                )
              })()}

              <div className="space-y-2">
                <Label>Note (Optional)</Label>
                <Input
                  type="text"
                  value={salaryForm.note}
                  onChange={(e) => setSalaryForm({ ...salaryForm, note: e.target.value })}
                  placeholder="Additional notes"
                />
              </div>

              <div
                className={`p-4 rounded-xl border-2 transition-all ${
                  salaryForm.paid
                    ? "bg-success/10 border-success/30"
                    : "bg-secondary/30 border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="paid"
                    checked={salaryForm.paid}
                    onChange={(e) =>
                      setSalaryForm({ ...salaryForm, paid: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-glass-border cursor-pointer"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="paid"
                      className="cursor-pointer font-semibold text-base"
                    >
                      Mark as Paid
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check when salary has been paid to the employee
                    </p>
                  </div>
                  {salaryForm.paid && (
                    <div className="flex items-center gap-1 text-success font-semibold">
                      <Check className="w-5 h-5" />
                      <span>Paid</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSalaryDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedEmployee && handleCreateOrUpdateSalary(selectedEmployee)}
                className="gradient-primary"
              >
                {selectedSalary ? "Update" : "Create"} Salary
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
}

