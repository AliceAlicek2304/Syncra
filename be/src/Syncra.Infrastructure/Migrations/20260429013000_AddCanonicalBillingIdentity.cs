using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    public partial class AddCanonicalBillingIdentity : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "billing_customer_id",
                table: "workspaces",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "billing_provider",
                table: "workspaces",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE workspaces
                SET billing_provider = 'stripe',
                    billing_customer_id = stripe_customer_id
                WHERE stripe_customer_id IS NOT NULL
                  AND (billing_provider IS NULL OR billing_customer_id IS NULL);
            ");

            migrationBuilder.Sql(@"
                UPDATE subscriptions
                SET provider_subscription_id = stripe_subscription_id
                WHERE provider_subscription_id IS NULL
                  AND stripe_subscription_id IS NOT NULL;
            ");

            migrationBuilder.Sql(@"
                ALTER TABLE subscriptions
                DROP COLUMN IF EXISTS stripe_subscription_id;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "stripe_subscription_id",
                table: "subscriptions",
                type: "text",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE subscriptions
                SET stripe_subscription_id = provider_subscription_id
                WHERE stripe_subscription_id IS NULL
                  AND provider_subscription_id IS NOT NULL;
            ");

            migrationBuilder.DropColumn(
                name: "billing_customer_id",
                table: "workspaces");

            migrationBuilder.DropColumn(
                name: "billing_provider",
                table: "workspaces");
        }
    }
}
