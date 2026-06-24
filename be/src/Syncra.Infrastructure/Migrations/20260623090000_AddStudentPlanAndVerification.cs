using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Syncra.Infrastructure.Persistence;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260623090000_AddStudentPlanAndVerification")]
    public partial class AddStudentPlanAndVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "student_email",
                table: "users",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "student_email_verified_at_utc",
                table: "users",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "student_verification_expires_at_utc",
                table: "users",
                type: "timestamp without time zone",
                nullable: true);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "student_email",
                table: "users");

            migrationBuilder.DropColumn(
                name: "student_email_verified_at_utc",
                table: "users");

            migrationBuilder.DropColumn(
                name: "student_verification_expires_at_utc",
                table: "users");
        }
    }
}
