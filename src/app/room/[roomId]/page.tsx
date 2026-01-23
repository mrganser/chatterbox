import { VideoRoom } from '@/components/room/VideoRoom';

interface PageProps {
  params: Promise<{ roomId: string }>;
}

export default async function RoomPage({ params }: PageProps) {
  const { roomId } = await params;
  return <VideoRoom roomId={roomId} />;
}
