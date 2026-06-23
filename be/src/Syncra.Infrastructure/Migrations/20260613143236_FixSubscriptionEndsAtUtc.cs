using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixSubscriptionEndsAtUtc : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001001"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 14, 32, 35, 693, DateTimeKind.Utc).AddTicks(5337), new DateTime(2026, 6, 13, 14, 32, 35, 693, DateTimeKind.Utc).AddTicks(5337) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001002"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 14, 32, 35, 693, DateTimeKind.Utc).AddTicks(5337), new DateTime(2026, 6, 13, 14, 32, 35, 693, DateTimeKind.Utc).AddTicks(5337) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001003"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 14, 32, 35, 693, DateTimeKind.Utc).AddTicks(5337), new DateTime(2026, 6, 13, 14, 32, 35, 693, DateTimeKind.Utc).AddTicks(5337) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001004"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 14, 32, 35, 693, DateTimeKind.Utc).AddTicks(5337), new DateTime(2026, 6, 13, 14, 32, 35, 693, DateTimeKind.Utc).AddTicks(5337) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001005"),
                columns: new[] { "last_event_timestamp_utc", "trial_ends_at_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 14, 32, 35, 693, DateTimeKind.Utc).AddTicks(5337), new DateTime(2026, 6, 27, 14, 32, 35, 693, DateTimeKind.Utc).AddTicks(5337), new DateTime(2026, 6, 13, 14, 32, 35, 693, DateTimeKind.Utc).AddTicks(5337) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001006"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 14, 32, 35, 693, DateTimeKind.Utc).AddTicks(5337), new DateTime(2026, 6, 13, 14, 32, 35, 693, DateTimeKind.Utc).AddTicks(5337) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001001"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 14, 26, 21, 981, DateTimeKind.Utc).AddTicks(9981), new DateTime(2026, 6, 13, 14, 26, 21, 981, DateTimeKind.Utc).AddTicks(9981) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001002"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 14, 26, 21, 981, DateTimeKind.Utc).AddTicks(9981), new DateTime(2026, 6, 13, 14, 26, 21, 981, DateTimeKind.Utc).AddTicks(9981) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001003"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 14, 26, 21, 981, DateTimeKind.Utc).AddTicks(9981), new DateTime(2026, 6, 13, 14, 26, 21, 981, DateTimeKind.Utc).AddTicks(9981) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001004"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 14, 26, 21, 981, DateTimeKind.Utc).AddTicks(9981), new DateTime(2026, 6, 13, 14, 26, 21, 981, DateTimeKind.Utc).AddTicks(9981) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001005"),
                columns: new[] { "last_event_timestamp_utc", "trial_ends_at_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 14, 26, 21, 981, DateTimeKind.Utc).AddTicks(9981), new DateTime(2026, 6, 27, 14, 26, 21, 981, DateTimeKind.Utc).AddTicks(9981), new DateTime(2026, 6, 13, 14, 26, 21, 981, DateTimeKind.Utc).AddTicks(9981) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001006"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 14, 26, 21, 981, DateTimeKind.Utc).AddTicks(9981), new DateTime(2026, 6, 13, 14, 26, 21, 981, DateTimeKind.Utc).AddTicks(9981) });
        }
    }
}
