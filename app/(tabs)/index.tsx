import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, TextInput, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import {
  loadEntries, loadSettings, saveSettings, addEntry, deleteEntry, updateEntry,
  getCachedEntries, getCachedSettings, getLocalCachedEntries, getLocalCachedSettings,
  getDaySpent, refreshCarry, CATEGORIES,
  today, yesterday, formatDate, SpendingEntry, BudgetSettings,
  FundsRecord, loadFundsRecords, addFundsRecord, updateFundsRecord, deleteFundsRecord,
  getCachedFunds, getLocalCachedFunds, ensureDailyIncrements,
} from '../../store/budget';
import AddEntryModal from '../../components/budget/AddEntryModal';
import FundsRecordModal from '../../components/budget/FundsRecordModal';
import HeroHeader from '../../components/HeroHeader';
import { fab, heroOutlineBtn } from '../../lib/sharedStyles';
import { useAuth } from '../../context/auth';
import theme from '../../lib/theme';

type RecordItem =
  | { kind: 'spending'; entry: SpendingEntry }
  | { kind: 'funds'; record: FundsRecord };

export default function BudgetTab() {
  const insets = useSafeAreaInsets();
  const { isGuest, exitGuestMode, user } = useAuth();
  const [entries, setEntries] = useState<SpendingEntry[]>([]);
  const [fundsRecords, setFundsRecords] = useState<FundsRecord[]>([]);
  const [settings, setSettings] = useState<BudgetSettings | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState<SpendingEntry | null>(null);
  const [showFundsModal, setShowFundsModal] = useState(false);
  const [editFunds, setEditFunds] = useState<FundsRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState<'daily' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);

  const todayStr = today();

  const load = async () => {
    let e: SpendingEntry[];
    let s: BudgetSettings | null;
    let f: FundsRecord[];

    if (user?.uid) {
      const cachedE = getCachedEntries(user.uid);
      const cachedS = getCachedSettings(user.uid);
      const cachedF = getCachedFunds(user.uid);
      if (cachedE) setEntries(cachedE);
      if (cachedS !== undefined) setSettings(cachedS);
      if (cachedF) setFundsRecords(cachedF);

      if (!cachedE || cachedS === undefined || !cachedF) {
        const [localE, localS, localF] = await Promise.all([
          !cachedE ? getLocalCachedEntries(user.uid) : Promise.resolve(null),
          cachedS === undefined ? getLocalCachedSettings(user.uid) : Promise.resolve(undefined as BudgetSettings | null | undefined),
          !cachedF ? getLocalCachedFunds(user.uid) : Promise.resolve(null),
        ]);
        if (localE) setEntries(localE);
        if (localS !== undefined) setSettings(localS);
        if (localF) setFundsRecords(localF);
      }

      s = await loadSettings(user.uid);
      e = await loadEntries(user.uid);
      f = await loadFundsRecords(user.uid);
    } else {
      [e, s, f] = await Promise.all([loadEntries(), loadSettings(), loadFundsRecords()]);
    }

    setEntries(e);
    if (!s) {
      setSettings(null);
      setEditMode('daily');
      setEditValue('');
      return;
    }
    const updated = refreshCarry(e, s, yesterday());
    if (updated !== s) saveSettings(updated, user?.uid);
    setSettings(updated);

    const { records: updatedFunds, settings: settingsWithFunds } = await ensureDailyIncrements(f, updated, todayStr, user?.uid);
    setFundsRecords(updatedFunds);
    if (settingsWithFunds !== updated) {
      saveSettings(settingsWithFunds, user?.uid);
      setSettings(settingsWithFunds);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const todaySpent = getDaySpent(entries, todayStr);
  const totalFunds = fundsRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalSpent = entries.reduce((sum, e) => sum + e.amount, 0);
  const remaining = settings ? totalFunds - totalSpent : 0;
  const rollover = settings ? remaining + todaySpent - settings.dailyBudget : 0;
  const pct = settings ? Math.min(totalSpent / Math.max(totalFunds, 1), 1) : 0;

  // Unified sorted list: spending entries + funds records, most recent first
  const allRecords: RecordItem[] = [
    ...entries.map((entry) => ({ kind: 'spending' as const, entry })),
    ...fundsRecords.map((record) => ({ kind: 'funds' as const, record })),
  ].sort((a, b) => {
    const dateA = a.kind === 'spending' ? a.entry.date : a.record.date;
    const dateB = b.kind === 'spending' ? b.entry.date : b.record.date;
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    const tsA = a.kind === 'spending' ? a.entry.timestamp : a.record.timestamp;
    const tsB = b.kind === 'spending' ? b.entry.timestamp : b.record.timestamp;
    return tsB - tsA;
  });

  const startEditDaily = () => {
    setEditValue(settings ? String(settings.dailyBudget) : '');
    setEditMode('daily');
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.navigator?.standalone || !window.visualViewport) return;
    const onResize = () =>
      setIosPWAKeyboard(Math.max(0, window.innerHeight - window.visualViewport!.height));
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport!.removeEventListener('resize', onResize);
  }, []);

  const commitEdit = async () => {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val > 0 && editMode === 'daily') {
      const newSettings: BudgetSettings = {
        dailyBudget: val,
        startDate: settings?.startDate ?? today(),
      };
      await saveSettings(newSettings, user?.uid);
      setSettings(newSettings);
    }
    setEditMode(null);
  };

  const bigLabel = () => {
    if (editMode === 'daily' && !settings) return 'set your daily budget 🌟';
    if (!settings) return 'tap to set your daily budget 🌟';
    return 'Total available today';
  };

  const showBigEdit = editMode === 'daily' && !settings;

  const handleSaveEntry = async (entryData: Omit<SpendingEntry, 'id' | 'timestamp'>) => {
    if (editEntry) {
      setEntries(await updateEntry(entries, editEntry.id, entryData, user?.uid));
    } else {
      setEntries(await addEntry(entries, entryData, user?.uid));
    }
    setShowAdd(false);
    setEditEntry(null);
  };

  const handleDeleteEntry = async () => {
    if (!editEntry) return;
    setEntries(await deleteEntry(entries, editEntry.id, user?.uid));
    setShowAdd(false);
    setEditEntry(null);
  };

  const handleSaveFunds = async (recordData: Omit<FundsRecord, 'id' | 'timestamp'>) => {
    if (editFunds) {
      setFundsRecords(await updateFundsRecord(fundsRecords, editFunds.id, recordData, user?.uid));
    } else {
      setFundsRecords(await addFundsRecord(fundsRecords, recordData, user?.uid));
    }
    setShowFundsModal(false);
    setEditFunds(null);
  };

  const handleDeleteFunds = async () => {
    if (!editFunds) return;
    setFundsRecords(await deleteFundsRecord(fundsRecords, editFunds.id, user?.uid));
    setShowFundsModal(false);
    setEditFunds(null);
  };

  return (
    <View style={s.root}>
      <HeroHeader
        eyebrow={formatDate(todayStr)}
        title="Well Fed 🌿"
        cardColor={theme.heroCard}
        right={isGuest ? (
          <TouchableOpacity style={heroOutlineBtn.btn} onPress={exitGuestMode}>
            <Text style={heroOutlineBtn.text}>Sign in</Text>
          </TouchableOpacity>
        ) : null}
      >
        {showBigEdit ? (
          <>
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
            <Text style={s.bigLabel}>set your daily budget</Text>
          </>
        ) : settings ? (
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
                <Text style={[s.statVal, remaining < 0 && s.bigAmountNeg]}>
                  ${Math.abs(remaining).toFixed(2)}
                </Text>
                <Text style={s.statLabel}>AVAILABLE TODAY</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.stat}>
                <Text style={[s.statVal, s.statSpent]}>${todaySpent.toFixed(2)}</Text>
                <Text style={s.statLabel}>SPENT TODAY</Text>
              </View>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${pct * 100}%` as any }, pct >= 1 && s.progressOver]} />
            </View>
          </>
        ) : (
          <Text style={s.bigLabel}>tap to set your daily budget</Text>
        )}
      </HeroHeader>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} colors={[theme.accent]} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Records</Text>
          {settings && (
            <TouchableOpacity style={s.addFundsBtn} onPress={() => { setEditFunds(null); setShowFundsModal(true); }}>
              <Text style={s.addFundsBtnText}>+ Add Funds</Text>
            </TouchableOpacity>
          )}
        </View>

        {allRecords.length === 0 ? (
          <View style={s.noEntries}>
            <Text style={s.noEntriesTitle}>Nothing logged yet 🍽️</Text>
            <Text style={s.noEntriesText}>Tap + to add your first entry today.</Text>
          </View>
        ) : (
          allRecords.map((item) => {
            if (item.kind === 'spending') {
              const { entry } = item;
              const cat = CATEGORIES[entry.category];
              return (
                <TouchableOpacity
                  key={entry.id}
                  style={[s.entryRow, { borderLeftColor: cat.color }]}
                  onPress={() => setEditEntry(entry)}
                  activeOpacity={0.7}
                >
                  <Text style={s.catEmoji}>{cat.emoji}</Text>
                  <View style={s.entryInfo}>
                    <Text style={s.entryDesc} numberOfLines={1}>
                      {entry.description || cat.label}
                    </Text>
                    <Text style={s.entryCat}>{cat.label} · {formatDate(entry.date)}</Text>
                  </View>
                  <Text style={[s.entryAmt, s.entryAmtNeg]}>-${entry.amount.toFixed(2)}</Text>
                </TouchableOpacity>
              );
            } else {
              const { record } = item;
              const label = record.type === 'daily-increment'
                ? 'Daily Budget'
                : (record.note || 'Funds Added');
              return (
                <TouchableOpacity
                  key={record.id}
                  style={[s.entryRow, s.fundsRow]}
                  onPress={() => { setEditFunds(record); setShowFundsModal(true); }}
                  activeOpacity={0.7}
                >
                  <Text style={s.catEmoji}>🌱</Text>
                  <View style={s.entryInfo}>
                    <Text style={s.entryDesc} numberOfLines={1}>{label}</Text>
                    <Text style={s.entryCat}>{formatDate(record.date)}</Text>
                  </View>
                  <Text style={[s.entryAmt, s.entryAmtPos]}>+${record.amount.toFixed(2)}</Text>
                </TouchableOpacity>
              );
            }
          })
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {settings && (
        <TouchableOpacity
          style={[fab.btn, { bottom: insets.bottom + 72 }]}
          onPress={() => { setEditEntry(null); setShowAdd(true); }}
          activeOpacity={0.85}
        >
          <Text style={fab.label}>+</Text>
        </TouchableOpacity>
      )}

      <AddEntryModal
        visible={showAdd || !!editEntry}
        onClose={() => { setShowAdd(false); setEditEntry(null); }}
        entry={editEntry}
        onSave={handleSaveEntry}
        onDelete={editEntry ? handleDeleteEntry : undefined}
      />

      <FundsRecordModal
        visible={showFundsModal || !!editFunds}
        onClose={() => { setShowFundsModal(false); setEditFunds(null); }}
        record={editFunds}
        onSave={handleSaveFunds}
        onDelete={editFunds ? handleDeleteFunds : undefined}
      />


    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },

  // Big number
  bigAmount: { fontSize: 32, fontWeight: '700', color: theme.textDark },
  bigAmountNeg: { color: theme.negative },
  bigLabel: {
    fontSize: 14, color: theme.textFaint, marginBottom: 22,
    fontWeight: '500', marginTop: 2,
  },
  bigLabelNeg: { color: theme.negative },

  bigEditRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigInput: {
    fontSize: 32, fontWeight: '700', color: theme.textDark,
    borderWidth: 0, padding: 0, margin: 0, minWidth: 60, outlineWidth: 0,
  },
  bigEditDone: {
    borderWidth: 1.5, borderColor: theme.border, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  bigEditDoneText: { color: theme.textDark, fontSize: 18, fontWeight: '700' },

  // Stats
  statRow: { flexDirection: 'row', marginBottom: 18 },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: theme.textDark },
  statSpent: { color: theme.negative },
  statLabel: {
    fontSize: 10, color: theme.textFaint, marginTop: 3,
    fontWeight: '700', letterSpacing: 0.6,
  },
  statDivider: { width: 1, backgroundColor: theme.border, marginVertical: 4 },
  statEditRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  // Rollover
  rolloverBadge: {
    backgroundColor: theme.primaryLight, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7, marginBottom: 16, alignSelf: 'flex-start',
  },
  rolloverBadgeNeg: {
    backgroundColor: theme.accentLight, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7, marginBottom: 16, alignSelf: 'flex-start',
  },
  rolloverText: { fontSize: 12, color: theme.primary, fontWeight: '700' },
  rolloverTextNeg: { fontSize: 12, color: theme.accent, fontWeight: '700' },

  // Progress
  progressTrack: {
    height: 4, backgroundColor: theme.border,
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: theme.heroCard, borderRadius: 2 },
  progressOver: { backgroundColor: theme.negative },

  // List
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 28 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: theme.textFaint,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  addFundsBtn: {
    backgroundColor: theme.accentLight, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  addFundsBtnText: { fontSize: 12, fontWeight: '700', color: theme.accent },

  noEntries: { alignItems: 'center', paddingVertical: 48 },
  noEntriesTitle: { fontSize: 17, fontWeight: '800', color: theme.textDark, marginBottom: 6 },
  noEntriesText: { fontSize: 14, color: theme.textFaint },

  entryRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border,
  },
  fundsRow: { borderLeftColor: theme.positive },
  catEmoji: { fontSize: 24, marginRight: 12 },
  entryInfo: { flex: 1 },
  entryDesc: { fontSize: 15, fontWeight: '700', color: theme.textDark },
  entryCat: { fontSize: 12, color: theme.textFaint, marginTop: 2, fontWeight: '500' },
  entryAmt: { fontSize: 17, fontWeight: '800', color: theme.textDark },
  entryAmtNeg: { color: theme.negative },
  entryAmtPos: { color: theme.positive },

  // stat input (inline hero edit)
  statInput: {
    fontSize: 18, fontWeight: '800', color: theme.textDark,
    borderBottomWidth: 1, borderColor: theme.border,
    padding: 0, minWidth: 40,
  },
  statDone: { fontSize: 16, fontWeight: '800', color: theme.textDark, marginLeft: 4 },
});
