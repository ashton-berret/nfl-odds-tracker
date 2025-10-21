// src/routes/api/test-parser/+server.ts

import { json } from '@sveltejs/kit';
import { extractPlayerProp } from '$lib/server/api/props-parser';

export async function GET() {
  // Use the sampleProps from your earlier test
  // For now, just hardcode a small sample
  const sampleProps = {
    bookmakers: [
      {
        key: "draftkings",
        title: "DraftKings",
        markets: [
          {
            key: "player_reception_yds",
            outcomes: [
              { name: "Over", description: "Justin Jefferson", price: -112, point: 79.5 },
              { name: "Under", description: "Justin Jefferson", price: -120, point: 79.5 }
            ]
          }
        ]
      },
      {
        key: "fanduel",
        title: "FanDuel",
        markets: [
          {
            key: "player_reception_yds",
            outcomes: [
              { name: "Over", description: "Justin Jefferson", price: -114, point: 79.5 },
              { name: "Under", description: "Justin Jefferson", price: -114, point: 79.5 }
            ]
          }
        ]
      }
    ]
  };

  const parsed = extractPlayerProp(sampleProps, "Justin Jefferson", "player_reception_yds");

  return json({ parsed });
}
