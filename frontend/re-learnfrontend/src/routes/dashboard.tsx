import { createFileRoute } from "@tanstack/react-router";
import { DashboardScreen } from "@/components/screens";
export const Route = createFileRoute("/dashboard")({
  component: DashboardScreen,
  head: () => ({
    meta: [
      { title: "Your learning journey — Re:Learn" },
      {
        name: "description",
        content: "Review your Python learning progress, ideas, and misconceptions.",
      },
      { property: "og:title", content: "Your learning journey — Re:Learn" },
      {
        property: "og:description",
        content: "A thoughtful overview of the Python ideas you are exploring.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
