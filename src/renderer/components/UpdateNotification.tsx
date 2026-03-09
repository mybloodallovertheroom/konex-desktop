import { useEffect, useState } from 'react';

interface UpdateState {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  error: string | null;
  progress: number;
  version: string | null;
}

function UpdateNotification() {
  const [state, setState] = useState<UpdateState>({
    checking: false,
    available: false,
    downloaded: false,
    error: null,
    progress: 0,
    version: null,
  });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    window.electron?.update.getState().then(setState);
    const unsub = window.electron?.update.onStateChange((s) => {
      setState(s);
      if (s.available) setDismissed(false);
    });
    return () => unsub?.();
  }, []);

  const isDownloading = state.progress > 0 && state.progress < 100;

  if (dismissed || (!state.available && !state.downloaded && !isDownloading)) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      width: '320px',
      background: 'linear-gradient(135deg, #18181b 0%, #1c1c1f 100%)',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      borderRadius: '14px',
      padding: '18px 20px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      animation: 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v14M6 10l6 6 6-6" />
            <path d="M4 20h16" />
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
              {state.downloaded ? 'Prêt à installer' : 'Mise à jour disponible'}
            </span>
            {!isDownloading && (
              <button onClick={() => setDismissed(true)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.35)', padding: '0 0 0 8px', lineHeight: 1,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '0 0 12px 0' }}>
            {state.downloaded
              ? `v${state.version} téléchargée — redémarre pour l'appliquer`
              : `v${state.version} est disponible`}
          </p>

          {isDownloading && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Téléchargement...</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>{state.progress.toFixed(0)}%</span>
              </div>
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${state.progress}%`,
                  background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                  borderRadius: '2px', transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          )}

          {!isDownloading && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {state.downloaded ? (
                <button
                  onClick={() => window.electron?.update.install()}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#fff', fontSize: '12px', fontWeight: 600,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Redémarrer maintenant
                </button>
              ) : (
                <>
                  <button
                    onClick={() => window.electron?.update.download()}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      color: '#fff', fontSize: '12px', fontWeight: 600,
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    Télécharger
                  </button>
                  <button
                    onClick={() => setDismissed(true)}
                    style={{
                      padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer', background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 500,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                  >
                    Plus tard
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UpdateNotification;
