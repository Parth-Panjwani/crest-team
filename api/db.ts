import Database from "better-sqlite3"
import { join } from "path"
import { tmpdir } from "os"
import { existsSync, mkdirSync } from "fs"

// Use /tmp for Vercel serverless functions (writable directory)
const dbPath = process.env.VERCEL
  ? join(tmpdir(), "database.sqlite")
  : join(process.cwd(), "server", "database.sqlite")

// Ensure directory exists
const dbDir = process.env.VERCEL ? tmpdir() : join(process.cwd(), "server")
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true })
}

const db = new Database(dbPath)

// Enable foreign keys
db.pragma("foreign_keys = ON")

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
    pin TEXT NOT NULL,
    baseSalary REAL
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    date TEXT NOT NULL,
    punches TEXT NOT NULL,
    totals TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(userId, date)
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'done')),
    category TEXT NOT NULL CHECK(category IN ('order', 'general', 'reminder')),
    adminOnly INTEGER NOT NULL DEFAULT 0,
    completedBy TEXT,
    completedAt TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    deletedAt TEXT,
    deletedBy TEXT,
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (completedBy) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (deletedBy) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS leaves (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('full', 'half')),
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS salaries (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    month TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('fixed', 'hourly')),
    base REAL NOT NULL,
    hours REAL NOT NULL,
    calcPay REAL NOT NULL,
    adjustments REAL NOT NULL,
    advances TEXT NOT NULL DEFAULT '[]',
    storePurchases TEXT NOT NULL DEFAULT '[]',
    totalDeductions REAL NOT NULL DEFAULT 0,
    finalPay REAL NOT NULL,
    paid INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(userId, month)
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    expiresAt TEXT,
    readBy TEXT NOT NULL DEFAULT '[]'
  );
`)

// Initialize with default data if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as {
  count: number
}
if (userCount.count === 0) {
  const insertUser = db.prepare(
    "INSERT INTO users (id, name, role, pin, baseSalary) VALUES (?, ?, ?, ?, ?)"
  )
  insertUser.run("1", "Store Owner", "admin", "1234", null)
  insertUser.run("2", "Alice Johnson", "employee", "5678", 30000)
  insertUser.run("3", "Bob Smith", "employee", "9012", 35000)
}

export default db
