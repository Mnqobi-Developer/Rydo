using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rydo.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTripPreferredPaymentMethod : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PreferredPaymentMethod",
                table: "Trips",
                type: "integer",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PreferredPaymentMethod",
                table: "Trips");
        }
    }
}
