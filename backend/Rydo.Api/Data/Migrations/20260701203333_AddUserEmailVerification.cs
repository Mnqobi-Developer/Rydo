using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rydo.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserEmailVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsEmailVerified",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true,
                filter: "\"Email\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Trips_DriverProfileId",
                table: "Trips",
                column: "DriverProfileId");

            migrationBuilder.AddForeignKey(
                name: "FK_Trips_Drivers_DriverProfileId",
                table: "Trips",
                column: "DriverProfileId",
                principalTable: "Drivers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Trips_Drivers_DriverProfileId",
                table: "Trips");

            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Trips_DriverProfileId",
                table: "Trips");

            migrationBuilder.DropColumn(
                name: "IsEmailVerified",
                table: "Users");
        }
    }
}
