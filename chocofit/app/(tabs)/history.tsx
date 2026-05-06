import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { getRecentWorkouts, getWorkoutDates } from '@/lib/db'
import { Workout } from '@/lib/types'

const DAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function HistoryScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1)
  const [workoutDates, setWorkoutDates] = useState<string[]>([])

  useFocusEffect(
    useCallback(() => {
      setWorkouts(getRecentWorkouts(20))
      setWorkoutDates(getWorkoutDates(calYear, calMonth))
    }, [calYear, calMonth])
  )

  function prevMonth() {
    if (calMonth === 1) { setCalYear((y) => y - 1); setCalMonth(12) }
    else setCalMonth((m) => m - 1)
  }

  function nextMonth() {
    if (calMonth === 12) { setCalYear((y) => y + 1); setCalMonth(1) }
    else setCalMonth((m) => m + 1)
  }

  const firstDay = new Date(calYear, calMonth - 1, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function isWorkoutDay(day: number): boolean {
    const ds = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return workoutDates.includes(ds)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>トレーニング履歴</Text>

      {/* カレンダー */}
      <View style={styles.card}>
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={prevMonth}>
            <Text style={styles.navBtn}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.calTitle}>{calYear}年 {calMonth}月</Text>
          <TouchableOpacity onPress={nextMonth}>
            <Text style={styles.navBtn}>▶</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.dayNames}>
          {DAYS.map((d, i) => (
            <Text key={d} style={[styles.dayName, i === 0 && styles.sun, i === 6 && styles.sat]}>{d}</Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((day, i) => (
            <View key={i} style={styles.cell}>
              {day !== null && (
                <View style={[styles.dayCircle, isWorkoutDay(day) && styles.workoutDay]}>
                  <Text style={[
                    styles.dayNum,
                    i % 7 === 0 && styles.sun,
                    i % 7 === 6 && styles.sat,
                    isWorkoutDay(day) && styles.workoutDayText,
                  ]}>
                    {day}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
        <Text style={styles.calLegend}>
          ● {workoutDates.length}日 来店
        </Text>
      </View>

      {/* 直近ワークアウトリスト */}
      <Text style={styles.sectionTitle}>直近のトレーニング</Text>
      {workouts.length === 0 ? (
        <Text style={styles.empty}>まだトレーニング記録がありません</Text>
      ) : (
        workouts.map((w) => (
          <View key={w.id} style={styles.workoutItem}>
            <View style={styles.workoutItemLeft}>
              <Text style={styles.workoutDate}>{w.date}</Text>
              <Text style={styles.workoutTheme}>{w.aiMenu?.theme ?? '-'}</Text>
              <Text style={styles.workoutExercises}>
                {w.aiMenu?.exercises?.map((e) => e.machineName).join(' / ')}
              </Text>
            </View>
            <View style={styles.workoutItemRight}>
              {w.feedback && (
                <Text style={styles.feedbackBadge}>
                  {w.feedback === 'easy' ? '楽' : w.feedback === 'good' ? '良' : '辛'}
                </Text>
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    marginBottom: 24, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6,
  },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navBtn: { fontSize: 18, color: '#E63946', paddingHorizontal: 8 },
  calTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  dayNames: { flexDirection: 'row', marginBottom: 4 },
  dayName: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#888' },
  sun: { color: '#E63946' },
  sat: { color: '#3A86FF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  workoutDay: { backgroundColor: '#E63946' },
  dayNum: { fontSize: 13, color: '#444' },
  workoutDayText: { color: '#fff', fontWeight: '700' },
  calLegend: { fontSize: 13, color: '#E63946', fontWeight: '600', textAlign: 'center', marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  empty: { color: '#aaa', textAlign: 'center', marginTop: 20 },
  workoutItem: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  workoutItemLeft: { flex: 1 },
  workoutDate: { fontSize: 13, color: '#999', marginBottom: 2 },
  workoutTheme: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  workoutExercises: { fontSize: 12, color: '#888' },
  workoutItemRight: { marginLeft: 12 },
  feedbackBadge: {
    backgroundColor: '#FFF0F1', color: '#E63946',
    fontWeight: '700', fontSize: 13, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
})
