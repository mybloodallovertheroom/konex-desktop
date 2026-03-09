import DiscordRPC from 'discord-rpc';

const CLIENT_ID = '1480642840961749206';

let client: DiscordRPC.Client | null = null;
let connected = false;
let startTimestamp = Date.now();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function parseTitle(title: string): { details: string; state?: string } {
  const cleaned = title.replace(/\s*\|\s*Konex\s*$/i, '').trim();

  if (!cleaned || cleaned.toLowerCase() === 'konex') {
    return { details: 'Sur Konex.lol' };
  }

  const parts = cleaned.split('|').map((p) => p.trim());
  if (parts.length >= 2) {
    const channel = parts[0].replace(/^#\s*/, '');
    const server = parts[1];
    return { details: server, state: `# ${channel}` };
  }

  return { details: cleaned };
}

function createClient(): DiscordRPC.Client {
  return new DiscordRPC.Client({ transport: 'ipc' });
}

async function setActivity(details: string, state?: string): Promise<void> {
  if (!connected || !client) return;
  try {
    await client.setActivity({
      details,
      state,
      startTimestamp,
      largeImageKey: 'konex_logo',
      largeImageText: 'Konex.lol',
      buttons: [{ label: 'Rejoindre Konex', url: 'https://konex.lol' }],
      instance: false,
    });
  } catch {}
}

export function updateActivityFromTitle(title: string): void {
  if (!connected) return;
  const { details, state } = parseTitle(title);
  setActivity(details, state);
}

export function resetActivity(): void {
  setActivity('Sur Konex.lol');
}

export function initDiscordRPC(): void {
  startTimestamp = Date.now();

  function connect() {
    client = createClient();

    client.on('ready', () => {
      connected = true;
      setActivity('Sur Konex.lol');
    });

    client.login({ clientId: CLIENT_ID }).catch(() => {
      connected = false;
      client = null;
      reconnectTimer = setTimeout(connect, 30_000);
    });
  }

  connect();
}

export function destroyDiscordRPC(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (client) {
    try {
      client.destroy();
    } catch {}
    client = null;
  }
  connected = false;
}
