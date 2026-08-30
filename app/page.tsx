import fixture from "@/data/P10_prepaid_meter_public.json";
import { MeterDashboard } from "@/components/meter-dashboard";
import type { Fixture } from "@/lib/types";

export default function Home() {
  return <MeterDashboard fixture={fixture as Fixture} />;
}
