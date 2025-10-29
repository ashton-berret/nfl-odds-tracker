-- AlterTable: Add DraftKings support
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- STEP 1: Recreate PlayerProp with nullable line
CREATE TABLE "new_PlayerProp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "propType" TEXT NOT NULL,
    "line" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerProp_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlayerProp_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_PlayerProp" ("id", "gameId", "playerId", "propType", "line", "createdAt")
SELECT "id", "gameId", "playerId", "propType", "line", "createdAt"
FROM "PlayerProp";

DROP TABLE "PlayerProp";
ALTER TABLE "new_PlayerProp" RENAME TO "PlayerProp";

CREATE INDEX "PlayerProp_gameId_idx" ON "PlayerProp"("gameId");
CREATE INDEX "PlayerProp_playerId_idx" ON "PlayerProp"("playerId");
CREATE INDEX "PlayerProp_gameId_playerId_propType_idx" ON "PlayerProp"("gameId", "playerId", "propType");

-- STEP 2: Recreate PropOdds with DraftKings fields
CREATE TABLE "new_PropOdds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propId" TEXT NOT NULL,
    "sportsbookId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'theoddsapi',
    "overOdds" INTEGER,
    "underOdds" INTEGER,
    "outcomeType" TEXT,
    "singleOdds" INTEGER,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropOdds_propId_fkey" FOREIGN KEY ("propId") REFERENCES "PlayerProp" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PropOdds_sportsbookId_fkey" FOREIGN KEY ("sportsbookId") REFERENCES "Sportsbook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_PropOdds" ("id", "propId", "sportsbookId", "overOdds", "underOdds", "fetchedAt")
SELECT "id", "propId", "sportsbookId", "overOdds", "underOdds", "fetchedAt"
FROM "PropOdds";

DROP TABLE "PropOdds";
ALTER TABLE "new_PropOdds" RENAME TO "PropOdds";

CREATE INDEX "PropOdds_propId_sportsbookId_fetchedAt_idx" ON "PropOdds"("propId", "sportsbookId", "fetchedAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
