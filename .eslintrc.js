module.exports = {
  extends: ["plugin:prettier/recommended"],
  plugins: ["prettier"],
  root: true,
  rules: {
    "prettier/prettier": "warn",
  },
  overrides: [
    {
      files: ["*.js"],
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: "module",
      },
    },
    {
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:react-hooks/recommended",
        "plugin:react/recommended",
      ],
      files: ["./**/*.ts*"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: ["./tsconfig.json"],
      },
      plugins: ["@typescript-eslint", "react"],
      rules: {
        "react/react-in-jsx-scope": "off",
      },
      settings: {
        react: {
          version: "detect",
        },
      },
    },
  ],
};
