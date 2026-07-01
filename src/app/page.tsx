import { getTrials } from "@/lib/trials";
import { AppShell } from "@/components/app-shell";

export default function HomePage() {
  const trials = getTrials();
  return (
    <div className="app-viewport flex min-h-0 flex-1 flex-col overflow-hidden">
      <AppShell initialTrials={trials} />
    </div>
  );
}
