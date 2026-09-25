const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite на вебі тягне wa-sqlite.wasm — без цього веб-бандл не резолвиться.
config.resolver.assetExts.push('wasm');

// SharedArrayBuffer для wa-sqlite вимагає cross-origin isolation.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  return middleware(req, res, next);
};

module.exports = config;
