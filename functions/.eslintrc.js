module.exports = {
  env: {
    es6: true,
    node: true, // ✅ 關鍵：告訴 ESLint 這是 Node.js 環境
  },
  parserOptions: {
    "ecmaVersion": 2018, // 支援較新的語法
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
    "max-len": "off", // 關閉行長限制，避免程式碼太長報錯
    "indent": "off",  // 關閉縮排檢查，避免因為縮排報錯
    "object-curly-spacing": "off",
    "comma-dangle": "off",
    "require-jsdoc": "off", // 關閉 JSDoc 強制要求
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};