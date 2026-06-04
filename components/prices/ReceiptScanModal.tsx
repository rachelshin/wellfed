import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, ScrollView, Image, ActivityIndicator, Alert,
} from 'react-native';
import AppModal from '../AppModal';
import DatePicker from '../DatePicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { PriceEntry, Unit } from '../../store/prices';
import { modalSheet } from '../../lib/sharedStyles';
import theme from '../../lib/theme';

interface DetectedItem {
  name: string;
  originalName: string;
  price: string;
  size: string;
  unit: Unit;
  store: string;
  selected: boolean;
  category: string;     // lowercase key
  addToPrice: boolean;
  addToPantry: boolean;
}

export interface ScannedItem {
  entry: Omit<PriceEntry, 'id'>;
  addToPrice: boolean;
  addToPantry: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAddItems: (items: ScannedItem[]) => void;
  existingCategories: string[];   // display names
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReceiptScanModal({ visible, onClose, onAddItems, existingCategories }: Props) {
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [storeName, setStoreName] = useState('');
  const [receiptDate, setReceiptDate] = useState(today());
  const [missingFields, setMissingFields] = useState<('store' | 'date')[]>([]);
  const [step, setStep] = useState<'pick' | 'review'>('pick');
  const [openCategoryIndex, setOpenCategoryIndex] = useState<number | null>(null);
  const [openUnitIndex, setOpenUnitIndex] = useState<number | null>(null);
  const [catSearch, setCatSearch] = useState('');
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);

  useEffect(() => {
    if (!visible) {
      setImageUri(null); setScanning(false);
      setItems([]); setStoreName(''); setReceiptDate(today()); setMissingFields([]);
      setStep('pick'); setOpenCategoryIndex(null); setOpenUnitIndex(null);
    }
  }, [visible]);

  useEffect(() => { setCatSearch(''); }, [openCategoryIndex]);

