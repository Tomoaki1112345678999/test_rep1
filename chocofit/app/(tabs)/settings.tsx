import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ScrollView, StyleSheet, Switch, Text,
  TouchableOpacity, View,
} from 'react-native'
import { MACHINES } from '@/constants/machines'
import { getMachineEnabled, getProfile, setMachineEnabled } from '@/lib/db'
import { Profile } from '@/lib/types'

const GOAL_LABELS: Record<string, string> = {
  diet: 'ダイエット', muscle: '筋力アップ',
  fitness: '体力向上', posture: '姿勢改善',
}
const LEVEL_LABELS: Record<string, string> = {
  beginner: '初心者', intermediate: '中級者',
}

export default function SettingsScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [machineStates, setMachineStates] = useState<Record<string, boolean>>({})

  useFocusEffect(
    useCallback(() => {
      setProfile(getProfile())
      const states: Record<string, boolean> = {}
      MACHINES.forEach((m) => { states[m.id] = getMachineEnabled(m.id) })
      setMachineStates(states)
    }, [])
  )

  function toggleMachine(id: string) {
    const next = !machineStates[id]
    setMachineEnabled(id, next)
    setMachineStates((prev) => ({ ...prev, [id]: next }))
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>設定</Text>

      {/* プロフィール */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>プロフィール</Text>
        {profile ? (
          <View style={styles.card}>
            <Row label="目的" value={GOAL_LABELS[profile.goal]} />
            <Row label="レベル" value={LEVEL_LABELS[profile.level]} />
            <Row label="利用時間" value={`${profile.durationMinutes}分`} />
            <Row label="年齢" value={`${profile.age}歳`} />
            <Row label="体重" value={`${profile.weightKg} kg`} />
            <Row label="性別" value={profile.sex === 'male' ? '男性' : '女性'} />
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push('/onboarding')}
            >
              <Text style={styles.editBtnText}>プロフィールを編集</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.setupBtn} onPress={() => router.push('/onboarding')}>
            <Text style={styles.setupBtnText}>プロフィールを設定する</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* マシン設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>新丸子店 マシン設定</Text>
        <Text style={styles.sectionNote}>使えないマシンはOFFにしてください</Text>
        <View style={styles.card}>
          {MACHINES.map((m) => (
            <View key={m.id} style={styles.machineRow}>
              <View style={styles.machineInfo}>
                <Text style={styles.machineName}>{m.name}</Text>
                <Text style={styles.machineCategory}>{m.category}</Text>
              </View>
              <Switch
                value={machineStates[m.id] ?? true}
                onValueChange={() => toggleMachine(m.id)}
                trackColor={{ true: '#E63946', false: '#e0e0e0' }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>
      </View>

      {/* APIキー案内 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AIモデル設定</Text>
        <View style={styles.card}>
          <Text style={styles.apiNote}>
            OpenAI APIキーを `.env` ファイルに設定するとリアルAI（GPT-5.4 mini）が使われます。
            未設定時はオフラインモックで動作します。
          </Text>
          <Text style={styles.apiCode}>
            EXPO_PUBLIC_OPENAI_API_KEY=sk-xxxx
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 20 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 4 },
  sectionNote: { fontSize: 12, color: '#999', marginBottom: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  rowLabel: { fontSize: 14, color: '#666' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  editBtn: {
    margin: 16, backgroundColor: '#f5f5f5', borderRadius: 10,
    padding: 12, alignItems: 'center',
  },
  editBtnText: { fontSize: 14, color: '#555', fontWeight: '600' },
  setupBtn: {
    backgroundColor: '#E63946', borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  setupBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  machineRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  machineInfo: { flex: 1 },
  machineName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  machineCategory: { fontSize: 12, color: '#999', marginTop: 1 },
  apiNote: { fontSize: 13, color: '#666', lineHeight: 20, padding: 16, paddingBottom: 8 },
  apiCode: {
    fontFamily: 'monospace', fontSize: 12, color: '#555',
    backgroundColor: '#f5f5f5', margin: 16, marginTop: 0,
    padding: 10, borderRadius: 8,
  },
})
