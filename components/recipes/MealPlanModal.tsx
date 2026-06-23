import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable, ScrollView, Platform, StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppModal from '../AppModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { modalSheet } from '../../lib/sharedStyles';
import { MealPlanOptions } from '../../lib/ai';
import useIosPWAKeyboard from '../../lib/useIosPWAKeyboard';
import theme from '../../lib/theme';

const PROFILES_KEY = '@meal_plan_profiles';

interface MealPlanProfile {
  id: string;
  name: string;
  people: string;
  dietary: string;
  budget: string;
  notes: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onGenerate: (opts: MealPlanOptions) => void;
}

export default function MealPlanModal({ visible, onClose, onGenerate }: Props) {
  const insets = useSafeAreaInsets();
  const [people, setPeople] = useState('2');
  const [dietary, setDietary] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [pantryOnly, setPantryOnly] = useState(false);
  const iosPWAKeyboard = useIosPWAKeyboard();
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const contentH = useRef(0);
  const viewH = useRef(0);

  const [profiles, setProfiles] = useState<MealPlanProfile[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(PROFILES_KEY).then(raw => {
      if (raw) setProfiles(JSON.parse(raw));
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !scrollRef.current) return;
    requestAnimationFrame(() => {
      const max = Math.max(0, contentH.current - viewH.current);
      if (scrollY.current > max) {
        scrollRef.current?.scrollTo({ y: max, animated: false });
      }
    });
  }, [iosPWAKeyboard]);

  const applyProfile = (p: MealPlanProfile) => {
    setPeople(p.people);
    setDietary(p.dietary);
    setBudget(p.budget);
    setNotes(p.notes);
  };

  const deleteProfile = async (id: string) => {
    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
  };

  const saveProfile = async () => {
    const name = profileName.trim();
    if (!name) return;
    const existing = profiles.find(p => p.name.toLowerCase() === name.toLowerCase());
    const updated = existing
      ? profiles.map(p => p.id === existing.id ? { ...p, people, dietary, budget, notes } : p)
      : [...profiles, { id: Date.now().toString(), name, people, dietary, budget, notes }];
    setProfiles(updated);
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
    setShowSave(false);
    setProfileName('');
  };

  const handleGenerate = () => {
    const p = parseInt(people, 10);
    const bg = parseFloat(budget);
    onGenerate({
      people: isNaN(p) || p < 1 ? 2 : p,
      dietaryRestrictions: dietary.trim(),
      weeklyBudget: !isNaN(bg) && bg > 0 ? bg : null,
      notes: notes.trim(),
      pantryOnly,
    });
  };

  return (
    <AppModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalSheet.backdrop}>
        <Pressable style={modalSheet.backdropTap} onPress={onClose} />
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            scrollEventThrottle={16}
            onScroll={e => { scrollY.current = e.nativeEvent.contentOffset.y; }}
            onContentSizeChange={(_, h) => { contentH.current = h; }}
            onLayout={e => { viewH.current = e.nativeEvent.layout.height; }}
          >
            <Text style={modalSheet.title}>Prep your week 🥘</Text>

            <View style={s.scopeToggle}>
              <TouchableOpacity
                style={[s.scopeBtn, pantryOnly && s.scopeBtnActive]}
                onPress={() => setPantryOnly(true)}
                activeOpacity={0.75}
              >
                <Text style={[s.scopeBtnText, pantryOnly && s.scopeBtnTextActive]}>Pantry only</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.scopeBtn, !pantryOnly && s.scopeBtnActive]}
                onPress={() => setPantryOnly(false)}
                activeOpacity={0.75}
              >
                <Text style={[s.scopeBtnText, !pantryOnly && s.scopeBtnTextActive]}>Allow extras + list</Text>
              </TouchableOpacity>
            </View>

            {profiles.length > 0 && (
              <View style={s.profilesRow}>
                {profiles.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={s.chip}
                    onPress={() => applyProfile(p)}
                    onLongPress={() => deleteProfile(p.id)}
                  >
                    <Text style={s.chipText}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={modalSheet.label}>How many people is this for?</Text>
            <TextInput
              style={modalSheet.input}
              value={people}
              onChangeText={setPeople}
              keyboardType="number-pad"
              placeholder="2"
              placeholderTextColor={theme.placeholder}
              returnKeyType="next"
            />

            <Text style={modalSheet.label}>Dietary restrictions (optional)</Text>
            <TextInput
              style={modalSheet.input}
              value={dietary}
              onChangeText={setDietary}
              placeholder="e.g. vegetarian, gluten-free, no nuts"
              placeholderTextColor={theme.placeholder}
              returnKeyType="next"
            />

            <Text style={modalSheet.label}>Weekly grocery budget (optional)</Text>
            <TextInput
              style={modalSheet.input}
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
              placeholder="e.g. 100"
              placeholderTextColor={theme.placeholder}
              returnKeyType="next"
            />

            <Text style={modalSheet.label}>Anything else? (optional)</Text>
            <TextInput
              style={modalSheet.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. no fish, love spicy food, use up the chicken"
              placeholderTextColor={theme.placeholder}
              returnKeyType="done"
              onSubmitEditing={handleGenerate}
            />

            {showSave ? (
              <View style={s.saveRow}>
                <TextInput
                  style={[modalSheet.input, s.nameInput]}
                  value={profileName}
                  onChangeText={setProfileName}
                  placeholder="Profile name"
                  placeholderTextColor={theme.placeholder}
                  returnKeyType="done"
                  onSubmitEditing={saveProfile}
                  autoFocus
                />
                <TouchableOpacity style={s.saveBtn} onPress={saveProfile}>
                  <Text style={s.saveBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelSaveBtn} onPress={() => { setShowSave(false); setProfileName(''); }}>
                  <Text style={s.cancelSaveBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.saveProfileBtn} onPress={() => setShowSave(true)}>
                <Text style={s.saveProfileBtnText}>Save as profile</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <TouchableOpacity style={modalSheet.primaryBtn} onPress={handleGenerate}>
            <Text style={modalSheet.primaryBtnText}>Generate meal prep ✨</Text>
          </TouchableOpacity>
          <TouchableOpacity style={modalSheet.cancelBtn} onPress={onClose}>
            <Text style={modalSheet.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppModal>
  );
}

const s = StyleSheet.create({
  scopeToggle: {
    flexDirection: 'row', borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: theme.border, marginBottom: 20,
  },
  scopeBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    backgroundColor: theme.bg,
  },
  scopeBtnActive: { backgroundColor: theme.heroRecipes },
  scopeBtnText: { fontSize: 14, fontWeight: '700', color: theme.textFaint },
  scopeBtnTextActive: { color: '#FFFFFF' },

  profilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    backgroundColor: theme.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  nameInput: {
    flex: 1,
    marginBottom: 0,
  },
  saveBtn: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelSaveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  cancelSaveBtnText: {
    color: theme.textFaint,
    fontSize: 16,
  },
  saveProfileBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  saveProfileBtnText: {
    color: theme.textFaint,
    fontSize: 14,
    fontWeight: '600',
  },
});
