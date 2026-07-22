import { redirect } from "next/navigation";
import { isHiddenProductEnabled } from "../lib/products/access";

export default function MedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isHiddenProductEnabled("med")) {
    redirect("/coming-soon");
  }

  return <div data-theme="medical">{children}</div>;
}
