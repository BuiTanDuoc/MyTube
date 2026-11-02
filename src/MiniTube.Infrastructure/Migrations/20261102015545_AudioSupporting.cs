using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MiniTube.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AudioSupporting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Kind",
                table: "Videos",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "Video");

            migrationBuilder.CreateIndex(
                name: "IX_Videos_Kind_Visibility_Status_PublishedAt",
                table: "Videos",
                columns: new[] { "Kind", "Visibility", "Status", "PublishedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Videos_Kind_Visibility_Status_PublishedAt",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "Videos");
        }
    }
}
