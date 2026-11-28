/// <reference types="vite/client" />

declare interface Window {
  env: {
    NODE_ENV: 'development' | 'production' | 'test';

    VITE_USE_SENTRY?: boolean;
    VITE_SENTRY_API?: string;
    VITE_SENTRY_ENVIRONMENT?: string;

    GATEWAY_API: string;
    CDN_IMAGES_URL: string;
    SOCKET_GATEWAY_API: string;
  };
}

interface ImportMetaEnv {
  readonly VITE_APP_UI_VERSION?: string;
  readonly VITE_SENTRY_RELEASE?: string;
}
