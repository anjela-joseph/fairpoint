import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDriveMatrix, hasRoutingKey } from '../../lib/routing';
import { DEFAULT_PREFERENCES, wasVisited } from '../../lib/discovery';
import { selectAlternative } from '../../lib/planner';
import { candidateTowns, fairTownRows, enrichTowns, rankExperiences } from '../../lib/experience';
import { inCoverage } from '../../lib/coverage';
import { KERALA_STATEWIDE } from '../../data/kerala-statewide';
import { HISTORY_KEY, parseHistory } from '../../lib/history';
import { MESSAGES, friendly } from '../messages';

export const MAX_FRIENDS = 4;
const MODE = 'live';

// All trip state and actions (friends, preferences, search, saved history, dialogs).
// UI components receive these values as props and contain no planning logic.
export default function useMeetingPlanner() {
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
      .catch(() => { if (mounted) setNotice(MESSAGES.historyLoad); })
      .finally(() => { if (mounted) setHistoryReady(true); });
    return () => { mounted = false; };
  }, []);
  const visited = history.filter(p => p.kind === MODE);

  function invalidate() {
    active.current?.abort(); active.current = null;
    setLoading(false); setResult(null); setError(''); setNotice('');
  }

  function reset() { invalidate(); setFriends([]); setRecenter(n => n + 1); }
  function fitMap() { setRecenter(n => n + 1); }

  function addFriend(point) {
    if (!inCoverage(point, KERALA_STATEWIDE.metadata)) { setNotice(MESSAGES.outsideKerala); return; }
    if (friends.length >= MAX_FRIENDS && editIndex === null) { setNotice(MESSAGES.groupFull); return; }
    invalidate();
    const index = editIndex ?? friends.length;
    const friend = { ...point, name: point.name || 'Dropped pin', person: `Friend ${index + 1}` };
    setFriends(prev => editIndex === null ? [...prev, friend] : prev.map((old, i) => i === editIndex ? { ...friend, person: old.person } : old));
    setEditIndex(null); setDialog(null);
  }
  function removeFriend(index) { invalidate(); setFriends(prev => prev.filter((_, i) => i !== index).map((f, i) => ({ ...f, person: `Friend ${i + 1}` }))); }

  function openPicker(index = null) { setEditIndex(index); setDialog('town'); }
  function openDialog(name) { setDialog(name); }
  function closeDialog() { setDialog(null); setEditIndex(null); }

  function changePreferences(next) { invalidate(); setPreferences(next); }
  function selectOuting(id) { setResult(current => selectAlternative(current, id)); }

  async function remember() {
    if (!result || saving) return;
    const winner = result.winner;
    const next = [...history.filter(p => !(p.id === winner.id && p.kind === MODE)), { id: winner.id, name: winner.name, lat: winner.lat, lon: winner.lon, kind: MODE, visitedAt: new Date().toISOString() }].slice(-100);
    setSaving(true);
    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      setHistory(next);
      setResult(current => current && current.winner.id === winner.id && current.preferences.avoidVisited ? { ...current, alternatives: current.alternatives.filter(row => !wasVisited(row, [winner])) } : current);
    } catch { setError(MESSAGES.historySave); }
    finally { setSaving(false); }
  }

  async function clearHistory() {
    if (saving) return;
    const next = history.filter(p => p.kind !== MODE);
    setSaving(true);
    try { await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)); setHistory(next); invalidate(); }
    catch { setError(MESSAGES.historyClear); }
    finally { setSaving(false); }
  }

  async function run() {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setLoading(true); setError(''); setNotice(''); setResult(null);
    try {
      const { candidates, area } = candidateTowns(friends, preferences);
      if (!candidates.length) throw new Error('No candidate Kerala towns');
      setProgress(MESSAGES.progressRoutes);
      const matrix = await getDriveMatrix(friends, candidates, { signal: controller.signal });
      const fair = fairTownRows(friends, candidates, matrix, preferences, visited);
      setProgress(MESSAGES.progressPlaces);
      const enriched = await enrichTowns(fair.rows, { signal: controller.signal });
      const next = { ...rankExperiences(fair, enriched, preferences), area, routingSource: matrix.source };
      if (active.current === controller && !controller.signal.aborted) setResult(next);
    } catch (err) {
      if (active.current === controller && !controller.signal.aborted) setError(friendly(err));
    } finally { if (active.current === controller) { setLoading(false); active.current = null; } }
  }

  async function openLink(url) {
    try { await Linking.openURL(url); } catch { setError(MESSAGES.link); }
  }

  return {
    mode: MODE, friends, result, loading, error, notice, dialog, preferences, visited, historyReady, saving, progress, editIndex, recenter,
    routingReady: hasRoutingKey(),
    remembered: result ? wasVisited(result.winner, visited) : false,
    addFriend, removeFriend, openPicker, openDialog, closeDialog, changePreferences, selectOuting, remember, clearHistory, run, reset, fitMap, openLink,
  };
}
