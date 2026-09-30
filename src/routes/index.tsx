import { createFileRoute } from "@tanstack/react-router";
import { PulseframeApp } from "@/components/visualizer/pulseframe-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <PulseframeApp />;
}
