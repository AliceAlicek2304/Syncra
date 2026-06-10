using Syncra.Application.DTOs.Repurpose;

namespace Syncra.Application.Interfaces;

public sealed record PromptComponents(
    string SystemPrompt,
    string UserPrompt);

public interface IPromptEngineeringService
{
    PromptComponents BuildPrompt(RepurposeRequest request);
}
