import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LanguageProvider } from './i18n/LanguageContext';
import { scheduleDailyHealthReminder } from './utils/notifications';
import IntroScreen from './screens/IntroScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import HealthScreen from './screens/HealthScreen';
import DashboardScreen from './screens/DashboardScreen';
import SettingsScreen from './screens/SettingsScreen';
import WeeklyReportScreen from './screens/WeeklyReportScreen';
import AIRecommendScreen from './screens/AIRecommendScreen';
import AIChatScreen from './screens/AIChatScreen';
import CommunityScreen from './screens/CommunityScreen';
import GroupBoardScreen from './screens/GroupBoardScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import WearableScreen from './screens/WearableScreen';
import LifeScreen from './screens/LifeScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import HealthNewsScreen from './screens/HealthNewsScreen';

const Stack = createNativeStackNavigator();
const DEMO = { name: '홍길동', userId: 'demo-user', isGuest: false };

export default function App() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      scheduleDailyHealthReminder();
    }
  }, []);

  return (
    <LanguageProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Intro">
          <Stack.Screen name="Intro"       component={IntroScreen}       />
          <Stack.Screen name="Home"        component={HomeScreen}        initialParams={DEMO} />
          <Stack.Screen name="Login"       component={LoginScreen}       />
          <Stack.Screen name="Health"      component={HealthScreen}      initialParams={DEMO} />
          <Stack.Screen name="Dashboard"   component={DashboardScreen}   initialParams={DEMO} />
          <Stack.Screen name="AIChat"      component={AIChatScreen}      initialParams={DEMO} />
          <Stack.Screen name="Community"   component={CommunityScreen}   initialParams={DEMO} />
          <Stack.Screen name="GroupBoard"  component={GroupBoardScreen}  initialParams={DEMO} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} initialParams={DEMO} />
          <Stack.Screen name="Settings"    component={SettingsScreen}    initialParams={DEMO} />
          <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} initialParams={DEMO} />
          <Stack.Screen name="AIRecommend" component={AIRecommendScreen} initialParams={DEMO} />
          <Stack.Screen name="Wearable"    component={WearableScreen}    initialParams={DEMO} />
          <Stack.Screen name="Life"        component={LifeScreen}        initialParams={DEMO} />
          <Stack.Screen name="Onboarding"  component={OnboardingScreen}  />
          <Stack.Screen name="HealthNews"  component={HealthNewsScreen}  initialParams={DEMO} />
        </Stack.Navigator>
      </NavigationContainer>
    </LanguageProvider>
  );
}
