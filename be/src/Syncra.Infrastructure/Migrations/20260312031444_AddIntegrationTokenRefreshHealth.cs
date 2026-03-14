using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIntegrationTokenRefreshHealth : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "token_refresh_health_status",
                table: "integrations",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "token_refresh_last_attempt_at_utc",
                table: "integrations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "token_refresh_last_error",
                table: "integrations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "token_refresh_last_success_at_utc",
                table: "integrations",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "token_refresh_health_status",
                table: "integrations");

            migrationBuilder.DropColumn(
                name: "token_refresh_last_attempt_at_utc",
                table: "integrations");

            migrationBuilder.DropColumn(
                name: "token_refresh_last_error",
                table: "integrations");

            migrationBuilder.DropColumn(
                name: "token_refresh_last_success_at_utc",
                table: "integrations");
        }
    }
}
