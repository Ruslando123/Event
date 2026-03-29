import { cookies } from "next/headers";
import {
  STUDIO_SESSION_COOKIE,
  parseStudioSessionToken,
} from "@/lib/studio-session";

export async function isStudioAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return parseStudioSessionToken(jar.get(STUDIO_SESSION_COOKIE)?.value);
}
