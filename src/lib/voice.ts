// Browser voice capture: MediaRecorder for raw audio + Web Speech API for
// live transcription. Both run in parallel so the user always has BOTH the
// raw recording AND a live transcript visible as they speak.

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((ev: SpeechRecognitionEvent) => void) | null
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(i: number): SpeechRecognitionResult
  [i: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  isFinal: boolean
  item(i: number): SpeechRecognitionAlternative
  [i: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

function getRecognitionCtor(): SpeechRecognitionConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export interface VoiceCaptureCallbacks {
  onPartialTranscript: (interim: string, finalSoFar: string) => void
  onAutoSave: (transcriptSoFar: string, audioBlob: Blob | null) => void
  onError: (err: Error) => void
  onEnd: (finalTranscript: string, audioBlob: Blob | null) => void
}

export class VoiceCapture {
  private recognition: SpeechRecognitionLike | null = null
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private finalTranscript = ''
  private autoSaveTimer: number | null = null
  private isRecording = false
  private stream: MediaStream | null = null
  private autoSaveIntervalMs: number

  constructor(
    private callbacks: VoiceCaptureCallbacks,
    autoSaveIntervalMs = 10000,
  ) {
    this.autoSaveIntervalMs = autoSaveIntervalMs
  }

  async start(): Promise<void> {
    if (this.isRecording) return
    this.finalTranscript = ''
    this.audioChunks = []

    // Get mic stream for MediaRecorder
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      this.callbacks.onError(
        new Error(
          `Microphone access denied or unavailable: ${
            e instanceof Error ? e.message : String(e)
          }. You can still type into the capture box.`,
        ),
      )
      return
    }

    // Start MediaRecorder for raw audio
    try {
      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ]
      const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
      this.mediaRecorder = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined)
      this.mediaRecorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data.size > 0) this.audioChunks.push(ev.data)
      }
      this.mediaRecorder.start(1000) // emit chunks every second
    } catch (e) {
      this.callbacks.onError(
        new Error(`MediaRecorder failed: ${e instanceof Error ? e.message : String(e)}`),
      )
    }

    // Start Web Speech API for live transcript
    const Ctor = getRecognitionCtor()
    if (Ctor) {
      this.recognition = new Ctor()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = navigator.language || 'en-US'
      this.recognition.onresult = (ev) => {
        let interim = ''
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i]
          if (res.isFinal) {
            this.finalTranscript += res[0].transcript + ' '
          } else {
            interim += res[0].transcript
          }
        }
        this.callbacks.onPartialTranscript(interim, this.finalTranscript)
      }
      this.recognition.onerror = (ev) => {
        // 'no-speech' is common and harmless — don't bubble it up
        if (ev.error === 'no-speech' || ev.error === 'aborted') return
        this.callbacks.onError(new Error(`Speech recognition: ${ev.error}`))
      }
      this.recognition.onend = () => {
        // Auto-restart if we're still supposed to be recording
        // (Chrome sometimes ends recognition early on long silences)
        if (this.isRecording && this.recognition) {
          try {
            this.recognition.start()
          } catch {
            // Already started — ignore
          }
        }
      }
      try {
        this.recognition.start()
      } catch (e) {
        this.callbacks.onError(
          new Error(
            `Speech recognition unavailable: ${
              e instanceof Error ? e.message : String(e)
            }. Recording audio only.`,
          ),
        )
      }
    } else {
      // No Web Speech API support (Firefox, Safari iOS). Audio still records.
      this.callbacks.onError(
        new Error(
          'Live transcription not supported in this browser (try Chrome/Edge). Audio is still being recorded — you can paste a transcript afterward.',
        ),
      )
    }

    this.isRecording = true
    this.startAutoSaveLoop()
  }

  private startAutoSaveLoop(): void {
    if (this.autoSaveTimer !== null) window.clearInterval(this.autoSaveTimer)
    this.autoSaveTimer = window.setInterval(() => {
      // Build a blob from chunks so far (don't stop the recorder)
      const blob = this.audioChunks.length
        ? new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType ?? 'audio/webm' })
        : null
      this.callbacks.onAutoSave(this.finalTranscript.trim(), blob)
    }, this.autoSaveIntervalMs)
  }

  async stop(): Promise<{ transcript: string; blob: Blob | null; durationMs: number }> {
    if (!this.isRecording) {
      return { transcript: this.finalTranscript.trim(), blob: null, durationMs: 0 }
    }
    this.isRecording = false

    if (this.autoSaveTimer !== null) {
      window.clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }

    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch {
        // Ignore
      }
      this.recognition = null
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      if (!this.mediaRecorder) return resolve(null)
      const mime = this.mediaRecorder.mimeType ?? 'audio/webm'
      this.mediaRecorder.onstop = () => {
        const merged = this.audioChunks.length ? new Blob(this.audioChunks, { type: mime }) : null
        resolve(merged)
      }
      try {
        this.mediaRecorder.stop()
      } catch {
        resolve(null)
      }
    })

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }

    const final = this.finalTranscript.trim()
    this.callbacks.onEnd(final, blob)
    return { transcript: final, blob, durationMs: 0 }
  }
}

export function isSpeechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null
}