  const filteredCats = catSearch.trim()
    ? existingCategories.filter((c) => c.toLowerCase().includes(catSearch.toLowerCase())).slice(0, 6)
    : existingCategories.slice(0, 6);

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
      const fetchRes = await fetch(uri);
      const blob = await fetchRes.blob();
      const mediaType = blob.type || 'image/jpeg';
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const res = await fetch('https://us-central1-well-fed-66136.cloudfunctions.net/scanReceipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType, existingCategories }),
      });
      if (!res.ok) throw new Error('Server error');

      const { items: raw, store: scannedStore, date: scannedDate } = await res.json();

      const missing: ('store' | 'date')[] = [];
      if (scannedStore) { setStoreName(scannedStore); } else { missing.push('store'); }
      if (scannedDate) { setReceiptDate(scannedDate); } else { missing.push('date'); }
      setMissingFields(missing);

      const seen = new Set<string>();
      const detected: DetectedItem[] = (raw as { name: string; price: string; category: string }[])
        .filter((it) => {
          const key = (it.name || '').toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((it) => {
          const aiCat = (it.category || '').toLowerCase().trim();
          const itemLow = (it.name || '').toLowerCase().trim();
          return {
            name: it.name || '',
            originalName: it.name || '',
            price: String(parseFloat(it.price) || 0),
            size: '1',
            unit: 'count',
            store: '',
            selected: true,
            // Only use the AI category if it's a real grouping (not just the item name repeated)
            category: aiCat && aiCat !== itemLow ? aiCat : '',
            addToPrice: true,
            addToPantry: true,
          };
        });
      setItems(detected);
      setStep('review');
    } catch {
      Alert.alert('', 'Couldn\'t read the receipt clearly. You can add items manually.');
      setItems([]); setStep('review');
    } finally {
      setScanning(false);
    }
  };

  const updateItem = (index: number, field: keyof DetectedItem, value: string | boolean | Unit) => {
    setItems((prev) => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  };

  const handleConfirm = () => {
    const active = items.filter((it) => it.selected && (it.addToPrice || it.addToPantry));
    if (active.length === 0) { onClose(); return; }
    onAddItems(active.map((it) => ({
      entry: {
        itemName: it.name.trim(),
        category: it.category.trim().toLowerCase() || 'uncategorized',
        store: storeName.trim() || it.store.trim(),
        price: parseFloat(it.price) || 0,
        size: it.size === 'n/a' ? 1 : (parseFloat(it.size) || 1),
        unit: it.unit,
        dateAdded: receiptDate,
        scannedName: it.originalName.trim(),
      },
      addToPrice: it.addToPrice,
      addToPantry: it.addToPantry,
    })));
  };

  const activeCount = items.filter((i) => i.selected && (i.addToPrice || i.addToPantry)).length;
  const priceCount = items.filter((i) => i.selected && i.addToPrice).length;
  const pantryCount = items.filter((i) => i.selected && i.addToPantry).length;

  return (
    <AppModal visible={visible} animationType="slide" transparent>
      <View style={modalSheet.backdrop}>
        <View style={[modalSheet.sheet, { paddingBottom: insets.bottom + 24 + iosPWAKeyboard }]}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>

            {step === 'pick' && !scanning && (
              <>
                <Text style={modalSheet.title}>Scan a receipt</Text>
                <Text style={s.sub}>Point your camera at a receipt and we'll pull out the prices for you.</Text>

                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={s.preview} resizeMode="contain" />
                ) : (
                  <View style={s.imagePlaceholder}>
                    <Text style={s.placeholderText}>No photo yet</Text>
                  </View>
                )}

                <TouchableOpacity style={modalSheet.primaryBtn} onPress={() => pickImage(true)}>
                  <Text style={modalSheet.primaryBtnText}>Take a Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.secondaryBtn} onPress={() => pickImage(false)}>
                  <Text style={s.secondaryBtnText}>Choose from Library</Text>
                </TouchableOpacity>
                <TouchableOpacity style={modalSheet.cancelBtn} onPress={onClose}>
                  <Text style={modalSheet.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {scanning && (
              <View style={s.scanningView}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={s.scanningTitle}>Reading your receipt…</Text>
              </View>
            )}

            {step === 'review' && !scanning && (
              <>
                <Text style={modalSheet.title}>
                  {items.length > 0 ? `Found ${items.length} item${items.length !== 1 ? 's' : ''}` : 'Add items manually'}
                </Text>
                <Text style={s.sub}>
                  {items.length > 0
                    ? 'Review details and choose where to save each item.'
                    : 'The receipt was tricky to read — add items from the + button on the Prices tab.'}
                </Text>

                {missingFields.length > 0 && (
                  <View style={s.missingBanner}>
                    <Text style={s.missingBannerText}>
                      Couldn't read {missingFields.join(' or ')} from the receipt — please check below.
                    </Text>
                  </View>
                )}

                <Text style={modalSheet.label}>Store Name</Text>
                <TextInput
                  style={[modalSheet.input, missingFields.includes('store') && !storeName.trim() && s.inputMissing]}
                  value={storeName}
                  onChangeText={setStoreName}
                  placeholder="e.g. Whole Foods"
                  placeholderTextColor={theme.placeholder}
                />

                <Text style={modalSheet.label}>Receipt Date</Text>
                <DatePicker value={receiptDate} onChange={setReceiptDate} />

                {items.length === 0 ? (
                  <View style={s.noItems}>
                    <Text style={s.noItemsText}>No items detected. Try a clearer photo next time.</Text>
                  </View>
                ) : (
                  items.map((item, i) => {
                    const sizeNA = item.size === 'n/a';
                    const catOpen = openCategoryIndex === i;
                    const catDisplay = item.category
                      ? item.category.charAt(0).toUpperCase() + item.category.slice(1)
                      : '';
                    return (
                      <View key={i} style={[s.itemRow, !item.selected && s.itemRowDimmed]}>
                        <TouchableOpacity onPress={() => updateItem(i, 'selected', !item.selected)}>
                          <Text style={[s.checkbox, item.selected && s.checkboxSelected]}>
                            {item.selected ? '✓' : '○'}
                          </Text>
                        </TouchableOpacity>
                        <View style={s.itemFields}>

                          {/* Name row */}
                          <View style={s.itemNameRow}>
                            <TextInput style={[s.itemName, { flex: 1 }]} value={item.name}
                              onChangeText={(v) => updateItem(i, 'name', v)} placeholder="Item name"
                              placeholderTextColor={theme.placeholder} />
                            <TouchableOpacity onPress={() => setItems((prev) => prev.filter((_, idx) => idx !== i))} style={s.removeBtn}>
                              <Text style={s.removeBtnText}>✕</Text>
                            </TouchableOpacity>
                          </View>

                          {/* Price / Size / Unit row */}
                          <View style={s.itemRow2}>
                            <View style={s.priceWrap}>
                              <Text style={s.itemFieldLabel}>$</Text>
                              <TextInput style={s.itemPrice} value={item.price}
                                onChangeText={(v) => updateItem(i, 'price', v)} keyboardType="decimal-pad" />
                            </View>
                            {sizeNA ? (
                              <TouchableOpacity style={[s.miniUnit, s.miniUnitActive]} onPress={() => updateItem(i, 'size', '1')}>
                                <Text style={[s.miniUnitText, s.miniUnitTextActive]}>n/a</Text>
                              </TouchableOpacity>
                            ) : (
                              <TextInput style={s.itemSize} value={item.size}
                                onChangeText={(v) => updateItem(i, 'size', v)} keyboardType="decimal-pad"
                                placeholder="qty" placeholderTextColor={theme.placeholder} />
                            )}
                            <TouchableOpacity
                              style={[s.miniUnit, s.unitDropBtn, openUnitIndex === i && s.miniUnitActive]}
                              onPress={() => setOpenUnitIndex(openUnitIndex === i ? null : i)}
                            >
                              <Text style={[s.miniUnitText, openUnitIndex === i && s.miniUnitTextActive]}>
                                {item.unit} {openUnitIndex === i ? '▲' : '▾'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[s.miniUnit, sizeNA && s.miniUnitActive]}
                              onPress={() => updateItem(i, 'size', sizeNA ? '1' : 'n/a')}>
                              <Text style={[s.miniUnitText, sizeNA && s.miniUnitTextActive]}>n/a</Text>
                            </TouchableOpacity>
                          </View>

                          {/* Unit picker */}
                          {openUnitIndex === i && (
                            <View style={s.unitPicker}>
                              {(['oz', 'lb', 'g', 'kg', 'ml', 'L', 'fl oz', 'count'] as Unit[]).map((u) => (
                                <TouchableOpacity
                                  key={u}
                                  style={[s.miniUnit, item.unit === u && s.miniUnitActive]}
                                  onPress={() => { updateItem(i, 'unit', u); setOpenUnitIndex(null); }}
                                >
                                  <Text style={[s.miniUnitText, item.unit === u && s.miniUnitTextActive]}>{u}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}

                          {/* Category row */}
                          <TouchableOpacity
                            style={s.catBadge}
                            onPress={() => setOpenCategoryIndex(catOpen ? null : i)}
                            activeOpacity={0.7}
                          >
                            <Text style={s.catBadgeText}>{catDisplay || 'set category…'}</Text>
                            <Text style={s.catBadgeArrow}>{catOpen ? '▲' : '▾'}</Text>
                          </TouchableOpacity>

                          {catOpen && (
                            <View style={s.catPicker}>
                              <TextInput
                                style={s.catInput}
                                value={catSearch}
                                onChangeText={setCatSearch}
                                placeholder="Search or type a new category…"
                                placeholderTextColor={theme.placeholder}
                                returnKeyType="done"
                                onSubmitEditing={() => {
                                  const val = catSearch.trim().toLowerCase();
                                  if (val) updateItem(i, 'category', val);
                                  setOpenCategoryIndex(null);
                                }}
                              />
                              {filteredCats.length > 0 && (
                                <View style={s.catChipRow}>
                                  {filteredCats.map((cat) => (
                                    <TouchableOpacity
                                      key={cat}
                                      style={[s.catChip, item.category === cat.toLowerCase() && s.catChipActive]}
                                      onPress={() => { updateItem(i, 'category', cat.toLowerCase()); setOpenCategoryIndex(null); }}
                                    >
                                      <Text style={[s.catChipText, item.category === cat.toLowerCase() && s.catChipTextActive]}>{cat}</Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              )}
                            </View>
                          )}

                          {/* Destination toggles — only when item is selected */}
                          {item.selected && (
                            <View style={s.destRow}>
                              <Text style={s.destLabel}>Save to:</Text>
                              <TouchableOpacity
                                style={[s.destChip, item.addToPrice && s.destChipActive]}
                                onPress={() => updateItem(i, 'addToPrice', !item.addToPrice)}
                              >
                                <Text style={[s.destChipText, item.addToPrice && s.destChipTextActive]}>
                                  {item.addToPrice ? '✓ ' : ''}Prices
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[s.destChip, item.addToPantry && s.destChipActive]}
                                onPress={() => updateItem(i, 'addToPantry', !item.addToPantry)}
                              >
                                <Text style={[s.destChipText, item.addToPantry && s.destChipTextActive]}>
                                  {item.addToPantry ? '✓ ' : ''}Pantry
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}

                        </View>
                      </View>
                    );
                  })
                )}

                {items.length > 0 && activeCount > 0 && (
                  <>
                    <TouchableOpacity style={modalSheet.primaryBtn} onPress={handleConfirm}>
                      <Text style={modalSheet.primaryBtnText}>
                        Save {activeCount} item{activeCount !== 1 ? 's' : ''}
                      </Text>
                    </TouchableOpacity>
                    <Text style={s.saveSummary}>
                      {priceCount > 0 && pantryCount > 0
                        ? `${priceCount} → Prices · ${pantryCount} → Pantry`
                        : priceCount > 0
                        ? `${priceCount} → Prices only`
                        : `${pantryCount} → Pantry only`}
                    </Text>
                  </>
                )}
                <TouchableOpacity style={modalSheet.cancelBtn} onPress={onClose}>
                  <Text style={modalSheet.cancelText}>Done</Text>
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
  sub: { fontSize: 14, color: theme.textFaint, marginBottom: 20, lineHeight: 20 },
  preview: { width: '100%', height: 180, borderRadius: 16, marginBottom: 20 },
  imagePlaceholder: {
    width: '100%', height: 120, borderRadius: 16, borderWidth: 1.5,
    borderColor: theme.border, borderStyle: 'dashed', alignItems: 'center',
    justifyContent: 'center', marginBottom: 20, backgroundColor: theme.bgTint,
  },
  placeholderText: { fontSize: 14, color: theme.textFaint },
  secondaryBtn: {
    borderWidth: 1.5, borderColor: theme.border, borderRadius: 16,
    padding: 16, alignItems: 'center', marginBottom: 10,
  },
  secondaryBtnText: { color: theme.textDark, fontSize: 16, fontWeight: '700' },
  scanningView: { alignItems: 'center', paddingVertical: 48 },
  scanningTitle: { marginTop: 16, fontSize: 18, fontWeight: '700', color: theme.textDark },
  noItems: { paddingVertical: 24, alignItems: 'center' },
  noItemsText: { fontSize: 14, color: theme.textFaint, textAlign: 'center', lineHeight: 20 },
  saveSummary: { textAlign: 'center', fontSize: 12, color: theme.textFaint, marginTop: -8, marginBottom: 8 },

  itemRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12,
    padding: 12, backgroundColor: theme.bgTint, borderRadius: 14,
    borderWidth: 1.5, borderColor: theme.border,
  },
  itemRowDimmed: { opacity: 0.35 },
  checkbox: { fontSize: 20, marginTop: 4, color: theme.textFaint },
  checkboxSelected: { color: theme.primary, fontWeight: '800' },
  itemFields: { flex: 1 },

  itemNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemName: {
    fontSize: 16, fontWeight: '700', color: theme.textDark,
    borderBottomWidth: 1.5, borderBottomColor: theme.border, paddingBottom: 6, outlineWidth: 0, outlineStyle: 'none',
  },
  removeBtn: { paddingLeft: 10, paddingBottom: 6 },
  removeBtnText: { fontSize: 16, color: theme.textFaint, fontWeight: '600' },

  itemRow2: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  priceWrap: { flexDirection: 'row', alignItems: 'center' },
  itemFieldLabel: { fontSize: 16, color: theme.textFaint, fontWeight: '700' },
  itemPrice: {
    fontSize: 16, color: theme.textDark, fontWeight: '700',
    borderWidth: 1.5, borderColor: theme.border, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 3, width: 64, outlineWidth: 0, outlineStyle: 'none',
  },
  itemSize: {
    fontSize: 16, color: theme.textDark, borderWidth: 1.5, borderColor: theme.border,
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, width: 48, outlineWidth: 0, outlineStyle: 'none',
  },
  miniUnit: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1.5, borderColor: theme.border },
  unitDropBtn: { paddingHorizontal: 10 },
  unitPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  miniUnitActive: { backgroundColor: theme.primaryLight, borderColor: theme.primary },
  miniUnitText: { fontSize: 11, color: theme.textFaint },
  miniUnitTextActive: { color: theme.primary, fontWeight: '800' },

  catBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: theme.primaryLight, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, gap: 4, marginBottom: 8,
  },
  catBadgeText: { fontSize: 12, fontWeight: '700', color: theme.primary },
  catBadgeArrow: { fontSize: 10, color: theme.primary },

  catPicker: { marginTop: 0, marginBottom: 8 },
  catChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 4 },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.bg,
  },
  catChipActive: { backgroundColor: theme.primaryLight, borderColor: theme.primary },
  catChipText: { fontSize: 12, color: theme.textFaint, fontWeight: '600' },
  catChipTextActive: { color: theme.primary, fontWeight: '800' },
  catInput: {
    fontSize: 16, borderWidth: 1.5, borderColor: theme.border, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6, color: theme.textDark,
    backgroundColor: theme.bg, marginTop: 4, outlineWidth: 0, outlineStyle: 'none',
  },

  destRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  destLabel: { fontSize: 11, color: theme.textFaint, fontWeight: '600', marginRight: 2 },
  destChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.bg,
  },
  destChipActive: { backgroundColor: theme.primaryLight, borderColor: theme.primary },
  destChipText: { fontSize: 12, color: theme.textFaint, fontWeight: '600' },
  destChipTextActive: { color: theme.primary, fontWeight: '800' },

  missingBanner: {
    backgroundColor: '#FEF3CD', borderRadius: 12, padding: 12, marginBottom: 16,
    borderLeftWidth: 3, borderLeftColor: theme.warning,
  },
  missingBannerText: { fontSize: 13, color: '#92620A', fontWeight: '600', lineHeight: 18 },
  inputMissing: { borderColor: theme.warning, borderWidth: 2 },
});
