namespace Syncra.Domain.Exceptions;

public sealed class ValidationException : DomainException
{
    public IReadOnlyList<ValidationError> Errors { get; }

    public ValidationException(string code, string message) : base(code, message)
    {
        Errors = [];
    }

    public ValidationException(string code, string message, IEnumerable<ValidationError> errors) : base(code, message)
    {
        Errors = errors.ToList().AsReadOnly();
    }
}

public sealed class ValidationError
{
    public string Property { get; }
    public string Message { get; }

    public ValidationError(string property, string message)
    {
        Property = property;
        Message = message;
    }
}