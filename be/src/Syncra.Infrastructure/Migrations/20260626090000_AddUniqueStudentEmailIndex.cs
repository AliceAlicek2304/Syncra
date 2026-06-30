using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Syncra.Infrastructure.Persistence;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260626090000_AddUniqueStudentEmailIndex")]
    public partial class AddUniqueStudentEmailIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                WITH ranked_student_emails AS (
                    SELECT
                        id,
                        ROW_NUMBER() OVER (
                            PARTITION BY student_email
                            ORDER BY
                                student_email_verified_at_utc ASC NULLS LAST,
                                created_at_utc ASC,
                                id ASC
                        ) AS rn
                    FROM users
                    WHERE student_email IS NOT NULL
                      AND deleted_at_utc IS NULL
                )
                UPDATE users
                SET student_email = NULL,
                    student_email_verified_at_utc = NULL,
                    student_verification_expires_at_utc = NULL,
                    updated_at_utc = NOW()
                WHERE id IN (
                    SELECT id
                    FROM ranked_student_emails
                    WHERE rn > 1
                );
                """);

            migrationBuilder.CreateIndex(
                name: "IX_users_student_email",
                table: "users",
                column: "student_email",
                unique: true,
                filter: "student_email IS NOT NULL AND deleted_at_utc IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_users_student_email",
                table: "users");
        }
    }
}
