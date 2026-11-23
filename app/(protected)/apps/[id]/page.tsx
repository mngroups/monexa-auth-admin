import { AppDetailPage } from "@/features/apps/components/app-detail-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppDetailPage id={id} />;
}
