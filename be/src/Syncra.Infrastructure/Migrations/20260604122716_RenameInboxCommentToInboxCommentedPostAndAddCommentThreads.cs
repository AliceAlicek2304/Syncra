using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RenameInboxCommentToInboxCommentedPostAndAddCommentThreads : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "inbox_comments");

            migrationBuilder.CreateTable(
                name: "inbox_commented_posts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    zernio_post_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    social_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    zernio_account_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    account_username = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    post_preview_caption = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    post_preview_thumbnail_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    comment_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    zernio_top_comment_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    is_read = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    received_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    like_count = table.Column<int>(type: "integer", nullable: true),
                    subreddit = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    is_ad = table.Column<bool>(type: "boolean", nullable: true),
                    ad_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    placement = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    permalink = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    metadata = table.Column<string>(type: "jsonb", nullable: true),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inbox_commented_posts", x => x.id);
                    table.UniqueConstraint("AK_inbox_commented_posts_workspace_id_zernio_post_id", x => new { x.workspace_id, x.zernio_post_id });
                    table.ForeignKey(
                        name: "FK_inbox_commented_posts_social_accounts_social_account_id",
                        column: x => x.social_account_id,
                        principalTable: "social_accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_inbox_commented_posts_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "inbox_comment_threads",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    zernio_post_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    payload_json = table.Column<string>(type: "text", nullable: false),
                    last_fetched_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    metadata = table.Column<string>(type: "jsonb", nullable: true),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inbox_comment_threads", x => x.id);
                    table.ForeignKey(
                        name: "FK_inbox_comment_threads_inbox_commented_posts_workspace_id_ze~",
                        columns: x => new { x.workspace_id, x.zernio_post_id },
                        principalTable: "inbox_commented_posts",
                        principalColumns: new[] { "workspace_id", "zernio_post_id" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_inbox_comment_threads_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_inbox_comment_threads_expires_at_utc",
                table: "inbox_comment_threads",
                column: "expires_at_utc");

            migrationBuilder.CreateIndex(
                name: "IX_inbox_comment_threads_workspace_id_zernio_post_id",
                table: "inbox_comment_threads",
                columns: new[] { "workspace_id", "zernio_post_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_inbox_commented_posts_social_account_id",
                table: "inbox_commented_posts",
                column: "social_account_id");

            migrationBuilder.CreateIndex(
                name: "IX_inbox_commented_posts_workspace_id_received_at_utc",
                table: "inbox_commented_posts",
                columns: new[] { "workspace_id", "received_at_utc" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_inbox_commented_posts_workspace_id_zernio_account_id_zernio~",
                table: "inbox_commented_posts",
                columns: new[] { "workspace_id", "zernio_account_id", "zernio_post_id" });

            migrationBuilder.CreateIndex(
                name: "IX_inbox_commented_posts_workspace_id_zernio_post_id",
                table: "inbox_commented_posts",
                columns: new[] { "workspace_id", "zernio_post_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "inbox_comment_threads");

            migrationBuilder.DropTable(
                name: "inbox_commented_posts");

            migrationBuilder.CreateTable(
                name: "inbox_comments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    social_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false),
                    account_username = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ad_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    author_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    author_picture = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    author_username = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    body_text = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    comment_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_ad = table.Column<bool>(type: "boolean", nullable: true),
                    is_read = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_reply = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    like_count = table.Column<int>(type: "integer", nullable: true),
                    metadata = table.Column<string>(type: "jsonb", nullable: true),
                    parent_comment_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    permalink = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    placement = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    post_preview_caption = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    post_preview_thumbnail_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    received_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    subreddit = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    zernio_account_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    zernio_comment_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    zernio_post_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    zernio_top_comment_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inbox_comments", x => x.id);
                    table.ForeignKey(
                        name: "FK_inbox_comments_social_accounts_social_account_id",
                        column: x => x.social_account_id,
                        principalTable: "social_accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_inbox_comments_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_inbox_comments_social_account_id",
                table: "inbox_comments",
                column: "social_account_id");

            migrationBuilder.CreateIndex(
                name: "IX_inbox_comments_workspace_id_received_at_utc",
                table: "inbox_comments",
                columns: new[] { "workspace_id", "received_at_utc" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_inbox_comments_workspace_id_zernio_comment_id",
                table: "inbox_comments",
                columns: new[] { "workspace_id", "zernio_comment_id" },
                unique: true);
        }
    }
}
