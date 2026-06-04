import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView, Platform,
} from 'react-native';
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
  const [servings, setServings] = useState('2');
  const [dietary, setDietary] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.navigator?.standalone || !window.visualViewport) return;
    const onResize = () =>
      setIosPWAKeyboard(Math.max(0, window.innerHeight - window.visualViewport!.height));
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport!.removeEventListener('resize', onResize);
  }, []);

  const handleGenerate = () => {
    const sv = parseInt(servings, 10);
    const bg = parseFloat(budget);
    onGenerate({
      servings: isNaN(sv) || sv < 1 ? 2 : sv,
      dietaryRestrictions: dietary.trim(),
      weeklyBudget: !isNaN(bg) && bg > 0 ? bg : null,
      notes: notes.trim(),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalSheet.backdrop}>
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={modalSheet.title}>Plan your week 📅</Text>

            <Text style={modalSheet.label}>Servings per meal</Text>
            <TextInput
              style={modalSheet.input}
              value={servings}
              onChangeText={setServings}
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
              placeholder="e.g. quick lunches, mostly Asian food, use up the chicken"
              placeholderTextColor={theme.placeholder}
              returnKeyType="done"
              onSubmitEditing={handleGenerate}
            />
          </ScrollView>

          <TouchableOpacity style={modalSheet.primaryBtn} onPress={handleGenerate}>
            <Text style={modalSheet.primaryBtnText}>Generate meal plan ✨</Text>
          </TouchableOpacity>
          <TouchableOpacity style={modalSheet.cancelBtn} onPress={onClose}>
            <Text style={modalSheet.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
