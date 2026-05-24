let audioContext: AudioContext | null = null;
let alertAudio: HTMLAudioElement | null = null;
let customSoundAvailable: boolean | null = null;

/** Override via .env: NEXT_PUBLIC_KITCHEN_ALERT_SOUND=/sounds/your-ring.mp3 */
const KITCHEN_ALERT_SOUND_URL =
  process.env.NEXT_PUBLIC_KITCHEN_ALERT_SOUND ?? "/sounds/kitchen-new-order.mp3";

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) {
    audioContext = new Ctx();
  }
  return audioContext;
}

function getAlertAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (customSoundAvailable === false) return null;
  if (!alertAudio) {
    alertAudio = new Audio(KITCHEN_ALERT_SOUND_URL);
    alertAudio.preload = "auto";
  }
  return alertAudio;
}

/** Call after a user gesture so later auto-play is allowed (browser policy). */
export function unlockKitchenAudio(): void {
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") {
    void ctx.resume();
  }
  const audio = getAlertAudio();
  if (audio) {
    audio.load();
  }
}

function playSyntheticChime(): boolean {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  if (ctx.state !== "running") return false;

  const now = ctx.currentTime;
  playTone(ctx, 880, now, 0.12);
  playTone(ctx, 1175, now + 0.14, 0.18);
  return true;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  durationSec: number,
  volume = 0.25
): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + durationSec);
  oscillator.start(startAt);
  oscillator.stop(startAt + durationSec + 0.05);
}

async function playCustomSound(): Promise<boolean> {
  const audio = getAlertAudio();
  if (!audio) return false;

  try {
    audio.currentTime = 0;
    await audio.play();
    customSoundAvailable = true;
    return true;
  } catch {
  }

  if (customSoundAvailable === null) {
    await new Promise<void>((resolve) => {
      const onReady = () => {
        audio.removeEventListener("canplaythrough", onReady);
        audio.removeEventListener("error", onError);
        resolve();
      };
      const onError = () => {
        audio.removeEventListener("canplaythrough", onReady);
        audio.removeEventListener("error", onError);
        resolve();
      };
      audio.addEventListener("canplaythrough", onReady, { once: true });
      audio.addEventListener("error", onError, { once: true });
      audio.load();
    });

    if (audio.error) {
      customSoundAvailable = false;
      return false;
    }

    try {
      audio.currentTime = 0;
      await audio.play();
      customSoundAvailable = true;
      return true;
    } catch {
      customSoundAvailable = false;
      return false;
    }
  }

  customSoundAvailable = false;
  return false;
}

/** Plays custom MP3 from public/sounds if present, otherwise the built-in chime. */
export async function playNewOrderSound(): Promise<boolean> {
  unlockKitchenAudio();

  const playedCustom = await playCustomSound();
  if (playedCustom) return true;

  return playSyntheticChime();
}

export function kitchenAlertSoundPath(): string {
  return KITCHEN_ALERT_SOUND_URL;
}
