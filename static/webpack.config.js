const path = require('path')
const {VueLoaderPlugin} = require('vue-loader')

module.exports = {
  mode: 'development',
  target: ['web', 'es5'],
  entry: {
    'polyfill': './src/polyfill.js',
    'vue': './src/vue.js',
    'app': './src/app.js',
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'js/[name].js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {targets: "defaults"}],
            ],
            plugins: ['@babel/plugin-transform-runtime'],
          },
        },
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.pug$/,
        loader: 'pug-plain-loader',
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
  ],
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.runtime.esm.js',
    },
  },
  devtool: false,
  devServer: {
    port: 8080,
    static: [
      {directory: path.join(__dirname, 'public')},
      {directory: path.join(__dirname, 'node_modules/bootstrap/dist')},
    ],
    hot: false,
    client: false,
    liveReload: false,
  },
}
