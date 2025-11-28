import { syncEntireSeason, syncCurrentWeek } from '../lib/services/game.service';
import { CURRENT_SEASON, CURRENT_SEASON_TYPE } from '../lib/constants';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'current') {
    console.log('Seeding current week...');
    const result = await syncCurrentWeek();
    console.log('\nResults:');
    console.log(`- Games processed: ${result.gamesProcessed}`);
    console.log(`- Games created: ${result.gamesCreated}`);
    console.log(`- Games updated: ${result.gamesUpdated}`);
    if (result.errors.length > 0) {
      console.log(`- Errors: ${result.errors.length}`);
      result.errors.forEach(err => console.error(`  - ${err}`));
    }
  } else if (command === 'season' || !command) {
    console.log(`Seeding entire season ${CURRENT_SEASON}, type ${CURRENT_SEASON_TYPE}...`);
    const result = await syncEntireSeason(CURRENT_SEASON, CURRENT_SEASON_TYPE);
    console.log('\nResults:');
    console.log(`- Games processed: ${result.gamesProcessed}`);
    console.log(`- Games created: ${result.gamesCreated}`);
    console.log(`- Games updated: ${result.gamesUpdated}`);
    if (result.errors.length > 0) {
      console.log(`- Errors: ${result.errors.length}`);
      result.errors.forEach(err => console.error(`  - ${err}`));
    }
  } else {
    console.log('Usage:');
    console.log('  npm run seed-games         # Seed entire season');
    console.log('  npm run seed-games current # Seed current week only');
    console.log('  npm run seed-games season  # Seed entire season');
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('\n✓ Seed complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Seed failed:', error);
    process.exit(1);
  });
