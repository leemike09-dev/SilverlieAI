import { Platform } from 'react-native';

// TTS 유틸리티 — 웹: Web Speech API / 네이티브: expo-speech (미설치 시 무음)
// 한국어 음성 안내

let nativeSpeech: any = null;
try {
  if (Platform.OS !== 'web') {
    nativeSpeech = require('expo-speech');
  }
} catch (_) {}

export function speak(text: string, rate = 0.9) {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = rate;
    window.speechSynthesis.speak(u);
  } else {
    if (!nativeSpeech) return;
    nativeSpeech.stop();
    nativeSpeech.speak(text, { language: 'ko-KR', rate });
  }
}

export function stopSpeech() {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } else {
    if (nativeSpeech) nativeSpeech.stop();
  }
}
