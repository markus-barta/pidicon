/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    env: { es2022: true, node: true },
    parserOptions: { ecmaVersion: "latest", sourceType: "script" },
    extends: [
      "eslint:recommended",
      "plugin:import/recommended",
      "plugin:promise/recommended"
    ],
    plugins: ["import", "promise"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "complexity": ["error", 10],
      "max-params": ["error", 5],
      "max-lines-per-function": [
        "error",
        { "max": 80, "skipBlankLines": true, "skipComments": true }
      ],
      "import/order": [
        "error",
        {
          "newlines-between": "always",
          "alphabetize": { "order": "asc", "caseInsensitive": true },
          "groups": [["builtin", "external"], ["internal"], ["parent", "sibling", "index"]]
        }
      ]
    }
  };