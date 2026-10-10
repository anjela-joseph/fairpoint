export async function fetchJson(url, options = {}, { signal, timeout = 15000, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
  try {
    const response = await fetchImpl(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      const error = new Error(`Service request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } catch (error) {
    if (timedOut) throw new Error('The request timed out. Check your connection and try again.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
