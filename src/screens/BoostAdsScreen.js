import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, Image, ActivityIndicator,
  Alert, StyleSheet, RefreshControl,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { useNavigation } from '../context/NavigationContext';
import { getConnections } from '../services/socialApi';
import * as ads from '../services/adsApi';
import { getWallet } from '../services/walletApi';

const GENDERS = [{ label: 'All', value: null }, { label: 'Male', value: [1] }, { label: 'Female', value: [2] }];
const RADII = [10, 25, 40, 80]; // km — Meta allows 1..80 km around a city

// Small debounced-search hook shared by the location / interest / language pickers.
function useDebouncedSearch(searchFn, minLen = 2, delay = 350) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const q = query.trim();
    if (q.length < minLen) { setResults([]); setSearching(false); return; }
    let alive = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try { const r = await searchFn(q); if (alive) setResults(r); }
      catch { if (alive) setResults([]); }
      finally { if (alive) setSearching(false); }
    }, delay);
    return () => { alive = false; clearTimeout(t); };
  }, [query, searchFn, minLen, delay]);
  return { query, setQuery, results, searching, clear: () => { setQuery(''); setResults([]); } };
}

export default function BoostAdsScreen() {
  const { navigate } = useNavigation();

  const [wallet, setWallet] = useState({ balance: 0, commission_percent: 10 });
  const [pages, setPages] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [pageId, setPageId] = useState(null);      // connection id
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [post, setPost] = useState(null);          // selected post {id, message, full_picture}

  const [budget, setBudget] = useState('100');
  const [days, setDays] = useState('3');
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('65');
  const [genderIdx, setGenderIdx] = useState(0);

  // Targeting pickers — each is a debounced search + a selected list.
  const loc = useDebouncedSearch(ads.searchGeo);
  const [cities, setCities] = useState([]);        // [{ key, name }] — empty = all India
  const [radiusKm, setRadiusKm] = useState(25);

  const interest = useDebouncedSearch(ads.searchInterests);
  const [interests, setInterests] = useState([]);  // [{ id, name }]

  const lang = useDebouncedSearch(ads.searchLanguages);
  const [languages, setLanguages] = useState([]);  // [{ key, name }]

  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [w, conns, camps] = await Promise.all([getWallet(), getConnections(), ads.getCampaigns(30)]);
      setWallet(w);
      setPages((conns.connections || []).filter((c) => c.platform === 'facebook'));
      setCampaigns(camps);
    } catch (e) {
      setError(e.message || 'Could not load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const addCity = (r) => {
    if (!r?.key || cities.some((c) => c.key === r.key)) return;
    setCities((cs) => [...cs, { key: r.key, name: r.name }]);
    loc.clear();
  };
  const removeCity = (key) => setCities((cs) => cs.filter((c) => c.key !== key));

  const addInterest = (r) => {
    if (!r?.id || interests.some((i) => i.id === r.id)) return;
    setInterests((xs) => [...xs, { id: r.id, name: r.name }]);
    interest.clear();
  };
  const removeInterest = (id) => setInterests((xs) => xs.filter((i) => i.id !== id));

  const addLanguage = (r) => {
    if (!r?.key || languages.some((l) => l.key === r.key)) return;
    setLanguages((xs) => [...xs, { key: r.key, name: r.name }]);
    lang.clear();
  };
  const removeLanguage = (key) => setLanguages((xs) => xs.filter((l) => l.key !== key));

  const pickPage = async (connId) => {
    setPageId(connId); setPost(null); setPosts([]); setLoadingPosts(true); setError(null);
    try {
      setPosts(await ads.getPagePosts(connId));
    } catch (e) {
      setError(e.message || 'Could not load posts for this Page.');
    } finally {
      setLoadingPosts(false);
    }
  };

  const budgetNum = Math.max(0, parseFloat(budget) || 0);
  const commission = Math.ceil(budgetNum * (Number(wallet.commission_percent) || 0) / 100);
  const total = budgetNum + commission;
  const canAfford = total <= (wallet.balance || 0);

  const doBoost = async () => {
    if (!pageId) { setError('Pick a Facebook Page.'); return; }
    if (!post) { setError('Pick a post to boost.'); return; }
    if (budgetNum < 100) { setError('Minimum budget is ₹100.'); return; }
    if (!canAfford) { setError('Not enough wallet balance. Add money first.'); return; }

    setPosting(true); setError(null);
    try {
      const res = await ads.boost({
        connectionId: pageId,
        postId: post.id,
        budgetInr: budgetNum,
        durationDays: Math.max(1, parseInt(days, 10) || 1),
        targeting: {
          // A pinned city+radius targets just that area; otherwise all of India.
          ...(cities.length
            ? { cities: cities.map((c) => ({ key: c.key, radius: radiusKm })) }
            : { country_codes: ['IN'] }),
          age_min: parseInt(ageMin, 10) || 18,
          age_max: parseInt(ageMax, 10) || 65,
          genders: GENDERS[genderIdx].value || undefined,
          ...(interests.length ? { interests: interests.map((i) => ({ id: i.id, name: i.name })) } : {}),
          ...(languages.length ? { locales: languages.map((l) => parseInt(l.key, 10)).filter(Boolean) } : {}),
        },
      });
      Alert.alert('Boost launched 🎉', `Your ad is live. ₹${budgetNum} budget + ₹${commission} fee charged.`);
      setPost(null); setBudget('100');
      setWallet((w) => ({ ...w, balance: res.wallet_balance ?? w.balance }));
      ads.getCampaigns(30).then(setCampaigns);
    } catch (e) {
      setError(e.message || 'Could not launch the boost.');
    } finally {
      setPosting(false);
    }
  };

  const toggle = async (c) => {
    const active = c.status !== 'active';
    try {
      await ads.setStatus(c.campaign_id, active);
      setCampaigns((list) => list.map((x) => (x.id === c.id ? { ...x, status: active ? 'active' : 'paused' } : x)));
    } catch (e) {
      Alert.alert('Error', e.message);
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
      {/* Balance strip */}
      <TouchableOpacity style={styles.balanceStrip} onPress={() => navigate('wallet')}>
        <Text style={styles.balanceText}>💰 {(wallet.balance || 0).toLocaleString()} pts</Text>
        <Text style={styles.balanceAdd}>Add money →</Text>
      </TouchableOpacity>

      {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {error}</Text></View>}

      {pages.length === 0 ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>Connect a Facebook Page first (Social Media → Connect) to boost its posts.</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigate('social')}>
            <Text style={styles.secondaryBtnText}>Go to Social Media</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* 1. Page */}
          <Text style={styles.section}>1. Choose a Page</Text>
          <View style={styles.chips}>
            {pages.map((p) => (
              <TouchableOpacity key={p.id} style={[styles.chip, pageId === p.id && styles.chipOn]} onPress={() => pickPage(p.id)}>
                <Text style={[styles.chipText, pageId === p.id && styles.chipTextOn]}>📘 {p.account_name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 2. Post */}
          {pageId && (
            <>
              <Text style={styles.section}>2. Choose a Post</Text>
              {loadingPosts ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 10 }} />
              ) : posts.length === 0 ? (
                <Text style={styles.muted}>No posts found on this Page. Publish a post first (Social Media).</Text>
              ) : posts.map((ps) => (
                <TouchableOpacity key={ps.id} style={[styles.postCard, post?.id === ps.id && styles.postCardOn]} onPress={() => setPost(ps)}>
                  {ps.full_picture ? <Image source={{ uri: ps.full_picture }} style={styles.postThumb} /> : <View style={[styles.postThumb, styles.postThumbEmpty]}><Text>📝</Text></View>}
                  <Text style={styles.postMsg} numberOfLines={2}>{ps.message || '(no caption)'}</Text>
                  {post?.id === ps.id && <Text style={styles.postCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* 3. Budget + targeting */}
          {post && (
            <>
              <Text style={styles.section}>3. Budget & Audience</Text>
              <View style={styles.row2}>
                <View style={styles.col}>
                  <Text style={styles.label}>Budget (₹)</Text>
                  <TextInput style={styles.input} value={budget} onChangeText={setBudget} keyboardType="numeric" />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Duration (days)</Text>
                  <TextInput style={styles.input} value={days} onChangeText={setDays} keyboardType="numeric" />
                </View>
              </View>
              <View style={styles.row2}>
                <View style={styles.col}>
                  <Text style={styles.label}>Age min</Text>
                  <TextInput style={styles.input} value={ageMin} onChangeText={setAgeMin} keyboardType="numeric" />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Age max</Text>
                  <TextInput style={styles.input} value={ageMax} onChangeText={setAgeMax} keyboardType="numeric" />
                </View>
              </View>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.chips}>
                {GENDERS.map((g, i) => (
                  <TouchableOpacity key={g.label} style={[styles.chip, genderIdx === i && styles.chipOn]} onPress={() => setGenderIdx(i)}>
                    <Text style={[styles.chipText, genderIdx === i && styles.chipTextOn]}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Location targeting */}
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={loc.query}
                onChangeText={loc.setQuery}
                placeholder="Search a city or area (e.g. Mumbai)"
                placeholderTextColor={COLORS.textMuted}
              />
              {loc.searching && <Text style={styles.hint}>Searching…</Text>}
              {loc.results.length > 0 && (
                <View style={styles.locResults}>
                  {loc.results.map((r) => (
                    <TouchableOpacity key={r.key} style={styles.locRow} onPress={() => addCity(r)}>
                      <Text style={styles.locRowText} numberOfLines={1}>
                        📍 {[r.name, r.region, r.country_name].filter(Boolean).join(', ')}
                      </Text>
                      <Text style={styles.locType}>{r.type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {cities.length === 0 ? (
                <Text style={styles.hint}>Targeting all of India. Search above to target a specific city/area.</Text>
              ) : (
                <>
                  <View style={styles.chips}>
                    {cities.map((c) => (
                      <TouchableOpacity key={c.key} style={styles.cityChip} onPress={() => removeCity(c.key)}>
                        <Text style={styles.cityChipText}>📍 {c.name} ✕</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.label}>Radius around each area</Text>
                  <View style={styles.chips}>
                    {RADII.map((km) => (
                      <TouchableOpacity key={km} style={[styles.chip, radiusKm === km && styles.chipOn]} onPress={() => setRadiusKm(km)}>
                        <Text style={[styles.chipText, radiusKm === km && styles.chipTextOn]}>{km} km</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Interests (detailed targeting) */}
              <Text style={styles.label}>Interests (optional)</Text>
              <TextInput
                style={styles.input}
                value={interest.query}
                onChangeText={interest.setQuery}
                placeholder="e.g. Fitness, Real estate, Cooking"
                placeholderTextColor={COLORS.textMuted}
              />
              {interest.searching && <Text style={styles.hint}>Searching…</Text>}
              {interest.results.length > 0 && (
                <View style={styles.locResults}>
                  {interest.results.slice(0, 12).map((r) => (
                    <TouchableOpacity key={r.id} style={styles.locRow} onPress={() => addInterest(r)}>
                      <Text style={styles.locRowText} numberOfLines={1}>🎯 {r.name}</Text>
                      {Array.isArray(r.path) && r.path.length > 1 && (
                        <Text style={styles.locType} numberOfLines={1}>{r.path[r.path.length - 2]}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {interests.length > 0 && (
                <View style={styles.chips}>
                  {interests.map((i) => (
                    <TouchableOpacity key={i.id} style={styles.cityChip} onPress={() => removeInterest(i.id)}>
                      <Text style={styles.cityChipText}>🎯 {i.name} ✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Languages */}
              <Text style={styles.label}>Languages (optional)</Text>
              <TextInput
                style={styles.input}
                value={lang.query}
                onChangeText={lang.setQuery}
                placeholder="e.g. Hindi, English, Marathi"
                placeholderTextColor={COLORS.textMuted}
              />
              {lang.searching && <Text style={styles.hint}>Searching…</Text>}
              {lang.results.length > 0 && (
                <View style={styles.locResults}>
                  {lang.results.slice(0, 12).map((r) => (
                    <TouchableOpacity key={r.key} style={styles.locRow} onPress={() => addLanguage(r)}>
                      <Text style={styles.locRowText} numberOfLines={1}>🗣 {r.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {languages.length > 0 && (
                <View style={styles.chips}>
                  {languages.map((l) => (
                    <TouchableOpacity key={l.key} style={styles.cityChip} onPress={() => removeLanguage(l.key)}>
                      <Text style={styles.cityChipText}>🗣 {l.name} ✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Cost */}
              <View style={styles.costBox}>
                <View style={styles.costRow}><Text style={styles.costLabel}>Ad budget</Text><Text style={styles.costVal}>₹{budgetNum}</Text></View>
                <View style={styles.costRow}><Text style={styles.costLabel}>Service fee ({wallet.commission_percent}%)</Text><Text style={styles.costVal}>₹{commission}</Text></View>
                <View style={[styles.costRow, styles.costTotal]}><Text style={styles.costLabelBold}>Total</Text><Text style={styles.costValBold}>{total} pts</Text></View>
                {!canAfford && <Text style={styles.costWarn}>Not enough balance ({(wallet.balance || 0).toLocaleString()} pts) — add money.</Text>}
              </View>

              <TouchableOpacity style={[styles.boostBtn, (!canAfford || posting) && { opacity: 0.6 }]} onPress={doBoost} disabled={posting || !canAfford}>
                {posting ? <ActivityIndicator color="#fff" /> : <Text style={styles.boostBtnText}>🚀 Boost Post — {total} pts</Text>}
              </TouchableOpacity>
            </>
          )}
        </>
      )}

      {/* Campaigns */}
      <Text style={[styles.section, { marginTop: 26 }]}>Your Boosts</Text>
      {campaigns.length === 0 ? (
        <Text style={styles.muted}>No boosts yet.</Text>
      ) : campaigns.map((c) => (
          <View key={c.id} style={styles.campCard}>
            <View style={styles.campHead}>
              <Text style={[styles.campStatus, { color: c.status === 'active' ? '#059669' : c.status === 'failed' ? '#dc2626' : '#b45309' }]}>{(c.status || '').toUpperCase()}</Text>
              <Text style={styles.campDate}>₹{c.budget_inr} · {c.duration_days}d</Text>
            </View>
            <View style={styles.campActions}>
              <TouchableOpacity onPress={() => navigate('ad-insights', { campaign: c })}><Text style={styles.campAction}>📊 Insights</Text></TouchableOpacity>
              {c.status !== 'failed' && (
                <TouchableOpacity onPress={() => toggle(c)}><Text style={styles.campAction}>{c.status === 'active' ? '⏸ Pause' : '▶️ Resume'}</Text></TouchableOpacity>
              )}
            </View>
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 60 },

  balanceStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, marginBottom: 16 },
  balanceText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  balanceAdd: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 12 },

  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 12, marginBottom: 14 },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },

  notice: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 14, padding: 16 },
  noticeText: { fontSize: 13, color: '#92400e', lineHeight: 19, marginBottom: 12 },
  secondaryBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  secondaryBtnText: { color: '#fff', fontWeight: '700' },

  section: { fontSize: 13, fontWeight: '800', color: COLORS.primary, marginBottom: 10, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  muted: { color: COLORS.textMuted, fontSize: 13 },
  hint: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  chip: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  chipOn: { borderColor: COLORS.primary, backgroundColor: 'rgba(21,62,63,0.06)' },
  chipText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  chipTextOn: { color: COLORS.primary },

  locResults: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, marginTop: 6, overflow: 'hidden' },
  locRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  locRowText: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '600' },
  locType: { fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', marginLeft: 8 },
  cityChip: { backgroundColor: 'rgba(21,62,63,0.06)', borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  cityChipText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },

  postCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, padding: 10, marginBottom: 8 },
  postCardOn: { borderColor: COLORS.primary },
  postThumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: COLORS.border, marginRight: 12 },
  postThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  postMsg: { flex: 1, fontSize: 13, color: COLORS.text },
  postCheck: { color: COLORS.primary, fontWeight: '900', fontSize: 18, marginLeft: 8 },

  row2: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  col: { flex: 1 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'rgba(21,62,63,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: COLORS.text },

  costBox: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginTop: 8 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  costLabel: { fontSize: 13, color: COLORS.textMuted },
  costVal: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  costTotal: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 6, paddingTop: 8 },
  costLabelBold: { fontSize: 14, color: COLORS.primary, fontWeight: '800' },
  costValBold: { fontSize: 15, color: COLORS.primary, fontWeight: '900' },
  costWarn: { color: '#dc2626', fontSize: 12, marginTop: 8, fontWeight: '600' },

  boostBtn: { backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  boostBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },

  campCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 10 },
  campHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  campStatus: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  campDate: { fontSize: 12, color: COLORS.textMuted },
  campActions: { flexDirection: 'row', gap: 18, marginTop: 8 },
  campAction: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});
