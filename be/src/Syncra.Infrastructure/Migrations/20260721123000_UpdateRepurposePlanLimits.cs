using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Syncra.Infrastructure.Persistence;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260721123000_UpdateRepurposePlanLimits")]
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
