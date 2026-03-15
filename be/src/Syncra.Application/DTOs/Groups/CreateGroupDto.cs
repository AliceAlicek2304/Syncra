using System.ComponentModel.DataAnnotations;

namespace Syncra.Application.DTOs.Groups;

public record CreateGroupDto(
    [Required]
    [StringLength(50, MinimumLength = 1)]
    string Name
);
