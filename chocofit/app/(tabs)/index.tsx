import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native'
import { MACHINE_MAP } from '@/constants/machines'
import { generateMenu } from '@/lib/ai'
import {
  getEnabledMachineIds, getLastWorkout, getProfile,
  getRecentWorkoutDates,
} from '@/lib/db'
import { AIMenu, Mood, MuscleGroup, Workout } from '@/lib/types'

const MOODS: { value: Mood; label: string; emoji: string }[] = [
  { value: 'great', label: '絶好調', emoji: '💪' },
  { value: 'normal', label: '普通', emoji: '😊' },
  { value: 'tired', label: '疲れ気味', emoji: '😴' },
]

export default function HomeScreen() {
  const [mood, setMood] = useState<Mood>('normal')
  const [menu, setMenu] = useState<AIMenu | null>(null)
  const [loading, setLoading] = useState(false)
  const [streak, setStreak] = useState(0)
  const [lastWorkout, setLastWorkout] = useState<Workout | null>(null)
  const [hasProfile, setHasProfile] = useState(true)

  useEffect(() => {
    const profile = getProfile()
    if (!profile) {
      setHasProfile(false)
      router.replace('/onboarding')
      return
    }
    const last = getLastWorkout()
    setLastWorkout(last)
    setStreak(calcStreak())
  }, [])

  function calcStreak(): number {
    // 直近30日分の来店日を1クエリで取得してストリークを計算
    const dates = new Set(getRecentWorkoutDates(30))
    const today = new Date()
    let count = 0
    for (let i = 0; i < 30; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (dates.has(ds)) {
        count++
      } else if (i > 0) {
        break
      }
    }
    return count
  }

  async function handleGenerate() {
    const profile = getProfile()
    if (!profile) return
    setLoading(true)
    try {
      const enabledIds = getEnabledMachineIds()
      const last = getLastWorkout()
      // 前回ワークアウトの筋肉グループを取得してローテーションに反映
      const lastMuscleGroup: MuscleGroup | undefined = last?.aiMenu?.exercises
        ?.find((e) => e.type === 'strength')
        ?.machineId
        ? MACHINE_MAP[last!.aiMenu.exercises.find((e) => e.type === 'strength')!.machineId]?.muscleGroup
        : undefined
      const generated = await generateMenu({
        profile,
        mood,
        enabledMachineIds: enabledIds,
        lastMuscleGroup,
        lastFeedback: last?.feedback ?? undefined,
      })
      setMenu(generated)
    } finally {
      setLoading(false)
    }
  }

  function handleStart() {
    if (!menu) return
    router.push({ pathname: '/workout-session', params: { menuJson: JSON.stringify(menu), mood } })
  }

  if (!hasProfile) return null

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>ChocoFit</Text>
        {streak > 0 && (
          <View style={styles.streak}>
            <Text style={styles.streakText}>🔥 {streak}日連続</Text>
          </View>
        )}
      </View>

      {lastWorkout && (
        <Text style={styles.lastVisit}>前回: {lastWorkout.date}</Text>
      )}

      <Text style={styles.sectionTitle}>今日の体調</Text>
      <View style={styles.moodRow}>
        {MOODS.map((m) => (
          <TouchableOpacity
            key={m.value}
            style={[styles.moodBtn, mood === m.value && styles.moodBtnSelected]}
            onPress={() => setMood(m.value)}
          >
            <Text style={styles.moodEmoji}>{m.emoji}</Text>
            <Text style={[styles.moodLabel, mood === m.value && styles.moodLabelSelected]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.generateBtnText}>AIメニューを作る</Text>
        }
      </TouchableOpacity>

      {menu && (
        <View style={styles.menuCard}>
          <Text style={styles.menuTheme}>{menu.theme}</Text>
          <Text style={styles.menuReason}>{menu.reason}</Text>
          <Text style={styles.menuTime}>目安時間: {menu.estimatedMinutes}分</Text>

          {menu.exercises.map((ex, i) => (
            <View key={i} style={styles.exerciseRow}>
              <Text style={styles.exerciseName}>{ex.machineName}</Text>
              {ex.type === 'strength' ? (
                <Text style={styles.exerciseDetail}>
                  {ex.weightKg ? `${ex.weightKg}kg × ` : ''}{ex.reps}回 × {ex.sets}セット
                </Text>
              ) : (
                <Text style={styles.exerciseDetail}>
                  {ex.durationMinutes}分
                  {ex.speedKmh ? ` / ${ex.speedKmh}km/h` : ''}
                  {ex.level ? ` / レベル${ex.level}` : ''}
                </Text>
              )}
              {ex.note && <Text style={styles.exerciseNote}>{ex.note}</Text>}
            </View>
          ))}

          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Text style={styles.startBtnText}>このメニューで始める</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: '#E63946' },
  streak: { backgroundColor: '#FFF3CD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  streakText: { fontSize: 14, fontWeight: '700', color: '#856404' },
  lastVisit: { fontSize: 13, color: '#999', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  moodRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  moodBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 16, borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#fff',
  },
  moodBtnSelected: { borderColor: '#E63946', backgroundColor: '#FFF0F1' },
  moodEmoji: { fontSize: 28, marginBottom: 4 },
  moodLabel: { fontSize: 12, color: '#666' },
  moodLabelSelected: { color: '#E63946', fontWeight: '700' },
  generateBtn: {
    backgroundColor: '#E63946', borderRadius: 14,
    padding: 18, alignItems: 'center', marginBottom: 24,
  },
  generateBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  menuCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  menuTheme: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  menuReason: { fontSize: 14, color: '#666', marginBottom: 4, lineHeight: 20 },
  menuTime: { fontSize: 13, color: '#E63946', fontWeight: '600', marginBottom: 16 },
  exerciseRow: { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingVertical: 12 },
  exerciseName: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 2 },
  exerciseDetail: { fontSize: 14, color: '#555' },
  exerciseNote: { fontSize: 12, color: '#999', marginTop: 2 },
  startBtn: {
    backgroundColor: '#1a1a1a', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 16,
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
