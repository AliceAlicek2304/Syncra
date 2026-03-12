using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPostTitleAndIntegrationLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "integration_id",
                table: "posts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "title",
                table: "posts",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_posts_integration_id",
                table: "posts",
                column: "integration_id");

            migrationBuilder.AddForeignKey(
                name: "FK_posts_integrations_integration_id",
                table: "posts",
                column: "integration_id",
                principalTable: "integrations",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_posts_integrations_integration_id",
                table: "posts");

            migrationBuilder.DropIndex(
                name: "IX_posts_integration_id",
                table: "posts");

            migrationBuilder.DropColumn(
                name: "integration_id",
                table: "posts");

            migrationBuilder.DropColumn(
                name: "title",
                table: "posts");
        }
    }
}
