import { createFileRoute } from "@tanstack/react-router";
import { WireframeApp, screenHead } from "@/features/wireframes/WireframeApp";
export const Route = createFileRoute("/")({
  head: () => screenHead("Exploración de proveedores"),
  component: Index,
});
function Index() {
  return <WireframeApp screen="ExploracinDeProveedores" />;
}
