module.exports = {
  expo: {
    name: "Silver Life AI",
    slug: "silver-life-ai",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#1A4A8A",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.silverlifeai.app",
      entitlements: {
        "com.apple.developer.applesignin": ["Default"],
      },
    },
    android: {
      package: "com.silverlifeai.app",
      adaptiveIcon: {
        backgroundColor: "#1A4A8A",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      permissions: [
        "android.permission.ACTIVITY_RECOGNITION",
        "android.permission.INTERNET",
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE",
        "android.permission.POST_NOTIFICATIONS",
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [{ scheme: "silverlifeai", host: "oauth" }],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro",
    },
    extra: {
      eas: {
        projectId: "2220b18b-fc03-4ccd-9e62-49dda3b0793f",
      },
    },
    owner: "gigas4",
    runtimeVersion: {
      policy: "sdkVersion",
    },
    updates: {
      url: "https://u.expo.dev/2220b18b-fc03-4ccd-9e62-49dda3b0793f",
    },
    plugins: [
      [
        "expo-build-properties",
        {
          android: { newArchEnabled: false },
          ios: { newArchEnabled: false },
        },
      ],
      "expo-font",
      "expo-web-browser",
      "expo-apple-authentication",
      [
        "expo-sensors",
        {
          motionPermission: "걸음수 자동 측정을 위해 신체 활동 접근 권한이 필요합니다.",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/android-icon-monochrome.png",
          color: "#5C6BC0",
          sounds: [],
          iosDisplayInForeground: true,
        },
      ],
      "expo-video",
      "./plugins/withKakaoAndroid",
    ],
    scheme: "silverlifeai",
    experiments: {
      baseUrl: "/SilverlieAI",
    },
  },
};
