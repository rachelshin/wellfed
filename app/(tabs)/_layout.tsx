import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={[s.icon, focused && s.iconFocused]}>{emoji}</Text>;
}

const s = StyleSheet.create({
  icon: { fontSize: 22, opacity: 0.4 },
  iconFocused: { opacity: 1 },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B9D',
        tabBarInactiveTintColor: '#C4B5C8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#FCE7F3',
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
          tabBarIcon: ({ focused }) => <TabIcon emoji="💸" focused={focused} />,
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
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🍳" focused={focused} />,
        }}
      />
      {/* Pantry is a screen but not shown in the tab bar */}
      <Tabs.Screen
        name="pantry"
        options={{ href: null }}
      />
    </Tabs>
  );
}
