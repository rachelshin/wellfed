import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, ScrollView, Image, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { PriceEntry, Unit } from '../../store/prices';

interface DetectedItem {
  name: string;
  price: string;
  size: string;
  unit: Unit;
  store: string;
  selected: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAddItems: (items: Omit<PriceEntry, 'id'>[]) => void;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseReceiptText(text: string): DetectedItem[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: DetectedItem[] = [];
  const skipWords = ['total', 'subtotal', 'tax', 'change', 'cash', 'card', 'balance',
    'visa', 'mastercard', 'debit', 'credit', 'thank', 'welcome', 'receipt',
    'store', 'address', 'phone', 'date', 'time', 'cashier', 'discount'];

  for (const line of lines) {
    const match = line.match(/^(.+?)\s+\$?(\d{1,4}\.\d{2})\s*$/);
    if (!match) continue;
    const name = match[1].replace(/[^a-zA-Z0-9\s\-']/g, '').trim();
    const price = parseFloat(match[2]);
    if (!name || name.length < 2) continue;
    if (skipWords.some((w) => name.toLowerCase().includes(w))) continue;
    if (price <= 0 || price > 500) continue;
    items.push({ name, price: String(price.toFixed(2)), size: '1', unit: 'count', store: '', selected: true });
  }

  return items;
}

export default function ReceiptScanModal({ visible, onClose, onAddItems }: Props) {
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [storeName, setStoreName] = useState('');
  const [step, setStep] = useState<'pick' | 'review'>('pick');
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);

  useEffect(() => {
    if (!visible) {
      setImageUri(null); setScanning(false);
      setItems([]); setStoreName(''); setStep('pick');
    }
  }, [visible]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.navigator?.standalone || !window.visualViewport) return;
    const onResize = () =>
      setIosPWAKeyboard(Math.max(0, window.innerHeight - window.visualViewport!.height));
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport!.removeEventListener('resize', onResize);
  }, []);

