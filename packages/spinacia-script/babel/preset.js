const path = require('path');

const validateBoolOption = (name, value, defaultValue) => {
  if (typeof value === 'undefined') {
    value = defaultValue;
  }
  
  if (typeof value !== 'boolean') {
    throw new Error(`Preset react-app: '${name}' option must be a boolean.`);
  }
  
  return value;
};

module.exports = function (api, opts) {

  const env = process.env.BABEL_ENV || process.env.NODE_ENV;

  const isEnvDevelopment = env === 'development';
  const isEnvProduction = env === 'production';
  const isEnvTest = env === 'test';

  if (!opts) {
    opts = {};
  }

  const useESModules = validateBoolOption(
    'useESModules',
    opts.useESModules,
    isEnvDevelopment || isEnvProduction
  );

  const isTypeScriptEnabled = validateBoolOption(
    'typescript',
    opts.typescript,
    true
  );

  const areHelpersEnabled = validateBoolOption('helpers', opts.helpers, true);
  const useAbsoluteRuntime = validateBoolOption(
    'absoluteRuntime',
    opts.absoluteRuntime,
    true
  );

  let absoluteRuntimePath = void 0;

  if (useAbsoluteRuntime) {
    absoluteRuntimePath = path.dirname(
      require.resolve('@babel/runtime/package.json')
    );
  }

  return {
    'presets': [
      (isEnvProduction || isEnvDevelopment) && [
        // Latest stable ECMAScript features
        require('@babel/preset-env').default,
        {
          // Allow importing core-js in entrypoint and use browserlist to select polyfills
          'useBuiltIns': 'entry',
          // Set the corejs version we are using to avoid warnings in console
          // This will need to change once we upgrade to corejs@3
          'corejs': 3,
          // Do not transform modules to CJS
          'modules': false,
          // Exclude transforms that make all code slower
          'exclude': ['transform-typeof-symbol'],
        },
      ],
      [
        require('@babel/preset-react').default,
        {
          'debug': false,
          // Adds component stack to warning messages
          // Adds __self attribute to JSX which React will use for some warnings
          'development': isEnvDevelopment || isEnvTest,
          // Will use the native built-in instead of trying to polyfill
          // behavior for any plugins that require one.
          'useBuiltIns': true,
        },
      ],
      isTypeScriptEnabled && [require('@babel/preset-typescript').default],
    ].filter(Boolean),
    'plugins': [
      // Experimental macros support. Will be documented after it's had some time
      // in the wild.
      require('babel-plugin-macros'),
      // Necessary to include regardless of the environment because
      // in practice some other transforms (such as object-rest-spread)
      // don't work without it: https://github.com/babel/babel/issues/7215
      [
        require('@babel/plugin-transform-destructuring').default,
        {
          // Use loose mode for performance:
          // https://github.com/facebook/create-react-app/issues/5602
          'loose': false,
          'selectiveLoose': [
            'useState',
            'useEffect',
            'useContext',
            'useReducer',
            'useCallback',
            'useMemo',
            'useRef',
            'useImperativeHandle',
            'useLayoutEffect',
            'useDebugValue',
          ],
        },
      ],
      // Turn on legacy decorators for TypeScript files
      isTypeScriptEnabled && [
        require('@babel/plugin-proposal-decorators').default,
        false,
      ],
      // class { handleClick = () => { } }
      // Enable loose mode to use assignment instead of defineProperty
      // See discussion in https://github.com/facebook/create-react-app/issues/4263
      [
        require('@babel/plugin-proposal-class-properties').default,
        {
          'loose': true,
        },
      ],
      // The following two plugins use Object.assign directly, instead of Babel's
      // extends helper. Note that this assumes `Object.assign` is available.
      // { ...todo, completed: true }
      [
        require('@babel/plugin-proposal-object-rest-spread').default,
        {
          'useBuiltIns': true,
        },
      ],
      // Polyfills the runtime needed for async/await, generators, and friends
      // https://babeljs.io/docs/en/babel-plugin-transform-runtime
      [
        require('@babel/plugin-transform-runtime').default,
        {
          'corejs': false,
          'helpers': areHelpersEnabled,
          'regenerator': true,
          // https://babeljs.io/docs/en/babel-plugin-transform-runtime#useesmodules
          // We should turn this on once the lowest version of Node LTS
          // supports ES Modules.
          useESModules,
          // Undocumented option that lets us encapsulate our runtime, ensuring
          // the correct version is used
          // https://github.com/babel/babel/blob/090c364a90fe73d36a30707fc612ce037bdbbb24/packages/babel-plugin-transform-runtime/src/index.js#L35-L42
          'absoluteRuntime': absoluteRuntimePath,
        },
      ],
      isEnvProduction && [
        // Remove PropTypes from production build
        require('babel-plugin-transform-react-remove-prop-types').default,
        {
          'removeImport': true,
        },
      ],
      // Adds syntax support for import()
      require('@babel/plugin-syntax-dynamic-import').default,
      isEnvTest &&
      // Transform dynamic import to require
      require('babel-plugin-dynamic-import-node'),
    ].filter(Boolean),
    'overrides': [
      isTypeScriptEnabled && {
        'test': /\.tsx?$/,
        'plugins': [
          [
            require('@babel/plugin-proposal-decorators').default,
            {'legacy': true},
          ],
        ],
      },
    ].filter(Boolean),
  };

};