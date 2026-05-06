import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  Alert, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native'
import { addBodyRecord, getBodyRecords } from '@/lib/db'
import { BodyRecord } from '@/lib/types'

export default function BodyScreen() {
  const [records, setRecords] = useState<BodyRecord[]>([])
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')

  useFocusEffect(
    useCallback(() => {
      setRecords(getBodyRecords(30))
    }, [])
  )

  function handleSave() {
    const w = parseFloat(weight)
    if (isNaN(w) || w <= 0) {
      Alert.alert('体重を正しく入力してください')
      return
    }
    const bf = bodyFat ? parseFloat(bodyFat) : null
    addBodyRecord(w, bf)
    setWeight('')
    setBodyFat('')
    setRecords(getBodyRecords(30))
  }

  const latest = records[0]
  const oldest = records[records.length - 1]
  const diff = latest && oldest && records.length > 1
    ? (latest.weightKg - oldest.weightKg).toFixed(1)
    : null

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>身体データ</Text>

      {/* 入力フォーム */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>今日の記録</Text>
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>体重 (kg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="例: 65.0"
              value={weight}
              onChangeText={setWeight}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>体脂肪率 (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="例: 20.0"
              value={bodyFat}
              onChangeText={setBodyFat}
            />
          </View>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>記録する</Text>
        </TouchableOpacity>
      </View>

      {/* サマリー */}
      {latest && (
        <View style={styles.summaryRow}>
          <SummaryCard label="現在の体重" value={`${latest.weightKg} kg`} />
          {latest.bodyFatPct !== null && (
            <SummaryCard label="体脂肪率" value={`${latest.bodyFatPct} %`} />
          )}
          {diff !== null && (
            <SummaryCard
              label="推移（直近）"
              value={`${parseFloat(diff) > 0 ? '+' : ''}${diff} kg`}
              accent={parseFloat(diff) < 0}
            />
          )}
        </View>
      )}

      {/* 簡易グラフ（バー） */}
      {records.length > 1 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>体重の推移</Text>
          <SimpleBarChart records={[...records].reverse()} />
        </View>
      )}

      {/* 履歴リスト */}
      <Text style={styles.sectionTitle}>記録一覧</Text>
      {records.length === 0 ? (
        <Text style={styles.empty}>まだ記録がありません</Text>
      ) : (
        records.map((r) => (
          <View key={r.id} style={styles.recordItem}>
            <Text style={styles.recordDate}>{r.recordedAt.slice(0, 10)}</Text>
            <Text style={styles.recordWeight}>{r.weightKg} kg</Text>
            {r.bodyFatPct !== null && (
              <Text style={styles.recordFat}>{r.bodyFatPct}%</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  )
}

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, accent && styles.summaryAccent]}>{value}</Text>
    </View>
  )
}

function SimpleBarChart({ records }: { records: BodyRecord[] }) {
  const weights = records.map((r) => r.weightKg)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min || 1
  const last = records.slice(-10)

  return (
    <View style={chartStyles.container}>
      {last.map((r, i) => {
        const height = Math.max(4, ((r.weightKg - min) / range) * 80 + 10)
        return (
          <View key={i} style={chartStyles.barWrap}>
            <Text style={chartStyles.barLabel}>{r.weightKg}</Text>
            <View style={[chartStyles.bar, { height }]} />
            <Text style={chartStyles.dateLabel}>{r.recordedAt.slice(5, 10)}</Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 10,
    padding: 12, fontSize: 16, textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: '#E63946', borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  summaryLabel: { fontSize: 11, color: '#999', marginBottom: 4 },
  summaryValue: { fontSize: 17, fontWeight: '800', color: '#1a1a1a' },
  summaryAccent: { color: '#2dc653' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 10 },
  empty: { color: '#aaa', textAlign: 'center', marginTop: 20 },
  recordItem: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4,
  },
  recordDate: { flex: 1, fontSize: 13, color: '#888' },
  recordWeight: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginRight: 12 },
  recordFat: { fontSize: 14, color: '#666' },
})

const chartStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 120, paddingTop: 24 },
  barWrap: { alignItems: 'center', flex: 1 },
  bar: { width: '60%', backgroundColor: '#E63946', borderRadius: 4 },
  barLabel: { fontSize: 9, color: '#888', marginBottom: 2 },
  dateLabel: { fontSize: 9, color: '#aaa', marginTop: 2 },
})
