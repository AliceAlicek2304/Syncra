using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Syncra.Infrastructure.Persistence;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260630100000_RemoveStudentPlan")]
    public partial class RemoveStudentPlan : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE subscriptions
                SET plan_id = basic.id
                FROM plans student
                CROSS JOIN plans basic
                WHERE subscriptions.plan_id = student.id
                  AND student.code = 'STUDENT'
                  AND basic.code = 'BASIC';

                DELETE FROM plans
                WHERE code = 'STUDENT';
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                INSERT INTO plans (
                    id,
                    created_at_utc,
                    updated_at_utc,
                    code,
                    name,
                    description,
                    price_monthly,
                    price_yearly,
                    max_members,
                    max_social_accounts,
                    max_scheduled_posts_per_month,
                    max_repurpose_generations_per_month,
                    stripe_product_id,
                    stripe_monthly_price_id,
                    stripe_yearly_price_id,
                    is_active,
                    sort_order
                )
                SELECT
                    '00000000-0000-0000-0000-000000000004',
                    NOW() AT TIME ZONE 'UTC',
                    NOW() AT TIME ZONE 'UTC',
                    'STUDENT',
                    'Student Plan',
                    'Legacy student plan',
                    59000,
                    49000,
                    1,
                    20,
                    1000,
                    15,
                    'prod_placeholder_student',
                    'price_placeholder_student_monthly',
                    'price_placeholder_student_yearly',
                    false,
                    40
                WHERE NOT EXISTS (
                    SELECT 1 FROM plans WHERE code = 'STUDENT'
                );
                """);
        }
    }
}
