import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import {
  loadEntries, loadSettings, saveSettings, addEntry, deleteEntry,
  getDaySpent, getAvailableBudget, CATEGORIES,
  today, formatDate, SpendingEntry, BudgetSettings,
} from '../../store/budget';
import AddEntryModal from '../../components/budget/AddEntryModal';
import { useAuth } from '../../context/auth';
import theme from '../../lib/theme';

export default function BudgetTab() {
  const insets = useSafeAreaInsets();
  const { isGuest, exitGuestMode, user } = useAuth();
  const [entries, setEntries] = useState<SpendingEntry[]>([]);
  const [settings, setSettings] = useState<BudgetSettings | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState<'remaining' | 'daily' | null>(null);
  const [editValue, setEditValue] = useState('');

  const todayStr = today();

  const load = async () => {
    const [e, s] = await Promise.all([loadEntries(user?.uid), loadSettings(user?.uid)]);
    setEntries(e);
    setSettings(s);
    if (!s) { setEditMode('daily'); setEditValue(''); }
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

  const startEditRemaining = () => {
    if (!settings) { startEditDaily(); return; }
    setEditValue(remaining >= 0 ? remaining.toFixed(2) : '0');
    setEditMode('remaining');
  };

  const startEditDaily = () => {
    setEditValue(settings ? String(settings.dailyBudget) : '');
    setEditMode('daily');
  };

  const commitEdit = async () => {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val > 0) {
      if (editMode === 'daily') {
        const newSettings: BudgetSettings = {
          dailyBudget: val,
          startDate: settings?.startDate ?? today(),
          adjustments: settings?.adjustments,
        };
        await saveSettings(newSettings, user?.uid);
        setSettings(newSettings);
        setEditMode(null);
      } else if (editMode === 'remaining' && settings) {
        // Compute adjustment so that remaining = val exactly
        const baseSettings: BudgetSettings = {
          ...settings,
          adjustments: { ...settings.adjustments, [todayStr]: 0 },
        };
        const baseRemaining = getAvailableBudget(entries, baseSettings, todayStr) - spent;
        const newAdj = val - baseRemaining;
        const newSettings: BudgetSettings = {
          ...settings,
          adjustments: { ...(settings.adjustments ?? {}), [todayStr]: newAdj },
        };
        await saveSettings(newSettings, user?.uid);
        setSettings(newSettings);
        setEditMode(null);
      }
    } else if (settings) {
      setEditMode(null);
    }
    // no settings + invalid value: stay in edit mode until a valid number is entered
  };

  const handleDelete = (entry: SpendingEntry) => {
    Alert.alert('Remove entry?', `"${entry.description || CATEGORIES[entry.category].label}"`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => setEntries(await deleteEntry(entries, entry.id, user?.uid)),
      },
    ]);
  };

  const bigLabel = () => {
    if (editMode === 'remaining') return 'set remaining for today';
    if (editMode === 'daily' && !settings) return 'set your daily budget';
    if (!settings) return 'tap to set your daily budget';
    if (remaining < 0) return 'over budget today';
    if (pct < 0.5) return 'plenty left — nice work!';
    if (pct < 0.8) return 'left for today';
    return 'left — almost there!';
  };

  const showBigEdit = editMode === 'remaining' || (editMode === 'daily' && !settings);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View>
          <Text style={s.headerEyebrow}>Today</Text>
          <Text style={s.headerTitle}>Well Fed 💸</Text>
        </View>
        {isGuest && (
          <TouchableOpacity onPress={exitGuestMode} style={s.signInBtn}>
            <Text style={s.signInBtnText}>Sign in</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.card}>
          <Text style={s.dateLabel}>{formatDate(todayStr)}</Text>

          {showBigEdit ? (
            <View style={s.bigEditRow}>
              <TextInput
                style={s.bigInput}
                value={editValue}
                onChangeText={setEditValue}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.placeholder}
                autoFocus
                onSubmitEditing={commitEdit}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={commitEdit} style={s.bigEditDone}>
                <Text style={s.bigEditDoneText}>✓</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={startEditRemaining} activeOpacity={0.7}>
              <Text style={[s.bigAmount, remaining < 0 && s.negative]}>
                {settings ? `$${Math.abs(remaining).toFixed(2)}` : '—'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={[s.bigLabel, remaining < 0 && editMode !== 'remaining' && s.negativeLabelText]}>
            {bigLabel()}
          </Text>

          {settings && (
            <>
              <View style={s.statRow}>
                {editMode === 'daily' ? (
                  <View style={s.stat}>
                    <View style={s.statEditRow}>
                      <TextInput
                        style={s.statInput}
                        value={editValue}
                        onChangeText={setEditValue}
                        keyboardType="decimal-pad"
                        autoFocus
                        onSubmitEditing={commitEdit}
                        returnKeyType="done"
                      />
                      <TouchableOpacity onPress={commitEdit}>
                        <Text style={s.statDone}>✓</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={s.statLabel}>daily</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={s.stat} onPress={startEditDaily} activeOpacity={0.6}>
                    <Text style={s.statVal}>${settings.dailyBudget.toFixed(2)}</Text>
                    <Text style={s.statLabel}>daily</Text>
                  </TouchableOpacity>
                )}
                <View style={s.divider} />
                <View style={s.stat}>
                  <Text style={[s.statVal, s.spentVal]}>${spent.toFixed(2)}</Text>
                  <Text style={s.statLabel}>spent</Text>
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
            </>
          )}
        </View>

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

      {settings && (
        <TouchableOpacity
          style={[s.fab, { bottom: insets.bottom + 72 }]}
          onPress={() => setShowAdd(true)}
          activeOpacity={0.85}
        >
          <Text style={s.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <AddEntryModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={async (entry) => { setEntries(await addEntry(entries, entry, user?.uid)); setShowAdd(false); }}
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
  signInBtn: { backgroundColor: theme.primaryLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 2 },
  signInBtnText: { color: theme.primary, fontWeight: '800', fontSize: 13 },

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

  bigEditRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigInput: {
    fontSize: 56, fontWeight: '900', color: theme.primary, lineHeight: 60,
    borderWidth: 0, padding: 0, margin: 0, minWidth: 80,
  },
  bigEditDone: {
    backgroundColor: theme.primary, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  bigEditDoneText: { color: theme.card, fontSize: 20, fontWeight: '700' },

  statRow: { flexDirection: 'row', marginBottom: 16, backgroundColor: theme.bgTint, borderRadius: 14, padding: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '800', color: theme.textDark },
  spentVal: { color: '#F97316' },
  statLabel: { fontSize: 11, color: theme.textFaint, marginTop: 2, fontWeight: '600' },
  divider: { width: 1, backgroundColor: theme.border, marginVertical: 2 },

  statEditRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statInput: {
    fontSize: 16, fontWeight: '800', color: theme.textDark,
    borderWidth: 0, padding: 0, minWidth: 48, textAlign: 'center',
  },
  statDone: { fontSize: 14, color: theme.primary, fontWeight: '800' },

  rolloverBadge: { backgroundColor: theme.primaryLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14 },
  rolloverBadgeNeg: { backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14 },
  rolloverText: { fontSize: 13, color: theme.primary, fontWeight: '700' },
  rolloverTextNeg: { fontSize: 13, color: theme.warning, fontWeight: '700' },

  progressTrack: { height: 6, backgroundColor: theme.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.primary, borderRadius: 3 },
  progressOver: { backgroundColor: theme.negative },

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
