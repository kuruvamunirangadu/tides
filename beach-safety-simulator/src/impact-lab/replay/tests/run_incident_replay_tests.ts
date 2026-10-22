import { IncidentReplayTestSuite } from './IncidentReplayTestSuite';

const results = await IncidentReplayTestSuite.getInstance().runFullSuite();
const failed = results.filter((result) => !result.passed);
console.log(`Incident replay results: ${results.length - failed.length}/${results.length} passed.`);
if (failed.length > 0) {
  failed.forEach((result) => console.error(`[FAIL] ${result.name}: ${result.actualOutcome}`));
  process.exit(1);
}