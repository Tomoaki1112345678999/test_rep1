import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  Alert, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native'
import { addSet, finishWorkout, startWorkout } from '@/lib/db'
import { AIMenu, Exercise, Feedback, Mood } from '@/lib/types'

interface SetLog {
  weightKg: string
  reps: string
  durationSec: string
  distanceKm: string
  speedKmh: string
  level: string
  done: boolean
}

function defaultSetLog(ex: Exercise): SetLog {
  return {
    weightKg: ex.weightKg ? String(ex.weightKg) : '',
    reps: ex.reps ? String(ex.reps) : '',
    durationSec: ex.durationMinutes ? String(ex.durationMinutes * 60) : '',
    distanceKm: '',
    speedKmh: ex.speedKmh ? String(ex.speedKmh) : '',
    level: ex.level ? String(ex.level) : '',
    done: false,
  }
}

const FEEDBACK_OPTIONS: { value: Feedback; label: string; emoji: string }[] = [
  { value: 'easy', label: '楽だった', emoji: '😊' },
  { value: 'good', label: 'ちょうど良い', emoji: '💯' },
  { value: 'hard', label: 'きつかった', emoji: '🥵' },
]

function parseMenu(json: string | undefined): AIMenu | null {
  if (!json) return null
  try {
    const parsed = JSON.parse(json) as AIMenu
    if (!Array.isArray(parsed.exercises)) return null
    return parsed
  } catch {
    return null
  }
}

