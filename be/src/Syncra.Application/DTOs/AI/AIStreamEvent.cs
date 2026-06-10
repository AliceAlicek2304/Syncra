namespace Syncra.Application.DTOs.AI;

public abstract record AIStreamEvent;

public sealed record TokenEvent(string Text) : AIStreamEvent;

public sealed record CompleteEvent(string FullOutput, int PromptTokens, int CompletionTokens) : AIStreamEvent;

public sealed record ErrorEvent(string Code, string Message) : AIStreamEvent;
