import { getTransactions } from "@/lib/data";
import { ActivityView } from "./activity-view";

export default async function ActivityPage() {
  const transactions = await getTransactions();
  return <ActivityView transactions={transactions} />;
}
