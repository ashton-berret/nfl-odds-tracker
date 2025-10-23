-- CreateTable
CREATE TABLE "PlayerTeamMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerName" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "position" TEXT,
    "jerseyNumber" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PlayerTeamMapping_playerName_idx" ON "PlayerTeamMapping"("playerName");

-- CreateIndex
CREATE INDEX "PlayerTeamMapping_teamName_idx" ON "PlayerTeamMapping"("teamName");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerTeamMapping_playerName_teamName_key" ON "PlayerTeamMapping"("playerName", "teamName");
