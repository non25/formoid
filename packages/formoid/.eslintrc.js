module.exports = {
  extends: ["formoid/core"],
  ignorePatterns: [".eslintrc.js", "lib/*", "tsup.config.ts", "vitest.config.ts"],
  root: true,
  rules: {
    "@typescript-eslint/no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["./test-utils"],
            message: "Importing test utilities is only permitted within test files.",
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ["src/**/*.test.ts"],
      rules: {
        "@typescript-eslint/no-restricted-imports": "off",
      },
    },
  ],
};
