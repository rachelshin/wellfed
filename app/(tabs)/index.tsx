import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import {
  loadEntries, loadSettings, saveSettings, addEntry, deleteEntry,
  getDaySpent, getAvailableBudget, CATEGORIES,
  today, formatDate, SpendingEntry, BudgetSettings,
} from '../../store/budget';
import AddEntryModal from '../../components/budget/AddEntryModal';
import SetBudgetModal from '../../components/budget/SetBudgetModal';
import { useAuth } from '../../context/auth';
import theme from '../../lib/theme';

export default function BudgetTab() {
  const insets = useSafeAreaInsets();
  const { isGuest, exitGuestMode, user } = useAuth();
  const [entries, setEntries] = useState<SpendingEntry[]>([]);
  const [settings, setSettings] = useState<BudgetSettings | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const todayStr = today();

  const load = async () => {
    const [e, s] = await Promise.all([loadEntries(user?.uid), loadSettings(user?.uid)]);
    setEntries(e);
    setSettings(s);
    if (!s) setShowBudget(true);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const todayEntries = entries
    .filter((e) => e.date === todayStr)
    .sort((a, b) => b.timestamp - a.timestamp);

  const spent = getDaySpent(entries, todayStr);
  const available = settings ? getAvailableBudget(entries, settings, todayStr) : 0;
  const remaining = available - spent;
  const rollover = settings ? available - settings.dailyBudget : 0;
  const pct = available > 0 ? Math.min(spent / available, 1) : 0;

  const handleDelete = (entry: SpendingEntry) => {
    Alert.alert('Remove entry?', `"${entry.description || CATEGORIES[entry.category].label}"`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => setEntries(await deleteEntry(entries, entry.id, user?.uid)),
      },
    ]);
  };

  const encouragingLabel = () => {
    if (!settings) return '';
    if (remaining < 0) return 'over budget today';
    if (pct < 0.5) return 'plenty left — nice work!';
    if (pct < 0.8) return 'left for today';
    return 'left — almost there!';
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View>
          <Text style={s.headerEyebrow}>Today</Text>
          <Text style={s.headerTitle}>Well Fed 💸</Text>
        </View>
        <View style={s.headerRight}>
          {isGuest && (
            <TouchableOpacity onPress={exitGuestMode} style={s.signInBtn}>
              <Text style={s.signInBtnText}>Sign in</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowBudget(true)} style={s.gearBtn}>
            <Text style={s.gearEmoji}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {settings ? (
          <View style={s.card}>
            <Text style={s.dateLabel}>{formatDate(todayStr)}</Text>
            <Text style={[s.bigAmount, remaining < 0 && s.negative]}>
              ${Math.abs(remaining).toFixed(2)}
            </Text>
            <Text style={[s.bigLabel, remaining < 0 && s.negativeLabelText]}>
              {encouragingLabel()}
            </Text>

            <View style={s.statRow}>
              <View style={s.stat}>
                <Text style={s.statVal}>${available.toFixed(2)}</Text>
                <Text style={s.statLabel}>available</Text>
              </View>
              <View style={s.divider} />
              <View style={s.stat}>
                <Text style={[s.statVal, s.spentVal]}>${spent.toFixed(2)}</Text>
                <Text style={s.statLabel}>spent</Text>
              </View>
              <View style={s.divider} />
              <View style={s.stat}>
                <Text style={s.statVal}>${settings.dailyBudget.toFixed(2)}</Text>
                <Text style={s.statLabel}>daily</Text>
              </View>
            </View>

            {rollover > 0 && (
              <View style={s.rolloverBadge}>
                <Text style={s.rolloverText}>
                  🎉 You saved ${rollover.toFixed(2)} from previous days!
                </Text>
              </View>
            )}
            {rollover < 0 && (
              <View style={s.rolloverBadgeNeg}>
                <Text style={s.rolloverTextNeg}>
                  💪 Went a bit over — you've got this today!
                </Text>
              </View>
            )}

            <View style={s.progressTrack}>
              <View style={[
                s.progressFill,
                { width: `${pct * 100}%` },
                pct >= 1 && s.progressOver,
              ]} />
            </View>
          </View>
        ) : (
          <TouchableOpacity style={s.emptyCard} onPress={() => setShowBudget(true)}>
            <Text style={s.emptyEmoji}>💸</Text>
            <Text style={s.emptyTitle}>Ready to start?</Text>
            <Text style={s.emptySub}>
              Set a daily budget and watch your savings grow — unused money rolls over every day!
            </Text>
            <View style={s.emptyBtn}>
              <Text style={s.emptyBtnText}>Set my budget ✨</Text>
            </View>
          </TouchableOpacity>
        )}

        <Text style={s.sectionTitle}>Today's Spending</Text>

        {todayEntries.length === 0 ? (
          <View style={s.noEntries}>
            <Text style={s.noEntriesEmoji}>🍽️</Text>
            <Text style={s.noEntriesTitle}>Nothing logged yet!</Text>
            <Text style={s.noEntriesText}>Tap + to add your first entry today.</Text>
          </View>
        ) : (
          todayEntries.map((entry) => {
            const cat = CATEGORIES[entry.category];
            return (
              <TouchableOpacity
                key={entry.id}
                style={s.entryRow}
                onLongPress={() => handleDelete(entry)}
                activeOpacity={0.7}
              >
                <View style={[s.catIcon, { backgroundColor: cat.color + '18' }]}>
                  <Text style={s.catEmoji}>{cat.emoji}</Text>
                </View>
                <View style={s.entryInfo}>
                  <Text style={s.entryDesc} numberOfLines={1}>
                    {entry.description || cat.label}
                  </Text>
                  <Text style={s.entryCat}>{cat.label}</Text>
                </View>
                <Text style={s.entryAmt}>${entry.amount.toFixed(2)}</Text>
              </TouchableOpacity>
            );
          })
        )}

        {todayEntries.length > 0 && (
          <Text style={s.hint}>Hold an entry to remove it</Text>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      <TouchableOpacity
        style={[s.fab, { bottom: insets.bottom + 72 }]}
        onPress={() => (settings ? setShowAdd(true) : setShowBudget(true))}
        activeOpacity={0.85}
      >
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      <AddEntryModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={async (entry) => { setEntries(await addEntry(entries, entry, user?.uid)); setShowAdd(false); }}
      />
      <SetBudgetModal
        visible={showBudget}
        current={settings}
        onClose={() => setShowBudget(false)}
        onSave={async (newSettings) => {
          await saveSettings(newSettings, user?.uid);
          setSettings(newSettings);
          setShowBudget(false);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },

  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14, paddingTop: 6,
  },
  headerEyebrow: { fontSize: 12, fontWeight: '700', color: theme.textFaint, letterSpacing: 0.5, textTransform: 'uppercase' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: theme.textDark },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  signInBtn: { backgroundColor: theme.primaryLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  signInBtnText: { color: theme.primary, fontWeight: '800', fontSize: 13 },
  gearBtn: { padding: 4 },
  gearEmoji: { fontSize: 22 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  card: {
    backgroundColor: theme.card, borderRadius: 24, padding: 22, marginBottom: 22,
    shadowColor: theme.primaryShadow, shadowOpacity: 0.08, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 4,
    borderWidth: 1.5, borderColor: theme.border,
  },
  dateLabel: { fontSize: 13, color: theme.textFaint, fontWeight: '600', marginBottom: 4 },
  bigAmount: { fontSize: 56, fontWeight: '900', color: theme.primary, lineHeight: 60 },
  negative: { color: theme.negative },
  bigLabel: { fontSize: 15, color: theme.textFaint, marginBottom: 20, fontWeight: '500' },
  negativeLabelText: { color: theme.negative },

  statRow: { flexDirection: 'row', marginBottom: 16, backgroundColor: theme.bgTint, borderRadius: 14, padding: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '800', color: theme.textDark },
  spentVal: { color: '#F97316' },
  statLabel: { fontSize: 11, color: theme.textFaint, marginTop: 2, fontWeight: '600' },
  divider: { width: 1, backgroundColor: theme.border, marginVertical: 2 },

  rolloverBadge: { backgroundColor: theme.primaryLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14 },
  rolloverBadgeNeg: { backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14 },
  rolloverText: { fontSize: 13, color: theme.primary, fontWeight: '700' },
  rolloverTextNeg: { fontSize: 13, color: theme.warning, fontWeight: '700' },

  progressTrack: { height: 6, backgroundColor: theme.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.primary, borderRadius: 3 },
  progressOver: { backgroundColor: theme.negative },

  emptyCard: {
    backgroundColor: theme.card, borderRadius: 24, padding: 32, alignItems: 'center',
    marginBottom: 22, borderWidth: 2, borderColor: theme.border, borderStyle: 'dashed',
  },
  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: theme.textDark, marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  emptyBtn: {
    backgroundColor: theme.primary, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12,
    shadowColor: theme.primaryShadow, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  emptyBtnText: { color: theme.card, fontWeight: '800', fontSize: 15 },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: theme.textDark, marginBottom: 12 },

  noEntries: { alignItems: 'center', paddingVertical: 36 },
  noEntriesEmoji: { fontSize: 42, marginBottom: 12 },
  noEntriesTitle: { fontSize: 17, fontWeight: '800', color: theme.textDark, marginBottom: 4 },
  noEntriesText: { fontSize: 14, color: theme.textFaint },

  entryRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.card, borderRadius: 16, padding: 14, marginBottom: 8,
    shadowColor: theme.primaryShadow, shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 1,
    borderWidth: 1, borderColor: theme.border,
  },
  catIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: 22 },
  entryInfo: { flex: 1, marginLeft: 12 },
  entryDesc: { fontSize: 15, fontWeight: '700', color: theme.textDark },
  entryCat: { fontSize: 12, color: theme.textFaint, marginTop: 2, fontWeight: '500' },
  entryAmt: { fontSize: 17, fontWeight: '800', color: theme.textDark },

  hint: { textAlign: 'center', fontSize: 12, color: theme.border, marginTop: 4, marginBottom: 8 },

  fab: {
    position: 'absolute', right: 20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.primaryShadow, shadowOpacity: 0.4, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  fabText: { color: theme.card, fontSize: 30, fontWeight: '300', lineHeight: 34 },
});
