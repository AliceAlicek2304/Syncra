using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Phase06_WebhookReliability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "last_event_timestamp_utc",
                table: "subscriptions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "last_event_timestamp_utc",
                table: "plans",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "attempt_count",
                table: "idempotency_records",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "last_error",
                table: "idempotency_records",
                type: "jsonb",
                nullable: true);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "last_event_timestamp_utc",
                table: "subscriptions");

            migrationBuilder.DropColumn(
                name: "last_event_timestamp_utc",
                table: "plans");

            migrationBuilder.DropColumn(
                name: "attempt_count",
                table: "idempotency_records");

            migrationBuilder.DropColumn(
                name: "last_error",
                table: "idempotency_records");
        }
    }
}
