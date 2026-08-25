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
# Widened beyond "give/prescribe/start X" to also catch how doctors actually
# phrase it in casual dictation — "you take medicine of X", "patient should
# take X", etc. — since the original three trigger words missed common
# phrasing entirely (the medicine just wouldn't be detected at all).
# "medicine of" after the trigger is swallowed as a non-capturing prefix so
# the captured name is just "Paracetamol", not "Medicine Of Paracetamol".
# The name also stops before a bare "N-N-N" dosage-frequency code (e.g.
# "Paracetamol 1-0-1") so that code is left for DOSAGE_PATTERNS to parse
# instead of becoming part of the medicine name — verified against real
# sample dictations on 2026-08-24; without this stop, "Give Paracetamol
# 1-0-1 after meal" incorrectly named the medicine "Paracetamol 1-0-1".
MED_LINE_PATTERN = re.compile(
    r"(?:give|prescribe|start|(?:you|patient)\s+(?:should\s+|will\s+|can\s+)?take)\s+(?:medicine\s+of\s+)?"
    r"([a-zA-Z][a-zA-Z0-9 \-]{2,40}?)(?:,|\.|;|$| \d-\d-\d| for | before | after )",
    re.I,
)
ADMIT_PATTERN = re.compile(r"\b(admit|admission|needs? to be admitted)\b", re.I)
# A single trigger word ("order"/"do"/"get"/"conduct"/"run"/"check") followed
# by one or more comma/"and"-separated test names, ending at the word
# "test(s)" or the clause boundary — so "do the CBC, dengue test" and "order
# CBC and dengue test" both yield ["CBC", "dengue"], not just the first name.
# This is intentionally forgiving (matches the file's existing "good enough,
# doctor reviews everything" philosophy) rather than a precise grammar.
TEST_TRIGGER_PATTERN = re.compile(
    r"\b(?:order|do|get|conduct|run|check)\b\s+(?:a|an|the)?\s*([a-zA-Z0-9 ,\-]{2,80}?)\s+tests?\b",
    re.I,
)
# TEST_TRIGGER_PATTERN needs BOTH a trigger word (order/do/get/...) AND a
# trailing "test(s)" — verified against real phrasing on 2026-08-25 that this
# misses most of how doctors actually say it: a bare "CBC" (no trigger, no
# "test" suffix), "please do a CBC" (has a trigger but no "test" suffix), and
# "I want a CBC test done" (has "test" but "want" isn't a recognized
# trigger) all failed to extract anything. Without a structured match, the
# frontend previously fell back to searching the catalog with the *entire*
# raw utterance, which only works if the doctor said the bare test name and
# nothing else — any natural framing broke the substring match entirely.
# These patterns strip that framing so a short utterance still yields a
# clean single candidate even when TEST_TRIGGER_PATTERN finds nothing.
TEST_FALLBACK_PREFIX = re.compile(
    r"^\s*(?:please\s+|kindly\s+|can\s+you\s+|could\s+you\s+|i\s+want\s+|i\s+would\s+like\s+|i'd\s+like\s+)*"
    r"(?:(?:order|do|get|conduct|run|check)\s+)?(?:a\s+|an\s+|the\s+)?",
    re.I,
)
TEST_FALLBACK_SUFFIX = re.compile(r"\s+(?:tests?|please|now|done)\s*$", re.I)
# Cap on how many words the cleaned leftover can be before we stop trusting
# it as "just a test name" — beyond this it's more likely a full sentence
# (e.g. a symptom description) that happened to have no trigger match, and
# blindly searching the catalog with it would be as unreliable as before.
FALLBACK_MAX_WORDS = 4


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

    # Each trigger match can itself name several tests ("CBC, dengue test"),
    # so split the captured chunk on commas/"and" before titlecasing — a
    # doctor listing three tests in one sentence should yield three entries,
    # not one run-on string the frontend's catalog search can't match.
    tests = []
    for match in TEST_TRIGGER_PATTERN.finditer(english_text):
        for name in re.split(r",|\band\b|&", match.group(1)):
            name = name.strip(" .")
            if name:
                tests.append(name.title())

    # Nothing matched the strict "trigger + test(s)" pattern — try treating
    # the whole utterance as one test name after stripping common framing
    # ("please", "can you", "order a", trailing "test"/"done"). Only trusted
    # if what's left is short; a longer leftover is more likely a sentence
    # this simple parser just didn't recognize, not a test name.
    if not tests:
        cleaned = TEST_FALLBACK_PREFIX.sub("", english_text).strip(" .,")
        # Trailing filler can stack ("... test done") — strip repeatedly
        # until nothing more matches, not just once, or "I want a CBC test
        # done" would only lose "done" and leave "CBC test" behind.
        prev = None
        while prev != cleaned:
            prev = cleaned
            cleaned = TEST_FALLBACK_SUFFIX.sub("", cleaned).strip(" .,")
        # Gate on the TOTAL length before splitting, not per-fragment after
        # — a real bug caught in testing: an unrelated symptom sentence
        # ("Patient has fever and headache for the last three days, no
        # vomiting") has no trigger word, so prefix-stripping does nothing,
        # but splitting on "and"/commas chops it into short-enough pieces
        # ("Patient has fever", "no vomiting") that each individually passed
        # a per-fragment cap and got fabricated into fake test names. Capping
        # the whole cleaned string first means only genuinely short
        # dictations (a bare test name, or a short comma-separated list of
        # them) reach the split step at all.
        if cleaned and len(cleaned.split()) <= FALLBACK_MAX_WORDS + 4:
            for name in re.split(r",|\band\b|&", cleaned):
                name = name.strip(" .")
                if name and len(name.split()) <= FALLBACK_MAX_WORDS:
                    tests.append(name.title())

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
