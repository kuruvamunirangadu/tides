import { CurrentFieldTestSuite } from './CurrentFieldTestSuite';

const results = new CurrentFieldTestSuite().run();
process.exit(results.failed > 0 ? 1 : 0);