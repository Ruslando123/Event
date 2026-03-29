import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EventGallery } from "@/components/EventGallery";

export const dynamic = "force-dynamic";

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  return <EventGallery eventSlug={slug} eventTitle={event.title} />;
}
