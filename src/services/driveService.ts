const CLIENT_ID  = import.meta.env.VITE_GOOGLE_CLIENT_ID   as string;
const FOLDER_ID  = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID as string;
const SCOPES     = 'https://www.googleapis.com/auth/drive.file';

let accessToken: string | null = null;
let tokenClient: google.accounts.oauth2.TokenClient | null = null;

// ─── Load scripts ─────────────────────────────────────────────────────────
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

// ─── Get OAuth token (silent first, then popup) ───────────────────────────
async function getToken(): Promise<string> {
  if (accessToken) return accessToken;
  if (!CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID חסר ב-.env');

  await loadScript('https://accounts.google.com/gsi/client');

  return new Promise((resolve, reject) => {
    const tryAuth = (prompt: string) => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (r: google.accounts.oauth2.TokenResponse) => {
          if (r.error) { reject(new Error(r.error)); return; }
          accessToken = r.access_token;
          setTimeout(() => { accessToken = null; }, (r.expires_in - 60) * 1000);
          resolve(r.access_token);
        },
      });
      tokenClient.requestAccessToken({ prompt });
    };
    tryAuth('none');
  }).catch(() => new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (r: google.accounts.oauth2.TokenResponse) => {
        if (r.error) { reject(new Error(r.error)); return; }
        accessToken = r.access_token;
        setTimeout(() => { accessToken = null; }, (r.expires_in - 60) * 1000);
        resolve(r.access_token);
      },
    });
    tokenClient!.requestAccessToken({ prompt: 'consent' });
  })) as Promise<string>;
}

// ─── Create subfolder ─────────────────────────────────────────────────────
async function createFolder(name: string, parentId: string, token: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'שגיאה ביצירת תיקייה');
  return data.id;
}

// ─── Upload xlsx file ────────────────────────────────────────────────────
async function uploadFile(name: string, buffer: ArrayBuffer, folderId: string, token: string): Promise<void> {
  const meta = { name, parents: [folderId], mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  form.append('file',     new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'שגיאה בהעלאת קובץ');
  }
}

// ─── Main export ──────────────────────────────────────────────────────────
export async function uploadEventToDrive(
  eventName: string,
  eventDate: string,
  files: { name: string; buffer: ArrayBuffer }[]
): Promise<string> {
  if (!FOLDER_ID) throw new Error('VITE_GOOGLE_DRIVE_FOLDER_ID חסר ב-.env');

  const token      = await getToken();
  const dateStr    = new Date(eventDate).toLocaleDateString('he-IL');
  const folderName = `${eventName} — ${dateStr}`;
  const folderId   = await createFolder(folderName, FOLDER_ID, token);

  for (const file of files) {
    await uploadFile(file.name, file.buffer, folderId, token);
  }

  return `https://drive.google.com/drive/folders/${folderId}`;
}

export const driveConfigured = !!FOLDER_ID && !!CLIENT_ID;
