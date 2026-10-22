import { TidalFlowTestSuite } from './TidalFlowTestSuite';

const suite = new TidalFlowTestSuite();
const results = suite.run();

if (results.failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

