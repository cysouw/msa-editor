/**
 * Assets Config file
 */

process.noDeprecation = true;

const path = require('path');
const webpack = require('webpack');
const UglifyJSPlugin = require('webpack-uglifyes-plugin');

const config = {
  entry: {
    app: './src/app/app.js',
    'app-multi': './src/app/app-multi.js'
  },
  output: {
    filename: 'js/[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      },
      { 
        test: /\.(jpe?g|png|gif)$/i,
        use: [{
          loader: 'file-loader',
          options: {
            outputPath: 'assets'
          }
        }]
      },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        options: {
          presets: ['es2015']
        }
      }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery'
    })
  ]
};

if (process.env.NODE_ENV === 'production') {
  config.plugins.push(
    new UglifyJSPlugin()
  );
}

module.exports = config;
