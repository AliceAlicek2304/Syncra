import os

path = r"d:\Code\Syncra\be\src\Syncra.Infrastructure\Services\ZernioClient.cs"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

target = """            var items = (response.Messages ?? [])
                .Select(m => new ZernioInboxMessageItemDto(
                    m.Id,
                    m.Message,
                    m.Direction?.ToString(),
                    m.CreatedAt,
                    null,
                    m.ReadAt != default))
                .ToList();"""

replacement = """            var items = (response.Messages ?? [])
                .Select(m => new ZernioInboxMessageItemDto(
                    m.Id,
                    m.Message,
                    m.Direction?.ToString(),
                    m.CreatedAt,
                    null,
                    m.ReadAt != default,
                    m.Attachments?.Select(a => new ZernioMessageAttachmentDto(
                        a.Id ?? string.Empty,
                        a.Type?.ToString() ?? string.Empty,
                        a.Url ?? string.Empty,
                        a.Filename,
                        a.PreviewUrl
                    )).ToList()
                ))
                .ToList();"""

if target in content:
    content = content.Replace(target, replacement) if hasattr(content, "Replace") else content.replace(target, replacement)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Replacement successful!")
else:
    # Try with CRLF / LF line endings normalize
    target_lf = target.replace("\r\n", "\n")
    content_lf = content.replace("\r\n", "\n")
    if target_lf in content_lf:
        content_lf = content_lf.replace(target_lf, replacement.replace("\r\n", "\n"))
        # Write back with original endings
        with open(path, "w", encoding="utf-8", newline="\r\n") as f:
            f.write(content_lf)
        print("Replacement successful (LF normalized)!")
    else:
        print("Target string not found in file!")
