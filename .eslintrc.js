module.exports = {
  root: true,
  extends: ["plugin:@typescript-eslint/recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  env: {
    browser: false,
    es2022: true,
    node: true,
    mocha: true,
  },
};
