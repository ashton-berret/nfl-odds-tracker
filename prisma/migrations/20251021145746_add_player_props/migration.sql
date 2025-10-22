-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "commenceTime" DATETIME NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Game_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Game_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sportsbook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PlayerProp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "propType" TEXT NOT NULL,
    "line" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerProp_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlayerProp_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PropOdds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propId" TEXT NOT NULL,
    "sportsbookId" TEXT NOT NULL,
    "overOdds" INTEGER NOT NULL,
    "underOdds" INTEGER NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropOdds_propId_fkey" FOREIGN KEY ("propId") REFERENCES "PlayerProp" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PropOdds_sportsbookId_fkey" FOREIGN KEY ("sportsbookId") REFERENCES "Sportsbook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PropResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propId" TEXT NOT NULL,
    "actualValue" REAL NOT NULL,
    "hit" BOOLEAN NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_abbreviation_key" ON "Team"("abbreviation");

-- CreateIndex
CREATE INDEX "Player_name_idx" ON "Player"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Player_name_teamId_key" ON "Player"("name", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_externalId_key" ON "Game"("externalId");

-- CreateIndex
CREATE INDEX "Game_commenceTime_idx" ON "Game"("commenceTime");

-- CreateIndex
CREATE UNIQUE INDEX "Sportsbook_name_key" ON "Sportsbook"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Sportsbook_key_key" ON "Sportsbook"("key");

-- CreateIndex
CREATE INDEX "PlayerProp_gameId_idx" ON "PlayerProp"("gameId");

-- CreateIndex
CREATE INDEX "PlayerProp_playerId_idx" ON "PlayerProp"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProp_gameId_playerId_propType_line_key" ON "PlayerProp"("gameId", "playerId", "propType", "line");

-- CreateIndex
CREATE INDEX "PropOdds_propId_sportsbookId_fetchedAt_idx" ON "PropOdds"("propId", "sportsbookId", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PropResult_propId_key" ON "PropResult"("propId");
