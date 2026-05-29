const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    game: './src/client/game/index.ts',
    explainer: './src/client/explainer/index.ts',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'app', 'static'),
    clean: false,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.client.json',
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  devtool: 'source-map',
};
