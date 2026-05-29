using Rydo.Api.Domain;

namespace Rydo.Api.Contracts;

public sealed record CreatePaymentRequest(Guid TripId, PaymentMethod Method, decimal Amount);
public sealed record PaymentResponse(Guid PaymentId, Guid TripId, PaymentMethod Method, PaymentStatus Status, decimal Amount, string Currency);
