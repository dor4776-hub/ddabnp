// Minimal type declarations for Google APIs used in driveService.ts

declare namespace google.accounts.oauth2 {
  interface TokenResponse {
    access_token: string;
    expires_in: number;
    error?: string;
  }
  interface TokenClient {
    requestAccessToken(opts?: { prompt?: string }): void;
    callback: (r: TokenResponse) => void;
  }
  function initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (r: TokenResponse) => void;
  }): TokenClient;
}

declare namespace google.picker {
  const Action: { PICKED: string; CANCEL: string };
  const ViewId: { FOLDERS: string };
  class DocsView {
    constructor(viewId: string);
    setSelectFolderEnabled(v: boolean): this;
    setMimeTypes(types: string): this;
  }
  class PickerBuilder {
    addView(view: DocsView): this;
    setOAuthToken(token: string): this;
    setTitle(title: string): this;
    setCallback(fn: (data: any) => void): this;
    build(): { setVisible(v: boolean): void };
  }
}

declare interface Window {
  google: typeof google;
  gapi: {
    load(lib: string, cb: () => void): void;
    client: {
      init(opts: { discoveryDocs: string[] }): Promise<void>;
    };
  };
}
