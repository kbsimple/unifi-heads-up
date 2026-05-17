export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startRecorder } = await import('@/lib/db/recorder')
    startRecorder()
  }
}
