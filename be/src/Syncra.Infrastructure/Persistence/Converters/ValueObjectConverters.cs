using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Syncra.Domain.ValueObjects;

namespace Syncra.Infrastructure.Persistence.Converters;

public static class ValueObjectConverters
{
    // PostTitle converter
    public static readonly ValueConverter<PostTitle, string> PostTitleConverter = new(
        v => v.Value,
        v => PostTitle.Create(v));

    // PostContent converter
    public static readonly ValueConverter<PostContent, string> PostContentConverter = new(
        v => v.Value,
        v => PostContent.Create(v));

    // Email converter
    public static readonly ValueConverter<Email, string> EmailConverter = new(
        v => v.Value,
        v => Email.Create(v));

    // WorkspaceName converter
    public static readonly ValueConverter<WorkspaceName, string> WorkspaceNameConverter = new(
        v => v.Value,
        v => WorkspaceName.Create(v));

    // WorkspaceSlug converter
    public static readonly ValueConverter<WorkspaceSlug, string> WorkspaceSlugConverter = new(
        v => v.Value,
        v => WorkspaceSlug.Create(v));

    // ScheduledTime converter - handles null for "None"
    public static readonly ValueConverter<ScheduledTime, DateTime?> ScheduledTimeConverter = new(
        v => v.IsNone ? null : v.UtcValue,
        v => v.HasValue ? ScheduledTime.Create(v) : ScheduledTime.None);
}