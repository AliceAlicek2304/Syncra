using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionProviderCustomerIdAndIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameIndex(
                name: "IX_subscriptions_workspace_id",
                table: "subscriptions",
                newName: "ix_subscriptions_workspace_id");

            migrationBuilder.AddColumn<string>(
                name: "provider_customer_id",
                table: "subscriptions",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "provider_customer_id",
                table: "subscriptions");

            migrationBuilder.RenameIndex(
                name: "ix_subscriptions_workspace_id",
                table: "subscriptions",
                newName: "IX_subscriptions_workspace_id");
        }
    }
}
