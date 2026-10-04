import { createFileRoute } from "@tanstack/react-router";
import { EvaluationScreen } from "@/components/screens";
export const Route = createFileRoute("/evaluation")({
  component: EvaluationScreen,
  head: () => ({
    meta: [
      { title: "Python assessment evaluation — Re:Learn" },
      {
        name: "description",
        content: "Review model accuracy, misconception F1, confusion patterns, and probe uplift.",
      },
      { property: "og:title", content: "Python assessment evaluation — Re:Learn" },
      {
        property: "og:description",
        content: "A warm, clear evaluation view for the Python learning assessment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
