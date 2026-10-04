import { createFileRoute } from "@tanstack/react-router";
import { QuestionScreen } from "@/components/screens";
export const Route = createFileRoute("/session/question")({
  component: QuestionScreen,
  head: () => ({
    meta: [
      { title: "Practice Python — Re:Learn" },
      {
        name: "description",
        content: "Try a Python question, share your thinking, and learn at your own pace.",
      },
      { property: "og:title", content: "Practice Python — Re:Learn" },
      { property: "og:description", content: "A kind, curiosity-first Python practice question." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
