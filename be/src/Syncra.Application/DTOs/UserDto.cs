namespace Syncra.Application.DTOs;

public record UserDto(Guid Id, string Email, bool HasPasswordBeenSet);
