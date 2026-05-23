using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddZernioAccountIdToPostPlatformTarget : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "zernio_post_id",
                table: "posts",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "zernio_target_count",
                table: "posts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "post_platform_targets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    external_post_id = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    external_post_url = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    error_message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    zernio_account_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    attempt_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    last_attempt_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    post_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    metadata = table.Column<string>(type: "jsonb", nullable: true),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_post_platform_targets", x => x.id);
                    table.ForeignKey(
                        name: "FK_post_platform_targets_posts_post_id",
                        column: x => x.post_id,
                        principalTable: "posts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_post_platform_targets_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "zernio_profiles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    zernio_profile_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    display_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    avatar_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    metadata = table.Column<string>(type: "jsonb", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_zernio_profiles", x => x.id);
                    table.ForeignKey(
                        name: "FK_zernio_profiles_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "zernio_webhook_events",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    payload = table.Column<string>(type: "jsonb", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    error_message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    processed_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    post_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    metadata = table.Column<string>(type: "jsonb", nullable: true),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_zernio_webhook_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_zernio_webhook_events_posts_post_id",
                        column: x => x.post_id,
                        principalTable: "posts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_zernio_webhook_events_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "social_accounts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    external_account_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    display_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    avatar_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    connected_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    zernio_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    metadata = table.Column<string>(type: "jsonb", nullable: true),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_social_accounts", x => x.id);
                    table.ForeignKey(
                        name: "FK_social_accounts_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_social_accounts_zernio_profiles_zernio_profile_id",
                        column: x => x.zernio_profile_id,
                        principalTable: "zernio_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_post_platform_targets_post_id",
                table: "post_platform_targets",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "IX_post_platform_targets_workspace_id",
                table: "post_platform_targets",
                column: "workspace_id");

            migrationBuilder.CreateIndex(
                name: "IX_social_accounts_workspace_id",
                table: "social_accounts",
                column: "workspace_id");

            migrationBuilder.CreateIndex(
                name: "IX_social_accounts_zernio_profile_id",
                table: "social_accounts",
                column: "zernio_profile_id");

            migrationBuilder.CreateIndex(
                name: "IX_zernio_profiles_workspace_id",
                table: "zernio_profiles",
                column: "workspace_id");

            migrationBuilder.CreateIndex(
                name: "IX_zernio_profiles_zernio_profile_id",
                table: "zernio_profiles",
                column: "zernio_profile_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_zernio_webhook_events_post_id",
                table: "zernio_webhook_events",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "IX_zernio_webhook_events_workspace_id_status_created_at_utc",
                table: "zernio_webhook_events",
                columns: new[] { "workspace_id", "status", "created_at_utc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "post_platform_targets");

            migrationBuilder.DropTable(
                name: "social_accounts");

            migrationBuilder.DropTable(
                name: "zernio_webhook_events");

            migrationBuilder.DropTable(
                name: "zernio_profiles");

            migrationBuilder.DropColumn(
                name: "zernio_post_id",
                table: "posts");

            migrationBuilder.DropColumn(
                name: "zernio_target_count",
                table: "posts");
        }
    }
}
