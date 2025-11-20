import { Tabs } from 'expo-router';
import { Camera, History, Settings } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FBFBFD',
          borderTopColor: '#E5E5E7',
          height: 85,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen name="index" options={{ title: 'カメラ', tabBarIcon: ({ size, color }) => (<Camera size={size} color={color} />) }} />
      <Tabs.Screen name="history" options={{ title: '履歴', tabBarIcon: ({ size, color }) => (<History size={size} color={color} />) }} />
      <Tabs.Screen name="settings" options={{ title: '設定', tabBarIcon: ({ size, color }) => (<Settings size={size} color={color} />) }} />
    </Tabs>
  );
}