import { Machine } from '@/lib/types'

export const MACHINES: Machine[] = [
  {
    id: 'treadmill',
    name: 'トレッドミル',
    category: '有酸素',
    type: 'cardio',
    muscleGroup: 'cardio',
    unit: 'time_distance',
  },
  {
    id: 'bike',
    name: 'エアロバイク',
    category: '有酸素',
    type: 'cardio',
    muscleGroup: 'cardio',
    unit: 'time_level',
  },
  {
    id: 'chest_press',
    name: 'チェストプレス',
    category: '胸',
    type: 'strength',
    muscleGroup: 'upper_a',
    unit: 'kg_reps',
  },
  {
    id: 'pec_fly',
    name: 'ペックフライ',
    category: '胸',
    type: 'strength',
    muscleGroup: 'upper_a',
    unit: 'kg_reps',
  },
  {
    id: 'lat_pulldown',
    name: 'ラットプルダウン',
    category: '背中',
    type: 'strength',
    muscleGroup: 'upper_b',
    unit: 'kg_reps',
  },
  {
    id: 'shoulder_press',
    name: 'ショルダープレス',
    category: '肩',
    type: 'strength',
    muscleGroup: 'upper_a',
    unit: 'kg_reps',
  },
  {
    id: 'leg_press',
    name: 'レッグプレス',
    category: '脚',
    type: 'strength',
    muscleGroup: 'lower',
    unit: 'kg_reps',
  },
  {
    id: 'leg_curl',
    name: 'レッグカール',
    category: '脚',
    type: 'strength',
    muscleGroup: 'lower',
    unit: 'kg_reps',
  },
  {
    id: 'leg_extension',
    name: 'レッグエクステンション',
    category: '脚',
    type: 'strength',
    muscleGroup: 'lower',
    unit: 'kg_reps',
  },
  {
    id: 'ab_crunch',
    name: 'アブドミナルクランチ',
    category: '腹',
    type: 'strength',
    muscleGroup: 'upper_b',
    unit: 'kg_reps',
  },
]

export const MACHINE_MAP: Record<string, Machine> = Object.fromEntries(
  MACHINES.map((m) => [m.id, m])
)
