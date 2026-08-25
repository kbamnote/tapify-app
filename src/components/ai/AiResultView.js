import React from 'react';
import { View, Text, TouchableOpacity, ToastAndroid, Platform, Alert, StyleSheet } from 'react-native';
import { COLORS } from '../../theme/colors';
import { copyText, shareText } from '../../utils/aiClipboard';
import { resultToText } from '../../utils/aiResultText';

function notify(msg) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert('', msg);
}

async function handleCopy(text) {
  const r = await copyText(text);
  if (r.ok) notify(r.method === 'share' ? 'Shared' : 'Copied to clipboard');
}

/**
 * Small labelled block with its own Copy button (sections / review replies).
 *
 * When the section declares an `apply` target it also gets an Apply button that
 * writes the text into the real field. That button is the difference between a
 * text generator and a product — without it the customer copies, leaves, finds
 * the right field and pastes, which is where most of them stop.
 */
function SectionBlock({ label, text, apply, onApply, applying, applied }) {
  if (!text) return null;
  const busy = applying === apply?.field;
  const done = applied === apply?.field;
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <TouchableOpacity onPress={() => handleCopy(text)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.miniCopy}>📋 Copy</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionText}>{text}</Text>
      {!!apply && !!onApply && (
        <TouchableOpacity
          style={[styles.applyBtn, done && styles.applyBtnDone, busy && { opacity: 0.6 }]}
          disabled={busy || done}
          onPress={() => onApply(apply, text)}
          activeOpacity={0.85}
        >
          <Text style={[styles.applyBtnText, done && styles.applyBtnTextDone]}>
            {busy ? 'Applying…' : done ? '✅ Applied to Google' : `⬆️  ${apply.label || 'Apply'}`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ResultBody({ tool, result, onApply, applying, applied }) {
  switch (tool.render) {
    case 'sections':
      return (
        <View>
          {(tool.sections || []).map((s) => (
            <SectionBlock
              key={s.key}
              label={s.label}
              text={(result[s.key] || '').toString().trim()}
              apply={s.apply}
              onApply={onApply}
              applying={applying}
              applied={applied}
            />
          ))}
        </View>
      );

    case 'keywords':
      return (
        <View>
          {(tool.groups || []).map((g) => {
            const list = Array.isArray(result[g.key]) ? result[g.key] : [];
            if (!list.length) return null;
            return (
              <View key={g.key} style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>{g.label}</Text>
                  <TouchableOpacity onPress={() => handleCopy(list.join(', '))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.miniCopy}>📋 Copy</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.chipWrap}>
                  {list.map((kw, i) => (
                    <View key={`${kw}-${i}`} style={styles.chip}>
                      <Text style={styles.chipText}>{kw}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      );

    case 'list': {
      const list = Array.isArray(result[tool.listKey]) ? result[tool.listKey] : [];
      return (
        <View style={styles.sectionBlock}>
          {list.map((item, i) => (
            <View key={i} style={styles.listRow}>
              <Text style={styles.listNum}>{i + 1}</Text>
              <Text style={styles.listText}>{item}</Text>
              <TouchableOpacity onPress={() => handleCopy(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.miniCopy}>📋</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      );
    }

    case 'faq': {
      const list = Array.isArray(result[tool.listKey]) ? result[tool.listKey] : [];
      return (
        <View>
          {list.map((f, i) => (
            <View key={i} style={styles.sectionBlock}>
              <Text style={styles.faqQ}>Q{i + 1}. {f.question}</Text>
              <Text style={styles.faqA}>{f.answer}</Text>
            </View>
          ))}
        </View>
      );
    }

    default:
      return <Text style={styles.sectionText}>{JSON.stringify(result)}</Text>;
  }
}

export default function AiResultView({ tool, result, meta, onRegenerate, onSaveToggle, isSaved, onOpenHistory, saving, loading, onApply, applying, applied }) {
  const fullText = resultToText(tool, result);
  const canSave = !!meta?.history_id;

  return (
    <View style={styles.container}>
      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={onRegenerate} disabled={loading} activeOpacity={0.8}>
          <Text style={styles.actionText}>🔄 Regenerate</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleCopy(fullText)} activeOpacity={0.8}>
          <Text style={styles.actionText}>📋 Copy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => shareText(fullText)} activeOpacity={0.8}>
          <Text style={styles.actionText}>📤 Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, isSaved && styles.actionBtnActive]}
          onPress={onSaveToggle}
          disabled={!canSave || saving}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionText, !canSave && styles.actionTextDisabled]}>{isSaved ? '❤️ Saved' : '🤍 Save'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onOpenHistory} activeOpacity={0.8}>
          <Text style={styles.actionText}>🕘 History</Text>
        </TouchableOpacity>
      </View>

      {/* Meta line */}
      {!!meta && (
        <Text style={styles.meta}>
          {meta.cached ? '💾 Saved result' : '✨ Freshly generated'}
          {meta.provider ? ` · ${meta.provider}` : ''}
        </Text>
      )}

      <ResultBody tool={tool} result={result} onApply={onApply} applying={applying} applied={applied} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  actionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  actionBtn: {
    backgroundColor: 'rgba(21,62,63,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(21,62,63,0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionBtnActive: { backgroundColor: '#fff1f2', borderColor: '#ffe4e6' },
  actionText: { fontSize: 12.5, fontWeight: '700', color: COLORS.primary },
  actionTextDisabled: { color: COLORS.textMuted },
  meta: { fontSize: 11, color: COLORS.textMuted, marginBottom: 14, fontStyle: 'italic' },

  sectionBlock: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: COLORS.primary, flex: 1 },
  miniCopy: { fontSize: 12, fontWeight: '700', color: COLORS.accent },
  sectionText: { fontSize: 14, color: COLORS.text, lineHeight: 21 },
  applyBtn: {
    marginTop: 10, backgroundColor: COLORS.primary, borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  applyBtnDone: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#059669' },
  applyBtnText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  applyBtnTextDone: { color: '#059669' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: 'rgba(21,62,63,0.06)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  listNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, color: '#fff',
    fontSize: 12, fontWeight: '800', textAlign: 'center', lineHeight: 24, marginRight: 10,
  },
  listText: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },

  faqQ: { fontSize: 14, fontWeight: '800', color: COLORS.primary, marginBottom: 6 },
  faqA: { fontSize: 13.5, color: COLORS.text, lineHeight: 20 },
});
