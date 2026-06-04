import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Platform,
} from 'react-native';
import AppModal from '../AppModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { modalSheet } from '../../lib/sharedStyles';
import { MealPlanOptions } from '../../lib/ai';
import theme from '../../lib/theme';

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
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const contentH = useRef(0);
  const viewH = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.navigator?.standalone || !window.visualViewport) return;
    const onResize = () =>
      setIosPWAKeyboard(Math.max(0, window.innerHeight - window.visualViewport!.height));
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport!.removeEventListener('resize', onResize);
  }, []);

  // When keyboard opens/closes the layout shifts, which can push the scroll position past the
  // content end (showing empty whitespace). Clamp it back to the valid maximum.
  useEffect(() => {
    if (Platform.OS !== 'web' || !scrollRef.current) return;
    requestAnimationFrame(() => {
      const max = Math.max(0, contentH.current - viewH.current);
      if (scrollY.current > max) {
        scrollRef.current?.scrollTo({ y: max, animated: false });
      }
    });
  }, [iosPWAKeyboard]);

  const handleGenerate = () => {
    const p = parseInt(people, 10);
    const bg = parseFloat(budget);
    onGenerate({
      people: isNaN(p) || p < 1 ? 2 : p,
      dietaryRestrictions: dietary.trim(),
      weeklyBudget: !isNaN(bg) && bg > 0 ? bg : null,
      notes: notes.trim(),
    });
  };

  return (
    <AppModal visible={visible} animationType="slide" transparent>
      <View style={modalSheet.backdrop}>
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
