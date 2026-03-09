import { useEffect, useState } from 'react';

interface UpdateState {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  error: string | null;
  progress: number;
  version: string | null;
}

/**
 * Update notification component
 * Shows update progress and prompts
 */
function UpdateNotification() {
  const [updateState, setUpdateState] = useState<UpdateState>({
    checking: false,
    available: false,
    downloaded: false,
    error: null,
    progress: 0,
    version: null,
  });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Get initial state
    window.electron?.update.getState().then(setUpdateState);

    // Listen for state changes
    const unsubscribe = window.electron?.update.onStateChange((state) => {
      setUpdateState(state);
      // Reset dismissed when new update is available
      if (state.available && !updateState.available) {
        setDismissed(false);
      }
    });

    return () => unsubscribe?.();
  }, []);

  // Don't show if dismissed or no update info
  if (dismissed || (!updateState.available && !updateState.downloaded && updateState.progress === 0)) {
    return null;
  }

  // Show download progress
  if (updateState.progress > 0 && updateState.progress < 100) {
    return (
      <div className="update-notification update-progress">
        <div className="update-content">
          <span className="update-text">
            Téléchargement de la mise à jour... {updateState.progress.toFixed(0)}%
          </span>
          <div className="update-progress-bar">
            <div
              className="update-progress-fill"
              style={{ width: `${updateState.progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Show ready to install
  if (updateState.downloaded) {
    return (
      <div className="update-notification update-ready">
        <div className="update-content">
          <span className="update-text">
            Mise à jour v{updateState.version} prête
          </span>
          <div className="update-actions">
            <button
              className="update-button update-button-primary"
              onClick={() => window.electron?.update.install()}
            >
              Redémarrer
            </button>
            <button
              className="update-button update-button-secondary"
              onClick={() => setDismissed(true)}
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default UpdateNotification;
