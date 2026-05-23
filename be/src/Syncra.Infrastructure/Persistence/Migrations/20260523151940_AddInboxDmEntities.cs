using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddInboxDmEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "inbox_conversations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    zernio_conversation_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    social_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    participant_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    participant_avatar_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    last_message_text = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    last_message_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    unread_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    is_read = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    metadata = table.Column<string>(type: "jsonb", nullable: true),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inbox_conversations", x => x.id);
                    table.ForeignKey(
                        name: "FK_inbox_conversations_social_accounts_social_account_id",
                        column: x => x.social_account_id,
                        principalTable: "social_accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_inbox_conversations_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "inbox_messages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    inbox_conversation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    zernio_message_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    direction = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    body_text = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    sent_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
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
                    table.PrimaryKey("PK_inbox_messages", x => x.id);
                    table.ForeignKey(
                        name: "FK_inbox_messages_inbox_conversations_inbox_conversation_id",
                        column: x => x.inbox_conversation_id,
                        principalTable: "inbox_conversations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_inbox_conversations_social_account_id",
                table: "inbox_conversations",
                column: "social_account_id");

            migrationBuilder.CreateIndex(
                name: "IX_inbox_conversations_workspace_id_last_message_at_utc",
                table: "inbox_conversations",
                columns: new[] { "workspace_id", "last_message_at_utc" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_inbox_conversations_workspace_id_zernio_conversation_id",
                table: "inbox_conversations",
                columns: new[] { "workspace_id", "zernio_conversation_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_inbox_messages_inbox_conversation_id_sent_at_utc",
                table: "inbox_messages",
                columns: new[] { "inbox_conversation_id", "sent_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_inbox_messages_workspace_id_zernio_message_id",
                table: "inbox_messages",
                columns: new[] { "workspace_id", "zernio_message_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "inbox_messages");

            migrationBuilder.DropTable(
                name: "inbox_conversations");
        }
    }
}
