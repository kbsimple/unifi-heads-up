export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startRecorder } = await import('@/lib/db/recorder')
    startRecorder()

    console.log('[server] startup', {
      nodeVersion: process.version,
      nodeEnv: process.env.NODE_ENV ?? 'unknown',
      buildId: process.env.NEXT_BUILD_ID ?? process.env.BUILD_ID ?? 'dev',
      startedAt: new Date().toISOString(),
    })
  }
}
