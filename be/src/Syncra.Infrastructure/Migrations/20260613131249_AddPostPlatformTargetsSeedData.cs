using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPostPlatformTargetsSeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001001"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 13, 12, 48, 759, DateTimeKind.Utc).AddTicks(1375), new DateTime(2026, 6, 13, 13, 12, 48, 759, DateTimeKind.Utc).AddTicks(1375) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001002"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 13, 12, 48, 759, DateTimeKind.Utc).AddTicks(1375), new DateTime(2026, 6, 13, 13, 12, 48, 759, DateTimeKind.Utc).AddTicks(1375) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001003"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 13, 12, 48, 759, DateTimeKind.Utc).AddTicks(1375), new DateTime(2026, 6, 13, 13, 12, 48, 759, DateTimeKind.Utc).AddTicks(1375) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001004"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 13, 12, 48, 759, DateTimeKind.Utc).AddTicks(1375), new DateTime(2026, 6, 13, 13, 12, 48, 759, DateTimeKind.Utc).AddTicks(1375) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001005"),
                columns: new[] { "last_event_timestamp_utc", "trial_ends_at_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 13, 12, 48, 759, DateTimeKind.Utc).AddTicks(1375), new DateTime(2026, 6, 27, 13, 12, 48, 759, DateTimeKind.Utc).AddTicks(1375), new DateTime(2026, 6, 13, 13, 12, 48, 759, DateTimeKind.Utc).AddTicks(1375) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001006"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 13, 12, 48, 759, DateTimeKind.Utc).AddTicks(1375), new DateTime(2026, 6, 13, 13, 12, 48, 759, DateTimeKind.Utc).AddTicks(1375) });
        }
    
        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove post platform targets
            migrationBuilder.Sql(@"
                DELETE FROM ""post_platform_targets""
                WHERE ""post_id"" IN (
                    '00000000-0000-0000-0000-000000010009',
                    '00000000-0000-0000-0000-000000010010',
                    '00000000-0000-0000-0000-000000010011',
                    '00000000-0000-0000-0000-000000010012',
                    '00000000-0000-0000-0000-000000010013',
                    '00000000-0000-0000-0000-000000010014'
                );
            ");

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001001"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 12, 28, 55, 87, DateTimeKind.Utc).AddTicks(4480), new DateTime(2026, 6, 13, 12, 28, 55, 87, DateTimeKind.Utc).AddTicks(4480) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001002"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 12, 28, 55, 87, DateTimeKind.Utc).AddTicks(4480), new DateTime(2026, 6, 13, 12, 28, 55, 87, DateTimeKind.Utc).AddTicks(4480) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001003"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 12, 28, 55, 87, DateTimeKind.Utc).AddTicks(4480), new DateTime(2026, 6, 13, 12, 28, 55, 87, DateTimeKind.Utc).AddTicks(4480) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001004"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 12, 28, 55, 87, DateTimeKind.Utc).AddTicks(4480), new DateTime(2026, 6, 13, 12, 28, 55, 87, DateTimeKind.Utc).AddTicks(4480) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001005"),
                columns: new[] { "last_event_timestamp_utc", "trial_ends_at_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 12, 28, 55, 87, DateTimeKind.Utc).AddTicks(4480), new DateTime(2026, 6, 27, 12, 28, 55, 87, DateTimeKind.Utc).AddTicks(4480), new DateTime(2026, 6, 13, 12, 28, 55, 87, DateTimeKind.Utc).AddTicks(4480) });

            migrationBuilder.UpdateData(
                table: "subscriptions",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000001006"),
                columns: new[] { "last_event_timestamp_utc", "updated_at_utc" },
                values: new object[] { new DateTime(2026, 6, 13, 12, 28, 55, 87, DateTimeKind.Utc).AddTicks(4480), new DateTime(2026, 6, 13, 12, 28, 55, 87, DateTimeKind.Utc).AddTicks(4480) });
        }
    }
}
