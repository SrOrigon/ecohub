import { redirect } from "next/navigation";

/** Atalho legado → hub de login demo. */
export default function DemoShortcutPage() {
  redirect("/login/demo");
}
