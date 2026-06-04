import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';

const PLUM = '#2B2040';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={[s.icon, focused && s.iconFocused]}>{emoji}</Text>;
}

const s = StyleSheet.create({
  icon: { fontSize: 24, opacity: 0.35 },
  iconFocused: { opacity: 1 },
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
          height: 96,
          paddingBottom: 30,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          lineHeight: 14,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Budget',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="prices"
        options={{
          title: 'Prices',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏷️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🧺" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🍳" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
