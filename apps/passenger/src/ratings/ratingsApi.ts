import { apiUrl } from '../trips/tripsApi';

export async function createRating({
  accessToken,
  tripId,
  fromUserId,
  toUserId,
  stars,
  tags,
  comment,
}: {
  accessToken: string;
  tripId: string;
  fromUserId: string;
  toUserId: string;
  stars: number;
  tags: string[];
  comment?: string;
}) {
  const response = await fetch(`${apiUrl}/api/ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ tripId, fromUserId, toUserId, stars, tags, comment }),
  });

  if (!response.ok) {
    const problem = await response.text();
    throw new Error(problem || `Rating failed with HTTP ${response.status}`);
  }
}
