// Scalar's stylesheet is imported in this layout so it's only loaded when
// visiting /docs. The component fetches this internally, but Next's bundler
// drops the side-effect import in "use client" components — colocating it
// in a server layout ensures it survives the build.
import "@scalar/api-reference-react/style.css";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
