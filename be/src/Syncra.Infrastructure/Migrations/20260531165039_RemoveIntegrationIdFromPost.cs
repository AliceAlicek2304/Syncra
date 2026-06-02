using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveIntegrationIdFromPost : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_posts_integrations_integration_id",
                table: "posts");

            migrationBuilder.RenameColumn(
                name: "integration_id",
                table: "posts",
                newName: "IntegrationId");

            migrationBuilder.RenameIndex(
                name: "IX_posts_integration_id",
                table: "posts",
                newName: "IX_posts_IntegrationId");

            migrationBuilder.AddForeignKey(
                name: "FK_posts_integrations_IntegrationId",
                table: "posts",
                column: "IntegrationId",
                principalTable: "integrations",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_posts_integrations_IntegrationId",
                table: "posts");

            migrationBuilder.RenameColumn(
                name: "IntegrationId",
                table: "posts",
                newName: "integration_id");

            migrationBuilder.RenameIndex(
                name: "IX_posts_IntegrationId",
                table: "posts",
                newName: "IX_posts_integration_id");

            migrationBuilder.AddForeignKey(
                name: "FK_posts_integrations_integration_id",
                table: "posts",
                column: "integration_id",
                principalTable: "integrations",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
