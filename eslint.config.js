const tseslint = require("@typescript-eslint/eslint-plugin");
const react = require("eslint-plugin-react");

module.exports = [
  {
    ignores: [".backups/**", "dist/**", "out/**", "node_modules/**"],
  },
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  ...tseslint.configs["flat/recommended"],
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  {
    files: ["**/*.{ts,tsx,js,jsx,cjs}"],
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/ban-ts-comment": "warn",
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
];
