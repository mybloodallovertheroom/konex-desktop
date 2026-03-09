import { useEffect, useState } from 'react';
import iconPath from '../assets/icon.png';

/**
 * Custom TitleBar component - Discord-style
 * Features:
 * - Draggable area
 * - Windows controls on the right (minimize, maximize, close)
 * - App title/logo on the left
 */
function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    // Get initial maximized state
    window.electron?.window.isMaximized().then(setIsMaximized);

    // Get app version
    window.electron?.app.getVersion().then(setAppVersion);

    // Listen for maximize changes
    const unsubscribe = window.electron?.window.onMaximizeChange((maximized) => {
      setIsMaximized(maximized);
    });

    return () => unsubscribe?.();
  }, []);

  const handleMinimize = () => window.electron?.window.minimize();
  const handleMaximize = () => window.electron?.window.maximize();
  const handleClose = () => window.electron?.window.close();

  return (
    <div className="titlebar">
      {/* Left side - Logo and title */}
      <div className="titlebar-left">
        <img src={iconPath} alt="Konex" className="titlebar-logo" />
        <span className="titlebar-title">Konex</span>
        {appVersion && <span className="titlebar-version">v{appVersion}</span>}
      </div>

      {/* Center - Draggable area */}
      <div className="titlebar-drag" />

      {/* Right side - Window controls */}
      <div className="titlebar-controls">
        {/* Minimize */}
        <button
          className="titlebar-button"
          onClick={handleMinimize}
          aria-label="Minimize"
        >
          <svg viewBox="0 0 12 12" fill="currentColor">
            <rect x="1" y="5.5" width="10" height="1" />
          </svg>
        </button>

        {/* Maximize/Restore */}
        <button
          className="titlebar-button"
          onClick={handleMaximize}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="2.5" y="4" width="6" height="6" rx="0.5" />
              <path d="M4 4V2.5C4 2.22 4.22 2 4.5 2H9.5C9.78 2 10 2.22 10 2.5V7.5C10 7.78 9.78 8 9.5 8H8" />
            </svg>
          ) : (
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="2" y="2" width="8" height="8" rx="0.5" />
            </svg>
          )}
        </button>

        {/* Close */}
        <button
          className="titlebar-button titlebar-button-close"
          onClick={handleClose}
          aria-label="Close"
        >
          <svg viewBox="0 0 12 12" fill="currentColor">
            <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default TitleBar;
