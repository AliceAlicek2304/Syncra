using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddInboxReviewEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "inbox_reviews",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    zernio_review_id = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    social_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    reviewer_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    reviewer_image_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    star_rating = table.Column<int>(type: "integer", nullable: false),
                    review_text = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    has_reply = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    reply_text = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    reply_created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_read = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    received_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    zernio_account_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    metadata = table.Column<string>(type: "jsonb", nullable: true),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inbox_reviews", x => x.id);
                    table.ForeignKey(
                        name: "FK_inbox_reviews_social_accounts_social_account_id",
                        column: x => x.social_account_id,
                        principalTable: "social_accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_inbox_reviews_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_inbox_reviews_social_account_id",
                table: "inbox_reviews",
                column: "social_account_id");

            migrationBuilder.CreateIndex(
                name: "IX_inbox_reviews_workspace_id_received_at_utc",
                table: "inbox_reviews",
                columns: new[] { "workspace_id", "received_at_utc" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_inbox_reviews_workspace_id_zernio_review_id",
                table: "inbox_reviews",
                columns: new[] { "workspace_id", "zernio_review_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "inbox_reviews");
        }
    }
}
