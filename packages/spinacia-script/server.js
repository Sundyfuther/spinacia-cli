/* eslint import/no-extraneous-dependencies: ["off"] */
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const PnpWebpackPlugin = require('pnp-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const postcssNormalize = require('postcss-normalize');
const WebpackBar = require('webpackbar');
const getCacheIdentifier = require('./utils/getCacheIdentifier');

const paths = require('./path');

const {ENV_CONF, ESLINT} = require('./path');

const PORT = ENV_CONF.port || 3000;

const postcssOption = {
  // Options for PostCSS as we reference these options twice
  // Adds vendor prefixing based on your specified browser support in
  // package.json
  'loader': require.resolve('postcss-loader'),
  'options': {
    // Necessary for external CSS imports to work
    // https://github.com/facebook/create-react-app/issues/2677
    'ident': 'postcss',
    'plugins': () => [
      require('postcss-flexbugs-fixes'),
      require('postcss-preset-env')({
        'autoprefixer': {
          'flexbox': 'no-2009',
        },
        'stage': 3,
      }),
      // Adds PostCSS Normalize as the reset css with default options,
      // so that it honors browserslist config in package.json
      // which in turn let's users customize the target behavior as per their needs.
      postcssNormalize(),
    ],
    'sourceMap': false
  },
};

new WebpackDevServer(webpack({
  'mode': 'development',
  'devtool': 'eval-source-map',
  'entry': [
    `webpack-dev-server/client?http://localhost:${PORT}`,
    'webpack/hot/only-dev-server',
    paths.appIndexJs
  ],
  'output': {
    'publicPath': './',
    'filename': 'bundle.js',
    'devtoolModuleFilenameTemplate': info => path.resolve(info.absoluteResourcePath).replace(/\\/g, '/')
  },
  'plugins': [
    new WebpackBar({
      'name': '[SPINACIA][DEV]',
      'profile': false,
      'basic': false
    }),
    new webpack.DefinePlugin({'process.env.ORIGIN_ENV': JSON.stringify(ENV_CONF.origin)}),
    new CaseSensitivePathsPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin(Object.assign(
      {
        'title': typeof ENV_CONF.documentTitle === 'string' ? ENV_CONF.documentTitle : 'spinacia-react-redux',
        'template': paths.appHtml,
        'inject': true,
        'favicon': paths.favicon,
        'loading': {
          'html': fs.readFileSync(paths.loadingHtml),
          'css': `<style>${fs.readFileSync(paths.loadingCss)}</style>`
        }
      },
      paths.assetsCdn,
      paths.assetsLib
    ))
  ],
  'resolve': {
    'extensions': ['.js', '.jsx'],
    'plugins': [
      // Adds support for installing with Plug'n'Play, leading to faster installs and adding
      // guards against forgotten dependencies and such.
      PnpWebpackPlugin
    ]
  },
  'resolveLoader': {
    'plugins': [
      // Also related to Plug'n'Play, but this time it tells Webpack to load its loaders
      // from the current package.
      PnpWebpackPlugin.moduleLoader(module),
    ]
  },
  'module': {
    'strictExportPresence': true,
    'rules': [
      // First, run the linter.
      // It's important to do this before Babel processes the JS.
      ESLINT && typeof ESLINT === 'boolean' ? {
        'test': /\.(js|mjs|jsx|ts|tsx)$/,
        'enforce': 'pre',
        'use': [
          {
            'options': {
              'formatter': require('eslint-friendly-formatter'),
              'eslintPath': require.resolve('eslint'),
              // @remove-on-eject-begin
              'baseConfig': {
                'extends': [require.resolve('eslint-config-spinacia-app')],
              },
              'ignore': false,
              'useEslintrc': false,
              // @remove-on-eject-end
              'fix': true
            },
            'loader': require.resolve('eslint-loader'),
          },
        ],
        'include': [paths.appSrc, paths.appBuild]
      } : {},
      {
        'test': /\.(js|mjs|jsx|ts|tsx)?$/,
        'loader': require.resolve('babel-loader'),
        'include': [paths.appSrc, paths.appBuild],
        'options': {
          'customize': require.resolve('./babel/webpack-overrides.js'),
          'babelrc': false,
          'compact': false,
          'presets': [require.resolve('./babel/preset.js')],
          // Make sure we have a unique cache identifier, erring on the
          // side of caution.
          // We remove this when the user ejects because the default
          // is sane and uses Babel options. Instead of options, we use
          // the react-scripts and babel-preset-react-app versions.
          'cacheIdentifier': getCacheIdentifier(
            'development',
            [
              'babel-plugin-named-asset-import',
              'spinacia-script',
            ]
          ),
          'plugins': [
            [
              require.resolve('babel-plugin-import'),
              {
                'libraryName': 'antd-mobile',
                'style': 'css'
              }
            ],
            [
              require.resolve('babel-plugin-named-asset-import'),
              {
                'loaderMap': {
                  'svg': {
                    'ReactComponent': '@svgr/webpack?-svgo,+ref![path]',
                  },
                },
              },
            ]
          ],
          'cacheDirectory': true
        }
      },
      {
        'test': /\.css$/,
        'use': ['style-loader', 'css-loader', postcssOption]
      },
      {
        'test': /\.less$/,
        'use': ['style-loader', 'css-loader', postcssOption, 'less-loader']
      },
      {
        'test': /\.(eot|svg|ttf|woff|woff2)(\?.+)?$/,
        'loader': 'file-loader'
      },
      {
        'test': /\.(jpe?g|png|gif)(\?.+)?$/,
        'loader': 'url-loader'
      },
      {
        'test': /\.md$/,
        'loader': 'raw-loader'
      }
    ]
  }
}), {
  'publicPath': '/',
  'hot': true,
  'historyApiFallback': true,
  'open': true,
  'openPage': '',
  'stats': {
    'all': false,
    'colors': true,
    'assets': true,
    'assetsSort': 'size',
    'builtAt': true,
    'cached': true,
    'env': true,
    'modules': true,
    'maxModules': 0,
    'performance': true,
    'publicPath': true,
    'version': true,
    'errors': true,
    'warnings': true,
    // our additional options
    'moduleTrace': true,
    'errorDetails': true
  },
  'compress': false,
  'clientLogLevel': 'error'
}).listen(PORT, error => {
  if (error) {
    throw error;
  }
});