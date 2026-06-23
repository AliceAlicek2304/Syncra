namespace Syncra.Application.Features.Students;

internal static class StudentEmailPolicy
{
    public static bool IsEligibleStudentEmail(string email)
    {
        var atIndex = email.LastIndexOf('@');
        if (atIndex < 0 || atIndex == email.Length - 1)
        {
            return false;
        }

        var domain = email[(atIndex + 1)..].Trim().ToLowerInvariant();
        return domain.EndsWith(".edu", StringComparison.OrdinalIgnoreCase) ||
               domain.EndsWith(".edu.vn", StringComparison.OrdinalIgnoreCase);
    }
}
