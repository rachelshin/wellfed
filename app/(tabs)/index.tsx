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
import HeroHeader from '../../components/HeroHeader';
import { fab, heroOutlineBtn } from '../../lib/sharedStyles';
import { useAuth } from '../../context/auth';
import theme from '../../lib/theme';

export default function BudgetTab() {
  const insets = useSafeAreaInsets();
  const { isGuest, exitGuestMode, user } = useAuth();
  const [entries, setEntries] = useState<SpendingEntry[]>([]);
  const [settings, setSettings] = useState<BudgetSettings | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState<'remaining' | 'daily' | 'bank' | null>(null);
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

  const startEditBank = () => {
    setEditValue(settings?.bankBalance != null ? settings.bankBalance.toFixed(2) : '');
    setEditMode('bank');
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
    } else if (editMode === 'bank' && settings) {
        const newSettings: BudgetSettings = { ...settings, bankBalance: val };
        await saveSettings(newSettings, user?.uid);
        setSettings(newSettings);
        setEditMode(null);
    } else if (settings) {
      setEditMode(null);
    }
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
    if (editMode === 'remaining') return 'set remaining for today ✏️';
    if (editMode === 'daily' && !settings) return 'set your daily budget 🌟';
    if (!settings) return 'tap to set your daily budget 🌟';
    if (remaining < 0) return 'over budget today 😬';
    if (pct < 0.5) return 'plenty left — nice work! ✨';
    if (pct < 0.8) return 'left for today 🌸';
    return 'left — almost there! 💪';
  };

  const showBigEdit = editMode === 'remaining' || (editMode === 'daily' && !settings);

  return (
    <View style={s.root}>
      <HeroHeader
        eyebrow={formatDate(todayStr)}
        title="Well Fed ✨"
        cardColor="#7050BE"
        right={isGuest ? (
          <TouchableOpacity style={heroOutlineBtn.btn} onPress={exitGuestMode}>
            <Text style={heroOutlineBtn.text}>Sign in</Text>
          </TouchableOpacity>
        ) : null}
      >
        {showBigEdit ? (
          <View style={s.bigEditRow}>
            <TextInput
              style={s.bigInput}
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="rgba(254,246,240,0.3)"
              autoFocus
              onSubmitEditing={commitEdit}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={commitEdit} style={s.bigEditDone}>
              <Text style={s.bigEditDoneText}>✓</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={startEditRemaining} activeOpacity={0.8}>
            <Text style={[s.bigAmount, remaining < 0 && s.bigAmountNeg]}>
              {settings ? `$${Math.abs(remaining).toFixed(2)}` : '—'}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={[s.bigLabel, remaining < 0 && editMode !== 'remaining' && s.bigLabelNeg]}>
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
                  <Text style={s.statLabel}>DAILY</Text>
                </View>
              ) : (
                <TouchableOpacity style={s.stat} onPress={startEditDaily} activeOpacity={0.6}>
                  <Text style={s.statVal}>${settings.dailyBudget.toFixed(2)}</Text>
                  <Text style={s.statLabel}>DAILY</Text>
                </TouchableOpacity>
              )}
              <View style={s.statDivider} />
              <View style={s.stat}>
                <Text style={[s.statVal, s.statSpent]}>${spent.toFixed(2)}</Text>
                <Text style={s.statLabel}>SPENT</Text>
              </View>
              <View style={s.statDivider} />
              {editMode === 'bank' ? (
                <View style={s.stat}>
                  <View style={s.statEditRow}>
                    <Text style={s.statVal}>$</Text>
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
                  <Text style={s.statLabel}>IN BANK</Text>
                </View>
              ) : (
                <TouchableOpacity style={s.stat} onPress={startEditBank} activeOpacity={0.6}>
                  <Text style={s.statVal}>
                    {settings.bankBalance != null ? `$${settings.bankBalance.toFixed(2)}` : '—'}
                  </Text>
                  <Text style={s.statLabel}>IN BANK</Text>
                </TouchableOpacity>
              )}
            </View>

            {rollover > 0 && (
              <View style={s.rolloverBadge}>
                <Text style={s.rolloverText}>+${rollover.toFixed(2)} saved from before 🎉</Text>
              </View>
            )}
            {rollover < 0 && (
              <View style={s.rolloverBadgeNeg}>
                <Text style={s.rolloverTextNeg}>${Math.abs(rollover).toFixed(2)} carried over 😅</Text>
              </View>
            )}

            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${pct * 100}%` as any }, pct >= 1 && s.progressOver]} />
            </View>
          </>
        )}
      </HeroHeader>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} colors={[theme.accent]} />}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.sectionTitle}>Today's Spending</Text>

        {todayEntries.length === 0 ? (
          <View style={s.noEntries}>
            <Text style={s.noEntriesTitle}>Nothing logged yet 🍽️</Text>
            <Text style={s.noEntriesText}>Tap + to add your first entry today.</Text>
          </View>
        ) : (
          todayEntries.map((entry) => {
            const cat = CATEGORIES[entry.category];
            return (
              <TouchableOpacity
                key={entry.id}
                style={[s.entryRow, { borderLeftColor: cat.color }]}
                onLongPress={() => handleDelete(entry)}
                activeOpacity={0.7}
              >
                <Text style={s.catEmoji}>{cat.emoji}</Text>
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
          <Text style={s.hint}>Hold to remove</Text>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {settings && (
        <TouchableOpacity
          style={[fab.btn, { bottom: insets.bottom + 72 }]}
          onPress={() => setShowAdd(true)}
          activeOpacity={0.85}
        >
          <Text style={fab.label}>+</Text>
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

  // Big number
  bigAmount: { fontSize: 64, fontWeight: '900', color: theme.warning, lineHeight: 68 },
  bigAmountNeg: { color: theme.negative },
  bigLabel: {
    fontSize: 14, color: 'rgba(254,246,240,0.5)', marginBottom: 22,
    fontWeight: '500', marginTop: 2,
  },
  bigLabelNeg: { color: theme.negative },

  bigEditRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigInput: {
    fontSize: 64, fontWeight: '900', color: theme.warning, lineHeight: 68,
    borderWidth: 0, padding: 0, margin: 0, minWidth: 80,
  },
  bigEditDone: {
    borderWidth: 1.5, borderColor: theme.warning, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  bigEditDoneText: { color: theme.warning, fontSize: 18, fontWeight: '700' },

  // Stats
  statRow: { flexDirection: 'row', marginBottom: 18 },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: theme.bg },
  statSpent: { color: theme.accent },
  statLabel: {
    fontSize: 10, color: 'rgba(254,246,240,0.4)', marginTop: 3,
    fontWeight: '700', letterSpacing: 0.6,
  },
  statDivider: { width: 1, backgroundColor: 'rgba(254,246,240,0.12)', marginVertical: 4 },

  statEditRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statInput: {
    fontSize: 18, fontWeight: '800', color: theme.bg,
    borderWidth: 0, padding: 0, minWidth: 52, textAlign: 'center',
  },
  statDone: { fontSize: 15, color: theme.warning, fontWeight: '800' },

  // Rollover
  rolloverBadge: {
    backgroundColor: 'rgba(167,139,219,0.18)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7, marginBottom: 16, alignSelf: 'flex-start',
  },
  rolloverBadgeNeg: {
    backgroundColor: 'rgba(244,207,110,0.15)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7, marginBottom: 16, alignSelf: 'flex-start',
  },
  rolloverText: { fontSize: 12, color: theme.primary, fontWeight: '700' },
  rolloverTextNeg: { fontSize: 12, color: theme.warning, fontWeight: '700' },

  // Progress
  progressTrack: {
    height: 6, backgroundColor: 'rgba(254,246,240,0.12)',
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: theme.accent, borderRadius: 3 },
  progressOver: { backgroundColor: theme.negative },

  // List
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 28 },
  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: theme.textFaint,
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14,
  },

  noEntries: { alignItems: 'center', paddingVertical: 48 },
  noEntriesTitle: { fontSize: 17, fontWeight: '800', color: theme.textDark, marginBottom: 6 },
  noEntriesText: { fontSize: 14, color: theme.textFaint },

  entryRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
    borderLeftWidth: 4,
  },
  catEmoji: { fontSize: 24, marginRight: 12 },
  entryInfo: { flex: 1 },
  entryDesc: { fontSize: 15, fontWeight: '700', color: theme.textDark },
  entryCat: { fontSize: 12, color: theme.textFaint, marginTop: 2, fontWeight: '500' },
  entryAmt: { fontSize: 17, fontWeight: '800', color: theme.textDark },

  hint: {
    textAlign: 'center', fontSize: 12, color: theme.textFaint,
    opacity: 0.5, marginTop: 4, marginBottom: 8,
  },
});
