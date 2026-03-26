import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { HEADER_PADDING_TOP } from '../utils/layout';

export default function WearableScreen({ navigation }: any) {
  const { t } = useLanguage();
  const [appleConnected, setAppleConnected] = useState(false);
  const [samsungConnected, setSamsungConnected] = useState(false);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{t.back}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t.wearableTitle}</Text>
        <Text style={styles.subtitle}>{t.wearableSubtitle}</Text>
      </View>

      <View style={styles.content}>

        {/* Apple Watch */}
        <View style={styles.deviceCard}>
          <View style={styles.deviceHeader}>
            <Text style={styles.deviceIcon}>⌚</Text>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>Apple Watch</Text>
              <Text style={styles.devicePlatform}>iOS · HealthKit</Text>
            </View>
            <View style={[styles.badge, styles.badgeSoon]}>
              <Text style={styles.badgeSoonText}>{t.wearableComingSoon}</Text>
            </View>
          </View>
          <Text style={styles.deviceDesc}>{t.wearableAppleDesc}</Text>
          <View style={styles.metricsRow}>
            {[`🚶 ${t.metricSteps}`, `❤️ ${t.metricHR}`, `💤 ${t.wearableSleep}`, `🔥 ${t.wearableCalories}`].map(m => (
              <View key={m} style={styles.metricChip}>
                <Text style={styles.metricChipText}>{m}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={[styles.connectBtn, styles.connectBtnDisabled]} disabled>
            <Text style={styles.connectBtnTextDisabled}>{t.wearableAppleRequires}</Text>
          </TouchableOpacity>
        </View>

        {/* Samsung Galaxy Watch */}
        <View style={styles.deviceCard}>
          <View style={styles.deviceHeader}>
            <Text style={styles.deviceIcon}>⌚</Text>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>Samsung Galaxy Watch</Text>
              <Text style={styles.devicePlatform}>Android · Health Connect</Text>
            </View>
            <View style={[styles.badge, samsungConnected ? styles.badgeConnected : styles.badgeReady]}>
              <Text style={[styles.badgeText, samsungConnected && styles.badgeConnectedText]}>
                {samsungConnected ? t.wearableConnected : t.wearableReady}
              </Text>
            </View>
          </View>
          <Text style={styles.deviceDesc}>{t.wearableSamsungDesc}</Text>
          <View style={styles.metricsRow}>
            {[`🚶 ${t.metricSteps}`, `❤️ ${t.metricHR}`, `💤 ${t.wearableSleep}`, `⚖️ ${t.metricWeight}`, `🩸 ${t.wearableBloodOxygen}`].map(m => (
              <View key={m} style={styles.metricChip}>
                <Text style={styles.metricChipText}>{m}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.connectBtn, samsungConnected && styles.connectBtnActive]}
            onPress={() => setSamsungConnected(!samsungConnected)}
          >
            <Text style={styles.connectBtnText}>
              {samsungConnected ? t.wearableDisconnect : t.wearableConnect}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 안내 */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ {t.wearableInfoTitle}</Text>
          <Text style={styles.infoText}>{t.wearableInfoText}</Text>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4EF' },
  header: {
    backgroundColor: '#2D6A4F',
    padding: 20,
    paddingTop: HEADER_PADDING_TOP,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#B7E4C7', fontSize: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#B7E4C7', marginTop: 4 },
  content: { padding: 16 },
  deviceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceIcon: { fontSize: 36, marginRight: 12 },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 18, fontWeight: 'bold', color: '#1C1A17' },
  devicePlatform: { fontSize: 13, color: '#888', marginTop: 2 },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeSoon: { backgroundColor: '#FEF3C7' },
  badgeSoonText: { fontSize: 12, color: '#D97706', fontWeight: '600' },
  badgeReady: { backgroundColor: '#E8F4F0' },
  badgeConnected: { backgroundColor: '#D1FAE5' },
  badgeText: { fontSize: 12, color: '#2D6A4F', fontWeight: '600' },
  badgeConnectedText: { color: '#065F46' },
  deviceDesc: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 12 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  metricChip: {
    backgroundColor: '#F7F4EF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metricChipText: { fontSize: 13, color: '#555' },
  connectBtn: {
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  connectBtnActive: { backgroundColor: '#888' },
  connectBtnDisabled: { backgroundColor: '#E0E0E0' },
  connectBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  connectBtnTextDisabled: { color: '#999', fontWeight: '600', fontSize: 14 },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: { fontSize: 15, fontWeight: 'bold', color: '#1D4ED8', marginBottom: 6 },
  infoText: { fontSize: 14, color: '#3B82F6', lineHeight: 20 },
});
