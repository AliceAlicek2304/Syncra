using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIdeaIdToMedia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "IdeaId",
                table: "media",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_media_IdeaId",
                table: "media",
                column: "IdeaId");

            migrationBuilder.AddForeignKey(
                name: "FK_media_ideas_IdeaId",
                table: "media",
                column: "IdeaId",
                principalTable: "ideas",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_media_ideas_IdeaId",
                table: "media");

            migrationBuilder.DropIndex(
                name: "IX_media_IdeaId",
                table: "media");

            migrationBuilder.DropColumn(
                name: "IdeaId",
                table: "media");
        }
    }
}