  const pickImage = async (useCamera: boolean) => {
    const fn = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await fn({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setImageUri(uri);
    await runOCR(uri);
  };

  const runOCR = async (uri: string) => {
    setScanning(true);
    try {
      if (Platform.OS !== 'web') {
        setItems([]); setStep('review'); setScanning(false); return;
      }
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(uri);
      await worker.terminate();
      setItems(parseReceiptText(text));
      setStep('review');
    } catch {
      Alert.alert('Hmm!', 'Couldn\'t read the receipt clearly. You can add items manually!');
      setItems([]); setStep('review');
    } finally {
      setScanning(false);
    }
  };

  const updateItem = (index: number, field: keyof DetectedItem, value: string | boolean | Unit) => {
    setItems((prev) => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  };

  const handleConfirm = () => {
    const selected = items.filter((it) => it.selected);
    if (selected.length === 0) { onClose(); return; }
    const entries: Omit<PriceEntry, 'id'>[] = selected.map((it) => ({
      displayName: it.name.trim(),
      itemName: it.name.trim().toLowerCase(),
      brand: '',
      store: storeName.trim() || it.store.trim(),
      price: parseFloat(it.price) || 0,
      size: parseFloat(it.size) || 1,
      unit: it.unit,
      dateAdded: today(),
    }));
    onAddItems(entries);
  };

  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.backdrop}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={s.handle} />

            {step === 'pick' && !scanning && (
              <>
                <Text style={s.emoji}>📄</Text>
                <Text style={s.title}>Scan a receipt</Text>
                <Text style={s.sub}>Point your camera at a receipt and we'll pull out the prices for you!</Text>

                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={s.preview} resizeMode="contain" />
                ) : (
                  <View style={s.imagePlaceholder}>
                    <Text style={s.placeholderEmoji}>📸</Text>
                    <Text style={s.placeholderText}>No photo yet</Text>
                  </View>
                )}

                <TouchableOpacity style={s.primaryBtn} onPress={() => pickImage(true)}>
                  <Text style={s.primaryBtnText}>📷  Take a Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.secondaryBtn} onPress={() => pickImage(false)}>
                  <Text style={s.secondaryBtnText}>🖼️  Choose from Library</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                  <Text style={s.cancelText}>Never mind</Text>
                </TouchableOpacity>
              </>
            )}

            {scanning && (
              <View style={s.scanningView}>
                <ActivityIndicator size="large" color="#FF6B9D" />
                <Text style={s.scanningTitle}>Reading your receipt…</Text>
                <Text style={s.scanningText}>This'll just take a moment!</Text>
              </View>
            )}

            {step === 'review' && !scanning && (
              <>
                <Text style={s.title}>
                  {items.length > 0 ? `Found ${items.length} item${items.length !== 1 ? 's' : ''}! 🎉` : 'Add items manually'}
                </Text>
                <Text style={s.sub}>
                  {items.length > 0
                    ? 'Check off what you want to save. Tap any field to edit.'
                    : 'The receipt was tricky to read — you can add items from the + button on the Prices tab.'}
                </Text>

                <Text style={s.label}>Store Name</Text>
                <TextInput style={s.storeInput} value={storeName} onChangeText={setStoreName}
                  placeholder="e.g. Whole Foods" placeholderTextColor="#D1C4D4" />

                {items.length === 0 ? (
                  <View style={s.noItems}>
                    <Text style={s.noItemsEmoji}>🕵️</Text>
                    <Text style={s.noItemsText}>No items detected. Try a clearer photo next time!</Text>
                  </View>
                ) : (
                  items.map((item, i) => (
                    <View key={i} style={[s.itemRow, !item.selected && s.itemRowDimmed]}>
                      <TouchableOpacity onPress={() => updateItem(i, 'selected', !item.selected)}>
                        <Text style={s.checkbox}>{item.selected ? '🩷' : '○'}</Text>
                      </TouchableOpacity>
                      <View style={s.itemFields}>
                        <TextInput style={s.itemName} value={item.name}
                          onChangeText={(v) => updateItem(i, 'name', v)} placeholder="Item name" placeholderTextColor="#D1C4D4" />
                        <View style={s.itemRow2}>
                          <View style={s.priceWrap}>
                            <Text style={s.itemFieldLabel}>$</Text>
                            <TextInput style={s.itemPrice} value={item.price}
                              onChangeText={(v) => updateItem(i, 'price', v)} keyboardType="decimal-pad" />
                          </View>
                          <TextInput style={s.itemSize} value={item.size}
                            onChangeText={(v) => updateItem(i, 'size', v)} keyboardType="decimal-pad"
                            placeholder="size" placeholderTextColor="#D1C4D4" />
                          <View style={s.unitSelect}>
                            {(['oz', 'lb', 'count', 'fl oz'] as Unit[]).map((u) => (
                              <TouchableOpacity key={u} onPress={() => updateItem(i, 'unit', u)}
                                style={[s.miniUnit, item.unit === u && s.miniUnitActive]}>
                                <Text style={[s.miniUnitText, item.unit === u && s.miniUnitTextActive]}>{u}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </View>
                    </View>
                  ))
                )}

                {items.length > 0 && (
                  <TouchableOpacity style={s.primaryBtn} onPress={handleConfirm}>
                    <Text style={s.primaryBtnText}>
                      Save {selectedCount} item{selectedCount !== 1 ? 's' : ''} 🎉
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                  <Text style={s.cancelText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,15,40,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingTop: 16, maxHeight: '94%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#F3E8FF',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  emoji: { fontSize: 36, textAlign: 'center', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: '#1E1B4B', marginBottom: 6 },
  sub: { fontSize: 14, color: '#9CA3AF', marginBottom: 20, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  storeInput: {
    borderWidth: 2, borderColor: '#FCE7F3', borderRadius: 14,
    padding: 12, fontSize: 16, color: '#1E1B4B',
    backgroundColor: '#FFF5F8', marginBottom: 16,
  },
  preview: { width: '100%', height: 180, borderRadius: 16, marginBottom: 20 },
  imagePlaceholder: {
    width: '100%', height: 140, borderRadius: 16, borderWidth: 2,
    borderColor: '#FCE7F3', borderStyle: 'dashed', alignItems: 'center',
    justifyContent: 'center', marginBottom: 20, backgroundColor: '#FFF5F8',
  },
  placeholderEmoji: { fontSize: 36, marginBottom: 8 },
  placeholderText: { fontSize: 14, color: '#C4B5C8' },
  scanningView: { alignItems: 'center', paddingVertical: 48 },
  scanningTitle: { marginTop: 16, fontSize: 18, fontWeight: '700', color: '#1E1B4B' },
  scanningText: { marginTop: 6, fontSize: 14, color: '#9CA3AF' },
  noItems: { paddingVertical: 24, alignItems: 'center' },
  noItemsEmoji: { fontSize: 36, marginBottom: 8 },
  noItemsText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  itemRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12,
    padding: 12, backgroundColor: '#FFF5F8', borderRadius: 14, borderWidth: 1.5, borderColor: '#FCE7F3',
  },
  itemRowDimmed: { opacity: 0.35 },
  checkbox: { fontSize: 22, marginTop: 4 },
  itemFields: { flex: 1 },
  itemName: {
    fontSize: 15, fontWeight: '700', color: '#1E1B4B',
    borderBottomWidth: 1.5, borderBottomColor: '#FCE7F3', paddingBottom: 6, marginBottom: 8,
  },
  itemRow2: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceWrap: { flexDirection: 'row', alignItems: 'center' },
  itemFieldLabel: { fontSize: 15, color: '#C4B5C8', fontWeight: '700' },
  itemPrice: {
    fontSize: 15, color: '#1E1B4B', fontWeight: '700',
    borderWidth: 1.5, borderColor: '#FCE7F3', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 3, width: 60,
  },
  itemSize: {
    fontSize: 14, color: '#1E1B4B', borderWidth: 1.5, borderColor: '#FCE7F3',
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, width: 46,
  },
  unitSelect: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  miniUnit: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1.5, borderColor: '#FCE7F3' },
  miniUnitActive: { backgroundColor: '#FFD6EA', borderColor: '#FF6B9D' },
  miniUnitText: { fontSize: 11, color: '#C4B5C8' },
  miniUnitTextActive: { color: '#FF6B9D', fontWeight: '800' },
  primaryBtn: {
    backgroundColor: '#FF6B9D', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 16, marginBottom: 10,
    shadowColor: '#FF6B9D', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  secondaryBtn: {
    borderWidth: 2, borderColor: '#FCE7F3', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 10,
  },
  secondaryBtnText: { color: '#FF6B9D', fontSize: 16, fontWeight: '700' },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelText: { color: '#C4B5C8', fontSize: 15 },
});
