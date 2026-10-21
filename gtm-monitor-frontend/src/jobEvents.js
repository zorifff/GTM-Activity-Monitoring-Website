import { authFetch } from './apiConfig';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const MAX_RECONNECT_ATTEMPTS = 20;

// Satu blok SSE ("event: x\ndata: {...}") → { event, data }
const parseSseBlock = (block) => {
  let event = 'message';
  const dataLines = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return null;
  }
};

// Memantau job latar belakang lewat Server-Sent Events sampai selesai.
// Dibaca dengan authFetch (bukan EventSource) agar cookie sesi yang kedaluwarsa diperbarui otomatis.
// Koneksi yang putus (jaringan / server restart) disambung ulang; server selalu mengirim status terakhir saat tersambung.
// Hasil: { event: 'completed' | 'failed', data }
export const watchJobEvents = async (url, { onProgress, signal } = {}) => {
  let attempts = 0;
  while (true) {
    let res;
    try {
      res = await authFetch(url, { headers: { Accept: 'text/event-stream' }, signal });
    } catch (err) {
      if (signal?.aborted) throw err;
      res = null;
    }

    if (res && res.ok && res.body) {
      attempts = 0;
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value.replace(/\r\n/g, '\n');
          let boundary;
          while ((boundary = buffer.indexOf('\n\n')) >= 0) {
            const message = parseSseBlock(buffer.slice(0, boundary));
            buffer = buffer.slice(boundary + 2);
            if (!message) continue;
            if (message.event === 'progress') onProgress?.(message.data);
            if (message.event === 'completed' || message.event === 'failed') return message;
          }
        }
      } catch (err) {
        if (signal?.aborted) throw err;
      }
    } else if (res && res.status < 500) {
      // 4xx (job tidak ditemukan / sesi berakhir / akses ditolak) tidak akan berubah bila diulang
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || body.error || `Gagal memantau progres (Status ${res.status}).`);
    }

    // Stream terputus sebelum hasil akhir → coba sambung ulang
    if (++attempts > MAX_RECONNECT_ATTEMPTS) {
      throw new Error('Koneksi ke server terputus saat memantau progres. Muat ulang halaman untuk melihat data terbaru.');
    }
    await sleep(3000);
  }
};
