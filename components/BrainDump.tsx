"use client";

import { useEffect, useRef, useState } from "react";
import { MicIcon, SparkIcon, StopIcon } from "./Icons";

/* Минимальные типы Web Speech API (нет в lib.dom) */
type SRAlternative = { transcript: string };
type SRResult = { isFinal: boolean; 0: SRAlternative; length: number };
type SREvent = { resultIndex: number; results: ArrayLike<SRResult> };
type SRErrorEvent = { error: string };
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SRCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const MIC_ERRORS: Record<string, string> = {
  "not-allowed": "Доступ к микрофону запрещён",
  "service-not-allowed": "Распознавание речи недоступно",
  "no-speech": "Речь не распознана — попробуйте ещё раз",
  network: "Сетевая ошибка распознавания речи",
  "audio-capture": "Микрофон не найден",
};

type Props = { onParse: (text: string) => Promise<number> };

export default function BrainDump({ onParse }: Props) {
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "" | "error" | "ok"; msg: string }>({ tone: "", msg: "" });
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    return () => recRef.current?.stop();
  }, []);

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "ru-RU";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalChunk += r[0].transcript;
        else interimChunk += r[0].transcript;
      }
      if (finalChunk) {
        setText((prev) => {
          const sep = prev && !/\s$/.test(prev) ? " " : "";
          return prev + sep + finalChunk.trim();
        });
      }
      setInterim(interimChunk);
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted") setStatus({ tone: "error", msg: MIC_ERRORS[e.error] ?? `Ошибка микрофона: ${e.error}` });
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      recRef.current = null;
    };

    recRef.current = rec;
    setStatus({ tone: "", msg: "Слушаю… говорите по-русски" });
    rec.start();
    setListening(true);
  }

  async function submit() {
    const value = text.trim();
    if (!value || busy) return;
    recRef.current?.stop();
    setBusy(true);
    setStatus({ tone: "", msg: "ИИ разбирает текст…" });
    try {
      const n = await onParse(value);
      setText("");
      setStatus(
        n > 0
          ? { tone: "ok", msg: `Добавлено задач: ${n}` }
          : { tone: "error", msg: "ИИ не нашёл задач в тексте" },
      );
    } catch (err) {
      setStatus({ tone: "error", msg: err instanceof Error ? err.message : "Не удалось разобрать текст" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass dump" aria-label="Brain dump">
      <div className="dump-title">
        <h2>Brain Dump</h2>
        <span>Ctrl + Enter — разобрать</span>
      </div>

      <div className="input-wrap">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
          }}
          placeholder="Выгрузи всё, что в голове: «завтра сдать отчёт боссу, купить корм коту, в пятницу записаться к стоматологу, когда-нибудь разобрать фото…»"
          disabled={busy}
        />
        <button
          type="button"
          className={`mic ${listening ? "on" : ""}`}
          onClick={toggleMic}
          disabled={!supported || busy}
          title={supported ? (listening ? "Остановить запись" : "Голосовой ввод (русский)") : "Браузер не поддерживает Web Speech API"}
          aria-label={listening ? "Остановить запись" : "Голосовой ввод"}
          aria-pressed={listening}
        >
          {listening ? <StopIcon /> : <MicIcon />}
        </button>
        <div className="interim">{interim}</div>
      </div>

      <div className="dump-actions">
        <span className={`status ${status.tone}`} role="status">
          {status.msg}
        </span>
        <button type="button" className="btn-primary" onClick={submit} disabled={busy || !text.trim()}>
          {busy ? <span className="spinner" /> : <SparkIcon />}
          Разобрать с помощью ИИ
        </button>
      </div>
    </section>
  );
}
