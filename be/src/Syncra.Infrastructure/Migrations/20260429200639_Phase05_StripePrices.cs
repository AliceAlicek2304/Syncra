using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Phase05_StripePrices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_plans_stripe_price_id",
                table: "plans");

            migrationBuilder.RenameColumn(
                name: "stripe_price_id",
                table: "plans",
                newName: "stripe_yearly_price_id");

            migrationBuilder.AddColumn<string>(
                name: "stripe_monthly_price_id",
                table: "plans",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_plans_stripe_monthly_price_id",
                table: "plans",
                column: "stripe_monthly_price_id",
                unique: true,
                filter: "stripe_monthly_price_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_plans_stripe_yearly_price_id",
                table: "plans",
                column: "stripe_yearly_price_id",
                unique: true,
                filter: "stripe_yearly_price_id IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_plans_stripe_monthly_price_id",
                table: "plans");

            migrationBuilder.DropIndex(
                name: "IX_plans_stripe_yearly_price_id",
                table: "plans");

            migrationBuilder.DropColumn(
                name: "stripe_monthly_price_id",
                table: "plans");

            migrationBuilder.RenameColumn(
                name: "stripe_yearly_price_id",
                table: "plans",
                newName: "stripe_price_id");

            migrationBuilder.CreateIndex(
                name: "IX_plans_stripe_price_id",
                table: "plans",
                column: "stripe_price_id",
                unique: true,
                filter: "stripe_price_id IS NOT NULL");
        }
    }
}
