const IS_DEV = process.env.APP_VARIANT === 'development';

module.exports = {
  expo: {
    name: IS_DEV ? '실버라이프 (Dev)' : '실버 라이프 AI',
    slug: 'silver-life-ai',
    version: '1.0.0',
    scheme: IS_DEV ? 'silverlifeai-dev' : 'silverlifeai',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    android: {
      package: IS_DEV ? 'com.silverlifeai.app.dev' : 'com.silverlifeai.app',
      adaptiveIcon: {
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      permissions: [
        'android.permission.ACTIVITY_RECOGNITION',
        'android.permission.INTERNET',
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.VIBRATE',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.ACCESS_BACKGROUND_LOCATION',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_LOCATION',
        'android.permission.health.READ_HEART_RATE',
        'android.permission.health.READ_STEPS',
        'android.permission.health.READ_SLEEP',
        'android.permission.health.READ_OXYGEN_SATURATION',
        'android.permission.health.READ_HEART_RATE_VARIABILITY',
      ],
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: IS_DEV ? 'silverlifeai-dev' : 'silverlifeai', host: 'oauth' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
        {
          action: 'ACTION_VIEW_HEALTH_DATA',
          category: ['DEFAULT'],
          data: [{ scheme: 'https', host: 'www.googleapis.com', pathPrefix: '/auth/health' }],
        },
      ],
    },
    ios: {
      bundleIdentifier: IS_DEV ? 'com.silverlifeai.app.dev' : 'com.silverlifeai.app',
      infoPlist: {
        NSMotionUsageDescription: '걸음수를 자동으로 측정하기 위해 신체 활동 접근 권한이 필요합니다.',
        NSMicrophoneUsageDescription: '음성 입력을 위해 마이크 접근 권한이 필요합니다.',
        NSSpeechRecognitionUsageDescription: '음성 입력을 위해 음성 인식 권한이 필요합니다.',
        NSCameraUsageDescription: '프로필 사진 촬영을 위해 카메라 접근 권한이 필요합니다.',
        NSLocationWhenInUseUsageDescription: '현재 위치와 동선 기록을 위해 위치 권한이 필요합니다.',
        NSLocationAlwaysAndWhenInUseUsageDescription: '앱이 백그라운드에 있을 때도 동선을 기록하기 위해 항상 위치 접근 권한이 필요합니다.',
        NSLocationAlwaysUsageDescription: '앱이 백그라운드에 있을 때도 동선을 기록하기 위해 항상 위치 접근 권한이 필요합니다.',
        NSHealthShareUsageDescription: '심박수, 수면, 산소포화도 등 건강 데이터를 읽어 루미가 건강 상태를 분석합니다.',
        NSHealthUpdateUsageDescription: '건강 기록을 저장합니다.',
      },
      entitlements: {
        'com.apple.developer.healthkit': true,
        'com.apple.developer.healthkit.background-delivery': true,
      },
    },
    plugins: [
      ['expo-sensors', { motionPermission: '걸음수 자동 측정을 위해 신체 활동 접근 권한이 필요합니다.' }],
      'expo-notifications',
      ['@react-native-seoul/kakao-login', { kakaoAppKey: '8f40217a9768056a44ce78516d2f5858' }],
      ['expo-location', {
        locationAlwaysAndWhenInUsePermission: '앱이 백그라운드에 있을 때도 동선을 기록하기 위해 항상 위치 접근 권한이 필요합니다.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      }],
    ],
    runtimeVersion: {
      policy: 'sdkVersion',
    },
    updates: {
      url: 'https://u.expo.dev/2220b18b-fc03-4ccd-9e62-49dda3b0793f',
    },
    extra: {
      eas: { projectId: '2220b18b-fc03-4ccd-9e62-49dda3b0793f' },
    },
  },
};
