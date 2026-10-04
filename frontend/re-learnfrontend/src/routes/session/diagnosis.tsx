import { createFileRoute } from "@tanstack/react-router";
import { DiagnosisScreen } from "@/components/screens";
export const Route = createFileRoute("/session/diagnosis")({
  component: DiagnosisScreen,
  head: () => ({
    meta: [
      { title: "Your Python learning clues — Re:Learn" },
      {
        name: "description",
        content: "Explore a gentle, evidence-based guess about a Python misconception.",
      },
      { property: "og:title", content: "Your Python learning clues — Re:Learn" },
      {
        property: "og:description",
        content: "See what your answer can tell you about how Python works.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
