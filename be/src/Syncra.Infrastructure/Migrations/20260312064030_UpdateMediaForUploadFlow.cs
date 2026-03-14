using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateMediaForUploadFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "post_id",
                table: "media",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "workspace_id",
                table: "media",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_media_workspace_id",
                table: "media",
                column: "workspace_id");

            migrationBuilder.AddForeignKey(
                name: "FK_media_workspaces_workspace_id",
                table: "media",
                column: "workspace_id",
                principalTable: "workspaces",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_media_workspaces_workspace_id",
                table: "media");

            migrationBuilder.DropIndex(
                name: "IX_media_workspace_id",
                table: "media");

            migrationBuilder.DropColumn(
                name: "workspace_id",
                table: "media");

            migrationBuilder.AlterColumn<Guid>(
                name: "post_id",
                table: "media",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
