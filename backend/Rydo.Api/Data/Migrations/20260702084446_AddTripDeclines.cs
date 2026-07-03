using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rydo.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTripDeclines : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TripDeclines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TripId = table.Column<Guid>(type: "uuid", nullable: false),
                    DriverProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    DeclinedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TripDeclines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TripDeclines_Drivers_DriverProfileId",
                        column: x => x.DriverProfileId,
                        principalTable: "Drivers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TripDeclines_Trips_TripId",
                        column: x => x.TripId,
                        principalTable: "Trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TripDeclines_DriverProfileId",
                table: "TripDeclines",
                column: "DriverProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_TripDeclines_TripId_DriverProfileId",
                table: "TripDeclines",
                columns: new[] { "TripId", "DriverProfileId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TripDeclines");
        }
    }
}
