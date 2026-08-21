import { Space_Mono, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-display",
});

const body = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-body",
});

export const metadata = {
  title: "·",
  description: "",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${display.variable} ${body.variable}`}>
        <div className="noise" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
