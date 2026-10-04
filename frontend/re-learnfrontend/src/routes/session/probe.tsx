import { createFileRoute } from "@tanstack/react-router";
import { ProbeScreen } from "@/components/screens";
export const Route = createFileRoute("/session/probe")({
  component: ProbeScreen,
  head: () => ({
    meta: [
      { title: "One more Python question — Re:Learn" },
      {
        name: "description",
        content: "Try a small follow-up Python question to sharpen your understanding.",
      },
      { property: "og:title", content: "One more Python question — Re:Learn" },
      {
        property: "og:description",
        content: "One more low-pressure check to help clarify the idea.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
