import { Tabs } from 'expo-router';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import theme, { fonts } from '../../lib/theme';

function makeTabButton(color: string) {
  return function TabButton({ children, onPress, accessibilityState }: any) {
    const focused = accessibilityState?.selected;
    return (
      <TouchableOpacity
        onPress={onPress ?? undefined}
        style={[s.tabBtn, { borderTopColor: focused ? color : 'transparent' }]}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  };
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowIcon: false,
        tabBarStyle: {
          backgroundColor: theme.bg,
          borderTopWidth: 0,
          height: 72,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Budget',
          tabBarLabel: ({ focused }) => (
            <Text style={[s.tabLabel, { color: focused ? theme.heroCard : theme.textFaint }]}>Budget</Text>
          ),
          tabBarButton: makeTabButton(theme.heroCard),
        }}
      />
      <Tabs.Screen
        name="prices"
        options={{
          title: 'Prices',
          tabBarLabel: ({ focused }) => (
            <Text style={[s.tabLabel, { color: focused ? theme.heroPrices : theme.textFaint }]}>Prices</Text>
          ),
          tabBarButton: makeTabButton(theme.heroPrices),
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: 'Pantry',
          tabBarLabel: ({ focused }) => (
            <Text style={[s.tabLabel, { color: focused ? theme.heroPantry : theme.textFaint }]}>Pantry</Text>
          ),
          tabBarButton: makeTabButton(theme.heroPantry),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarLabel: ({ focused }) => (
            <Text style={[s.tabLabel, { color: focused ? theme.heroRecipes : theme.textFaint }]}>Recipes</Text>
          ),
          tabBarButton: makeTabButton(theme.heroRecipes),
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 2,
    paddingTop: 10,
    paddingBottom: 16,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: fonts.display,
    letterSpacing: 0.2,
  },
});
