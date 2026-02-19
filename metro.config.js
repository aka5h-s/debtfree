const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ["browser", "import", "require"];

config.resolver.sourceExts = [...(config.resolver.sourceExts || []), "cjs"];

module.exports = config;
