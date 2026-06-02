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
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      permissions: [
        'android.permission.ACTIVITY_RECOGNITION',
        'android.permission.INTERNET',
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.VIBRATE',
        'android.permission.POST_NOTIFICATIONS',
      ],
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: IS_DEV ? 'silverlifeai-dev' : 'silverlifeai', host: 'oauth' }],
          category: ['BROWSABLE', 'DEFAULT'],
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
      },
    },
    plugins: [
      ['expo-sensors', { motionPermission: '걸음수 자동 측정을 위해 신체 활동 접근 권한이 필요합니다.' }],
      'expo-notifications',
      ['@react-native-seoul/kakao-login', { kakaoAppKey: '8f40217a9768056a44ce78516d2f5858' }],
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
