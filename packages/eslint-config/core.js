module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "plugin:react-hooks/recommended",
    "plugin:react/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: require("path").resolve(process.cwd(), "tsconfig.json"),
  },
  plugins: ["@typescript-eslint", "prettier", "react"],
  rules: {
    "@typescript-eslint/no-unused-vars": "warn",
    "prettier/prettier": "warn",
    "react/react-in-jsx-scope": "off",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
