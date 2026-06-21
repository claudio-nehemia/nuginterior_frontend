import { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export function VoiceInput({ onTranscript, className }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadAudio(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error('Gagal mengakses mikrofon. Pastikan izin diberikan.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadAudio = async (blob: Blob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const response = await api.post('/ai/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.data?.transcript) {
        onTranscript(response.data.data.transcript);
        toast.success('Transkripsi suara berhasil!');
      } else {
        toast.error('Tidak ada teks yang terdeteksi.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memproses suara. Pastikan OpenAI API Key sudah benar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={isLoading}
      onClick={isRecording ? stopRecording : startRecording}
      className={`h-8 w-8 rounded-xl shrink-0 transition-all ${
        isRecording 
          ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700 animate-pulse dark:bg-rose-950/20 dark:border-rose-900' 
          : 'border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
      } ${className}`}
      title={isRecording ? 'Berhenti Merekam' : 'Rekam Suara (Voice Note)'}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600 dark:text-teal-400" />
      ) : isRecording ? (
        <Square className="h-3 w-3 fill-rose-600 dark:fill-rose-400" />
      ) : (
        <Mic className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
