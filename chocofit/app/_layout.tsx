import { Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { initDB } from '@/lib/db'

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false)

  useEffect(() => {
    try {
      initDB()
      setDbReady(true)
    } catch (e) {
      Alert.alert('起動エラー', 'データベースの初期化に失敗しました。アプリを再起動してください。')
    }
  }, [])

  if (!dbReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>読み込み中...</Text>
      </View>
    )
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="workout-session" options={{ title: 'トレーニング中', headerBackVisible: false }} />
    </Stack>
  )
}
