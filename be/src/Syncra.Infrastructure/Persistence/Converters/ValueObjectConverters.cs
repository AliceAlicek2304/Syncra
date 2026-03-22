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

    // ScheduledTime converter - uses DateTime.MinValue to represent "None"
    // This avoids null issues with EF Core value conversion
    public static readonly ValueConverter<ScheduledTime, DateTime> ScheduledTimeConverter = new(
        v => v.IsNone ? DateTime.MinValue : v.UtcValue,
        v => v == DateTime.MinValue ? ScheduledTime.None : ScheduledTime.Create(v));
}