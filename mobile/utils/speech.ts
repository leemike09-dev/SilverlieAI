import { Platform } from 'react-native';

let nativeSpeech: any = null;
try {
  if (Platform.OS !== 'web') {
    nativeSpeech = require('expo-speech');
  }
} catch (_) {}

// 한국어 여성 목소리 우선 선택 (따뜻한 느낌)
function pickKoreanVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(v => v.lang.startsWith('ko') && /female|yuna|heami|sun.hi/i.test(v.name)) ||
    voices.find(v => v.lang.startsWith('ko') && v.name.includes('Google')) ||
    voices.find(v => v.lang.startsWith('ko')) ||
    null
  );
}

export function speak(text: string, rate = 0.85, pitch = 1.1) {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang   = 'ko-KR';
    utter.rate   = rate;
    utter.pitch  = pitch;
    utter.volume = 1.0;
    const trySpeak = () => {
      const v = pickKoreanVoice();
      if (v) utter.voice = v;
      window.speechSynthesis.speak(utter);
    };
    // 목소리 목록이 아직 로드 안 됐으면 이벤트 대기
    if (window.speechSynthesis.getVoices().length > 0) {
      trySpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        trySpeak();
      };
      // 300ms 내 이벤트 없으면 기본 목소리로 진행
      setTimeout(() => {
        if (!utter.voice) window.speechSynthesis.speak(utter);
      }, 300);
    }
  } else {
    if (!nativeSpeech) return;
    nativeSpeech.stop();
    nativeSpeech.speak(text, { language: 'ko-KR', rate, pitch });
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
