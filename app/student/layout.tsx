import { redirect } from "next/navigation";
import { isHiddenProductEnabled } from "../lib/products/access";

export default function StudentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isHiddenProductEnabled("student")) {
    redirect("/coming-soon");
  }

  return <div data-theme="student">{children}</div>;
}
