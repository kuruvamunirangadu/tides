import { Phase5CoordinationTestSuite } from './Phase5CoordinationTestSuite';

const results = new Phase5CoordinationTestSuite().run();
process.exit(results.failed > 0 ? 1 : 0);