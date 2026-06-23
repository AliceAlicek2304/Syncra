using Microsoft.EntityFrameworkCore.Migrations;

using Syncra.Infrastructure.Persistence.Seed;



#nullable disable



namespace Syncra.Infrastructure.Migrations

{

    /// <inheritdoc />

    public partial class AddTestUserSeedData : Migration

    {

        /// <inheritdoc />

        protected override void Up(MigrationBuilder migrationBuilder)

        {

            migrationBuilder.DropColumn(

                name: "StripeSubscriptionId",

                table: "subscriptions");



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



            migrationBuilder.AlterColumn<string>(

                name: "title",

                table: "posts",

                type: "character varying(200)",

                maxLength: 200,

                nullable: false,

                oldClrType: typeof(string),

                oldType: "character varying(500)",

                oldMaxLength: 500);



            // Insert test user for development/testing

            var now = DateTime.UtcNow;

            migrationBuilder.Sql(UserSeedData.GetInsertUserSql(now));

            migrationBuilder.Sql(UserSeedData.GetInsertUserProfileSql(now));



            // Insert workspaces

            migrationBuilder.Sql(WorkspaceSeedData.GetInsertWorkspaceSql(now));



            // Insert subscriptions

            migrationBuilder.Sql(SubscriptionSeedData.GetInsertSubscriptionSql(now));



            // Insert posts

            migrationBuilder.Sql(PostSeedData.GetInsertPostSql(now));



            // Insert post platform targets

            migrationBuilder.Sql(PostSeedData.GetInsertPostPlatformTargetSql(now));

        }



        /// <inheritdoc />

        protected override void Down(MigrationBuilder migrationBuilder)

        {

            // Remove post platform targets

            migrationBuilder.Sql(@"

                DELETE FROM ""post_platform_targets""

                WHERE ""post_id"" IN (

                    '00000000-0000-0000-0000-000000000300',

                    '00000000-0000-0000-0000-000000000301',

                    '00000000-0000-0000-0000-000000000302',

                    '00000000-0000-0000-0000-000000000303',

                    '00000000-0000-0000-0000-000000000304',

                    '00000000-0000-0000-0000-000000000305',

                    '00000000-0000-0000-0000-000000000306',

                    '00000000-0000-0000-0000-000000000307',

                    '00000000-0000-0000-0000-000000000308',

                    '00000000-0000-0000-0000-000000000309'

                );

            ");



            // Remove posts

            migrationBuilder.Sql(@"

                DELETE FROM ""posts""

                WHERE ""id"" IN (

                    '00000000-0000-0000-0000-000000000300',

                    '00000000-0000-0000-0000-000000000301',

                    '00000000-0000-0000-0000-000000000302',

                    '00000000-0000-0000-0000-000000000303',

                    '00000000-0000-0000-0000-000000000304',

                    '00000000-0000-0000-0000-000000000305',

                    '00000000-0000-0000-0000-000000000306',

                    '00000000-0000-0000-0000-000000000307',

                    '00000000-0000-0000-0000-000000000308',

                    '00000000-0000-0000-0000-000000000309'

                );

            ");



            // Remove subscriptions

            migrationBuilder.Sql(@"

                DELETE FROM ""subscriptions""

                WHERE ""id"" IN (

                    '00000000-0000-0000-0000-000000000200',

                    '00000000-0000-0000-0000-000000000201',

                    '00000000-0000-0000-0000-000000000202',

                    '00000000-0000-0000-0000-000000000203',

                    '00000000-0000-0000-0000-000000000204',

                    '00000000-0000-0000-0000-000000000205'

                );

            ");



            // Remove workspaces

            migrationBuilder.Sql(@"

                DELETE FROM ""workspaces""

                WHERE ""id"" IN (

                    '00000000-0000-0000-0000-000000000100',

                    '00000000-0000-0000-0000-000000000101',

                    '00000000-0000-0000-0000-000000000102',

                    '00000000-0000-0000-0000-000000000103',

                    '00000000-0000-0000-0000-000000000104',

                    '00000000-0000-0000-0000-000000000105'

                );

            ");



            // Remove test user profiles

            migrationBuilder.Sql(@"

                DELETE FROM ""user_profiles""

                WHERE ""user_id"" IN (

                    '00000000-0000-0000-0000-000000000010',

                    '00000000-0000-0000-0000-000000000020',

                    '00000000-0000-0000-0000-000000000030',

                    '00000000-0000-0000-0000-000000000040',

                    '00000000-0000-0000-0000-000000000050',

                    '00000000-0000-0000-0000-000000000060'

                );

            ");



            // Remove test users

            migrationBuilder.Sql(@"

                DELETE FROM ""users""

                WHERE ""id"" IN (

                    '00000000-0000-0000-0000-000000000010',

                    '00000000-0000-0000-0000-000000000020',

                    '00000000-0000-0000-0000-000000000030',

                    '00000000-0000-0000-0000-000000000040',

                    '00000000-0000-0000-0000-000000000050',

                    '00000000-0000-0000-0000-000000000060'

                );

            ");



            migrationBuilder.DropColumn(

                name: "billing_customer_id",

                table: "workspaces");



            migrationBuilder.DropColumn(

                name: "billing_provider",

                table: "workspaces");



            migrationBuilder.AddColumn<string>(

                name: "StripeSubscriptionId",

                table: "subscriptions",

                type: "text",

                nullable: true);



            migrationBuilder.AlterColumn<string>(

                name: "title",

                table: "posts",

                type: "character varying(500)",

                maxLength: 500,

                nullable: false,

                oldClrType: typeof(string),

                oldType: "character varying(200)",

                oldMaxLength: 200);

        }

    }

}

