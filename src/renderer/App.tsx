import { useEffect, useState, useRef } from 'react';
import TitleBar from './components/TitleBar';
import UpdateNotification from './components/UpdateNotification';

const KONEX_URL = 'https://konex.lol/app';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const webviewRef = useRef<Electron.WebviewTag | null>(null);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDidFinishLoad = () => {
      console.log('[Webview] Finished loading');
      setIsLoading(false);
      setIsOffline(false);
      setLoadError(null);
      window.electron?.webview.loaded();
    };

    const handleDidFailLoad = (event: Electron.DidFailLoadEvent) => {
      console.error('[Webview] Failed to load:', event.errorDescription);
      if (event.errorCode === -3) return;
      setIsLoading(false);
      setIsOffline(true);
      setLoadError(event.errorDescription);
      window.electron?.webview.failed();
    };

    const handleDomReady = () => {
      console.log('[Webview] DOM ready');

      webview.insertCSS(`
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `);

      webview.executeJavaScript(`
        (function() {
          if (window.__rpcObserver__) return;
          window.__rpcObserver__ = true;
          const send = () => { try { window.__konexBridge__?.updateRPC(document.title); } catch {} };
          send();
          const titleEl = document.querySelector('title');
          if (titleEl) {
            new MutationObserver(send).observe(titleEl, { childList: true, characterData: true, subtree: true });
          }
        })();
      `).catch(() => {});
    };

    const handleTitleUpdate = (event: any) => {
      const title = event.title as string;
      if (title) window.electron?.discord?.updateActivity(title);
    };

    const handleNavigate = async () => {
      try {
        const title = await webview.executeJavaScript('document.title');
        if (title) window.electron?.discord?.updateActivity(title);
      } catch {}
    };

    const handleNewWindow = (event: Electron.NewWindowWebContentsEvent) => {
      event.preventDefault();
      const url = (event as any).url as string | undefined;
      if (!url) return;
      if (url.startsWith('spotify:')) {
        webview.executeJavaScript(
          `window.__konexBridge__?.openExternal(${JSON.stringify(url)})`
        ).catch(() => {});
      } else {
        window.electron?.app.openExternal(url);
      }
    };

    webview.addEventListener('did-finish-load', handleDidFinishLoad);
    webview.addEventListener('did-fail-load', handleDidFailLoad as any);
    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('new-window', handleNewWindow as any);
    webview.addEventListener('page-title-updated', handleTitleUpdate);
    webview.addEventListener('did-navigate-in-page', handleNavigate);

    const unsubscribeReload = window.electron?.webview.onReload(() => {
      webview.reload();
      setIsLoading(true);
      setIsOffline(false);
    });

    const unsubscribeOffline = window.electron?.webview.onShowOffline(() => {
      setIsOffline(true);
    });

    return () => {
      webview.removeEventListener('did-finish-load', handleDidFinishLoad);
      webview.removeEventListener('did-fail-load', handleDidFailLoad as any);
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('new-window', handleNewWindow as any);
      webview.removeEventListener('page-title-updated', handleTitleUpdate);
      webview.removeEventListener('did-navigate-in-page', handleNavigate);
      unsubscribeReload?.();
      unsubscribeOffline?.();
    };
  }, []);

  const handleRetry = () => {
    const webview = webviewRef.current;
    if (webview) {
      setIsLoading(true);
      setIsOffline(false);
      setLoadError(null);
      webview.reload();
    }
  };

  return (
    <div className="app-container">
      <TitleBar />
      <div className="content-area">
        {isLoading && !isOffline && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <span className="loading-text">Chargement...</span>
          </div>
        )}
        {isOffline && (
          <div className="offline-screen">
            <div className="offline-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line x1="12" y1="20" x2="12.01" y2="20" />
              </svg>
            </div>
            <h2 className="offline-title">Connexion impossible</h2>
            <p className="offline-description">
              {loadError || "Impossible de se connecter à Konex. Vérifie ta connexion internet."}
            </p>
            <button className="retry-button" onClick={handleRetry}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Réessayer
            </button>
          </div>
        )}
        <webview
          ref={webviewRef as any}
          src={KONEX_URL}
          className={`webview ${isOffline ? 'hidden' : ''}`}
          partition="persist:konex"
          allowpopups="true"
          webpreferences="contextIsolation=yes, nodeIntegration=no, sandbox=no, backgroundThrottling=no"
        />
      </div>
      <UpdateNotification />
    </div>
  );
}

export default App;
