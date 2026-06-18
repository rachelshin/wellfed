import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  StyleSheet, ScrollView,
} from 'react-native';
import AppModal from '../AppModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SavedRecipe, SavedIngredient } from '../../store/savedRecipes';
import { modalSheet } from '../../lib/sharedStyles';
import { showAlert, confirmAction } from '../../lib/dialogs';
import useIosPWAKeyboard from '../../lib/useIosPWAKeyboard';
import theme from '../../lib/theme';

interface Props {
  recipe: SavedRecipe | null;
  onClose: () => void;
  onSave: (id: string, updates: { title: string; ingredients: SavedIngredient[]; steps: string[] }) => void;
  onDelete: (id: string) => void;
}

export default function EditRecipeModal({ recipe, onClose, onSave, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState<SavedIngredient[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const iosPWAKeyboard = useIosPWAKeyboard();

  useEffect(() => {
    setSaving(false);
    setIsEditing(false);
    if (recipe) {
      setTitle(recipe.title);
      setIngredients(recipe.ingredients.length > 0 ? recipe.ingredients : [{ name: '', amount: '' }]);
      setSteps(recipe.steps.length > 0 ? recipe.steps : ['']);
    }
  }, [recipe?.id]);

  const handleSave = () => {
    if (!recipe || saving) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) { showAlert('', 'Recipe needs a title.'); return; }
    setSaving(true);
    onSave(recipe.id, {
      title: cleanTitle,
      ingredients: ingredients.filter((ing) => ing.name.trim()),
      steps: steps.filter((s) => s.trim()),
    });
    onClose();
  };

  const handleDelete = () => {
    if (!recipe) return;
    confirmAction('Delete recipe?', `"${recipe.title}" will be removed.`, 'Delete',
      () => onDelete(recipe.id));
  };

  const updateIngredient = (index: number, field: keyof SavedIngredient, value: string) =>
    setIngredients((prev) => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing));

  const addIngredient = () => setIngredients((prev) => [...prev, { name: '', amount: '' }]);
  const removeIngredient = (index: number) =>
    setIngredients((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);

  const updateStep = (index: number, value: string) =>
    setSteps((prev) => prev.map((s, i) => i === index ? value : s));
  const addStep = () => setSteps((prev) => [...prev, '']);
  const removeStep = (index: number) =>
    setSteps((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);

  return (
    <AppModal visible={!!recipe} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalSheet.backdrop}>
        <Pressable style={modalSheet.backdropTap} onPress={onClose} />
        <View style={[modalSheet.sheet, s.sheet, { paddingBottom: insets.bottom + 24 + (isEditing ? iosPWAKeyboard : 0) }]}>
          <ScrollView key={isEditing ? 'edit' : 'view'} keyboardShouldPersistTaps="handled" bounces={false}>

            {!isEditing ? (
              /* ── VIEW MODE ── */
              <>
                <View style={s.viewHeader}>
                  <Text style={s.viewTitle}>{recipe?.title}</Text>
                  <TouchableOpacity style={s.editBtn} onPress={() => setIsEditing(true)} activeOpacity={0.8}>
                    <Text style={s.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {(recipe?.ingredients.length ?? 0) > 0 && (
                  <>
                    <Text style={s.sectionLabel}>Ingredients</Text>
                    {recipe!.ingredients.map((ing, i) => (
                      <View key={i} style={s.ingViewRow}>
                        <Text style={s.ingDot}>·</Text>
                        <View style={s.ingViewInfo}>
                          <Text style={s.ingViewName}>{ing.name}</Text>
                          {ing.amount ? <Text style={s.ingViewAmount}>{ing.amount}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {(recipe?.steps.length ?? 0) > 0 && (
                  <>
                    <Text style={[s.sectionLabel, s.sectionLabelSpaced]}>Directions</Text>
                    {recipe!.steps.map((step, i) => (
                      <View key={i} style={s.stepViewRow}>
                        <View style={s.stepViewNum}>
                          <Text style={s.stepViewNumText}>{i + 1}</Text>
                        </View>
                        <Text style={s.stepViewText}>{step}</Text>
                      </View>
                    ))}
                  </>
                )}

                <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
                  <Text style={s.deleteBtnText}>Delete recipe</Text>
                </TouchableOpacity>
                <TouchableOpacity style={modalSheet.cancelBtn} onPress={onClose}>
                  <Text style={modalSheet.cancelText}>Done</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* ── EDIT MODE ── */
              <>
                <Text style={modalSheet.title}>Edit Recipe</Text>

                <Text style={modalSheet.label}>Title</Text>
                <TextInput
                  style={modalSheet.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Recipe title"
                  placeholderTextColor={theme.placeholder}
                />

                <Text style={[modalSheet.label, s.sectionLabelSpaced]}>Ingredients</Text>
                {ingredients.map((ing, i) => (
                  <View key={i} style={s.ingEditRow}>
                    <TextInput
                      style={[modalSheet.input, s.ingName]}
                      value={ing.name}
                      onChangeText={(v) => updateIngredient(i, 'name', v)}
                      placeholder="Ingredient"
                      placeholderTextColor={theme.placeholder}
                    />
                    <TextInput
                      style={[modalSheet.input, s.ingAmount]}
                      value={ing.amount}
                      onChangeText={(v) => updateIngredient(i, 'amount', v)}
                      placeholder="Amount"
                      placeholderTextColor={theme.placeholder}
                    />
                    <TouchableOpacity onPress={() => removeIngredient(i)} style={s.removeBtn}>
                      <Text style={s.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={s.addRowBtn} onPress={addIngredient}>
                  <Text style={s.addRowBtnText}>+ Add ingredient</Text>
                </TouchableOpacity>

                <Text style={[modalSheet.label, s.sectionLabelSpaced]}>Directions</Text>
                {steps.map((step, i) => (
                  <View key={i} style={s.stepEditRow}>
                    <View style={s.stepEditNum}>
                      <Text style={s.stepEditNumText}>{i + 1}</Text>
                    </View>
                    <TextInput
                      style={[modalSheet.input, s.stepInput]}
                      value={step}
                      onChangeText={(v) => updateStep(i, v)}
                      placeholder={`Step ${i + 1}…`}
                      placeholderTextColor={theme.placeholder}
                      multiline
                    />
                    <TouchableOpacity onPress={() => removeStep(i)} style={s.removeBtn}>
                      <Text style={s.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={s.addRowBtn} onPress={addStep}>
                  <Text style={s.addRowBtnText}>+ Add step</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[modalSheet.primaryBtn, s.saveBtn, saving && { opacity: 0.5 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={modalSheet.primaryBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
                  <Text style={s.deleteBtnText}>Delete recipe</Text>
                </TouchableOpacity>
                <TouchableOpacity style={modalSheet.cancelBtn} onPress={() => setIsEditing(false)}>
                  <Text style={modalSheet.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </AppModal>
  );
}

const s = StyleSheet.create({
  sheet: { maxHeight: '95%' },

  // View mode
  viewHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 },
  viewTitle: { flex: 1, fontSize: 24, fontWeight: '900', color: theme.textDark, lineHeight: 30 },
  editBtn: {
    backgroundColor: theme.primaryLight, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, flexShrink: 0,
  },
  editBtnText: { fontSize: 14, fontWeight: '800', color: theme.primary },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: theme.textFaint,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  sectionLabelSpaced: { marginTop: 24 },

  ingViewRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 10 },
  ingDot: { fontSize: 18, color: theme.primary, fontWeight: '700', width: 14 },
  ingViewInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  ingViewName: { fontSize: 15, color: theme.textDark, fontWeight: '600', flex: 1 },
  ingViewAmount: { fontSize: 13, color: theme.textFaint, marginLeft: 8 },

  stepViewRow: { flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'flex-start' },
  stepViewNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  stepViewNumText: { fontSize: 12, fontWeight: '800', color: theme.primary },
  stepViewText: { flex: 1, fontSize: 15, color: theme.textDark, lineHeight: 22 },

  // Edit mode
  ingEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 0 },
  ingName: { flex: 2, marginBottom: 8 },
  ingAmount: { flex: 1, marginBottom: 8 },

  stepEditRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 0 },
  stepEditNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 14,
  },
  stepEditNumText: { fontSize: 12, fontWeight: '800', color: theme.primary },
  stepInput: { flex: 1, marginBottom: 8 },

  removeBtn: { paddingHorizontal: 6, paddingBottom: 8, marginTop: 14 },
  removeBtnText: { fontSize: 16, color: theme.textFaint, fontWeight: '600' },

  addRowBtn: { paddingVertical: 10, marginBottom: 4 },
  addRowBtnText: { fontSize: 14, color: theme.primary, fontWeight: '700' },

  saveBtn: { marginTop: 24 },
  deleteBtn: { padding: 14, alignItems: 'center', marginBottom: 4 },
  deleteBtnText: { fontSize: 15, color: theme.negative, fontWeight: '700' },
});
