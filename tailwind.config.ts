import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        mist: "#eef3f0",
        line: "#d8e1dc",
        action: "#0f766e",
        warn: "#b45309",
        danger: "#b42318"
      }
    }
  },
  plugins: []
};

export default config;
