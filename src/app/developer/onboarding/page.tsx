import { LeadGenerationEngine } from "@/components/onboarding/lead-generation-engine";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DeveloperOnboardingEnginePage() {
  await requireRole("DEVELOPER");
  return <LeadGenerationEngine />;
}
