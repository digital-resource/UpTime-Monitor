import { WebsiteDetail } from "@/components/websites/WebsiteDetail";

export default function WebsiteDetailPage({ params }: { params: { id: string } }) {
  return <WebsiteDetail websiteId={params.id} />;
}
