using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Syncra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPostPublishOutcomeFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "publish_external_id",
                table: "posts",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "publish_external_url",
                table: "posts",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "publish_last_attempt_at_utc",
                table: "posts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "publish_last_error",
                table: "posts",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "publish_provider_response_metadata",
                table: "posts",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "publish_external_id",
                table: "posts");

            migrationBuilder.DropColumn(
                name: "publish_external_url",
                table: "posts");

            migrationBuilder.DropColumn(
                name: "publish_last_attempt_at_utc",
                table: "posts");

            migrationBuilder.DropColumn(
                name: "publish_last_error",
                table: "posts");

            migrationBuilder.DropColumn(
                name: "publish_provider_response_metadata",
                table: "posts");
        }
    }
}
