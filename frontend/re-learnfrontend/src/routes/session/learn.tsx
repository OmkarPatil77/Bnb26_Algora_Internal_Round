import { createFileRoute } from "@tanstack/react-router";
import { LearnScreen } from "@/components/screens";
export const Route = createFileRoute("/session/learn")({
  component: LearnScreen,
  head: () => ({
    meta: [
      { title: "See how Python lists work — Re:Learn" },
      {
        name: "description",
        content: "Trace Python code line by line and see how two names can share one list.",
      },
      { property: "og:title", content: "See how Python lists work — Re:Learn" },
      {
        property: "og:description",
        content: "Follow a calm, visual explanation of Python list references.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
