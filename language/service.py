"""
MEDISYS Voice Prescription Service
-----------------------------------
Standalone microservice that turns a doctor's spoken dictation — in any
supported Indian language — into structured prescription data. It is called
by the Node backend (see server/server.js, POST /api/voice/prescribe) and
never talks to the browser directly.

Pipeline:
  1. ASR  — Sarvam AI's speech-to-text transcribes the audio to text in its
            original language. (Originally scoped for self-hosted AI4Bharat
            NeMo, but that requires a Linux/CUDA GPU this project doesn't
            have — see git history / README.md for that path if it becomes
            available later.)
  2. NMT  — if the language isn't English, Sarvam AI's translate endpoint
            converts the transcript to English for structuring, while the
            original-language transcript is still returned for the record.
  3. Structuring — a lightweight rule-based parser pulls out symptoms,
            medicines (name / dosage / duration / food instruction), test
            orders, and an admission flag from the transcript, and the
            doctor reviews/edits everything client-side before it is saved.

Requires SARVAM_API_KEY — see language/README.md and language/.env.example.
Without it, /transcribe returns a clear 503 rather than failing obscurely.
"""

import os
import re
import logging

from flask import Flask, request, jsonify
from dotenv import load_dotenv

from sarvam_client import transcribe as sarvam_transcribe, translate_to_english, SarvamNotConfigured

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("medisys.language")

app = Flask(__name__)

# ---------------------------------------------------------------------------
# Supported Indian languages (ISO codes used by AI4Bharat's models)
# ---------------------------------------------------------------------------
SUPPORTED_LANGUAGES = {
    "hi": "Hindi",
    "bn": "Bengali",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "pa": "Punjabi",
    "or": "Odia",
    "en": "English",
}

# ---------------------------------------------------------------------------
# Prescription structuring — simple, transparent rule-based extraction.
# The doctor reviews and edits every field client-side, so this only needs
# to get the common dictation patterns right, not be perfect.
# ---------------------------------------------------------------------------
DOSAGE_PATTERNS = [
    (re.compile(r"\b(1-0-1|once.*evening|morning and evening)\b", re.I), "1-0-1 (Morning & Evening)"),
    (re.compile(r"\b(1-1-1|three times a day|thrice)\b", re.I), "1-1-1 (Three times a day)"),
    (re.compile(r"\b(1-0-0|morning only|once a day)\b", re.I), "1-0-0 (Morning only)"),
    (re.compile(r"\b(0-0-1|night only|before bed)\b", re.I), "0-0-1 (Night only)"),
    (re.compile(r"\b(sos|as needed|as required)\b", re.I), "SOS (As needed)"),
]
FOOD_PATTERNS = [
    (re.compile(r"\bbefore (food|meal)s?\b", re.I), "Before Meal"),
    (re.compile(r"\bafter (food|meal)s?\b", re.I), "After Meal"),
    (re.compile(r"\bwith (food|meal)s?\b", re.I), "With Meal"),
    (re.compile(r"\bempty stomach\b", re.I), "Empty Stomach"),
]
DURATION_PATTERN = re.compile(r"\bfor\s+(\d{1,2})\s+days?\b", re.I)
MED_LINE_PATTERN = re.compile(
    r"(?:give|prescribe|start)\s+([a-zA-Z][a-zA-Z0-9 \-]{2,40}?)(?:,|\.|;|$| for | before | after )",
    re.I,
)
ADMIT_PATTERN = re.compile(r"\b(admit|admission|needs? to be admitted)\b", re.I)
TEST_PATTERN = re.compile(r"\border\s+(?:a|an)?\s*([a-zA-Z0-9 \-]{2,30})\s+test\b", re.I)


def structure_transcript(english_text: str) -> dict:
    medicines = []
    for match in MED_LINE_PATTERN.finditer(english_text):
        segment_start = match.start()
        window = english_text[segment_start:segment_start + 160]
        dosage = next((label for pat, label in DOSAGE_PATTERNS if pat.search(window)), "")
        food = next((label for pat, label in FOOD_PATTERNS if pat.search(window)), "")
        duration_match = DURATION_PATTERN.search(window)
        medicines.append({
            "name": match.group(1).strip().title(),
            "dosage": dosage,
            "duration": duration_match.group(1) if duration_match else "",
            "foodInstruction": food,
        })

    tests = [m.group(1).strip().title() for m in TEST_PATTERN.finditer(english_text)]

    return {
        "notes": english_text.strip(),
        "medicines": medicines,
        "testsSuggested": tests,
        "admitSuggested": bool(ADMIT_PATTERN.search(english_text)),
    }


@app.get("/health")
def health():
    return jsonify({"status": "ok", "languages": SUPPORTED_LANGUAGES})


@app.post("/transcribe")
def transcribe():
    """
    Multipart form fields:
      audio     - the recorded dictation (webm/wav)
      language  - ISO code from SUPPORTED_LANGUAGES (default: hi)
    """
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    language = (request.form.get("language") or "hi").lower()
    if language not in SUPPORTED_LANGUAGES:
        return jsonify({"error": f"Unsupported language '{language}'"}), 400

    audio_bytes = request.files["audio"].read()

    try:
        transcript_native = sarvam_transcribe(audio_bytes, language)
    except SarvamNotConfigured as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        log.exception("Sarvam speech-to-text call failed")
        return jsonify({"error": "Speech-to-text request failed.", "detail": str(exc)}), 502

    # Translate to English for structuring, unless already English.
    english_text = transcript_native
    if language != "en":
        try:
            english_text = translate_to_english(transcript_native, source_language=language)
        except SarvamNotConfigured:
            pass  # already logged/returned above for the ASR call
        except Exception:
            log.exception("Translation unavailable — structuring native-language text as-is")

    structured = structure_transcript(english_text)

    return jsonify({
        "language": language,
        "transcriptNative": transcript_native,
        "transcriptEnglish": english_text,
        **structured,
    })


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8500)
