/**
 * Page racine — Redirect vers /vs (Dashboard)
 * Rendu : statique
 */

import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/vs");
}
