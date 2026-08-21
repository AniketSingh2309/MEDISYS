"""
Thin wrapper around the official `sarvamai` SDK (https://docs.sarvam.ai) —
used instead of self-hosted AI4Bharat NeMo, which needs a Linux/CUDA GPU
this project doesn't have.

One call does both jobs we need in one round trip:
  client.speech_to_text.translate(...) — Indic-language audio -> English text

A second, plain speech_to_text.transcribe(...) call gets the untranslated
native-language transcript, kept for the record and shown to the doctor
alongside the English draft.

Requires SARVAM_API_KEY in language/.env (see .env.example). If it isn't
set, every function raises SarvamNotConfigured, which service.py turns
into a clear 503 instead of a stack trace.
"""

import os

from sarvamai import SarvamAI

# service.py uses plain ISO codes ("hi", "ta", ...); the SDK wants
# BCP-47-style codes.
SARVAM_LANG_CODE = {
    "hi": "hi-IN", "bn": "bn-IN", "ta": "ta-IN", "te": "te-IN", "mr": "mr-IN",
    "gu": "gu-IN", "kn": "kn-IN", "ml": "ml-IN", "pa": "pa-IN", "or": "od-IN",
    "en": "en-IN",
}

_client = None


class SarvamNotConfigured(Exception):
    """Raised when SARVAM_API_KEY isn't set."""


def _get_client() -> SarvamAI:
    global _client
    if _client is not None:
        return _client
    key = os.environ.get("SARVAM_API_KEY")
    if not key:
        raise SarvamNotConfigured(
            "SARVAM_API_KEY is not set. Add it to language/.env — see language/README.md."
        )
    _client = SarvamAI(api_subscription_key=key)
    return _client


def transcribe(audio_bytes: bytes, language: str) -> str:
    """Native-language transcript (no translation)."""
    client = _get_client()
    lang_code = SARVAM_LANG_CODE.get(language, "hi-IN")
    result = client.speech_to_text.transcribe(
        file=("dictation.webm", audio_bytes, "audio/webm"),
        model="saaras:v3",
        language_code=lang_code,
        input_audio_codec="webm",
    )
    return result.transcript


def transcribe_and_translate(audio_bytes: bytes) -> str:
    """Indic-language audio straight to English text, in one call."""
    client = _get_client()
    result = client.speech_to_text.translate(
        file=("dictation.webm", audio_bytes, "audio/webm"),
        model="saaras:v2.5",
        input_audio_codec="webm",
    )
    return result.transcript


def translate_to_english(text: str, source_language: str) -> str:
    """Text-to-text translation, used when we already have a native transcript."""
    if source_language == "en":
        return text
    client = _get_client()
    result = client.text.translate(
        input=text,
        source_language_code=SARVAM_LANG_CODE.get(source_language, "hi-IN"),
        target_language_code="en-IN",
        model="sarvam-translate:v1",
    )
    return result.translated_text
