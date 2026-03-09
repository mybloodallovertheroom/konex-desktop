/// <reference types="vite/client" />

declare namespace Electron {
  interface WebviewTag extends HTMLElement {
    src: string;
    partition: string;
    allowpopups: string;
    webpreferences: string;
    reload: () => void;
    insertCSS: (css: string) => Promise<string>;
    addEventListener<K extends keyof WebviewTagEventMap>(
      type: K,
      listener: (event: WebviewTagEventMap[K]) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener<K extends keyof WebviewTagEventMap>(
      type: K,
      listener: (event: WebviewTagEventMap[K]) => void,
      options?: boolean | EventListenerOptions
    ): void;
  }

  interface WebviewTagEventMap {
    'did-finish-load': Event;
    'did-fail-load': DidFailLoadEvent;
    'dom-ready': Event;
    'new-window': NewWindowWebContentsEvent;
    'will-navigate': WillNavigateEvent;
  }

  interface DidFailLoadEvent extends Event {
    errorCode: number;
    errorDescription: string;
    validatedURL: string;
    isMainFrame: boolean;
  }

  interface NewWindowWebContentsEvent extends Event {
    url: string;
    frameName: string;
    disposition: string;
  }

  interface WillNavigateEvent extends Event {
    url: string;
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<
      React.HTMLAttributes<Electron.WebviewTag> & {
        src?: string;
        partition?: string;
        allowpopups?: string;
        webpreferences?: string;
        useragent?: string;
        disablewebsecurity?: string;
        nodeintegration?: string;
      },
      Electron.WebviewTag
    >;
  }
}
