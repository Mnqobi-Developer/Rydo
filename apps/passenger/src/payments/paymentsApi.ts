import { apiUrl, type PaymentMethod } from '../trips/tripsApi';

export type PaymentResponse = {
  paymentId: string;
  tripId: string;
  method: PaymentMethod;
  status: number;
  amount: number;
  currency: string;
};

export async function createPayment({
  accessToken,
  tripId,
  method,
  amount,
}: {
  accessToken: string;
  tripId: string;
  method: PaymentMethod;
  amount: number;
}) {
  const response = await fetch(`${apiUrl}/api/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ tripId, method, amount }),
  });

  if (!response.ok) {
    const problem = await response.text();
    throw new Error(problem || `Payment failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<PaymentResponse>;
}
