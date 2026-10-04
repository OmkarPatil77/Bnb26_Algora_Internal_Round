import { createFileRoute } from "@tanstack/react-router";
import { ReassessScreen } from "@/components/screens";
export const Route = createFileRoute("/session/reassess")({
  component: ReassessScreen,
  head: () => ({
    meta: [
      { title: "Check what clicked — Re:Learn" },
      {
        name: "description",
        content: "Try three fresh Python examples to see how your understanding transfers.",
      },
      { property: "og:title", content: "Check what clicked — Re:Learn" },
      {
        property: "og:description",
        content: "Friendly transfer practice for your new Python understanding.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
