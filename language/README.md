# MEDISYS — Voice Prescription (Sarvam AI)

Lets a doctor **speak a prescription in an Indian language** on the Doctor
Queue (OPD) and IPD Rounds screens; this service transcribes it, translates
it to English, and pulls out medicines/dosage/duration/food instructions/
tests/admission so the doctor can review and confirm before saving.

## Why this lives in its own folder

`server/` (Node/Express) stays exactly as it is — one proxy route was added
(`POST /api/voice/prescribe` in `server/server.js`) that forwards the
recorded audio to this service over local HTTP and returns its JSON
response. Nothing else in the repo's structure changes.

## Engine: Sarvam AI (hosted API)

This originally targeted a self-hosted AI4Bharat NeMo model, but NeMo
requires a Linux machine with an NVIDIA GPU (its `triton` dependency has no
macOS build) — confirmed unworkable in this project's dev environment.
It now calls **Sarvam AI's** hosted speech-to-text and translate APIs
(https://docs.sarvam.ai) instead — no GPU, no local model download, just an
API key.

## One-time setup

```bash
cd language
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# then edit .env and set SARVAM_API_KEY=<your key>
```

## Running

```bash
cd language && source venv/bin/activate
python service.py
# Listens on http://127.0.0.1:8500
```

The Node backend expects this service at `http://127.0.0.1:8500` by
default — override with `VOICE_SERVICE_URL` in `server/.env` if it runs
elsewhere.

## Endpoints

- `GET /health` — readiness + supported language list.
- `POST /transcribe` — multipart `audio` (webm/wav) + `language` (ISO code,
  e.g. `hi`, `ta`, `bn`). Returns the native-language transcript, an
  English translation, and a structured `{ notes, medicines, testsSuggested,
  admitSuggested }` draft.

Without `SARVAM_API_KEY` set, `/transcribe` returns a `503` with a clear
message rather than failing obscurely — the service still boots and
`/health` still works, so the rest of the app is unaffected.

## Supported languages

Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam,
Punjabi, Odia, English — see `SUPPORTED_LANGUAGES` in `service.py` and the
matching Sarvam codes in `sarvam_client.py`.

## Notes

- Structuring is a transparent, rule-based first pass over the translated
  transcript (see `structure_transcript()` in `service.py`) — the doctor
  always reviews and edits the drafted fields client-side before anything
  is saved, the same as manual entry today.
- The Sarvam API request/response shapes here follow their public docs as
  of this writing — if a call ever 4xxs unexpectedly, check
  https://docs.sarvam.ai for schema changes before assuming the key is bad.
