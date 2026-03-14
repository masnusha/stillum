import { redirect } from "next/navigation";

// next-auth redirects here after sending a magic link.
// We redirect back to /login which handles the "sent" state,
// but in practice the user arrives here from their email client,
// so we send them to the dashboard (next-auth handles token exchange).
export default function CheckEmailPage() {
  redirect("/login");
}
