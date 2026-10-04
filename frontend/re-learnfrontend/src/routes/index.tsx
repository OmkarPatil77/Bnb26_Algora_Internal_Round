import { createFileRoute } from "@tanstack/react-router";
import { HomeScreen } from "@/components/screens";
export const Route = createFileRoute("/")({
  component: HomeScreen,
  head: () => ({
    meta: [
      { title: "Re:Learn — A kinder way to learn Python" },
      {
        name: "description",
        content:
          "Understand the thinking behind Python mistakes with gentle, personalized practice.",
      },
      { property: "og:title", content: "Re:Learn — A kinder way to learn Python" },
      {
        property: "og:description",
        content: "A thoughtful Python learning journey that helps ideas click.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
