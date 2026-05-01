using Microsoft.EntityFrameworkCore.Migrations;
using Syncra.Infrastructure.Persistence.Seed;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTestUserSeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StripeSubscriptionId",
                table: "subscriptions");

            migrationBuilder.AddColumn<string>(
                name: "billing_customer_id",
                table: "workspaces",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "billing_provider",
                table: "workspaces",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "title",
                table: "posts",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            // Insert test user for development/testing
            var now = DateTime.UtcNow;
            migrationBuilder.Sql(UserSeedData.GetInsertUserSql(now));
            migrationBuilder.Sql(UserSeedData.GetInsertUserProfileSql(now));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove test user profile
            migrationBuilder.Sql(@"
                DELETE FROM ""user_profiles""
                WHERE ""user_id"" = '00000000-0000-0000-0000-000000000010';
            ");

            // Remove test user
            migrationBuilder.Sql(@"
                DELETE FROM ""users""
                WHERE ""id"" = '00000000-0000-0000-0000-000000000010';
            ");

            migrationBuilder.DropColumn(
                name: "billing_customer_id",
                table: "workspaces");

            migrationBuilder.DropColumn(
                name: "billing_provider",
                table: "workspaces");

            migrationBuilder.AddColumn<string>(
                name: "StripeSubscriptionId",
                table: "subscriptions",
                type: "text",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "title",
                table: "posts",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);
        }
    }
}
