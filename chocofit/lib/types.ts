export type Goal = 'diet' | 'muscle' | 'fitness' | 'posture'
export type Level = 'beginner' | 'intermediate'
export type Mood = 'great' | 'normal' | 'tired'
export type Feedback = 'easy' | 'good' | 'hard'
export type MachineType = 'strength' | 'cardio'
export type MuscleGroup = 'upper_a' | 'upper_b' | 'lower' | 'cardio'

export interface Machine {
  id: string
  name: string
  category: string
  type: MachineType
  muscleGroup: MuscleGroup
  unit: 'kg_reps' | 'time_distance' | 'time_level'
}

export interface Exercise {
  machineId: string
  machineName: string
  type: MachineType
  // 筋トレ
  sets?: number
  reps?: number
  weightKg?: number
  restSeconds?: number
  // 有酸素
  durationMinutes?: number
  speedKmh?: number
  level?: number
  note?: string
}

export interface AIMenu {
  theme: string
  reason: string
  exercises: Exercise[]
  estimatedMinutes: number
}

export interface Profile {
  goal: Goal
  level: Level
  durationMinutes: number
  age: number
  weightKg: number
  sex: 'male' | 'female'
}

export interface BodyRecord {
  id: number
  weightKg: number
  bodyFatPct: number | null
  recordedAt: string
}

export interface WorkoutSet {
  id: number
  workoutId: number
  machineId: string
  setNumber: number
  weightKg: number | null
  reps: number | null
  distanceKm: number | null
  durationSec: number | null
  speedKmh: number | null
  level: number | null
}

export interface Workout {
  id: number
  date: string
  startedAt: string
  finishedAt: string | null
  mood: Mood
  aiMenu: AIMenu
  feedback: Feedback | null
}
