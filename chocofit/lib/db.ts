import * as SQLite from 'expo-sqlite'
import { MACHINES } from '../constants/machines'
import { BodyRecord, Feedback, Mood, Profile, Workout, WorkoutSet } from './types'
import { AIMenu } from './types'

const db = SQLite.openDatabaseSync('chocofit.db')

export function initDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY,
      goal TEXT NOT NULL,
      level TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      age INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      sex TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS body_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weight_kg REAL NOT NULL,
      body_fat_pct REAL,
      recorded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      mood TEXT NOT NULL,
      ai_menu TEXT NOT NULL,
      feedback TEXT
    );

    CREATE TABLE IF NOT EXISTS sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      machine_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      weight_kg REAL,
      reps INTEGER,
      distance_km REAL,
      duration_sec INTEGER,
      speed_kmh REAL,
      level INTEGER,
      FOREIGN KEY (workout_id) REFERENCES workouts(id)
    );

    CREATE TABLE IF NOT EXISTS machine_settings (
      machine_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1
    );
  `)
}

// --- Profile ---

export function getProfile(): Profile | null {
  const row = db.getFirstSync<{
    goal: string; level: string; duration_minutes: number
    age: number; weight_kg: number; sex: string
  }>('SELECT * FROM profile WHERE id = 1')
  if (!row) return null
  return {
    goal: row.goal as Profile['goal'],
    level: row.level as Profile['level'],
    durationMinutes: row.duration_minutes,
    age: row.age,
    weightKg: row.weight_kg,
    sex: row.sex as Profile['sex'],
  }
}

export function saveProfile(p: Profile) {
  db.runSync(
    `INSERT OR REPLACE INTO profile (id, goal, level, duration_minutes, age, weight_kg, sex, created_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
    p.goal, p.level, p.durationMinutes, p.age, p.weightKg, p.sex, new Date().toISOString()
  )
}

// --- Body Records ---

export function addBodyRecord(weightKg: number, bodyFatPct: number | null): number {
  const result = db.runSync(
    'INSERT INTO body_records (weight_kg, body_fat_pct, recorded_at) VALUES (?, ?, ?)',
    weightKg, bodyFatPct, new Date().toISOString()
  )
  return result.lastInsertRowId
}

export function getBodyRecords(limit = 30): BodyRecord[] {
  return db.getAllSync<{
    id: number; weight_kg: number; body_fat_pct: number | null; recorded_at: string
  }>('SELECT * FROM body_records ORDER BY recorded_at DESC LIMIT ?', limit)
    .map((r) => ({
      id: r.id,
      weightKg: r.weight_kg,
      bodyFatPct: r.body_fat_pct,
      recordedAt: r.recorded_at,
    }))
}

// --- Workouts ---

export function startWorkout(mood: Mood, menu: AIMenu): number {
  const now = new Date().toISOString()
  const result = db.runSync(
    'INSERT INTO workouts (date, started_at, mood, ai_menu, feedback) VALUES (?, ?, ?, ?, NULL)',
    now.slice(0, 10), now, mood, JSON.stringify(menu)
  )
  return result.lastInsertRowId
}

export function finishWorkout(id: number, feedback: Feedback) {
  db.runSync(
    'UPDATE workouts SET finished_at = ?, feedback = ? WHERE id = ?',
    new Date().toISOString(), feedback, id
  )
}

export function getRecentWorkouts(limit = 20): Workout[] {
  return db.getAllSync<{
    id: number; date: string; started_at: string; finished_at: string | null
    mood: string; ai_menu: string; feedback: string | null
  }>('SELECT * FROM workouts ORDER BY started_at DESC LIMIT ?', limit)
    .map((r) => ({
      id: r.id,
      date: r.date,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      mood: r.mood as Mood,
      aiMenu: JSON.parse(r.ai_menu) as AIMenu,
      feedback: r.feedback as Feedback | null,
    }))
}

export function getLastWorkout(): Workout | null {
  const rows = getRecentWorkouts(1)
  return rows[0] ?? null
}

// --- Sets ---

export function addSet(s: Omit<WorkoutSet, 'id'>) {
  db.runSync(
    `INSERT INTO sets (workout_id, machine_id, set_number, weight_kg, reps, distance_km, duration_sec, speed_kmh, level)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    s.workoutId, s.machineId, s.setNumber,
    s.weightKg, s.reps, s.distanceKm, s.durationSec, s.speedKmh, s.level
  )
}

export function getSetsForWorkout(workoutId: number): WorkoutSet[] {
  return db.getAllSync<{
    id: number; workout_id: number; machine_id: string; set_number: number
    weight_kg: number | null; reps: number | null; distance_km: number | null
    duration_sec: number | null; speed_kmh: number | null; level: number | null
  }>('SELECT * FROM sets WHERE workout_id = ? ORDER BY machine_id, set_number', workoutId)
    .map((r) => ({
      id: r.id,
      workoutId: r.workout_id,
      machineId: r.machine_id,
      setNumber: r.set_number,
      weightKg: r.weight_kg,
      reps: r.reps,
      distanceKm: r.distance_km,
      durationSec: r.duration_sec,
      speedKmh: r.speed_kmh,
      level: r.level,
    }))
}

export function getMaxWeightPerMachine(machineId: string, limit = 30): { date: string; weightKg: number }[] {
  return db.getAllSync<{ date: string; max_weight: number }>(
    `SELECT w.date, MAX(s.weight_kg) as max_weight
     FROM sets s JOIN workouts w ON s.workout_id = w.id
     WHERE s.machine_id = ? AND s.weight_kg IS NOT NULL
     GROUP BY w.date
     ORDER BY w.date ASC
     LIMIT ?`,
    machineId, limit
  ).map((r) => ({ date: r.date, weightKg: r.max_weight }))
}

// --- Machine Settings ---

export function getMachineEnabled(machineId: string): boolean {
  const row = db.getFirstSync<{ enabled: number }>(
    'SELECT enabled FROM machine_settings WHERE machine_id = ?', machineId
  )
  return row === null ? true : row.enabled === 1
}

export function setMachineEnabled(machineId: string, enabled: boolean) {
  db.runSync(
    'INSERT OR REPLACE INTO machine_settings (machine_id, enabled) VALUES (?, ?)',
    machineId, enabled ? 1 : 0
  )
}

export function getEnabledMachineIds(): string[] {
  const all = db.getAllSync<{ machine_id: string; enabled: number }>(
    'SELECT machine_id, enabled FROM machine_settings'
  )
  const overrides = new Map(all.map((r) => [r.machine_id, r.enabled === 1]))
  return MACHINES
    .filter((m) => overrides.get(m.id) !== false)
    .map((m) => m.id)
}

export function getWorkoutDates(year: number, month: number): string[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`
  return db.getAllSync<{ date: string }>(
    "SELECT DISTINCT date FROM workouts WHERE date LIKE ? ORDER BY date",
    `${prefix}%`
  ).map((r) => r.date)
}

export function getRecentWorkoutDates(days: number): string[] {
  const since = new Date()
  since.setDate(since.getDate() - days)
  return db.getAllSync<{ date: string }>(
    "SELECT DISTINCT date FROM workouts WHERE date >= ? ORDER BY date DESC",
    since.toISOString().slice(0, 10)
  ).map((r) => r.date)
}
