using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBillingVouchers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "billing_vouchers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    discount_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    percent_off = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    amount_off = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    minimum_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    applicable_plan_codes_json = table.Column<string>(type: "jsonb", nullable: true),
                    applicable_intervals_json = table.Column<string>(type: "jsonb", nullable: true),
                    max_redemptions = table.Column<int>(type: "integer", nullable: true),
                    max_redemptions_per_user = table.Column<int>(type: "integer", nullable: true),
                    redeemed_count = table.Column<int>(type: "integer", nullable: false),
                    starts_at_utc = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    requires_student_verification = table.Column<bool>(type: "boolean", nullable: false),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    deleted_at_utc = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    metadata = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_billing_vouchers", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "billing_voucher_redemptions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    voucher_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    plan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    subscription_id = table.Column<Guid>(type: "uuid", nullable: true),
                    billing_payment_id = table.Column<Guid>(type: "uuid", nullable: true),
                    voucher_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    checkout_session_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    payment_provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    original_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    discount_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    final_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    redeemed_at_utc = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    deleted_at_utc = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    metadata = table.Column<string>(type: "jsonb", nullable: true),
                    workspace_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_billing_voucher_redemptions", x => x.id);
                    table.ForeignKey(
                        name: "FK_billing_voucher_redemptions_billing_payments_billing_paymen~",
                        column: x => x.billing_payment_id,
                        principalTable: "billing_payments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_billing_voucher_redemptions_billing_vouchers_voucher_id",
                        column: x => x.voucher_id,
                        principalTable: "billing_vouchers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_billing_voucher_redemptions_plans_plan_id",
                        column: x => x.plan_id,
                        principalTable: "plans",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_billing_voucher_redemptions_subscriptions_subscription_id",
                        column: x => x.subscription_id,
                        principalTable: "subscriptions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_billing_voucher_redemptions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_billing_voucher_redemptions_billing_payment_id",
                table: "billing_voucher_redemptions",
                column: "billing_payment_id");

            migrationBuilder.CreateIndex(
                name: "ix_billing_voucher_redemptions_checkout_session_id",
                table: "billing_voucher_redemptions",
                column: "checkout_session_id",
                unique: true,
                filter: "checkout_session_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_billing_voucher_redemptions_plan_id",
                table: "billing_voucher_redemptions",
                column: "plan_id");

            migrationBuilder.CreateIndex(
                name: "ix_billing_voucher_redemptions_redeemed_at_utc",
                table: "billing_voucher_redemptions",
                column: "redeemed_at_utc");

            migrationBuilder.CreateIndex(
                name: "IX_billing_voucher_redemptions_subscription_id",
                table: "billing_voucher_redemptions",
                column: "subscription_id");

            migrationBuilder.CreateIndex(
                name: "ix_billing_voucher_redemptions_user_id",
                table: "billing_voucher_redemptions",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_billing_voucher_redemptions_voucher_id",
                table: "billing_voucher_redemptions",
                column: "voucher_id");

            migrationBuilder.CreateIndex(
                name: "ix_billing_voucher_redemptions_workspace_id",
                table: "billing_voucher_redemptions",
                column: "workspace_id");

            migrationBuilder.CreateIndex(
                name: "ix_billing_vouchers_code",
                table: "billing_vouchers",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_billing_vouchers_expires_at_utc",
                table: "billing_vouchers",
                column: "expires_at_utc");

            migrationBuilder.CreateIndex(
                name: "ix_billing_vouchers_is_active",
                table: "billing_vouchers",
                column: "is_active");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "billing_voucher_redemptions");

            migrationBuilder.DropTable(
                name: "billing_vouchers");
        }
    }
}
