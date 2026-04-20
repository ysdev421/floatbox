const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// フォントファイル（.ttf）をアセットとして認識させる
config.resolver.assetExts.push('ttf');

module.exports = config;
