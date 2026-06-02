import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';

const PLUM  = '#2B2040';
const BLUSH = '#F7A8C4';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={[s.icon, focused && s.iconFocused]}>{label}</Text>;
}

const s = StyleSheet.create({
  icon: { fontSize: 18, fontWeight: '700', color: PLUM, opacity: 0.3 },
  iconFocused: { opacity: 1, color: PLUM },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PLUM,
        tabBarInactiveTintColor: PLUM,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: 'rgba(43,32,64,0.08)',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Budget',
          tabBarIcon: ({ focused }) => <TabIcon label="$" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="prices"
        options={{
          title: 'Prices',
          tabBarIcon: ({ focused }) => <TabIcon label="≈" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ focused }) => <TabIcon label="✦" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{ href: null }}
      />
    </Tabs>
  );
}
