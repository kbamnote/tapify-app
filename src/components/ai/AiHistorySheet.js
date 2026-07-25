import React, { useState, useEffect, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../../theme/colors';
import { fetchHistory } from '../../services/aiApi';
import { resultToText } from '../../utils/aiResultText';

/** Bottom-sheet style modal showing a tool's recent generations. */
export default function AiHistorySheet({ visible, tool, onClose, onSelect }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!tool) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHistory(tool.key, { limit: 30 });
      setItems(data);
    } catch (e) {
      setError(e.message || 'Could not load history');
    } finally {
      setLoading(false);
    }
  }, [tool]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{tool?.icon} {tool?.title} · History</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 40 }} />
          ) : error ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity onPress={load} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🕘</Text>
              <Text style={styles.emptyText}>No history yet. Generate something to see it here.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {items.map((item) => {
                const preview = resultToText(tool, item.result).replace(/\n+/g, ' ').slice(0, 120);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.item}
                    activeOpacity={0.85}
                    onPress={() => { onSelect(item); onClose(); }}
                  >
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemDate}>{formatDate(item.created_at)}</Text>
                      {item.is_saved && <Text style={styles.savedBadge}>❤️ Saved</Text>}
                    </View>
                    <Text style={styles.itemPreview} numberOfLines={2}>{preview || '—'}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function formatDate(s) {
  if (!s) return '';
  try {
    const d = new Date(s.replace(' ', 'T'));
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return s;
  }
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '80%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.primary, flex: 1 },
  close: { fontSize: 18, color: COLORS.textMuted, padding: 4 },
  item: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemDate: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  savedBadge: { fontSize: 11, fontWeight: '700', color: COLORS.error },
  itemPreview: { fontSize: 13, color: COLORS.text, lineHeight: 19 },
  empty: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 14, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
});
