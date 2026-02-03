/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#0F172A', // Slate 900
                accent: '#3B82F6', // Blue 500
            }
        },
    },
    plugins: [],
}
