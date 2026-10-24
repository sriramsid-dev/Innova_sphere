/**
 * Innova Sphere — Browser voice input (Web Speech API)
 *
 * Single-utterance dictation for the chat input. No network endpoints, no keys,
 * no dependencies: everything runs through the browser's built-in
 * SpeechRecognition implementation.
 *
 * Guarantees relied on by the UI:
 *  - Feature-detected; reports "unsupported" instead of throwing.
 *  - The recognition object (and therefore the microphone permission prompt)
 *    is only created when the user explicitly starts a session.
 *  - Final transcripts are handed to `onFinalTranscript`; they are never sent.
 *  - One session at a time; handlers are detached and the session aborted on
 *    unmount or when the UI language changes.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export const VOICE_STATUS = {
  IDLE: "idle",
  LISTENING: "listening",
  STOPPING: "stopping",
  ERROR: "error",
  UNSUPPORTED: "unsupported",
};

/** UI language → BCP-47 tag understood by the browser. */
export const SPEECH_LANG_CODES = {
  en: "en-IN",
  te: "te-IN",
};

export function getRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function detachHandlers(recognition) {
  if (!recognition) return;
  recognition.onstart = null;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  recognition.onspeechend = null;
  recognition.onaudioend = null;
}

export default function useSpeechRecognition({ lang, disabled = false, onFinalTranscript }) {
  const [status, setStatus] = useState(() =>
    getRecognitionConstructor() ? VOICE_STATUS.IDLE : VOICE_STATUS.UNSUPPORTED
  );
  const [errorCode, setErrorCode] = useState(null);
  const [interimText, setInterimText] = useState("");

  const recognitionRef = useRef(null);
  const sessionActiveRef = useRef(false);
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const langRef = useRef(lang);

  // Keep the latest callback/language without restarting a session.
  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  /**
   * Detach listeners and drop the recognition instance. `mode` chooses between
   * a graceful stop and an immediate abort. Never touches React state, so it is
   * safe to call from an unmount cleanup.
   */
  const releaseRecognition = useCallback((mode = "abort") => {
    const recognition = recognitionRef.current;
    if (recognition) {
      detachHandlers(recognition);
      try {
        if (mode === "abort") recognition.abort();
        else recognition.stop();
      } catch {
        /* Already finished — nothing to release. */
      }
    }
    recognitionRef.current = null;
    sessionActiveRef.current = false;
  }, []);

  const start = useCallback(() => {
    if (disabled) return;

    const RecognitionCtor = getRecognitionConstructor();
    if (!RecognitionCtor) {
      setStatus(VOICE_STATUS.UNSUPPORTED);
      setErrorCode(null);
      setInterimText("");
      return;
    }

    // Never allow two recognition sessions to overlap.
    if (sessionActiveRef.current) return;

    const recognition = new RecognitionCtor();
    recognition.lang = SPEECH_LANG_CODES[langRef.current] || SPEECH_LANG_CODES.en;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const alternative = result && result[0];
        const transcript = alternative ? alternative.transcript : "";
        if (result && result.isFinal) finalTranscript += transcript;
        else interim += transcript;
      }

      if (interim.trim()) setInterimText(interim.trim());

      if (finalTranscript.trim()) {
        setInterimText("");
        if (onFinalTranscriptRef.current) {
          onFinalTranscriptRef.current(finalTranscript.trim());
        }
      }
    };

    recognition.onerror = (event) => {
      const code = (event && event.error) || "unknown";

      sessionActiveRef.current = false;
      detachHandlers(recognition);
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setInterimText("");

      // "aborted" is our own teardown, not a user-facing failure.
      if (code === "aborted") {
        setStatus(VOICE_STATUS.IDLE);
        return;
      }

      setErrorCode(code);
      setStatus(VOICE_STATUS.ERROR);
    };

    recognition.onend = () => {
      sessionActiveRef.current = false;
      detachHandlers(recognition);
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setInterimText("");
      // A completed utterance is not an error; a prior error keeps its message.
      setStatus((prev) => (prev === VOICE_STATUS.ERROR ? prev : VOICE_STATUS.IDLE));
    };

    recognitionRef.current = recognition;
    sessionActiveRef.current = true;
    setErrorCode(null);
    setInterimText("");
    setStatus(VOICE_STATUS.LISTENING);

    try {
      recognition.start();
    } catch {
      // start() throws synchronously for some blocked/invalid states.
      sessionActiveRef.current = false;
      detachHandlers(recognition);
      recognitionRef.current = null;
      setErrorCode("start-failed");
      setStatus(VOICE_STATUS.ERROR);
    }
  }, [disabled]);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || !sessionActiveRef.current) return;

    setStatus(VOICE_STATUS.STOPPING);

    try {
      recognition.stop();
    } catch {
      releaseRecognition("abort");
      setStatus(VOICE_STATUS.IDLE);
      setInterimText("");
    }
  }, [releaseRecognition]);

  const toggle = useCallback(() => {
    if (status === VOICE_STATUS.LISTENING || status === VOICE_STATUS.STOPPING) {
      stop();
      return;
    }
    if (status === VOICE_STATUS.IDLE || status === VOICE_STATUS.ERROR) {
      start();
    }
  }, [status, start, stop]);

  // Language switched mid-session: retire the session instead of dictating into
  // a locale the user can no longer read.
  useEffect(() => {
    if (!sessionActiveRef.current) return;
    releaseRecognition("abort");
    setStatus(VOICE_STATUS.IDLE);
    setErrorCode(null);
    setInterimText("");
  }, [lang, releaseRecognition]);

  // The composer was disabled (assistant is processing): stop recording.
  useEffect(() => {
    if (!disabled || !sessionActiveRef.current) return;
    releaseRecognition("abort");
    setStatus(VOICE_STATUS.IDLE);
    setErrorCode(null);
    setInterimText("");
  }, [disabled, releaseRecognition]);

  // Unmount: abort and detach everything.
  useEffect(() => () => releaseRecognition("abort"), [releaseRecognition]);

  return {
    status,
    errorCode,
    interimText,
    start,
    stop,
    toggle,
  };
}
