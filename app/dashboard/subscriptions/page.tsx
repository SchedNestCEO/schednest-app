import { redirect } from "next/navigation";

export default function DashboardSubscriptionsRedirectPage() {
  redirect("/admin/subscriptions");
}
