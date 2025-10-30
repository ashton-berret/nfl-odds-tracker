-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlayerProp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "propType" TEXT NOT NULL,
    "line" REAL,
    "source" TEXT NOT NULL DEFAULT 'theoddsapi',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerProp_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlayerProp_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PlayerProp" ("createdAt", "gameId", "id", "line", "playerId", "propType") SELECT "createdAt", "gameId", "id", "line", "playerId", "propType" FROM "PlayerProp";
DROP TABLE "PlayerProp";
ALTER TABLE "new_PlayerProp" RENAME TO "PlayerProp";
CREATE INDEX "PlayerProp_gameId_idx" ON "PlayerProp"("gameId");
CREATE INDEX "PlayerProp_playerId_idx" ON "PlayerProp"("playerId");
CREATE INDEX "PlayerProp_gameId_playerId_propType_idx" ON "PlayerProp"("gameId", "playerId", "propType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
