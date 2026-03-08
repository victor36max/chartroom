import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/", "dist/", "src/bundle/"] },
  tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: false,
      },
    },
  },
);
