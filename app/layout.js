import "./globals.css";

export const metadata = {
  title: "GEO Performance Report",
  description: "Generative Engine Optimization Dashboard",
  robots: {
    index: false,
    follow: false,
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noindex, nofollow, noarchive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
