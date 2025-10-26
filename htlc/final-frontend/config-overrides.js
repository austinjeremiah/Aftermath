const webpack = require('webpack');

module.exports = function override(config) {
  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "assert": require.resolve("assert"),
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "os": require.resolve("os-browserify"),
    "url": require.resolve("url"),
    "process": require.resolve("process/browser.js")
  });
  
  config.resolve.fallback = fallback;
  
  // Add .js extension resolution for ESM modules
  config.resolve.extensionAlias = {
    '.js': ['.js', '.ts', '.tsx']
  };
  
  config.resolve.fullySpecified = false; // This is key for the ESM issue
  
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer']
    })
  ]);
  
  // Ensure proper module resolution
  config.module.rules.push({
    test: /\.m?js$/,
    resolve: {
      fullySpecified: false
    }
  });
  
  return config;
}