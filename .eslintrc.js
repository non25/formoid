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
        "@typescript-eslint/no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["./pipe"],
                // eslint-disable-next-line prettier/prettier
                message: "The `pipe` function should only be imported in test files because it will not be included in the final bundle.",
              },
            ],
          },
        ],
      },
      settings: {
        react: {
          version: "detect",
        },
      },
    },
  ],
};
