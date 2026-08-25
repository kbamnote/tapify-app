import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, StyleSheet, RefreshControl,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { useNavigation } from '../context/NavigationContext';
import {
  getQuestions, answerQuestion, publishFaqs, getFields,
} from '../services/googleBusinessApi';
import { generate as generateAi } from '../services/aiApi';

/**
 * Questions & Answers on the Google listing.
 *
 * Two jobs on one screen. Answering what customers asked, and seeding your own
 * FAQ — Google allows an owner to post questions on their own listing, and
 * that is the only way to control what the Q&A section says before anyone
 * thinks to ask.
 *
 * The FAQ generator lives here rather than in the AI Growth Center because this
 * is where its output can actually be published. A card that only produced text
 * to copy was removed for exactly that reason.
 */

// The FAQ endpoint, addressed directly. generate() only needs `.endpoint`, and
// the tool has no card in the catalog any more.
const FAQ_TOOL = { key: 'faq', endpoint: '/api/ai/faq.php' };

export default function GoogleQuestionsScreen() {
  const { navigate } = useNavigation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [openId, setOpenId] = useState(null);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const [faqs, setFaqs] = useState(null);      // generated, awaiting review
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await getQuestions(10));   // Google caps this endpoint at 10 per page
    } catch (e) {
      setError(e?.message || 'Could not load questions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const post = async (q) => {
    const text = draft.trim();
    if (!text) return;
    setPosting(true);
    try {
      await answerQuestion(q.id, text);
      setOpenId(null);
      setDraft('');
      await load();
      Alert.alert('Answered', 'Your answer is now public on your Google listing.');
    } catch (e) {
      Alert.alert('Could not post', e?.message || 'Please try again.');
    } finally {
      setPosting(false);
    }
  };

  /** Generate FAQs from the live listing, for review before anything is posted. */
  const generateFaqs = async () => {
    setGenerating(true);
    try {
      let seed = {};
      try {
        const f = (await getFields())?.fields || {};
        seed = {
          business_name: f.business_name || '',
          category: f.primary_category || '',
          city: f.city || '',
          services: (f.services || []).map((s) => s.name).filter(Boolean).join(', '),
        };
      } catch (e) { /* the AI can work from less */ }

      if (!seed.business_name || !seed.category) {
        Alert.alert('Need a bit more', 'Set your business name and category on your listing first.');
        return;
      }
      const res = await generateAi(FAQ_TOOL, seed);
      const list = res?.result?.faqs || [];
      if (!list.length) {
        Alert.alert('Nothing generated', 'The AI did not return any FAQs. Try again.');
        return;
      }
      // Selected by default, but everything is reviewed before it goes public.
      setFaqs(list.map((f) => ({ ...f, keep: true })));
    } catch (e) {
      Alert.alert('Could not generate', e?.message || 'Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const publish = async () => {
    const chosen = (faqs || []).filter((f) => f.keep);
    if (!chosen.length) {
      Alert.alert('Nothing selected', 'Tick at least one question to post.');
      return;
    }
    Alert.alert(
      'Post to Google?',
      `${chosen.length} question${chosen.length === 1 ? '' : 's'} and their answers will be posted publicly on your listing, under your business name.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Post',
          onPress: async () => {
            setPublishing(true);
            try {
              const res = await publishFaqs(chosen.map(({ question, answer }) => ({ question, answer })));
              setFaqs(null);
              await load();
              const failed = (res?.results || []).filter((r) => !r.ok).length;
              Alert.alert(
                'Posted',
                failed
                  ? `${res.posted} posted. Google rejected ${failed} — it limits how many questions can be added at once, so try the rest in a few minutes.`
                  : `${res.posted} question${res.posted === 1 ? '' : 's'} added to your listing.`
              );
            } catch (e) {
              Alert.alert('Could not post', e?.message || 'Please try again.');
            } finally {
              setPublishing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.bigIcon}>❓</Text>
        <Text style={styles.errTitle}>Could not load questions</Text>
        <Text style={styles.errText}>{error}</Text>
        <Text style={[styles.errText, { marginTop: 10 }]}>
          If this says access was denied, the My Business Q&amp;A API may not be switched on for
          your account yet.
        </Text>
        <TouchableOpacity style={styles.errBtn} onPress={load}>
          <Text style={styles.errBtnText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigate('ai-growth')}>
          <Text style={styles.errLink}>Back to AI Growth Center</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const questions = data?.questions || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.backRow} onPress={() => navigate('ai-growth')}>
        <Text style={styles.backText}>← AI Growth Center</Text>
      </TouchableOpacity>

      {data?.unanswered > 0 && (
        <View style={styles.alert}>
          <Text style={styles.alertText}>
            {data.unanswered} question{data.unanswered === 1 ? '' : 's'} without an answer from you.
            Google shows whichever answer gets the most votes — including a stranger's guess — until
            you post your own.
          </Text>
        </View>
      )}

      {/* FAQ generator */}
      <View style={styles.faqCard}>
        <Text style={styles.faqTitle}>✨ Add your own FAQs</Text>
        <Text style={styles.faqSub}>
          Google lets you post questions on your own listing. Writing the common ones yourself is
          how you decide what the Q&amp;A section says, instead of waiting to be asked.
        </Text>

        {!faqs ? (
          <TouchableOpacity
            style={[styles.primaryBtn, generating && { opacity: 0.6 }]}
            onPress={generateFaqs}
            disabled={generating}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{generating ? 'Writing…' : 'Generate FAQs'}</Text>
          </TouchableOpacity>
        ) : (
          <>
            {faqs.map((f, i) => (
              <TouchableOpacity
                key={i}
                style={styles.faqRow}
                activeOpacity={0.8}
                onPress={() => setFaqs((p) => p.map((x, j) => (j === i ? { ...x, keep: !x.keep } : x)))}
              >
                <Text style={styles.faqCheck}>{f.keep ? '☑' : '☐'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.faqQ}>{f.question}</Text>
                  <Text style={styles.faqA}>{f.answer}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <View style={styles.faqActions}>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1 }, publishing && { opacity: 0.6 }]}
                onPress={publish}
                disabled={publishing}
              >
                <Text style={styles.primaryBtnText}>
                  {publishing ? 'Posting…' : `Post ${faqs.filter((f) => f.keep).length} to Google`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFaqs(null)}>
                <Text style={styles.cancel}>Discard</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.faqNote}>
              A few at a time — Google limits how quickly questions can be added.
            </Text>
          </>
        )}
      </View>

      {/* Existing questions */}
      <Text style={styles.sectionHead}>On your listing</Text>
      {questions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.bigIcon}>❓</Text>
          <Text style={styles.errText}>
            No questions yet. Add your own above so the section is not empty when someone looks.
          </Text>
        </View>
      ) : questions.map((q) => (
        <View key={q.id} style={styles.card}>
          <Text style={styles.qText}>{q.text}</Text>
          <Text style={styles.qMeta}>
            {q.is_mine ? 'Posted by you' : `Asked by ${q.author}`}
            {q.upvotes > 0 ? ` · ${q.upvotes} found this useful` : ''}
            {q.answer_count > 0 ? ` · ${q.answer_count} answer${q.answer_count === 1 ? '' : 's'}` : ''}
          </Text>

          {q.answer ? (
            <View style={styles.answerBox}>
              <Text style={styles.answerLabel}>Your answer</Text>
              <Text style={styles.answerText}>{q.answer}</Text>
            </View>
          ) : (
            <Text style={styles.unanswered}>No answer from you yet</Text>
          )}

          {openId === q.id ? (
            <View style={styles.editor}>
              <TextInput
                style={styles.input}
                multiline
                value={draft}
                onChangeText={setDraft}
                placeholder="Write your answer…"
                placeholderTextColor={COLORS.textMuted}
              />
              <View style={styles.editorActions}>
                <TouchableOpacity
                  style={[styles.btn, (!draft.trim() || posting) && { opacity: 0.5 }]}
                  onPress={() => post(q)}
                  disabled={!draft.trim() || posting}
                >
                  <Text style={styles.btnText}>{posting ? 'Posting…' : 'Post answer'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setOpenId(null); setDraft(''); }}>
                  <Text style={styles.cancel}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setOpenId(q.id); setDraft(q.answer || ''); }}>
              <Text style={styles.answerBtn}>{q.answer ? 'Edit answer' : '💬 Answer'}</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: COLORS.background },
  bigIcon: { fontSize: 34, marginBottom: 10 },
  errTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  errText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19 },
  errBtn: { marginTop: 16, backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  errBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  errLink: { marginTop: 12, fontSize: 12, color: COLORS.primary, textDecorationLine: 'underline' },

  backRow: { marginBottom: 12 },
  backText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  alert: {
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: 10, padding: 12, marginBottom: 14,
  },
  alertText: { fontSize: 12.5, color: '#92400e', lineHeight: 18 },

  faqCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1.5,
    borderColor: COLORS.primary, padding: 14, marginBottom: 20,
  },
  faqTitle: { fontSize: 14.5, fontWeight: '800', color: COLORS.primary },
  faqSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, marginBottom: 12, lineHeight: 17 },
  faqRow: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: 10,
  },
  faqCheck: { fontSize: 17, color: COLORS.primary, marginTop: 1 },
  faqQ: { fontSize: 13, fontWeight: '800', color: COLORS.text, lineHeight: 18 },
  faqA: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 3, lineHeight: 18 },
  faqActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  faqNote: { fontSize: 11, color: COLORS.textMuted, marginTop: 8 },

  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  sectionHead: {
    fontSize: 12, fontWeight: '800', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  empty: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, marginBottom: 10,
  },
  qText: { fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 20 },
  qMeta: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 4 },
  unanswered: { fontSize: 12, fontWeight: '700', color: '#b45309', marginTop: 10 },
  answerBox: {
    backgroundColor: COLORS.background, borderRadius: 8, padding: 10, marginTop: 10,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  answerLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted },
  answerText: { fontSize: 13, color: COLORS.text, marginTop: 3, lineHeight: 19 },
  answerBtn: { fontSize: 13, fontWeight: '800', color: COLORS.primary, marginTop: 10 },

  editor: { marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10,
    fontSize: 13, color: COLORS.text, minHeight: 80, textAlignVertical: 'top',
    backgroundColor: COLORS.background,
  },
  editorActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  cancel: { fontSize: 12, color: COLORS.textMuted },
});
