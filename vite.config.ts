import { defineConfig } from "vite";

/**
 * No GitHub Pages o site mora em /<repositório>/, então o workflow define BASE_PATH.
 * Em desenvolvimento e builds locais a base continua "/".
 */
export default defineConfig({
  base: process.env.BASE_PATH ?? "/"
});
