using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCommentedPostFieldsToInboxComments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "account_username",
                table: "inbox_comments",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ad_id",
                table: "inbox_comments",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_ad",
                table: "inbox_comments",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "like_count",
                table: "inbox_comments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "permalink",
                table: "inbox_comments",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "placement",
                table: "inbox_comments",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "subreddit",
                table: "inbox_comments",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "account_username",
                table: "inbox_comments");

            migrationBuilder.DropColumn(
                name: "ad_id",
                table: "inbox_comments");

            migrationBuilder.DropColumn(
                name: "is_ad",
                table: "inbox_comments");

            migrationBuilder.DropColumn(
                name: "like_count",
                table: "inbox_comments");

            migrationBuilder.DropColumn(
                name: "permalink",
                table: "inbox_comments");

            migrationBuilder.DropColumn(
                name: "placement",
                table: "inbox_comments");

            migrationBuilder.DropColumn(
                name: "subreddit",
                table: "inbox_comments");
        }
    }
}
