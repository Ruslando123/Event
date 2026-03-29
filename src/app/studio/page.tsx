import { cookies } from "next/headers";
import {
  STUDIO_SESSION_COOKIE,
  parseStudioSessionToken,
} from "@/lib/studio-session";
import { StudioClient } from "./StudioClient";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const jar = await cookies();
  const initialAuthed = parseStudioSessionToken(
    jar.get(STUDIO_SESSION_COOKIE)?.value,
  );

  return <StudioClient initialAuthed={initialAuthed} />;
}
