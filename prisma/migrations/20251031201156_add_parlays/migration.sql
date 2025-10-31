-- CreateTable
CREATE TABLE "Parlay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "combinedOdds" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "profit" REAL,
    "placedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" DATETIME,
    CONSTRAINT "Parlay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParlayLeg" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parlayId" TEXT NOT NULL,
    "propId" TEXT NOT NULL,
    "sportsbookId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "odds" INTEGER NOT NULL,
    "result" TEXT,
    CONSTRAINT "ParlayLeg_parlayId_fkey" FOREIGN KEY ("parlayId") REFERENCES "Parlay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParlayLeg_propId_fkey" FOREIGN KEY ("propId") REFERENCES "PlayerProp" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ParlayLeg_sportsbookId_fkey" FOREIGN KEY ("sportsbookId") REFERENCES "Sportsbook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Parlay_userId_idx" ON "Parlay"("userId");

-- CreateIndex
CREATE INDEX "Parlay_status_idx" ON "Parlay"("status");

-- CreateIndex
CREATE INDEX "ParlayLeg_parlayId_idx" ON "ParlayLeg"("parlayId");

-- CreateIndex
CREATE INDEX "ParlayLeg_propId_idx" ON "ParlayLeg"("propId");
