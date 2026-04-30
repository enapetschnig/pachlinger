import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ParsedVoiceData {
  beschreibung: string;
  materials: Array<{ material: string; menge: string }>;
  kundeName?: string | null;
  kundeAdresse?: string | null;
}

interface VoiceRecorderProps {
  onResult: (data: ParsedVoiceData) => void;
  disabled?: boolean;
  compact?: boolean;
  context?: "arbeiten" | "material";
  label?: string;
}

const pickMimeType = (): string => {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    if ((MediaRecorder as any).isTypeSupported?.(c)) return c;
  }
  return "audio/webm";
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });

export function VoiceRecorder({ onResult, disabled, compact, context, label }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef<string>("audio/webm");

  useEffect(() => {
    return () => {
      try { recorderRef.current?.stop(); } catch (_) {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = async () => {
    setError(null);
    setSuccess(false);
    if (typeof MediaRecorder === "undefined") {
      setError("Aufnahme nicht unterstützt. Bitte Browser aktualisieren.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      mimeRef.current = mime;
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        chunksRef.current = [];
        if (blob.size < 1000) {
          setError("Aufnahme zu kurz. Bitte erneut versuchen.");
          return;
        }
        await sendAudio(blob);
      };
      recorder.onerror = (e: any) => {
        console.error("Recorder error:", e?.error || e);
        setError("Aufnahme-Fehler. Bitte erneut versuchen.");
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("getUserMedia failed:", err);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setError("Mikrofonzugriff verweigert. Bitte in den Browser-Einstellungen erlauben.");
      } else if (err?.name === "NotFoundError") {
        setError("Kein Mikrofon gefunden.");
      } else {
        setError("Aufnahme konnte nicht gestartet werden.");
      }
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try { recorderRef.current.stop(); } catch (_) {}
    }
    setIsRecording(false);
  };

  const sendAudio = async (blob: Blob) => {
    setIsParsing(true);
    setError(null);
    try {
      const audioBase64 = await blobToBase64(blob);
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error: fnError } = await supabase.functions.invoke("parse-voice-input", {
        body: {
          audio: audioBase64,
          audioMimeType: blob.type || "audio/webm",
          context: context || "arbeiten",
        },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        onResult(data.data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data?.error || "KI konnte die Eingabe nicht verarbeiten");
      }
    } catch (err: any) {
      console.error("sendAudio error:", err);
      setError(err?.message || "Fehler bei der Verarbeitung");
    } finally {
      setIsParsing(false);
    }
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2">
        {isRecording ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            disabled={disabled}
            className="gap-1.5 h-8"
          >
            <MicOff className="h-4 w-4" />
            Stopp
          </Button>
        ) : isParsing ? (
          <Button type="button" variant="outline" size="sm" disabled className="gap-1.5 h-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            KI
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startRecording}
            disabled={disabled}
            className="gap-1.5 h-8"
            title="Spracheingabe starten"
          >
            <Mic className="h-4 w-4" />
            Diktieren
          </Button>
        )}
        {isRecording && (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
            läuft
          </span>
        )}
        {success && <Check className="h-4 w-4 text-green-600" />}
        {error && (
          <span className="text-xs text-destructive flex items-center gap-1" title={error}>
            <AlertCircle className="h-3 w-3" />
            Fehler
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {isRecording ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            disabled={disabled}
            className="gap-2"
          >
            <MicOff className="w-4 h-4" />
            Aufnahme stoppen
          </Button>
        ) : isParsing ? (
          <Button type="button" variant="outline" size="sm" disabled className="gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Wird verarbeitet…
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startRecording}
            disabled={disabled}
            className="gap-2"
          >
            <Mic className="w-4 h-4" />
            {label || "Spracheingabe starten"}
          </Button>
        )}
        {isRecording && (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
            Aufnahme läuft… Stopp drücken wenn fertig
          </span>
        )}
        {success && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <Check className="w-4 h-4" />
            Eingetragen
          </span>
        )}
      </div>
      {error && (
        <div className={cn("flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-2")}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
