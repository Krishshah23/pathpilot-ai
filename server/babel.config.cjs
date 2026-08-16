// Test-only Babel config: transpiles ESM -> CJS so Jest's standard mocking
// (jest.mock, hoisting) works normally. The app itself runs as native ESM
// ("type": "module" in package.json) via Node directly — this config is
// never used outside the Jest test run.
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
};
