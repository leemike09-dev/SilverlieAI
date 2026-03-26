import { Platform, StatusBar } from 'react-native';

export const HEADER_PADDING_TOP =
  Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 60;
