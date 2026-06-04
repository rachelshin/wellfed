import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import theme from '../lib/theme';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HDRS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

interface Props {
  value: string;       // YYYY-MM-DD
  onChange: (v: string) => void;
}

function parse(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m: m - 1, d };
}

function fmtDisplay(s: string) {
  const { y, m, d } = parse(s);
  return `${MONTHS[m]} ${d}, ${y}`;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function buildWeeks(year: number, month: number): (number | null)[][] {
  const startDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let day = 1 - startDow;
  while (day <= daysInMonth) {
    const row: (number | null)[] = [];
    for (let i = 0; i < 7; i++, day++) {
      row.push(day > 0 && day <= daysInMonth ? day : null);
    }
    weeks.push(row);
  }
  return weeks;
}

export default function DatePicker({ value, onChange }: Props) {
  const sel = parse(value);
  const [open, setOpen] = useState(false);
  const [vy, setVy] = useState(sel.y);
  const [vm, setVm] = useState(sel.m);

  const shift = (delta: number) => {
    let m = vm + delta, y = vy;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setVm(m); setVy(y);
  };

  const weeks = buildWeeks(vy, vm);

  return (
    <View style={s.wrap}>
      <TouchableOpacity style={s.btn} onPress={() => setOpen((o) => !o)} activeOpacity={0.7}>
        <Text style={s.btnText}>{fmtDisplay(value)}</Text>
        <Text style={s.arrow}>{open ? '▲' : '▾'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={s.cal}>
          <View style={s.calHeader}>
            <TouchableOpacity onPress={() => shift(-1)} hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}>
              <Text style={s.nav}>‹</Text>
            </TouchableOpacity>
            <Text style={s.monthLabel}>{MONTHS[vm]} {vy}</Text>
            <TouchableOpacity onPress={() => shift(1)} hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}>
              <Text style={s.nav}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={s.dowRow}>
            {DAY_HDRS.map((d) => <Text key={d} style={s.dowHdr}>{d}</Text>)}
          </View>

          {weeks.map((row, ri) => (
            <View key={ri} style={s.weekRow}>
              {row.map((day, ci) => {
                const active = day !== null && day === sel.d && vm === sel.m && vy === sel.y;
                return (
                  <TouchableOpacity
                    key={ci}
                    style={[s.dayCell, active && s.dayCellActive]}
                    onPress={() => {
                      if (!day) return;
                      onChange(`${vy}-${pad(vm + 1)}-${pad(day)}`);
                      setOpen(false);
                    }}
                    disabled={!day}
                    activeOpacity={day ? 0.7 : 1}
                  >
                    <Text style={[s.dayNum, active && s.dayNumActive]}>{day ?? ''}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 16 },
  btn: {
    borderWidth: 1.5, borderColor: theme.border, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.bgTint,
  },
  btnText: { fontSize: 16, color: theme.textDark, fontWeight: '600' },
  arrow: { fontSize: 11, color: theme.textFaint },
  cal: {
    borderWidth: 1.5, borderColor: theme.border, borderRadius: 14,
    backgroundColor: '#FFF', padding: 12, marginTop: 4,
  },
  calHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  nav: { fontSize: 24, fontWeight: '700', color: theme.textDark, paddingHorizontal: 8 },
  monthLabel: { fontSize: 15, fontWeight: '800', color: theme.textDark },
  dowRow: { flexDirection: 'row', marginBottom: 4 },
  dowHdr: { flex: 1, textAlign: 'center', fontSize: 11, color: theme.textFaint, fontWeight: '700' },
  weekRow: { flexDirection: 'row', marginBottom: 2 },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 20 },
  dayCellActive: { backgroundColor: theme.primary },
  dayNum: { fontSize: 13, color: theme.textDark, fontWeight: '500' },
  dayNumActive: { color: '#FFF', fontWeight: '800' },
});
