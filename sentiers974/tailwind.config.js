/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")], // ⟵ ajout obligatoire
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: { extend: {} },
  plugins: [],
};
