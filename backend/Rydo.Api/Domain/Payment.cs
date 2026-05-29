namespace Rydo.Api.Domain;

public sealed class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public PaymentMethod Method { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "ZAR";
    public string? ProviderReference { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? PaidAtUtc { get; set; }
}

public enum PaymentMethod
{
    Cash = 1,
    Card = 2,
    Eft = 3,
    Wallet = 4,
    Ozow = 5,
    SnapScan = 6,
    Yoco = 7,
    ApplePay = 8,
    GooglePay = 9
}

public enum PaymentStatus
{
    Pending = 1,
    Paid = 2,
    Failed = 3,
    Refunded = 4
}
