import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Check,
  X,
} from "lucide-react"
import { Layout } from "@/components/Layout"
import { store, Salary as SalaryType, User } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

export default function Salary() {
  const user = store.getCurrentUser()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isAdmin = user?.role === "admin"
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [salaries, setSalaries] = useState<SalaryType[]>([])
  const [employees, setEmployees] = useState<User[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedSalary, setSelectedSalary] = useState<SalaryType | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [formData, setFormData] = useState({
    type: "fixed" as "fixed" | "hourly",
    base: 0,
    hours: 0,
    adjustments: 0,
    note: "",
    paid: false,
  })

  useEffect(() => {
    if (!user) {
      navigate("/login")
      return
    }
    loadData()
  }, [user, navigate, selectedMonth])

  const loadData = () => {
    if (isAdmin) {
      const allEmployees = store
        .getAllUsers()
        .filter((u) => u.role === "employee")
      setEmployees(allEmployees)
      const monthSalaries = store.getSalariesForMonth(selectedMonth)
      setSalaries(monthSalaries)
    }
  }

  const calculateSalary = (
    data: typeof formData,
    base: number,
    hours: number
  ) => {
    const calcPay = data.type === "hourly" ? base * hours : base
    const finalPay = calcPay + data.adjustments
    return { calcPay, finalPay }
  }

  const handleCreate = (employeeId?: string) => {
    const employee = employeeId
      ? employees.find((e) => e.id === employeeId)
      : null
    const baseSalary = employee?.baseSalary || 0

    setFormData({
      type: "fixed",
      base: baseSalary,
      hours: 0,
      adjustments: 0,
      note: "",
      paid: false,
    })
    setSelectedEmployee(employeeId || "")
    setSelectedSalary(null)
    setIsCreateDialogOpen(true)
  }

  const handleEdit = (salary: SalaryType) => {
    setSelectedSalary(salary)
    setSelectedEmployee(salary.userId)
    setFormData({
      type: salary.type,
      base: salary.base,
      hours: salary.hours,
      adjustments: salary.adjustments,
      note: salary.note || "",
      paid: salary.paid,
    })
    setIsEditDialogOpen(true)
  }

  const handleDelete = (salary: SalaryType) => {
    setSelectedSalary(salary)
    setIsDeleteDialogOpen(true)
  }

  const handleCreateSubmit = () => {
    if (!selectedEmployee) {
      toast({
        title: "Validation Error",
        description: "Please select an employee",
        variant: "destructive",
      })
      return
    }

    if (formData.base <= 0) {
      toast({
        title: "Validation Error",
        description: "Base pay must be greater than 0",
        variant: "destructive",
      })
      return
    }

    if (formData.type === "hourly" && formData.hours <= 0) {
      toast({
        title: "Validation Error",
        description: "Hours must be greater than 0 for hourly salary",
        variant: "destructive",
      })
      return
    }

    const { calcPay, finalPay } = calculateSalary(
      formData,
      formData.base,
      formData.hours
    )

    const salary: SalaryType = {
      id: Date.now().toString(),
      userId: selectedEmployee,
      month: selectedMonth,
      type: formData.type,
      base: formData.base,
      hours: formData.type === "hourly" ? formData.hours : 0,
      calcPay,
      adjustments: formData.adjustments,
      finalPay,
      paid: formData.paid,
      note: formData.note || undefined,
    }

    store.updateSalary(salary)
    toast({
      title: "Salary Created",
      description: `Salary record created successfully`,
    })
    setIsCreateDialogOpen(false)
    loadData()
  }

  const handleEditSubmit = () => {
    if (!selectedSalary) return

    if (formData.base <= 0) {
      toast({
        title: "Validation Error",
        description: "Base pay must be greater than 0",
        variant: "destructive",
      })
      return
    }

    if (formData.type === "hourly" && formData.hours <= 0) {
      toast({
        title: "Validation Error",
        description: "Hours must be greater than 0 for hourly salary",
        variant: "destructive",
      })
      return
    }

    const { calcPay, finalPay } = calculateSalary(
      formData,
      formData.base,
      formData.hours
    )

    store.updateSalary({
      ...selectedSalary,
      type: formData.type,
      base: formData.base,
      hours: formData.type === "hourly" ? formData.hours : 0,
      calcPay,
      adjustments: formData.adjustments,
      finalPay,
      paid: formData.paid,
      note: formData.note || undefined,
    })

    toast({
      title: "Salary Updated",
      description: `Salary record updated successfully`,
    })
    setIsEditDialogOpen(false)
    setSelectedSalary(null)
    loadData()
  }

  const handleDeleteConfirm = () => {
    if (!selectedSalary) return

    store.deleteSalary(selectedSalary.id)
    toast({
      title: "Salary Deleted",
      description: "Salary record has been removed",
      variant: "destructive",
    })

    setIsDeleteDialogOpen(false)
    setSelectedSalary(null)
    loadData()
  }

  const currentSalary = !isAdmin
    ? store.getSalary(user?.id || "", selectedMonth)
    : null
  const totalPayout = salaries.reduce(
    (sum, s) => sum + (s.paid ? s.finalPay : 0),
    0
  )
  const pendingPayout = salaries.reduce(
    (sum, s) => sum + (!s.paid ? s.finalPay : 0),
    0
  )
  const avgHours =
    salaries.length > 0
      ? Math.round(
          salaries.reduce((sum, s) => sum + s.hours, 0) / salaries.length
        )
      : 0

  if (!user) return null

  return (
    <Layout>
      <div className="min-h-screen p-3 md:p-8 max-w-7xl mx-auto overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">Salary</h1>
              <p className="text-sm text-muted-foreground">
                {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 sm:flex-none sm:w-auto px-4 py-2 rounded-xl border border-glass-border bg-card text-foreground text-sm md:text-base"
              />
              {isAdmin && (
                <Button
                  onClick={() => handleCreate()}
                  className="flex-shrink-0 gradient-primary shadow-md hover:shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Salary
                </Button>
              )}
            </div>
          </div>
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
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary mb-4 shadow-md">
                    <DollarSign className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h2 className="text-sm text-muted-foreground mb-2">
                    Total Pay
                  </h2>
                  <p className="text-5xl font-bold gradient-primary bg-clip-text text-transparent">
                    ₹{currentSalary.finalPay.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center py-3 border-b border-glass-border">
                    <span className="text-muted-foreground">Base Pay</span>
                    <span className="font-semibold">
                      ₹{currentSalary.base.toLocaleString()}
                    </span>
                  </div>
                  {currentSalary.type === "hourly" && (
                    <div className="flex justify-between items-center py-3 border-b border-glass-border">
                      <span className="text-muted-foreground">
                        Hours Worked
                      </span>
                      <span className="font-semibold">
                        {currentSalary.hours}h
                      </span>
                    </div>
                  )}
                  {currentSalary.adjustments !== 0 && (
                    <div className="flex justify-between items-center py-3 border-b border-glass-border">
                      <span className="text-muted-foreground">Adjustments</span>
                      <span
                        className={`font-semibold ${
                          currentSalary.adjustments > 0
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {currentSalary.adjustments > 0 ? "+" : ""}₹
                        {currentSalary.adjustments.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {currentSalary.note && (
                    <div className="py-3">
                      <span className="text-sm text-muted-foreground block mb-1">
                        Note
                      </span>
                      <p className="text-foreground">{currentSalary.note}</p>
                    </div>
                  )}
                </div>

                <div
                  className={`text-center py-4 rounded-2xl ${
                    currentSalary.paid
                      ? "bg-success/20 text-success"
                      : "bg-warning/20 text-warning"
                  }`}
                >
                  <span className="font-semibold">
                    {currentSalary.paid ? "✓ Paid" : "Pending Payment"}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">
                  No Salary Information
                </h3>
                <p className="text-muted-foreground">
                  Salary details for this month will be available soon
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          // Admin View
          <>
            <div className="flex flex-col gap-4 mb-6">
              <div className="glass-card rounded-2xl p-4 md:p-5">
                <p className="text-xs md:text-sm text-muted-foreground mb-2">
                  Total Payout
                </p>
                <p className="text-2xl md:text-3xl font-bold">
                  ₹{totalPayout.toLocaleString()}
                </p>
              </div>
              <div className="glass-card rounded-2xl p-4 md:p-5">
                <p className="text-xs md:text-sm text-muted-foreground mb-2">
                  Pending
                </p>
                <p className="text-2xl md:text-3xl font-bold text-warning">
                  ₹{pendingPayout.toLocaleString()}
                </p>
              </div>
            </div>

            {employees.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <DollarSign className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No Employees</h3>
                <p className="text-muted-foreground">
                  Add employees in the Staff section to manage their salaries
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {employees.map((employee) => {
                  const salary = salaries.find((s) => s.userId === employee.id)
                  return (
                    <motion.div
                      key={employee.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card rounded-2xl p-4 md:p-5"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold mb-1 truncate">
                            {employee.name}
                          </h3>
                          {salary ? (
                            <p className="text-xs text-muted-foreground">
                              {salary.type === "hourly" ? "Hourly" : "Fixed"}{" "}
                              Salary
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No salary record
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0 ml-2">
                          {salary ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(salary)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(salary)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCreate(employee.id)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Salary
                            </Button>
                          )}
                        </div>
                      </div>

                      {salary ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Final Pay
                            </p>
                            <p className="text-xl font-bold">
                              ₹{salary.finalPay.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Status
                              </p>
                              <div
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                                  salary.paid
                                    ? "bg-success/20 text-success"
                                    : "bg-warning/20 text-warning"
                                }`}
                              >
                                {salary.paid ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    Paid
                                  </>
                                ) : (
                                  <>
                                    <X className="w-3 h-3" />
                                    Pending
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground mb-1">
                                Base
                              </p>
                              <p className="text-sm font-semibold">
                                ₹{salary.base.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            {salary.type === "hourly" && (
                              <div>
                                <p className="text-muted-foreground mb-1">
                                  Hours
                                </p>
                                <p className="font-semibold">{salary.hours}h</p>
                              </div>
                            )}
                            <div className="text-right">
                              <p className="text-muted-foreground mb-1">
                                Adjustments
                              </p>
                              <p
                                className={`font-semibold ${
                                  salary.adjustments > 0
                                    ? "text-success"
                                    : salary.adjustments < 0
                                    ? "text-destructive"
                                    : ""
                                }`}
                              >
                                {salary.adjustments > 0 ? "+" : ""}₹
                                {salary.adjustments.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {salary.note && (
                            <div className="pt-2 border-t border-glass-border">
                              <p className="text-xs text-muted-foreground mb-1">
                                Note
                              </p>
                              <p className="text-xs text-foreground line-clamp-2">
                                {salary.note}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                          No salary record
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Salary Record</DialogTitle>
              <DialogDescription>
                Create a salary record for the selected employee and month.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select
                  value={selectedEmployee}
                  onValueChange={(value) => {
                    setSelectedEmployee(value)
                    const employee = employees.find((e) => e.id === value)
                    if (employee?.baseSalary) {
                      setFormData((prev) => ({
                        ...prev,
                        base: employee.baseSalary || 0,
                      }))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}{" "}
                        {emp.baseSalary
                          ? `(Base: ₹${emp.baseSalary.toLocaleString()})`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEmployee &&
                  (() => {
                    const emp = employees.find((e) => e.id === selectedEmployee)
                    return emp?.baseSalary ? (
                      <p className="text-xs text-muted-foreground">
                        Base salary: ₹{emp.baseSalary.toLocaleString()}{" "}
                        (prefilled)
                      </p>
                    ) : (
                      <p className="text-xs text-warning">
                        No base salary set for this employee. Set it in Staff
                        section.
                      </p>
                    )
                  })()}
              </div>

              <div className="space-y-2">
                <Label>Salary Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "fixed" | "hourly") =>
                    setFormData({ ...formData, type: value })
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
                    value={formData.base || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        base: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                {formData.type === "hourly" && (
                  <div className="space-y-2">
                    <Label>Hours</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.hours || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
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
                  value={formData.adjustments || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      adjustments: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Positive for bonus, negative for deduction"
                />
              </div>

              <div className="space-y-2">
                <Label>Note (Optional)</Label>
                <Textarea
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  placeholder="Additional notes about this salary"
                  rows={3}
                />
              </div>

              <div
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.paid
                    ? "bg-success/10 border-success/30"
                    : "bg-secondary/30 border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="paid"
                    checked={formData.paid}
                    onChange={(e) =>
                      setFormData({ ...formData, paid: e.target.checked })
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
                      {formData.paid
                        ? "This salary has been marked as paid"
                        : "Check this box when the salary has been paid to the employee"}
                    </p>
                  </div>
                  {formData.paid && (
                    <div className="flex items-center gap-1 text-success font-semibold">
                      <Check className="w-5 h-5" />
                      <span>Paid</span>
                    </div>
                  )}
                </div>
              </div>

              {formData.base > 0 && (
                <div className="p-4 bg-secondary/30 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground">
                      Calculated Pay:
                    </span>
                    <span className="font-semibold">
                      ₹
                      {calculateSalary(
                        formData,
                        formData.base,
                        formData.hours
                      ).calcPay.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Final Pay:</span>
                    <span className="text-2xl font-bold text-primary">
                      ₹
                      {calculateSalary(
                        formData,
                        formData.base,
                        formData.hours
                      ).finalPay.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSubmit}
                className="gradient-primary shadow-md hover:shadow-lg"
              >
                Create Salary
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Salary Record</DialogTitle>
              <DialogDescription>
                Update salary information for this employee.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Salary Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "fixed" | "hourly") =>
                    setFormData({ ...formData, type: value })
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
                    value={formData.base || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        base: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                {formData.type === "hourly" && (
                  <div className="space-y-2">
                    <Label>Hours</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.hours || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
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
                  value={formData.adjustments || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      adjustments: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Positive for bonus, negative for deduction"
                />
              </div>

              <div className="space-y-2">
                <Label>Note (Optional)</Label>
                <Textarea
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  placeholder="Additional notes about this salary"
                  rows={3}
                />
              </div>

              <div
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.paid
                    ? "bg-success/10 border-success/30"
                    : "bg-secondary/30 border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="paid-edit"
                    checked={formData.paid}
                    onChange={(e) =>
                      setFormData({ ...formData, paid: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-glass-border cursor-pointer"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="paid-edit"
                      className="cursor-pointer font-semibold text-base"
                    >
                      Mark as Paid
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.paid
                        ? "This salary has been marked as paid"
                        : "Check this box when the salary has been paid to the employee"}
                    </p>
                  </div>
                  {formData.paid && (
                    <div className="flex items-center gap-1 text-success font-semibold">
                      <Check className="w-5 h-5" />
                      <span>Paid</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-secondary/30 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Calculated Pay:</span>
                  <span className="font-semibold">
                    ₹
                    {calculateSalary(
                      formData,
                      formData.base,
                      formData.hours
                    ).calcPay.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Final Pay:</span>
                  <span className="text-2xl font-bold text-primary">
                    ₹
                    {calculateSalary(
                      formData,
                      formData.base,
                      formData.hours
                    ).finalPay.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditSubmit}
                className="gradient-primary shadow-md hover:shadow-lg"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Salary Record?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this salary record. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  )
}
