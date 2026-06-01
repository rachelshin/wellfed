const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase 9+ uses package.json "exports" field — Metro needs this flag to resolve subpaths like firebase/auth
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
