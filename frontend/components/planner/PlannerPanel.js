import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Button from '../common/Button';
import ErrorMessage from '../common/ErrorMessage';
import Notice from '../common/Notice';
import FriendList from '../friends/FriendList';
import OutingPreferences from '../preferences/OutingPreferences';
import OutingResults from '../results/OutingResults';
import RoutingKeyNotice from './RoutingKeyNotice';
import { C, F } from '../../theme';

// Left-hand (desktop) / lower (mobile) panel. `planner` is the object returned by useMeetingPlanner().
export default function PlannerPanel({ desktop, planner }) {
  const { mode, friends, result, loading, error, notice, preferences, visited, historyReady, saving, progress, routingReady, remembered } = planner;
  const live = mode === 'live';
  return <View style={[s.content, !desktop && s.mobile]}>
    <FriendList friends={friends} editable={live} loading={loading} onAdd={() => planner.openPicker()} onEdit={planner.openPicker} onRemove={planner.removeFriend} />
    <OutingPreferences value={preferences} onChange={planner.changePreferences} visitedCount={visited.length} onClear={planner.clearHistory} />
    <View style={s.actions}>
      {live && !routingReady && <RoutingKeyNotice onPress={() => planner.openDialog('setup')} />}
      <Button primary label={loading ? 'Working it out…' : result ? 'Find again' : 'Find a spot'} icon={loading ? undefined : 'arrow-right'} onPress={planner.run} disabled={friends.length < 2 || loading || !historyReady || saving} />
      {loading && <View style={s.loading}><ActivityIndicator color={C.ink} size="small" /><Text style={s.progress}>{progress}</Text></View>}
      {(friends.length > 0 || loading) && <Button plain small label={loading ? 'Cancel' : 'Start over'} onPress={planner.reset} style={s.reset} />}
      {!!error && <ErrorMessage message={error} />}
      {!!notice && <Notice live>{notice}</Notice>}
    </View>
    {result && <OutingResults result={result} friends={friends} mode={mode} onOpen={planner.openLink} onSelect={planner.selectOuting} onRemember={planner.remember} remembered={remembered} saving={saving} />}
  </View>;
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 32, paddingTop: 0, paddingBottom: 40 },
  mobile: { paddingHorizontal: 16, paddingTop: 28 },
  actions: { marginTop: 32 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 16 },
  progress: { fontFamily: F.body, fontSize: 17, color: C.ink },
  reset: { alignSelf: 'center', marginTop: 8 },
});
