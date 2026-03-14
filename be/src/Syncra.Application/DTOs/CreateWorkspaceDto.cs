using System.ComponentModel.DataAnnotations;

namespace Syncra.Application.DTOs;

public record CreateWorkspaceDto(
    [Required, MaxLength(200)] string Name
);
