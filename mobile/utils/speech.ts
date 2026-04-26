import { Platform } from 'react-native';

let nativeSpeech: any = null;
try {
  if (Platform.OS !== 'web') {
    nativeSpeech = require('expo-speech');
  }
} catch (_) {}

function pickKoreanVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(v => v.lang.startsWith('ko') && /female|yuna|heami|sun.hi/i.test(v.name)) ||
    voices.find(v => v.lang.startsWith('ko') && v.name.includes('Google')) ||
    voices.find(v => v.lang.startsWith('ko')) ||
    null
  );
}

// 짧은 단일 문장용 (인사, 안내 멘트)
export function speak(text: string, rate = 0.82, pitch = 1.05) {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ko-KR'; utter.rate = rate; utter.pitch = pitch; utter.volume = 1.0;
    const trySpeak = () => {
      const v = pickKoreanVoice();
      if (v) utter.voice = v;
      window.speechSynthesis.speak(utter);
    };
    if (window.speechSynthesis.getVoices().length > 0) {
      trySpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; trySpeak(); };
      setTimeout(() => { if (!utter.voice) window.speechSynthesis.speak(utter); }, 300);
    }
  } else {
    if (!nativeSpeech) return;
    nativeSpeech.stop();
    nativeSpeech.speak(text, { language: 'ko-KR', rate, pitch });
  }
}

// AI 답변용 — 문장 단위 끊어읽기 (자연스러운 쉬어읽기)
export function speakSentences(text: string, rate = 0.78, pitch = 1.05) {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const sentences = text
      .replace(/([.!?。])\s*/g, '$1|||')
      .split('|||')
      .map(s => s.trim())
      .filter(s => s.length > 2);

    if (sentences.length === 0) return;

    const enqueue = () => {
      const voice = pickKoreanVoice();
      sentences.forEach((sentence, i) => {
        const utter = new SpeechSynthesisUtterance(sentence);
        utter.lang = 'ko-KR'; utter.rate = rate; utter.pitch = pitch; utter.volume = 1.0;
        if (voice) utter.voice = voice;
        window.speechSynthesis.speak(utter);
        // 문장 사이 자연스러운 쉬어읽기
        if (i < sentences.length - 1) {
          const pause = new SpeechSynthesisUtterance(' ');
          pause.lang = 'ko-KR'; pause.rate = 0.1; pause.volume = 0;
          window.speechSynthesis.speak(pause);
        }
      });
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      enqueue();
    } else {
      window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; enqueue(); };
      setTimeout(() => { if (!window.speechSynthesis.speaking) enqueue(); }, 300);
    }
  } else {
    if (!nativeSpeech) return;
    nativeSpeech.stop();
    nativeSpeech.speak(text, { language: 'ko-KR', rate: rate * 0.95, pitch });
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
