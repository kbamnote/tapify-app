import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, StyleSheet, RefreshControl,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { useNavigation } from '../context/NavigationContext';
import * as wallet from '../services/walletApi';

const QUICK = [100, 500, 1000, 2000];

export default function WalletScreen() {
  const { navigate } = useNavigation();
  const [info, setInfo] = useState(null);      // { balance, points_per_inr, commission_percent, payments_enabled }
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [w, t] = await Promise.all([wallet.getWallet(), wallet.getTransactions(50)]);
      setInfo(w);
      setTxns(t);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not load wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  }, [load]);

  const addMoney = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 1) { Alert.alert('Enter amount', 'Enter an amount of at least ₹1.'); return; }
    if (!info?.payments_enabled) {
      Alert.alert('Coming soon', 'Online top-up is being set up. It will be available shortly.');
      return;
    }
    // Razorpay keys are set → create the order. Opening the Razorpay checkout
    // needs the react-native-razorpay SDK (added when payments go live); then
    // wallet.verifyTopup({orderId, paymentId, signature}) credits the points.
    setBusy(true);
    try {
      const order = await wallet.createTopupOrder(amt);
      Alert.alert('Payment ready', `Order created for ₹${amt} (${order.points} points). Checkout will open once the payment screen is enabled.`);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not start the payment.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      {/* Balance card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Wallet Balance</Text>
        <Text style={styles.balanceValue}>{(info?.balance ?? 0).toLocaleString()} <Text style={styles.pts}>pts</Text></Text>
        <Text style={styles.balanceSub}>≈ ₹{(info?.balance ?? 0).toLocaleString()} · ₹1 = {info?.points_per_inr ?? 1} point</Text>
      </View>

      {/* Add money */}
      <Text style={styles.section}>Add Money</Text>
      <View style={styles.quickRow}>
        {QUICK.map((q) => (
          <TouchableOpacity key={q} style={styles.quickChip} onPress={() => setAmount(String(q))}>
            <Text style={styles.quickText}>₹{q}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.addRow}>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount (₹)"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.addBtn} onPress={addMoney} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>Add</Text>}
        </TouchableOpacity>
      </View>
      {!info?.payments_enabled && <Text style={styles.hint}>Online top-up is being set up — coming soon.</Text>}

      <TouchableOpacity style={styles.boostLink} onPress={() => navigate('boost-ads')}>
        <Text style={styles.boostLinkText}>📈 Boost a post with your points →</Text>
      </TouchableOpacity>

      {/* Transactions */}
      <Text style={styles.section}>History</Text>
      {txns.length === 0 ? (
        <Text style={styles.muted}>No transactions yet.</Text>
      ) : txns.map((t) => {
        const credit = t.direction === 'credit';
        return (
          <View key={t.id} style={styles.txnRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.txnDesc}>{t.description || t.category}</Text>
              <Text style={styles.txnMeta}>{t.category} · {fmt(t.created_at)}</Text>
            </View>
            <Text style={[styles.txnAmt, { color: credit ? '#059669' : '#dc2626' }]}>
              {credit ? '+' : '−'}{Number(t.points).toLocaleString()}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

function fmt(s) {
  if (!s) return '';
  try { return new Date(String(s).replace(' ', 'T') + 'Z').toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
  catch (_) { return s; }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 50 },

  balanceCard: { backgroundColor: COLORS.primary, borderRadius: 18, padding: 22, marginBottom: 20 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  balanceValue: { color: '#fff', fontSize: 38, fontWeight: '900', marginTop: 6 },
  pts: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  balanceSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },

  section: { fontSize: 13, fontWeight: '800', color: COLORS.primary, marginBottom: 10, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  quickChip: { backgroundColor: 'rgba(21,62,63,0.06)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(21,62,63,0.12)' },
  quickText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  addRow: { flexDirection: 'row', gap: 10 },
  amountInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'rgba(21,62,63,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  hint: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 },

  boostLink: { marginTop: 20, marginBottom: 6, backgroundColor: 'rgba(209,154,102,0.12)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(209,154,102,0.3)' },
  boostLinkText: { color: COLORS.accent, fontWeight: '800', fontSize: 14 },

  muted: { color: COLORS.textMuted, fontSize: 13 },
  txnRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 13, marginBottom: 8 },
  txnDesc: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  txnMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  txnAmt: { fontSize: 15, fontWeight: '800' },
});
