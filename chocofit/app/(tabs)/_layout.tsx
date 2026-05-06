import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#E63946',
        tabBarStyle: { paddingBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'ホーム', tabBarLabel: 'ホーム' }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: '履歴', tabBarLabel: '履歴' }}
      />
      <Tabs.Screen
        name="body"
        options={{ title: '身体', tabBarLabel: '身体' }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '設定', tabBarLabel: '設定' }}
      />
    </Tabs>
  )
}
