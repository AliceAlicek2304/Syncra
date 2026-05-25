using System.ComponentModel.DataAnnotations;

namespace Syncra.Application.DTOs;

public record CreateWorkspaceDto(
    [Required, MaxLength(200)] string Name,
    [MaxLength(50)] string? Color = null,
    [MaxLength(500)] string? Description = null
);
