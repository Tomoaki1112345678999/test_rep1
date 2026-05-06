import { router } from 'expo-router'
import { useState } from 'react'
import {
  Alert, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import { getProfile, saveProfile } from '@/lib/db'
import { Goal, Level, Profile } from '@/lib/types'

const GOALS: { value: Goal; label: string }[] = [
  { value: 'diet', label: 'ダイエット' },
  { value: 'muscle', label: '筋力アップ' },
  { value: 'fitness', label: '体力向上' },
  { value: 'posture', label: '姿勢改善' },
]

const DURATIONS = [20, 30, 45]

export default function OnboardingScreen() {
  const [goal, setGoal] = useState<Goal>('diet')
  const [level, setLevel] = useState<Level>('beginner')
  const [duration, setDuration] = useState(30)
  const [age, setAge] = useState('')
  const [weight, setWeight] = useState('')
  const [sex, setSex] = useState<'male' | 'female'>('male')

  function handleSave() {
    const parsedAge = parseInt(age)
    const parsedWeight = parseFloat(weight)
    if (isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
      Alert.alert('入力エラー', '年齢を正しく入力してください')
      return
    }
    if (isNaN(parsedWeight) || parsedWeight <= 0 || parsedWeight > 300) {
      Alert.alert('入力エラー', '体重を正しく入力してください')
      return
    }
    const isEditing = getProfile() !== null
    const profile: Profile = {
      goal, level, durationMinutes: duration,
      age: parsedAge, weightKg: parsedWeight, sex,
    }
    saveProfile(profile)
    // 編集で来た場合は戻る、初回セットアップはホームへ
    if (isEditing && router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(tabs)')
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>ChocoFit へようこそ</Text>
      <Text style={styles.subtitle}>まず基本情報を教えてください</Text>

      <Label text="トレーニングの目的" />
      <Row>
        {GOALS.map((g) => (
          <Chip
            key={g.value}
            label={g.label}
            selected={goal === g.value}
            onPress={() => setGoal(g.value)}
          />
        ))}
      </Row>

      <Label text="レベル" />
      <Row>
        <Chip label="初心者" selected={level === 'beginner'} onPress={() => setLevel('beginner')} />
        <Chip label="中級者" selected={level === 'intermediate'} onPress={() => setLevel('intermediate')} />
      </Row>

      <Label text="1回あたりの利用時間" />
      <Row>
        {DURATIONS.map((d) => (
          <Chip key={d} label={`${d}分`} selected={duration === d} onPress={() => setDuration(d)} />
        ))}
      </Row>

      <Label text="性別" />
      <Row>
        <Chip label="男性" selected={sex === 'male'} onPress={() => setSex('male')} />
        <Chip label="女性" selected={sex === 'female'} onPress={() => setSex('female')} />
      </Row>

      <Label text="年齢" />
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        placeholder="例：28"
        value={age}
        onChangeText={setAge}
      />

      <Label text="体重 (kg)" />
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="例：65.0"
        value={weight}
        onChangeText={setWeight}
      />

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>始める</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8, color: '#1a1a1a' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32 },
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 20, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd',
  },
  chipSelected: { backgroundColor: '#E63946', borderColor: '#E63946' },
  chipText: { fontSize: 14, color: '#444' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12,
    padding: 14, fontSize: 16, marginTop: 4,
  },
  button: {
    backgroundColor: '#E63946', borderRadius: 14,
    padding: 18, alignItems: 'center', marginTop: 40,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
})
