/**
 * Health Connect 권한 요청 시 MainActivity 재시작 루프 방지.
 *
 * 원인: react-native-health-connect Expo 플러그인이 rationale 필터를
 *       런처 액티비티(MainActivity)에 붙여 requestPermission() 호출 시
 *       앱이 재시작되어 HC 목록 등록 불가.
 *
 * 해결: 플러그인을 app.json plugins에서 제외(rationale 필터 미주입)하고,
 *       rationale·VIEW_PERMISSION_USAGE 수신을 위한 전용 activity-alias를
 *       이 플러그인으로 직접 추가한다.
 *       <queries>·<uses-permission>은 각각 라이브러리 네이티브 매니페스트
 *       (Gradle 머지)와 app.json android.permissions로 처리.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function fixHCRationale(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];

    if (!app['activity-alias']) {
      app['activity-alias'] = [];
    }

    // rationale 전용 alias — HC가 MainActivity 대신 여기로 인텐트를 보냄
    app['activity-alias'].push({
      $: {
        'android:name': '.PermissionsRationaleAlias',
        'android:targetActivity': '.MainActivity',
        'android:exported': 'true',
      },
      'intent-filter': [
        {
          action: [
            {
              $: {
                'android:name':
                  'androidx.health.connect.action.SHOW_PERMISSIONS_RATIONALE',
              },
            },
          ],
        },
      ],
    });

    // Android 14+(API 34) 권한 사용 내역 화면 alias
    app['activity-alias'].push({
      $: {
        'android:name': '.ViewPermissionUsageAlias',
        'android:targetActivity': '.MainActivity',
        'android:exported': 'true',
        'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
      },
      'intent-filter': [
        {
          action: [
            {
              $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' },
            },
          ],
          category: [
            {
              $: {
                'android:name': 'android.intent.category.HEALTH_PERMISSIONS',
              },
            },
          ],
        },
      ],
    });

    return config;
  });
};
