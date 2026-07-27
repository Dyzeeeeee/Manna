import { Mic, Send } from "lucide-react";
import { useMemo, useRef, useState } from "react";

/* The slice of the Web Speech API this uses. It isn't in the DOM lib types, and
   in practice only Chromium ships it (Android is the target), so it's feature-
   detected and the mic button simply doesn't render where it's missing. */
interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: (event: SpeechResultEvent) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
}
type SpeechCtor = new () => SpeechRecognitionLike;

function speechCtor(): SpeechCtor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** The one-line capture box: type or speak something like "200 on Jollibee" and
 *  it becomes a pre-filled draft on the add sheet's review panel. It never files
 *  anything itself — `onCapture` opens the sheet, where a tap confirms — so a
 *  misheard sentence costs a correction, never a wrong transaction. Rendered only
 *  when the parse Worker is configured; the numpad wizard is always there as the
 *  offline and manual path. */
export function CaptureBox({ onCapture }: { onCapture: (sentence: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [listening, setListening] = useState(false);
  const SR = useMemo(speechCtor, []);
  /* Holds the live recogniser: a SpeechRecognition dropped from all references
     can be garbage-collected mid-utterance, cutting recognition off. */
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  const busy = status === "loading";

  const submit = async (value?: string) => {
    const sentence = (value ?? text).trim();
    if (!sentence || busy) return;
    setStatus("loading");
    try {
      await onCapture(sentence);
      setText("");
      setStatus("idle");
    } catch {
      // The sheet stays reachable via +, so a failed parse is a hint, not a wall.
      setStatus("error");
    }
  };

  const listen = () => {
    if (!SR || listening || busy) return;
    const rec = new SR();
    rec.lang = "en-PH";
    rec.interimResults = false;
    rec.onresult = (event) => {
      const said = event.results[0]?.[0]?.transcript ?? "";
      if (said) {
        setText(said);
        void submit(said);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognition.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex min-h-12 items-center gap-1 rounded-tile bg-clay-100 p-1.5 shadow-soft">
        {SR && (
          <button
            type="button"
            onClick={listen}
            disabled={busy}
            aria-label={listening ? "Listening" : "Log by voice"}
            aria-pressed={listening}
            className={`flex size-10 shrink-0 items-center justify-center rounded-control transition-colors duration-150 ${
              listening ? "bg-sage-500/15 text-sage-500" : "text-umber-700 hover:bg-clay-200"
            }`}
          >
            <Mic className={`size-5 ${listening ? "animate-pulse" : ""}`} />
          </button>
        )}

        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          disabled={busy}
          aria-label="Log with a sentence"
          placeholder={listening ? "Listening…" : "Say what you spent — “200 on Jollibee”"}
          className="min-w-0 flex-1 bg-transparent px-2 text-umber-900 placeholder:text-umber-700/50 focus:outline-none disabled:opacity-60"
        />

        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !text.trim()}
          aria-label="Read and log"
          className="flex size-10 shrink-0 items-center justify-center rounded-control bg-sage-500 text-clay-50 transition duration-150 hover:brightness-105 active:brightness-95 disabled:opacity-40"
        >
          <Send className={`size-4 ${busy ? "animate-pulse" : ""}`} />
        </button>
      </div>

      {status === "error" && (
        <p role="status" className="px-2 text-sm text-accent-rust">
          Couldn&rsquo;t read that. Tap + to log it by hand.
        </p>
      )}
    </section>
  );
}
