import { redirect } from "next/navigation";

export const metadata = {
  title: "Inventory Categories | ServStack",
};

/** @deprecated Use /dashboard/categories?tab=inventory */
export default function InventoryCategoriesPage() {
  redirect("/dashboard/categories?tab=inventory");
}