export default function WorkoutSessionScreen() {
  const params = useLocalSearchParams<{ menuJson: string; mood: string }>()
  const menu = parseMenu(params.menuJson)
  const mood = (params.mood ?? 'normal') as Mood

  const workoutIdRef = useRef<number | null>(null)
  const startedRef = useRef(false)

  const [logs, setLogs] = useState<SetLog[][]>(() =>
    (menu?.exercises ?? []).map((ex) =>
      Array.from({ length: ex.sets ?? 1 }, () => defaultSetLog(ex))
    )
  )
  const [finished, setFinished] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)

  useEffect(() => {
    if (!menu) {
      Alert.alert('エラー', 'メニューの読み込みに失敗しました', [
        { text: 'OK', onPress: () => router.back() },
      ])
      return
    }
    // Strict Modeでの二重登録を防止
    if (startedRef.current) return
    startedRef.current = true

    try {
      workoutIdRef.current = startWorkout(mood, menu)
    } catch (e) {
      Alert.alert('エラー', 'ワークアウトの開始に失敗しました')
      router.back()
      return
    }

    const timer = setInterval(() => setElapsedSec((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  function updateLog(exIdx: number, setIdx: number, field: keyof SetLog, value: string | boolean) {
    setLogs((prev) => {
      const next = prev.map((sets) => sets.map((s) => ({ ...s })))
      next[exIdx][setIdx][field] = value as never
      return next
    })
  }

  function handleFinish() {
    if (!feedback) {
      Alert.alert('フィードバックを選んでください')
      return
    }
    const workoutId = workoutIdRef.current
    if (workoutId === null || !menu) {
      Alert.alert('エラー', '記録の保存に失敗しました')
      return
    }
    try {
      menu.exercises.forEach((ex, exIdx) => {
        logs[exIdx].forEach((log, setIdx) => {
          addSet({
            workoutId,
            machineId: ex.machineId,
            setNumber: setIdx + 1,
            weightKg: parseFloat(log.weightKg) || null,
            reps: parseInt(log.reps) || null,
            distanceKm: parseFloat(log.distanceKm) || null,
            durationSec: parseInt(log.durationSec) || null,
            speedKmh: parseFloat(log.speedKmh) || null,
            level: parseInt(log.level) || null,
          })
        })
      })
      finishWorkout(workoutId, feedback)
      setFinished(true)
    } catch (e) {
      Alert.alert('エラー', '記録の保存に失敗しました。もう一度お試しください。')
    }
  }

  const minutes = Math.floor(elapsedSec / 60)
  const seconds = elapsedSec % 60
  const allDone = logs.length > 0 && logs.every((sets) => sets.every((s) => s.done))

  if (!menu) return null

  if (finished) {
    return (
      <View style={styles.doneContainer}>
        <Text style={styles.doneEmoji}>🎉</Text>
        <Text style={styles.doneTitle}>お疲れ様でした！</Text>
        <Text style={styles.doneTime}>
          {minutes}分{seconds}秒
        </Text>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.homeBtnText}>ホームに戻る</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.timer}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </Text>

      {menu.exercises.map((ex, exIdx) => (
        <View key={exIdx} style={styles.exerciseCard}>
          <Text style={styles.exerciseName}>{ex.machineName}</Text>
          {ex.note && <Text style={styles.note}>{ex.note}</Text>}

          {ex.type === 'strength' ? (
            <>
              <View style={styles.setHeader}>
                <Text style={[styles.setCol, { flex: 0.4 }]}>SET</Text>
                <Text style={[styles.setCol, { flex: 1 }]}>重量(kg)</Text>
                <Text style={[styles.setCol, { flex: 1 }]}>回数</Text>
                <Text style={[styles.setCol, { flex: 0.6 }]}>完了</Text>
              </View>
              {logs[exIdx].map((log, setIdx) => (
                <View key={setIdx} style={[styles.setRow, log.done && styles.setRowDone]}>
                  <Text style={[styles.setCol, { flex: 0.4, fontWeight: '700' }]}>{setIdx + 1}</Text>
                  <TextInput
                    style={[styles.setInput, { flex: 1 }]}
                    keyboardType="decimal-pad"
                    value={log.weightKg}
                    onChangeText={(v) => updateLog(exIdx, setIdx, 'weightKg', v)}
                    placeholder={ex.weightKg ? String(ex.weightKg) : '-'}
                  />
                  <TextInput
                    style={[styles.setInput, { flex: 1 }]}
                    keyboardType="number-pad"
                    value={log.reps}
                    onChangeText={(v) => updateLog(exIdx, setIdx, 'reps', v)}
                    placeholder={ex.reps ? String(ex.reps) : '-'}
                  />
                  <TouchableOpacity
                    style={[styles.doneCheck, log.done && styles.doneCheckDone]}
                    onPress={() => updateLog(exIdx, setIdx, 'done', !log.done)}
                  >
                    <Text style={{ color: log.done ? '#fff' : '#999' }}>{log.done ? '✓' : '○'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.cardioRow}>
              {ex.speedKmh !== undefined && (
                <View style={styles.cardioField}>
                  <Text style={styles.cardioLabel}>速度(km/h)</Text>
                  <TextInput
                    style={styles.cardioInput}
                    keyboardType="decimal-pad"
                    value={logs[exIdx][0].speedKmh}
                    onChangeText={(v) => updateLog(exIdx, 0, 'speedKmh', v)}
                    placeholder={String(ex.speedKmh)}
                  />
                </View>
              )}
              {ex.level !== undefined && (
                <View style={styles.cardioField}>
                  <Text style={styles.cardioLabel}>負荷レベル</Text>
                  <TextInput
                    style={styles.cardioInput}
                    keyboardType="number-pad"
                    value={logs[exIdx][0].level}
                    onChangeText={(v) => updateLog(exIdx, 0, 'level', v)}
                    placeholder={String(ex.level)}
                  />
                </View>
              )}
              <View style={styles.cardioField}>
                <Text style={styles.cardioLabel}>距離(km)</Text>
                <TextInput
                  style={styles.cardioInput}
                  keyboardType="decimal-pad"
                  value={logs[exIdx][0].distanceKm}
                  onChangeText={(v) => updateLog(exIdx, 0, 'distanceKm', v)}
                  placeholder="0.0"
                />
              </View>
              <TouchableOpacity
                style={[styles.doneCheck, logs[exIdx][0].done && styles.doneCheckDone]}
                onPress={() => updateLog(exIdx, 0, 'done', !logs[exIdx][0].done)}
              >
                <Text style={{ color: logs[exIdx][0].done ? '#fff' : '#999' }}>
                  {logs[exIdx][0].done ? '✓完了' : '完了'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      {allDone && (
        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackTitle}>今日のトレーニングはどうでしたか？</Text>
          <View style={styles.feedbackRow}>
            {FEEDBACK_OPTIONS.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[styles.feedbackBtn, feedback === f.value && styles.feedbackBtnSelected]}
                onPress={() => setFeedback(f.value)}
              >
                <Text style={styles.feedbackEmoji}>{f.emoji}</Text>
                <Text style={[styles.feedbackLabel, feedback === f.value && styles.feedbackLabelSelected]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
            <Text style={styles.finishBtnText}>トレーニング完了</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  content: { padding: 16, paddingBottom: 60 },
  timer: { fontSize: 40, fontWeight: '800', textAlign: 'center', color: '#E63946', marginVertical: 16 },
  exerciseCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 16, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6,
  },
  exerciseName: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  note: { fontSize: 12, color: '#999', marginBottom: 10 },
  setHeader: { flexDirection: 'row', marginBottom: 6 },
  setCol: { fontSize: 12, color: '#888', fontWeight: '600' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  setRowDone: { opacity: 0.5 },
  setInput: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    padding: 8, fontSize: 15, marginRight: 8, textAlign: 'center',
  },
  doneCheck: {
    flex: 0.6, height: 36, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#e0e0e0',
    alignItems: 'center', justifyContent: 'center',
  },
  doneCheckDone: { backgroundColor: '#E63946', borderColor: '#E63946' },
  cardioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' },
  cardioField: { flex: 1, minWidth: 80 },
  cardioLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  cardioInput: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    padding: 10, fontSize: 15, textAlign: 'center',
  },
  feedbackSection: { marginTop: 8 },
  feedbackTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12, textAlign: 'center' },
  feedbackRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  feedbackBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#fff',
  },
  feedbackBtnSelected: { borderColor: '#E63946', backgroundColor: '#FFF0F1' },
  feedbackEmoji: { fontSize: 26, marginBottom: 4 },
  feedbackLabel: { fontSize: 12, color: '#666' },
  feedbackLabelSelected: { color: '#E63946', fontWeight: '700' },
  finishBtn: {
    backgroundColor: '#E63946', borderRadius: 14,
    padding: 18, alignItems: 'center',
  },
  finishBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  doneEmoji: { fontSize: 64, marginBottom: 16 },
  doneTitle: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  doneTime: { fontSize: 20, color: '#E63946', fontWeight: '700', marginBottom: 40 },
  homeBtn: {
    backgroundColor: '#E63946', borderRadius: 14,
    paddingHorizontal: 40, paddingVertical: 16,
  },
  homeBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
})
