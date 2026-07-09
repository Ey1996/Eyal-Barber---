export const metadata = {
  title: "בארבר שופ — קביעת תורים",
  description: "קביעת תורים אונליין למספרה",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#0B0A0D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body style={{ margin: 0, background: "#0B0A0D" }}>{children}</body>
    </html>
  );
}
