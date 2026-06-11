/**
 * react-native-health-connect 플러그인이 MainActivity에 추가하는
 * ACTION_SHOW_PERMISSIONS_RATIONALE 인텐트 필터를 제거.
 *
 * 이 필터가 있으면 requestPermission() 호출 시 HC가 우리 앱에 인텐트를 보내
 * MainActivity가 재시작(크래시처럼 보임)되는 문제 발생 — Android 16(API 36) 확인됨.
 * 필터 제거 후 HC는 자체 권한 UI만 표시하고, 우리 앱을 재시작하지 않음.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function removeHCRationale(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults?.manifest?.application?.[0];
    if (!app?.activity) return config;

    for (const activity of app.activity) {
      if (!activity['intent-filter']) continue;
      activity['intent-filter'] = activity['intent-filter'].filter((filter) => {
        const actions = filter.action || [];
        return !actions.some(
          (a) => a.$?.['android:name'] === 'android.health.connect.action.SHOW_PERMISSIONS_RATIONALE'
        );
      });
    }
    return config;
  });
};
