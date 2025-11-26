import { redirect } from "next/navigation";
import { getAvailableProviders } from "@/lib/providers";

export const dynamic = "force-dynamic";

export default async function Home() {
  const providers = await getAvailableProviders();

  // Find first available provider, default to claude
  const defaultProvider = providers.find((p) => p.available)?.id || "claude";

  redirect(`/${defaultProvider}`);
}
