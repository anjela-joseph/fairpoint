import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Feather from '@expo/vector-icons/Feather';
import MeetingMap from './components/MeetingMap';
import OutingPreferences from './components/OutingPreferences';
import LocationSearch from './components/LocationSearch';
import OutingResults from './components/OutingResults';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FRIEND_COLORS } from './data/candidates';
import { getTravelMatrix, hasRoutingKey } from './lib/routing';
import { DEFAULT_PREFERENCES, wasVisited } from './lib/discovery';
import { selectAlternative } from './lib/planner';
import { candidateTowns, fairTownRows, enrichTowns, rankExperiences } from './lib/experience';
import { inCoverage } from './lib/coverage';
import { KERALA_STATEWIDE } from './data/kerala-statewide';
import { HISTORY_KEY, parseHistory } from './lib/history';

const C = { ink: '#253e34', green: '#176752', soft: '#eff3e9', muted: '#7c857c', border: '#e5e8df', paper: '#fafbf7', coral: '#be8e73' };
const Icon = ({ name, size = 18, color = C.ink }) => <Feather name={name} size={size} color={color} />;

function Button({ label, icon, onPress, primary, disabled, small, style, accessibilityLabel }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed, hovered }) => [s.button, primary && s.primary, small && s.smallButton, hovered && !disabled && { opacity: 0.85 }, pressed && { opacity: 0.65 }, disabled && { opacity: 0.4 }, style]}>
    {icon && <Icon name={icon} size={small ? 15 : 18} color={primary ? 'white' : C.green} />}
    {label && <Text style={[s.buttonText, primary && { color: 'white' }, small && { fontSize: 12 }]}>{label}</Text>}
  </Pressable>;
}

function Dialog({ title, children, onClose }) {
  return <Modal transparent animationType="fade" visible onRequestClose={onClose}>
    <View style={s.scrim}><View accessibilityViewIsModal style={s.dialog}>
      <View style={s.between}><Text accessibilityRole="header" style={s.dialogTitle}>{title}</Text><Button icon="x" accessibilityLabel="Close dialog" small onPress={onClose} /></View>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </View></View>
  </Modal>;
}

export default function App() { return <SafeAreaProvider><MeetingApp /></SafeAreaProvider>; }

