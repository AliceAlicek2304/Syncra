using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdatePlanWithStripeIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "stripe_price_id",
                table: "plans",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "stripe_product_id",
                table: "plans",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "plans",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000001"),
                columns: new[] { "stripe_price_id", "stripe_product_id" },
                values: new object[] { "price_placeholder_free", "prod_placeholder_free" });

            migrationBuilder.UpdateData(
                table: "plans",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000002"),
                columns: new[] { "stripe_price_id", "stripe_product_id" },
                values: new object[] { "price_placeholder_pro", "prod_placeholder_pro" });

            migrationBuilder.UpdateData(
                table: "plans",
                keyColumn: "id",
                keyValue: new Guid("00000000-0000-0000-0000-000000000003"),
                columns: new[] { "stripe_price_id", "stripe_product_id" },
                values: new object[] { "price_placeholder_team", "prod_placeholder_team" });

            migrationBuilder.CreateIndex(
                name: "IX_plans_stripe_price_id",
                table: "plans",
                column: "stripe_price_id",
                unique: true,
                filter: "stripe_price_id IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_plans_stripe_price_id",
                table: "plans");

            migrationBuilder.DropColumn(
                name: "stripe_price_id",
                table: "plans");

            migrationBuilder.DropColumn(
                name: "stripe_product_id",
                table: "plans");
        }
    }
}
