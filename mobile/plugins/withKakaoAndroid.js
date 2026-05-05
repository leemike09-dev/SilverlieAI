const { withAndroidManifest, withStringsXml, AndroidConfig } = require('@expo/config-plugins');

const KAKAO_APP_KEY = '8f40217a9768056a44ce78516d2f5858';
const ACTIVITY_NAME = 'com.kakao.sdk.auth.AuthCodeHandlerActivity';

const withKakaoStrings = (config) =>
  withStringsXml(config, (mod) => {
    AndroidConfig.Strings.setStringItem(
      [{ $: { name: 'kakao_app_key', translatable: 'false' }, _: KAKAO_APP_KEY }],
      mod.modResults,
    );
    return mod;
  });

const withKakaoManifest = (config) =>
  withAndroidManifest(config, (mod) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    if (!app.activity) app.activity = [];
    const existing = app.activity.findIndex((a) => a.$['android:name'] === ACTIVITY_NAME);
    const entry = {
      $: { 'android:name': ACTIVITY_NAME, 'android:exported': 'true' },
      'intent-filter': [{
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        category: [
          { $: { 'android:name': 'android.intent.category.DEFAULT' } },
          { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
        ],
        data: [{ $: { 'android:host': 'oauth', 'android:scheme': `kakao${KAKAO_APP_KEY}` } }],
      }],
    };
    if (existing < 0) app.activity.push(entry);
    else app.activity.splice(existing, 1, entry);
    return mod;
  });

module.exports = (config) => {
  config = withKakaoStrings(config);
  config = withKakaoManifest(config);
  return config;
};
