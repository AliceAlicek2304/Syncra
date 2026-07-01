using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Syncra.Infrastructure.Persistence;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260630110000_AddBillingPayments")]
    public partial class AddBillingPayments : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "billing_payments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false),
                    subscription_id = table.Column<Guid>(type: "uuid", nullable: true),
                    plan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    provider_payment_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    provider_subscription_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    original_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    interval = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    discount_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    discount_percent_off = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    paid_at_utc = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    deleted_at_utc = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    metadata = table.Column<string>(type: "jsonb", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_billing_payments", x => x.id);
                    table.ForeignKey(
                        name: "fk_billing_payments_plans_plan_id",
                        column: x => x.plan_id,
                        principalTable: "plans",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_billing_payments_subscriptions_subscription_id",
                        column: x => x.subscription_id,
                        principalTable: "subscriptions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_billing_payments_workspaces_workspace_id",
                        column: x => x.workspace_id,
                        principalTable: "workspaces",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_billing_payments_paid_at_utc",
                table: "billing_payments",
                column: "paid_at_utc");

            migrationBuilder.CreateIndex(
                name: "ix_billing_payments_plan_id",
                table: "billing_payments",
                column: "plan_id");

            migrationBuilder.CreateIndex(
                name: "ix_billing_payments_provider_provider_payment_id",
                table: "billing_payments",
                columns: new[] { "provider", "provider_payment_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_billing_payments_subscription_id",
                table: "billing_payments",
                column: "subscription_id");

            migrationBuilder.CreateIndex(
                name: "ix_billing_payments_workspace_id",
                table: "billing_payments",
                column: "workspace_id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "billing_payments");
        }
    }
}
