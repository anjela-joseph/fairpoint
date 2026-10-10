import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import MeetingScreen from './screens/MeetingScreen';
import { FONT_FILES } from './theme';

export default function App() {
  const [loaded, failed] = useFonts(FONT_FILES);
  if (!loaded && !failed) return null; // fonts are bundled, so this is a split second
  return <SafeAreaProvider><MeetingScreen /></SafeAreaProvider>;
}
