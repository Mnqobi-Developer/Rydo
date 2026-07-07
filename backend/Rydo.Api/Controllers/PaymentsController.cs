using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Contracts;
using Rydo.Api.Data;
using Rydo.Api.Domain;

namespace Rydo.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/payments")]
public sealed class PaymentsController(RydoDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<PaymentResponse>> Create(CreatePaymentRequest request, CancellationToken cancellationToken)
    {
        var trip = await db.Trips.FindAsync([request.TripId], cancellationToken);
        if (trip is null)
        {
            return NotFound(new { error = "Trip not found." });
        }

        var existingPayment = await db.Payments.FirstOrDefaultAsync(x => x.TripId == request.TripId, cancellationToken);
        var status = ResolvePaymentStatus(trip, request.Method);
        DateTimeOffset? paidAt = status == PaymentStatus.Paid ? DateTimeOffset.UtcNow : null;
        if (existingPayment is not null)
        {
            existingPayment.Method = request.Method;
            existingPayment.Amount = request.Amount;
            existingPayment.Status = status;
            existingPayment.PaidAtUtc = paidAt ?? existingPayment.PaidAtUtc;
            await db.SaveChangesAsync(cancellationToken);
            return Ok(ToResponse(existingPayment));
        }

        var payment = new Payment
        {
            TripId = request.TripId,
            Method = request.Method,
            Amount = request.Amount,
            Status = status,
            PaidAtUtc = paidAt
        };

        db.Payments.Add(payment);
        await db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(Get), new { paymentId = payment.Id }, ToResponse(payment));
    }

    [HttpGet("{paymentId:guid}")]
    public async Task<ActionResult<PaymentResponse>> Get(Guid paymentId, CancellationToken cancellationToken)
    {
        var payment = await db.Payments.FindAsync([paymentId], cancellationToken);
        return payment is null ? NotFound() : Ok(ToResponse(payment));
    }

    private static PaymentResponse ToResponse(Payment payment)
    {
        return new PaymentResponse(payment.Id, payment.TripId, payment.Method, payment.Status, payment.Amount, payment.Currency);
    }

    private static PaymentStatus ResolvePaymentStatus(Trip trip, PaymentMethod method)
    {
        return method switch
        {
            PaymentMethod.Card => PaymentStatus.Paid,
            PaymentMethod.Cash when trip.Status == TripStatus.Completed => PaymentStatus.Paid,
            _ => PaymentStatus.Pending
        };
    }
}
