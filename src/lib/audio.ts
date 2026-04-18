export const playDingDong = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return

    const ctx = new AudioContext()

    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.frequency.value = freq
      osc.type = 'sine'

      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

      osc.start(startTime)
      osc.stop(startTime + duration)
    }

    const now = ctx.currentTime
    playNote(659.25, now, 0.6) // E5
    playNote(523.25, now + 0.5, 1.0) // C5
  } catch (err) {
    console.error('Audio playback failed', err)
  }
}

export const speakText = (text: string) => {
  if (!('speechSynthesis' in window)) return

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'pt-BR'
  utterance.rate = 0.9
  utterance.pitch = 1.1

  window.speechSynthesis.speak(utterance)
}
