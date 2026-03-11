namespace Syncra.Application.Options;

public class RedisOptions
{
    public const string SectionName = "Redis";
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 6379;
    public string Password { get; set; } = string.Empty;
    public int Database { get; set; } = 0;

    public string ConnectionString =>
        string.IsNullOrEmpty(Password)
            ? $"{Host}:{Port}"
            : $"{Host}:{Port},password={Password},db={Database}";
}
