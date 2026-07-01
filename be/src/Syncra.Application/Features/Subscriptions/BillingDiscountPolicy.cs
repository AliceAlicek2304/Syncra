using Syncra.Application.DTOs.Payments;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;

namespace Syncra.Application.Features.Subscriptions;

public static class BillingDiscountPolicy
{
    public const string StudentDiscountCode = "STUDENT50";
    private const decimal StudentPercentOff = 50m;

    public static PaymentDiscount? Resolve(string planCode, string? discountCode, User? user)
    {
        if (string.IsNullOrWhiteSpace(discountCode))
        {
            return null;
        }

        if (!string.Equals(discountCode.Trim(), StudentDiscountCode, StringComparison.OrdinalIgnoreCase))
        {
            throw new DomainException("invalid_discount_code", "Discount code is not valid.");
        }

        if (!IsStudentDiscountEligiblePlan(planCode))
        {
            throw new DomainException(
                "discount_not_applicable",
                "Student discount can only be applied to Basic or Max plans.");
        }

        if (user?.HasValidStudentVerification != true)
        {
            throw new DomainException(
                "student_verification_required",
                "Please verify your student email before using the student discount.");
        }

        return new PaymentDiscount(
            Code: StudentDiscountCode,
            Label: "Student discount",
            PercentOff: StudentPercentOff,
            Source: "student_verification");
    }

    public static bool IsStudentDiscountEligiblePlan(string planCode)
    {
        return string.Equals(planCode, "BASIC", StringComparison.OrdinalIgnoreCase)
            || string.Equals(planCode, "MAX", StringComparison.OrdinalIgnoreCase);
    }
}
