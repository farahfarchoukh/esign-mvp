import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#2980B9",
          bluedark: "#1F6391",
          orange: "#F89406",
          orangedark: "#D97E05",
        },
      },
    },
  },
  plugins: [],
};

export default config;
