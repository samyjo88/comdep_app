import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Optimistic UI pattern: sync local state with incoming props after
      // a server revalidation. setState inside a guarded useEffect is
      // intentional here and does NOT cause infinite loops.
      "react-hooks/set-state-in-effect": "warn",

      // react-hook-form's watch() is intentionally not memoizable;
      // suppress the incompatible-library noise for RHF usages.
      "react-hooks/incompatible-library": "warn",
    },
  },
]);

export default eslintConfig;
