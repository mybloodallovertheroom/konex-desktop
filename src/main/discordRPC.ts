/**
 * Konex Desktop - Discord Rich Presence
 *
 * Affiche l'activité Konex sur Discord :
 * - Serveur et canal actuel (via le titre de la page)
 * - Durée de la session
 * - Bouton pour rejoindre Konex
 */

import DiscordRPC from 'discord-rpc';

const CLIENT_ID = '1480642840961749206';

let client: DiscordRPC.Client | null = null;
let connected = false;
let startTimestamp = Date.now();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Parse le titre de la page pour extraire les infos de contexte
 * Exemples de titres konex.lol :
 *   "# général | Mon Serveur | Konex"
 *   "Mon Serveur | Konex"
 *   "Konex"
 */
function parseTitle(title: string): { details: string; state?: string } {
  // Supprimer le suffixe " | Konex" si présent
  const cleaned = title.replace(/\s*\|\s*Konex\s*$/i, '').trim();

  if (!cleaned || cleaned.toLowerCase() === 'konex') {
    return { details: 'Sur Konex.lol' };
  }

  // Format "# canal | Serveur"
  const parts = cleaned.split('|').map((p) => p.trim());
  if (parts.length >= 2) {
    const channel = parts[0].replace(/^#\s*/, '');
    const server = parts[1];
    return {
      details: server,
      state: `# ${channel}`,
    };
  }

  // Format "Serveur" seul
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
  } catch {
    // Silencieux — Discord peut être fermé
  }
}

/**
 * Met à jour l'activité Discord depuis le titre de la page
 */
export function updateActivityFromTitle(title: string): void {
  if (!connected) return;
  const { details, state } = parseTitle(title);
  setActivity(details, state);
}

/**
 * Remet l'activité à "Sur Konex.lol" (ex: pendant le chargement)
 */
export function resetActivity(): void {
  setActivity('Sur Konex.lol');
}

/**
 * Initialise la connexion Discord RPC
 * Tente une reconnexion automatique si Discord n'est pas ouvert
 */
export function initDiscordRPC(): void {
  startTimestamp = Date.now();

  function connect() {
    client = createClient();

    client.on('ready', () => {
      connected = true;
      console.log('[DiscordRPC] Connecté');
      setActivity('Sur Konex.lol');
    });

    client.login({ clientId: CLIENT_ID }).catch(() => {
      connected = false;
      client = null;
      // Retry dans 30s (Discord pas ouvert ou pas installé)
      reconnectTimer = setTimeout(connect, 30_000);
    });
  }

  connect();
}

/**
 * Déconnecte proprement le RPC
 */
export function destroyDiscordRPC(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (client) {
    try {
      client.destroy();
    } catch {
      // Silencieux
    }
    client = null;
  }
  connected = false;
}
