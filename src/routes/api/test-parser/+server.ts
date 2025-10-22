// src/routes/api/test-parser/+server.ts

import { json } from '@sveltejs/kit';
import { extractPlayerProp, extractAllPlayerProps } from '$lib/server/api/props-parser';

export async function GET() {
  console.log('[TEST-PARSER] Starting test...');

  // Same test data as before
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
              { name: "Under", description: "Justin Jefferson", price: -112, point: 79.5 },
              { name: "Over", description: "Ladd McConkey", price: -115, point: 55.5 },
              { name: "Under", description: "Ladd McConkey", price: -109, point: 55.5 }
            ]
          },
          {
            key: "player_pass_yds",
            outcomes: [
              { name: "Over", description: "Justin Herbert", price: -111, point: 253.5 },
              { name: "Under", description: "Justin Herbert", price: -113, point: 253.5 }
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
              { name: "Under", description: "Justin Jefferson", price: -114, point: 79.5 },
              { name: "Over", description: "Ladd McConkey", price: -114, point: 55.5 },
              { name: "Under", description: "Ladd McConkey", price: -114, point: 55.5 }
            ]
          },
          {
            key: "player_pass_yds",
            outcomes: [
              { name: "Over", description: "Justin Herbert", price: -114, point: 251.5 },
              { name: "Under", description: "Justin Herbert", price: -114, point: 251.5 }
            ]
          }
        ]
      }
    ]
  };

  // Test the new function
  const allProps = extractAllPlayerProps(sampleProps);

  console.log(`[TEST-PARSER] Found ${allProps.length} unique props`);

  return json({
    success: true,
    propsCount: allProps.length,
    allProps
  });
}
