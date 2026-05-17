using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddHasPasswordBeenSet : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasPasswordBeenSet",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Set HasPasswordBeenSet to true for users who have a password set
            migrationBuilder.Sql(
                @"UPDATE users 
                  SET ""HasPasswordBeenSet"" = true 
                  WHERE ""password_hash"" != '' AND ""password_hash"" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasPasswordBeenSet",
                table: "users");
        }
    }
}
