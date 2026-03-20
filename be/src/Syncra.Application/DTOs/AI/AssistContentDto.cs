using System.ComponentModel.DataAnnotations;

namespace Syncra.Application.DTOs.AI;

public sealed class AssistContentRequestDto
{
    [Required]
    [MaxLength(10000)]
    public string Content { get; set; } = string.Empty;

    // write-more | rephrase | shorten | expand | custom
    [Required]
    [MaxLength(50)]
    public string Action { get; set; } = "custom";

    // For "custom" action: the user's free-form instruction
    [MaxLength(500)]
    public string? Instruction { get; set; }

    [MaxLength(200)]
    public string? Title { get; set; }
}

public sealed class AssistContentResponseDto
{
    public string Result { get; set; } = string.Empty;
}