function MeetingApp() {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const mode = 'live';
  const [friends, setFriends] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState(null);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [history, setHistory] = useState([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState('');
  const [editIndex, setEditIndex] = useState(null);
  const [recenter, setRecenter] = useState(0);
  const active = useRef(null);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(HISTORY_KEY).then(raw => { if (mounted) setHistory(parseHistory(raw)); })
      .catch(() => { if (mounted) setNotice('Past outings could not be loaded on this device.'); })
      .finally(() => { if (mounted) setHistoryReady(true); });
    return () => { mounted = false; };
  }, []);
  const visited = history.filter(p => p.kind === mode);

  function invalidate() {
    active.current?.abort(); active.current = null;
    setLoading(false); setResult(null); setError(''); setNotice('');
  }

  function reset() { invalidate(); setFriends([]); setRecenter(n => n + 1); }
  function addFriend(point) {
    if (!inCoverage(point, KERALA_STATEWIDE.metadata)) { setNotice('Choose a starting location inside Kerala.'); return; }
    if (friends.length >= 4 && editIndex === null) { setNotice('Four friends is a full trip. Remove a pin to add another.'); return; }
    invalidate();
    const index = editIndex ?? friends.length;
    const friend = { ...point, name: point.name || 'Dropped pin', person: `Friend ${index + 1}` };
    setFriends(prev => editIndex === null ? [...prev, friend] : prev.map((old, i) => i === editIndex ? { ...friend, person: old.person } : old));
    setEditIndex(null); setDialog(null);
  }
  function removeFriend(index) { invalidate(); setFriends(prev => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, person: `Friend ${i + 1}` }))); }
  function openPicker(index = null) { setEditIndex(index); setDialog('town'); }
  function changePreferences(next) { invalidate(); setPreferences(next); }
  async function remember() {
    if (!result || saving) return;
    const winner = result.winner;
    const next = [...history.filter(p => !(p.id === winner.id && p.kind === mode)), { id: winner.id, name: winner.name, lat: winner.lat, lon: winner.lon, kind: mode, visitedAt: new Date().toISOString() }].slice(-100);
    setSaving(true);
    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      setHistory(next);
      setResult(current => current && current.winner.id === winner.id && current.preferences.avoidVisited ? { ...current, alternatives: current.alternatives.filter(row => !wasVisited(row, [winner])) } : current);
    } catch { setError('This outing could not be saved on your device. Please try again.'); }
    finally { setSaving(false); }
  }
  async function clearHistory() {
    if (saving) return;
    const next = history.filter(p => p.kind !== mode);
    setSaving(true);
    try { await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)); setHistory(next); invalidate(); }
    catch { setError('History could not be cleared. Please try again.'); }
    finally { setSaving(false); }
  }
  async function run() {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setLoading(true); setError(''); setNotice(''); setResult(null);
    try {
      let next;
      {
        if (!hasRoutingKey()) throw new Error('Live routing needs an openrouteservice key. Add EXPO_PUBLIC_ORS_KEY to .env and restart Expo.');
        const { candidates, area } = candidateTowns(friends, preferences);
        if (!candidates.length) throw new Error('No candidate Kerala towns are in this exploration area. Move your pins or choose Go farther.');
        setProgress(`Checking road journeys to ${candidates.length} destinations…`);
        const matrix = await getTravelMatrix(friends, candidates, { signal: controller.signal });
        const fair = fairTownRows(friends, candidates, matrix, preferences, visited);
        setProgress(`Matching experiences at ${fair.rows.length} reachable destinations…`);
        const enriched = await enrichTowns(fair.rows, { signal: controller.signal });
        next = { ...rankExperiences(fair, enriched, preferences), area };
      }
      if (active.current === controller && !controller.signal.aborted) setResult(next);
    } catch (err) {
      if (active.current === controller && !controller.signal.aborted) setError(err.message || 'Something went wrong. Please try again.');
    } finally { if (active.current === controller) { setLoading(false); active.current = null; } }
  }
  async function openLink(url) {
    try { await Linking.openURL(url); } catch { setError('Could not open the link. Please try again.'); }
  }

  const mapPanel = <View style={[s.mapPanel, !desktop && { height: 340, minHeight: 340 }]}>
    <MeetingMap friends={friends} winner={result?.winner} onAdd={addFriend} recenter={recenter} />
    <View pointerEvents="box-none" style={s.mapTop}>
      <View style={s.mapLocation}><View style={s.dot} /><Text style={s.mapLocationText}>YOUR GROUP'S AREA</Text></View>
      <Button icon="maximize" small accessibilityLabel="Fit all pins on map" onPress={() => setRecenter(n => n + 1)} style={s.mapControl} />
    </View>
    <View pointerEvents="none" style={[s.mapBottom, !desktop && { left: 16, bottom: 30, right: 60 }]}>
      <View style={s.mapHintIcon}><Icon name={result ? 'check' : 'map-pin'} color={C.green} size={20} /></View>
      <View style={{ flex: 1 }}><Text style={s.mapHintTitle}>{result ? 'A place worth making the trip for.' : 'Your next catch-up starts with a pin.'}</Text>
        <Text style={s.mapHintText}>{result ? 'Pins show locations. Open Maps for road directions.' : 'Search a Kerala location or tap the map to add 2–4 friends.'}</Text></View>
    </View>
  </View>;

  const panel = <View style={[s.panelContent, !desktop && { paddingHorizontal: 22 }]}>
    <View style={s.eyebrowRow}><View style={s.eyebrowLine} /><Text style={s.eyebrow}>THE JOURNEY SHOULD BE FAIR</Text></View>
    <Text accessibilityRole="header" style={s.hero}>Good company.{ '\n' }Fair journeys<Text style={{ color: '#77946b' }}>.</Text></Text>
    <Text style={s.intro}>Find a place that brings everyone closer,{desktop ? '\n' : ' '}without one friend going the extra mile.</Text>
    <View style={[s.between, { marginTop: 28, marginBottom: 15 }]}><Text style={s.sectionTitle}>Who's coming?</Text><Text style={s.counter}>{friends.length} / 4 friends</Text></View>
    {friends.length === 0 && <View style={s.empty}><Icon name="users" size={28} color="#98a58c" /><Text style={s.emptyTitle}>Every good plan starts with friends.</Text><Text style={s.emptyText}>Choose a town below or tap the map to{ '\n' }drop your first pin.</Text></View>}
    {friends.map((friend, index) => <View key={`${index}-${friend.lat}-${friend.lon}`} style={s.friendRow}>
      <View style={[s.avatar, { backgroundColor: `${FRIEND_COLORS[index]}18` }]}><Text style={[s.avatarText, { color: FRIEND_COLORS[index] }]}>{index + 1}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Change location for ${friend.person}`} onPress={() => openPicker(index)} style={{ flex: 1, gap: 4 }}>
        <Text style={s.friendName}>{friend.person}<Text style={s.friendTown}> · {friend.name}</Text></Text>
        <Text style={s.coordinates}>{Math.abs(friend.lat).toFixed(4)}° {friend.lat >= 0 ? 'N' : 'S'}, {Math.abs(friend.lon).toFixed(4)}° {friend.lon >= 0 ? 'E' : 'W'}</Text>
      </Pressable>
      {mode === 'live' ? <Button icon="x" small accessibilityLabel={`Remove ${friend.person}`} onPress={() => removeFriend(index)} style={{ padding: 8 }} /> : <Icon name="map-pin" size={16} color="#adb5a8" />}
    </View>)}
    {mode === 'live' && <Button label={friends.length >= 4 ? 'Everyone is here' : 'Add a friend'} icon="plus" disabled={friends.length >= 4 || loading} onPress={() => openPicker()} style={s.addButton} />}
    <View style={s.modeNote}><Icon name="navigation" size={14} color={C.muted} /><Text style={s.noteText}>Local Kerala places · real road journeys</Text></View>
    <OutingPreferences value={preferences} onChange={changePreferences} visitedCount={visited.length} onClear={clearHistory} />
    {mode === 'live' && !hasRoutingKey() && <Pressable accessibilityRole="button" onPress={() => setDialog('setup')} style={s.setupNote}><Icon name="key" size={14} color="#887143" /><Text style={s.setupNoteText}>Connect a routing key to calculate your trip</Text><Icon name="arrow-up-right" size={14} color="#887143" /></Pressable>}
    <Button primary label={loading ? 'Finding your fair spot…' : result ? 'Find again' : 'Find a fair meeting point'} icon={loading ? undefined : 'arrow-right'} onPress={run} disabled={friends.length < 2 || loading || !historyReady || saving} style={{ marginTop: 8 }} />
    {loading && <View style={s.loading}><ActivityIndicator color={C.green} size="small" /><Text style={s.noteText}>{progress}</Text></View>}
    <View style={[s.between, { marginTop: 14 }]}><View style={s.inline}><Icon name="shield" size={12} color={C.muted} /><Text style={s.micro}>No account. Just a better plan.</Text></View><Button label={loading ? 'Cancel' : 'Reset trip'} icon="rotate-ccw" small onPress={reset} style={s.resetButton} /></View>
    {!!error && <View accessibilityRole="alert" style={s.error}><Icon name="alert-circle" color="#a94d3e" size={17} /><Text style={s.errorText}>{error}</Text></View>}
    {mode === 'live' && <Text style={s.notice}>Saved place data covers all 14 Kerala districts. Road journeys and Wikipedia still need internet. Mapped places may be incomplete.</Text>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
    {result ? <OutingResults result={result} friends={friends} mode={mode} onOpen={openLink} onSelect={id => setResult(current => selectAlternative(current, id))} onRemember={remember} remembered={wasVisited(result.winner, visited)} saving={saving} /> : <View style={s.howCard}>
      <View style={s.howIcon}><Icon name="git-merge" size={22} color={C.green} /></View>
      <View style={{ flex: 1 }}><Text style={s.howTitle}>Make the destination worth it.</Text><Text style={s.howText}>A scenic detour can be fair too. Choose what to do, how far to go, and how to share the journey.</Text><Pressable accessibilityRole="button" onPress={() => setDialog('about')}><Text style={s.textLink}>A little more about fairness ↗</Text></Pressable></View>
    </View>}
    <View style={s.panelFooter}><View style={s.dotSmall} /><Text style={s.micro}>A little thoughtfulness goes a long way.</Text></View>
  </View>;

  return <SafeAreaView style={s.root} edges={['top', 'left', 'right', 'bottom']}>
    <StatusBar style="dark" />
    <View style={[s.header, !desktop && { paddingHorizontal: 20, height: 70 }]}>
      <View style={s.brand}><View style={s.brandMark}><Icon name="git-merge" color="#eff4dc" size={24} /></View><Text style={s.brandText}>fairpoint<Text style={{ color: '#91a875' }}>.</Text></Text><View style={s.brandDivider} />{width > 600 && <Text style={s.brandCaption}>A better place to meet.</Text>}</View>
      <View style={s.inline}>{desktop && <Text style={s.headerTag}>FOR THE PEOPLE WORTH THE TRIP</Text>}<Button label={width > 500 ? 'How it works' : undefined} icon="help-circle" small accessibilityLabel="How it works" onPress={() => setDialog('about')} style={{ marginLeft: desktop ? 25 : 0 }} /></View>
    </View>
    {desktop ? <View style={s.desktopBody}><ScrollView style={s.sidebar} contentContainerStyle={{ flexGrow: 1 }}>{panel}</ScrollView>{mapPanel}</View> : <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>{mapPanel}{panel}</ScrollView>}
    {dialog === 'town' && <Dialog title={editIndex === null ? 'Where is your friend starting?' : 'Change starting point'} onClose={() => { setDialog(null); setEditIndex(null); }}>
      <LocationSearch onSelect={addFriend} />
    </Dialog>}
    {dialog === 'about' && <Dialog title="A fairer way to get together." onClose={() => setDialog(null)}>
      {[['01', 'A specific start, a worthwhile destination', 'Type to search saved Kerala villages, neighbourhoods and landmarks, search Kerala addresses online, or drop a map pin. Meeting destinations currently cover Kerala. Choose City, Scenic, or Mixed. Optional must-have activities need mapped evidence within 5 km of a town centre. Saved and live counts are labelled; handwritten vibe estimates are used when place data is unavailable.'], ['02', 'Fair can be farther away', 'There are no maximum drive or time-difference cutoffs. Journey fairness contributes 70% of the score and experience 30%. Similar journeys compares travel proportionally. Scenic with Go farther searches named nature destinations throughout Kerala and favours similar road distances, even beyond the group’s local area.'], ['03', 'Keep discovering', 'Browse up to eight distinct alternatives and nearby attractions from OpenStreetMap and English Wikipedia. Mark actual outings with We went here to avoid their surrounding 2 km next time. History stays on your device.']].map(([number, title, copy]) => <View key={number} style={s.aboutRow}><Text style={s.aboutNumber}>{number}</Text><View style={{ flex: 1 }}><Text style={s.howTitle}>{title}</Text><Text style={s.howText}>{copy}</Text></View></View>)}
      <Text style={s.dialogNote}>We compare up to 64 destinations, including mapped scenic places, towns and neighbourhoods. Stay closer explores around your group; Go farther considers all Kerala. Longer trips stay eligible. Similarity is the shortest journey divided by the longest, using road distance for Scenic with Go farther. Scores weight fairness 70% and experience 30%. Saved or live OpenStreetMap counts can be incomplete; vibe estimates are labelled. Road estimates exclude traffic. Address queries and coordinates go to openrouteservice; uncached town areas go to Overpass. Selecting a live result queries English Wikipedia around that town.</Text>
      <Button primary label="Let's make a plan" onPress={() => setDialog(null)} />
    </Dialog>}
    {dialog === 'setup' && <Dialog title="Connect live routing" onClose={() => setDialog(null)}>
      <Text style={s.dialogText}>Create a free openrouteservice token, copy .env.example to .env in the project folder, and add your token:</Text>
      <Text selectable style={s.code}>EXPO_PUBLIC_ORS_KEY=your_token</Text>
      <Text style={s.dialogText}>Restart with npx expo start -c. This client key is visible in the app bundle. Saved location search works without a key.</Text>
      <Button primary label="Open openrouteservice" icon="external-link" onPress={() => openLink('https://openrouteservice.org/dev/#/signup')} />
    </Dialog>}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  header: { height: 88, backgroundColor: C.paper, borderBottomWidth: 1, borderColor: C.border, paddingHorizontal: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 }, brandMark: { width: 39, height: 39, borderRadius: 13, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  brandText: { fontSize: 27, fontWeight: '800', color: C.ink, letterSpacing: -1.2 }, brandDivider: { width: 1, height: 22, backgroundColor: C.border, marginHorizontal: 9 }, brandCaption: { color: C.muted, fontSize: 12 }, headerTag: { color: C.muted, fontSize: 9, letterSpacing: 1.8, fontWeight: '600' },
  desktopBody: { flex: 1, flexDirection: 'row' }, sidebar: { width: 430, flexGrow: 0, flexShrink: 0, backgroundColor: C.paper, borderRightWidth: 1, borderColor: C.border }, panelContent: { paddingHorizontal: 32, paddingTop: 35, paddingBottom: 20 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 18 }, eyebrowLine: { width: 21, height: 1, backgroundColor: '#8fa37c' }, eyebrow: { fontSize: 9, letterSpacing: 1.7, fontWeight: '700', color: '#6d8263' },
  hero: { fontSize: 40, lineHeight: 45, letterSpacing: -1.8, color: C.ink, fontWeight: '600', fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia, serif' }) }, intro: { fontSize: 13, lineHeight: 21, color: C.muted, marginTop: 16, marginBottom: 26 },
  segment: { flexDirection: 'row', backgroundColor: '#ecefe7', padding: 4, borderRadius: 10, gap: 4 }, segmentItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, borderRadius: 7 }, segmentActive: { backgroundColor: C.paper, boxShadow: '0px 2px 5px #203d3510' }, segmentText: { fontSize: 12, fontWeight: '600', color: C.muted },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, inline: { flexDirection: 'row', alignItems: 'center', gap: 6 }, sectionTitle: { fontSize: 14, fontWeight: '600', color: C.ink }, counter: { fontSize: 10, color: C.muted, letterSpacing: 0.2 },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.border, borderRadius: 11, backgroundColor: '#ffffff', padding: 13, marginBottom: 9 }, avatar: { width: 34, height: 37, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }, avatarText: { fontWeight: '700', fontSize: 14 }, friendName: { color: C.ink, fontSize: 12, fontWeight: '700' }, friendTown: { fontWeight: '400', color: '#727d72' }, coordinates: { color: '#90988b', fontSize: 10, letterSpacing: 0.25 },
  button: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 15, borderRadius: 10 }, primary: { backgroundColor: C.green }, smallButton: { paddingVertical: 8, paddingHorizontal: 8 }, buttonText: { fontSize: 13, fontWeight: '600', color: C.green }, resetButton: { paddingHorizontal: 0, paddingVertical: 2 }, addButton: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#bac7af', paddingVertical: 13 },
  modeNote: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7, marginBottom: 14 }, noteText: { flexShrink: 1, fontSize: 10, color: C.muted, lineHeight: 16 }, micro: { fontSize: 9, color: C.muted }, setupNote: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#f5efde', padding: 10, borderRadius: 8, marginBottom: 8 }, setupNoteText: { fontSize: 10, color: '#887143', flex: 1, lineHeight: 16 },
  howCard: { flexDirection: 'row', gap: 13, paddingTop: 22, borderTopWidth: 1, borderColor: C.border, marginTop: 29 }, howIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#eaf0e3', alignItems: 'center', justifyContent: 'center' }, howTitle: { fontSize: 13, color: C.ink, fontWeight: '600', marginBottom: 6 }, howText: { fontSize: 11, lineHeight: 18, color: C.muted }, textLink: { fontSize: 10, fontWeight: '600', color: C.green, marginTop: 12 }, panelFooter: { flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', marginTop: 32 }, dotSmall: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#91a875' },
  mapPanel: { flex: 1, position: 'relative', backgroundColor: '#e5eadd', overflow: 'hidden' }, mapTop: { position: 'absolute', left: 27, right: 25, top: 23, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, mapLocation: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffffff0', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 9, boxShadow: '0 2px 12px #203d3510' }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }, mapLocationText: { color: C.ink, fontSize: 9, fontWeight: '700', letterSpacing: 1.7 }, mapControl: { backgroundColor: 'white', width: 39, height: 39, borderRadius: 9 },
  mapBottom: { position: 'absolute', left: 28, right: 80, bottom: 32, backgroundColor: '#fffffff5', borderRadius: 12, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: 435, boxShadow: '0 4px 22px #203d3512' }, mapHintIcon: { width: 38, height: 38, backgroundColor: '#eff3e9', borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, mapHintTitle: { color: C.ink, fontSize: 12, fontWeight: '600', lineHeight: 17 }, mapHintText: { color: C.muted, fontSize: 10, marginTop: 4, lineHeight: 15 },
  empty: { alignItems: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: '#f2f5ec', borderRadius: 10, padding: 24, marginBottom: 13, gap: 10 }, emptyTitle: { fontSize: 12, color: C.ink, textAlign: 'center' }, emptyText: { fontSize: 11, lineHeight: 18, color: C.muted, textAlign: 'center' }, loading: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 15 }, error: { flexDirection: 'row', gap: 9, backgroundColor: '#fcf0eb', borderRadius: 8, padding: 13, marginTop: 17 }, errorText: { color: '#a94d3e', fontSize: 12, lineHeight: 19, flex: 1 }, notice: { color: '#887143', fontSize: 11, lineHeight: 18, backgroundColor: '#f5f0e3', padding: 12, borderRadius: 8, marginTop: 12 },
  results: { borderTopWidth: 1, borderColor: C.border, marginTop: 27, paddingTop: 24 }, resultHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 20 }, sampleBadge: { marginLeft: 'auto', fontSize: 8, color: C.green, backgroundColor: '#eaf0e3', padding: 5, borderRadius: 4, letterSpacing: 1 }, meetLabel: { fontSize: 13, color: C.muted, marginBottom: 4 }, winnerName: { fontSize: 35, letterSpacing: -1.5, color: C.ink, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia, serif' }) }, stats: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff3e7', borderRadius: 11, paddingVertical: 18, marginTop: 18, marginBottom: 13 }, stat: { flex: 1, paddingHorizontal: 16 }, statValue: { fontSize: 28, fontWeight: '600', color: C.ink, letterSpacing: -0.8 }, statUnit: { fontSize: 12, fontWeight: '400', letterSpacing: 0 }, statLabel: { fontSize: 10, color: '#78866c', marginTop: 5 }, statDivider: { width: 1, height: 35, backgroundColor: '#dce3d1' }, mapsButton: { borderWidth: 1, borderColor: '#cedbc3', paddingVertical: 12 }, comparisonText: { fontSize: 11, color: C.muted, lineHeight: 17 }, legendDot: { width: 6, height: 6, borderRadius: 3 }, chartRow: { marginBottom: 15 }, chartName: { fontSize: 11, fontWeight: '600', color: C.ink, marginBottom: 6 }, chartFrom: { fontWeight: '400', color: C.muted }, barRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 4 }, barTrack: { flex: 1, height: 7, backgroundColor: '#edf0e7', borderRadius: 4, overflow: 'hidden' }, barFill: { height: 7, borderRadius: 4 }, barValue: { fontSize: 9, color: C.muted, width: 40, textAlign: 'right' }, placeRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 14, borderBottomWidth: 1, borderColor: C.border }, placeIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#edf1e6', alignItems: 'center', justifyContent: 'center' }, placeName: { fontSize: 12, fontWeight: '500', color: C.ink }, placeDistance: { fontSize: 10, color: C.muted, marginTop: 4 }, disclaimer: { fontSize: 9, lineHeight: 15, color: C.muted, marginTop: 17 },
  scrim: { flex: 1, backgroundColor: '#142c2466', alignItems: 'center', justifyContent: 'center', padding: 20 }, dialog: { backgroundColor: C.paper, borderRadius: 18, padding: 24, width: '100%', maxWidth: 470, maxHeight: '90%', gap: 16 }, dialogTitle: { color: C.ink, fontSize: 19, fontWeight: '600', flex: 1 }, dialogText: { fontSize: 13, lineHeight: 21, color: C.muted }, dialogNote: { fontSize: 11, lineHeight: 18, color: C.muted }, search: { color: C.ink, borderWidth: 1, borderColor: '#cbd6c2', backgroundColor: 'white', padding: 14, borderRadius: 9, fontSize: 14 }, townOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, borderBottomWidth: 1, borderColor: C.border }, townName: { flex: 1, color: C.ink, fontSize: 13 }, aboutRow: { flexDirection: 'row', gap: 14 }, aboutNumber: { fontSize: 13, fontWeight: '600', color: '#879b73' }, code: { fontSize: 12, backgroundColor: '#eaf0e3', padding: 14, borderRadius: 8, color: C.green, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
