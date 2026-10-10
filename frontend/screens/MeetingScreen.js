import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import useMeetingPlanner from '../hooks/useMeetingPlanner';
import AppHeader from '../components/layout/AppHeader';
import MapPanel from '../components/map/MapPanel';
import IntroHero from '../components/planner/IntroHero';
import PlannerPanel from '../components/planner/PlannerPanel';
import AboutDialog from '../components/dialogs/AboutDialog';
import LocationDialog from '../components/dialogs/LocationDialog';
import SetupDialog from '../components/dialogs/SetupDialog';
import { C } from '../theme';

// Page layout: header, then side-by-side panel + map on desktop, or map above panel on mobile.
export default function MeetingScreen() {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const planner = useMeetingPlanner();

  const map = <MapPanel desktop={desktop} friends={planner.friends} result={planner.result} onAdd={planner.addFriend} recenter={planner.recenter} onRecenter={planner.fitMap} />;
  const panel = <PlannerPanel desktop={desktop} planner={planner} />;

  return <SafeAreaView style={s.root} edges={['top', 'left', 'right', 'bottom']}>
    <StatusBar style="dark" />
    <AppHeader width={width} desktop={desktop} onHelp={() => planner.openDialog('about')} />
    {desktop
      ? <View style={s.desktopBody}><ScrollView style={s.sidebar} contentContainerStyle={{ flexGrow: 1 }}><IntroHero desktop />{panel}</ScrollView>{map}</View>
      : <ScrollView contentContainerStyle={{ paddingBottom: 12 }}><IntroHero />{map}{panel}</ScrollView>}
    {planner.dialog === 'town' && <LocationDialog editing={planner.editIndex !== null} onSelect={planner.addFriend} onClose={planner.closeDialog} />}
    {planner.dialog === 'about' && <AboutDialog onClose={planner.closeDialog} />}
    {planner.dialog === 'setup' && <SetupDialog onClose={planner.closeDialog} onOpen={planner.openLink} />}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  desktopBody: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 470, flexGrow: 0, flexShrink: 0, backgroundColor: C.paper, borderRightWidth: 1, borderColor: C.ink },
});
