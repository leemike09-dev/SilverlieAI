import { useState, useRef, useEffect } from 'react';
import { Animated, Platform } from 'react-native';

interface UseVoiceProps {
  onTranscript: (text: string) => void;
  onSend: (text: string) => void;
  showToast: (msg: string) => void;
}

export function useVoice({ onTranscript, onSend, showToast }: UseVoiceProps) {
  const [isRecording, setIsRecording] = useState(false);
  const pulseAnim          = useRef(new Animated.Value(1)).current;
  const recognitionRef     = useRef<any>(null);
  const silenceTimerRef    = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');
  const lastFinalIdxRef    = useRef<number>(-1);

  // 녹음 펄스 애니메이션
  useEffect(() => {
    if (isRecording) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: false }),
      ])).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const stopVoice = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
  };

  const toggleVoice = () => {
    if (Platform.OS !== 'web') {
      showToast('키보드의 🎤 마이크 버튼으로 음성 입력하세요');
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { showToast('Chrome 브라우저를 사용해 주세요'); return; }
    if (isRecording) { stopVoice(); return; }

    const recognition = new SR();
    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsRecording(true);
    recognition.onend   = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    finalTranscriptRef.current = '';
    lastFinalIdxRef.current = -1;

    recognition.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          if (i > lastFinalIdxRef.current) {
            finalTranscriptRef.current += e.results[i][0].transcript;
            lastFinalIdxRef.current = i;
          }
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      const combined = (finalTranscriptRef.current + interim).trim();
      if (combined) onTranscript(combined);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(stopVoice, 1500);
    };
    recognition.start();
  };

  return { isRecording, pulseAnim, toggleVoice, stopVoice };
}
