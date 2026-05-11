import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, MicOff, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { improveText, transcribeAudio, TranscribeEmptyError, VoiceKind } from "@/lib/openai";

const MIN_RECORDING_MS = 700; // unter 0,7s ist typischerweise nur Klick/Tastenrauschen → ignorieren

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  /** Steuert Whisper-Prompt + GPT-Bereinigung. Default: 'bezeichnung'. */
  kind?: VoiceKind;
}

/**
 * Mic-Button + Magic-Wand-Button für Position-Bezeichnung.
 * - Mic startet/stoppt MediaRecorder; nach Stop wird Audio an Whisper geschickt, dann GPT-Bereinigung.
 * - Magic Wand verbessert nur den aktuellen Text ohne Audio.
 */
export function VoiceInput({ value, onChange, disabled, kind = "bezeichnung" }: Props) {
  const { toast } = useToast();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [improving, setImproving] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  const stopRecording = () => {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    if (recording || processing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // mimeType-Fallback: Safari/iOS unterstützt webm nicht — auf mp4/aac fallen
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/mp4;codecs=mp4a.40.2",
        "audio/aac",
      ];
      const mimeType =
        typeof MediaRecorder !== "undefined" && "isTypeSupported" in MediaRecorder
          ? candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? ""
          : "";
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        setRecording(false);
        const duration = Date.now() - startedAtRef.current;
        // Blob mit tatsächlich aufgenommenem mimeType — Whisper akzeptiert
        // webm, mp4, m4a, wav, ogg, mp3.
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || mimeType || "audio/webm",
        });
        if (blob.size === 0) return;

        // Zu kurze Aufnahmen führen verlässlich zu Whisper-Halluzinationen
        // ("Untertitel der Amara.org-Community" etc.) — gar nicht erst senden.
        if (duration < MIN_RECORDING_MS) {
          toast({
            title: "Aufnahme zu kurz",
            description: "Halte den Knopf mindestens 1 Sekunde — dann sprich deutlich los.",
          });
          return;
        }

        setProcessing(true);
        try {
          const result = await transcribeAudio(blob, kind);
          const text = result.text;
          if (!text.trim()) {
            toast({ title: "Keine Sprache erkannt", description: "Bitte erneut versuchen." });
            return;
          }
          // Direkte Bereinigung via GPT (kind-spezifischer Prompt)
          const improved = await improveText(text, kind);
          const finalText = improved || text;
          // An bestehenden Text anhängen (mit Leerzeichen falls schon Inhalt da ist)
          const sep = value.trim() === "" ? "" : " ";
          onChange(value + sep + finalText);
        } catch (e: any) {
          if (e instanceof TranscribeEmptyError) {
            toast({
              title: "Nichts Verständliches erkannt",
              description: "Bitte nochmal näher am Mikro und deutlicher sprechen.",
            });
          } else {
            toast({ variant: "destructive", title: "Fehler", description: e.message });
          }
        } finally {
          setProcessing(false);
        }
      };
      mr.start();
      recorderRef.current = mr;
      startedAtRef.current = Date.now();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Mikrofon-Zugriff verweigert",
        description: "Bitte erlaube den Zugriff im Browser.",
      });
    }
  };

  const handleImprove = async () => {
    if (improving || !value.trim()) return;
    setImproving(true);
    try {
      const improved = await improveText(value, kind);
      if (improved) onChange(improved);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setImproving(false);
    }
  };

  const busy = recording || processing || improving;

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={recording ? "destructive" : "outline"}
        size="sm"
        onClick={recording ? stopRecording : startRecording}
        disabled={disabled || (processing && !recording)}
        className="h-9"
        title={recording ? "Aufnahme stoppen" : "Sprachaufnahme"}
      >
        {processing && !recording ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : recording ? (
          <>
            <MicOff className="h-4 w-4 mr-1" />
            <span className="font-mono">{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}</span>
          </>
        ) : (
          <>
            <Mic className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Diktieren</span>
          </>
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleImprove}
        disabled={disabled || busy || !value.trim()}
        className="h-9"
        title="Text mit KI verbessern"
      >
        {improving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Verbessern</span>
          </>
        )}
      </Button>
    </div>
  );
}
