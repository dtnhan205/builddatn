import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pure Botanica",
  description: "Pure Botanica - Nơi cung cấp các sản phẩm thiên nhiên chất lượng cao",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
