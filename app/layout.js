import "./globals.css";

export const metadata = {
  title: "Movie Night",
  description: "Rate movies with your friends, 1 to 5.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
