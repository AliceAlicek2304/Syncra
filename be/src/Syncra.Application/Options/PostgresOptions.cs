namespace Syncra.Application.Options;

public class PostgresOptions
{
    public const string SectionName = "Postgres";
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 5432;
    public string Database { get; set; } = "syncra_dev";
    public string Username { get; set; } = "postgres";
    public string Password { get; set; } = string.Empty;
    public bool UseSsl { get; set; } = true;

    public string ConnectionString
    {
        get
        {
            var sslPart = UseSsl ? ";SSL Mode=Require;Trust Server Certificate=true" : "";
            return $"Host={Host};Port={Port};Database={Database};Username={Username};Password={Password}{sslPart}";
        }
    }
}
