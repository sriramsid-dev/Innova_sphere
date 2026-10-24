import React from "react";
import { VOICE_STATUS } from "../hooks/useSpeechRecognition";

/**
 * Speech error code → localized message key.
 * Codes come from the Web Speech API `SpeechRecognitionErrorEvent.error`.
 */
const ERROR_MESSAGE_KEYS = {
  "not-allowed": "voicePermissionDenied",
  "service-not-allowed": "voicePermissionDenied",
  "audio-capture": "voiceNoMic",
  "no-speech": "voiceNoSpeech",
  network: "voiceNetworkError",
  "language-not-supported": "voiceLangUnsupported",
  "start-failed": "voiceErrorGeneric",
};

function getErrorMessageKey(errorCode) {
  return ERROR_MESSAGE_KEYS[errorCode] || "voiceErrorGeneric";
}

function MicIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}

/**
 * Microphone toggle. `type="button"` plus preventDefault keeps it from ever
 * submitting the surrounding chat form.
 */
export default function MicButton({ t, status, onToggle, disabled }) {
  const isListening = status === VOICE_STATUS.LISTENING;
  const isStopping = status === VOICE_STATUS.STOPPING;
  const isUnsupported = status === VOICE_STATUS.UNSUPPORTED;

  const label = isUnsupported
    ? t.voiceUnsupported
    : isListening
      ? t.voiceStopLabel
      : isStopping
        ? t.voiceStopping
        : t.voiceInputLabel;

  return (
    <button
      type="button"
      className={`ap-mic-btn${isListening ? " listening" : ""}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      disabled={disabled || isUnsupported || isStopping}
      aria-label={label}
      aria-pressed={isListening}
      title={label}
    >
      {isListening ? <StopIcon /> : <MicIcon />}
      {isListening && <span className="ap-mic-pulse" aria-hidden="true" />}
    </button>
  );
}

/**
 * Polite live region under the composer: listening preview, permission denial,
 * unsupported browser, and recognition errors.
 */
export function VoiceStatus({ t, status, errorCode, interimText, onRetry }) {
  if (status === VOICE_STATUS.LISTENING) {
    return (
      <div className="ap-voice-status listening" role="status" aria-live="polite">
        <span className="ap-voice-dot" aria-hidden="true" />
        <span className="ap-voice-text">{t.voiceListening}</span>
        {interimText ? <span className="ap-voice-interim">“{interimText}”</span> : null}
      </div>
    );
  }

  if (status === VOICE_STATUS.STOPPING) {
    return (
      <div className="ap-voice-status" role="status" aria-live="polite">
        <span className="ap-voice-text">{t.voiceStopping}</span>
      </div>
    );
  }

  if (status === VOICE_STATUS.ERROR) {
    return (
      <div className="ap-voice-status error" role="alert">
        <span className="ap-voice-text">{t[getErrorMessageKey(errorCode)]}</span>
        <button type="button" className="ap-voice-retry" onClick={onRetry}>
          {t.voiceTryAgain}
        </button>
      </div>
    );
  }

  if (status === VOICE_STATUS.UNSUPPORTED) {
    return (
      <div className="ap-voice-status" role="status" aria-live="polite">
        <span className="ap-voice-text">{t.voiceUnsupported}</span>
      </div>
    );
  }

  return null;
}
