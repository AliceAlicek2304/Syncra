using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    public partial class UpdateRepurposePlanLimits : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE plans
                SET "MaxRepurposeGenerationsPerMonth" = CASE code
                    WHEN 'BASIC' THEN 15
                    WHEN 'PRO' THEN 50
                    WHEN 'MAX' THEN 200
                    ELSE "MaxRepurposeGenerationsPerMonth"
                END,
                    updated_at_utc = NOW() AT TIME ZONE 'UTC'
                WHERE code IN ('BASIC', 'PRO', 'MAX');
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE plans
                SET "MaxRepurposeGenerationsPerMonth" = 15,
                    updated_at_utc = NOW() AT TIME ZONE 'UTC'
                WHERE code IN ('BASIC', 'PRO', 'MAX');
                """);
        }
    }
}
