using System.ComponentModel.DataAnnotations;

namespace Syncra.Application.DTOs.Ideas;

public record CreateIdeaDto(
    [Required][StringLength(200)] string Title,
    [StringLength(2000)] string? Description,
    [StringLength(50)] string Status = "unassigned"
);