import { redirect } from "next/navigation";
import { isHiddenProductEnabled } from "../lib/products/access";

export default function TeamsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isHiddenProductEnabled("teams")) {
    redirect("/coming-soon");
  }

  return <div data-theme="teams">{children}</div>;
}
