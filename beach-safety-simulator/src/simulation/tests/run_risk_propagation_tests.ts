import { RiskPropagationTestSuite } from './RiskPropagationTestSuite';

const results = new RiskPropagationTestSuite().run();
process.exit(results.failed > 0 ? 1 : 0);