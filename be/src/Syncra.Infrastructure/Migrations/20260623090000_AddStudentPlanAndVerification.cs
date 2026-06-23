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

            migrationBuilder.Sql("""
                INSERT INTO "plans" (
                    "id",
                    "code",
                    "name",
                    "description",
                    "price_monthly",
                    "price_yearly",
                    "max_members",
                    "max_social_accounts",
                    "max_scheduled_posts_per_month",
                    "MaxRepurposeGenerationsPerMonth",
                    "stripe_product_id",
                    "stripe_monthly_price_id",
                    "stripe_yearly_price_id",
                    "is_active",
                    "sort_order",
                    "created_at_utc",
                    "version"
                )
                VALUES (
                    '00000000-0000-0000-0000-000000000004',
                    'STUDENT',
                    'Student',
                    'Discounted plan for verified students.',
                    59000,
                    49000,
                    1,
                    20,
                    2147483647,
                    15,
                    'prod_placeholder_student',
                    'price_placeholder_student_monthly',
                    'price_placeholder_student_yearly',
                    TRUE,
                    4,
                    TIMESTAMP '2024-01-01 00:00:00',
                    1
                )
                ON CONFLICT ("id") DO UPDATE SET
                    "code" = EXCLUDED."code",
                    "name" = EXCLUDED."name",
                    "description" = EXCLUDED."description",
                    "price_monthly" = EXCLUDED."price_monthly",
                    "price_yearly" = EXCLUDED."price_yearly",
                    "max_members" = EXCLUDED."max_members",
                    "max_social_accounts" = EXCLUDED."max_social_accounts",
                    "max_scheduled_posts_per_month" = EXCLUDED."max_scheduled_posts_per_month",
                    "MaxRepurposeGenerationsPerMonth" = EXCLUDED."MaxRepurposeGenerationsPerMonth",
                    "stripe_product_id" = EXCLUDED."stripe_product_id",
                    "stripe_monthly_price_id" = EXCLUDED."stripe_monthly_price_id",
                    "stripe_yearly_price_id" = EXCLUDED."stripe_yearly_price_id",
                    "is_active" = EXCLUDED."is_active",
                    "sort_order" = EXCLUDED."sort_order";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM "plans"
                WHERE "id" = '00000000-0000-0000-0000-000000000004';
                """);

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
