// Polyfills for Node 18 compatibility with modern Metro
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function() {
    return [...this].reverse();
  };
}
if (!Array.prototype.toSorted) {
  Array.prototype.toSorted = function(compareFn) {
    return [...this].sort(compareFn);
  };
}
if (!Array.prototype.toSpliced) {
  Array.prototype.toSpliced = function(start, deleteCount, ...items) {
    const copy = [...this];
    copy.splice(start, deleteCount, ...items);
    return copy;
  };
}

const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ["browser", "import", "require"];

config.resolver.sourceExts = [...(config.resolver.sourceExts || []), "cjs"];

module.exports = config;
