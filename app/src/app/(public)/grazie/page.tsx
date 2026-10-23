import { DEFAULT_CALLBACK_PHONE, getRepository } from "@/lib/data";
import GrazieClient from "./GrazieClient";

// Read the admin-configured callback number on every request, never from a static cache.
export const dynamic = "force-dynamic";

/** Resolves the callback number for the thank-you sentence; never throws. */
async function loadCallbackPhone(): Promise<string> {
  try {
    const phone = await getRepository().getCallbackPhone();
    return phone.trim() !== "" ? phone : DEFAULT_CALLBACK_PHONE;
  } catch {
    return DEFAULT_CALLBACK_PHONE;
  }
}

export default async function GraziePage() {
  const callbackPhone = await loadCallbackPhone();
  return <GrazieClient callbackPhone={callbackPhone} />;
}
