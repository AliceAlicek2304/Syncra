using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAnalyticsIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_posts_workspace_id",
                table: "posts");

            migrationBuilder.CreateTable(
                name: "notifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    body = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    payload_json = table.Column<string>(type: "jsonb", nullable: true),
                    read_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    metadata = table.Column<string>(type: "jsonb", nullable: true),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notifications", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_posts_workspace_id_status_published_at_utc",
                table: "posts",
                columns: new[] { "workspace_id", "status", "published_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_workspace_id_created_at_utc",
                table: "audit_logs",
                columns: new[] { "workspace_id", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_notifications_workspace_id_created_at_utc",
                table: "notifications",
                columns: new[] { "workspace_id", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_notifications_workspace_id_user_id_read_at_utc",
                table: "notifications",
                columns: new[] { "workspace_id", "user_id", "read_at_utc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "notifications");

            migrationBuilder.DropIndex(
                name: "IX_posts_workspace_id_status_published_at_utc",
                table: "posts");

            migrationBuilder.DropIndex(
                name: "IX_audit_logs_workspace_id_created_at_utc",
                table: "audit_logs");

            migrationBuilder.CreateIndex(
                name: "IX_posts_workspace_id",
                table: "posts",
                column: "workspace_id");
        }
    }
}
