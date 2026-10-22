import { IntelligentSurveillanceTestSuite } from './IntelligentSurveillanceTestSuite';

const results = new IntelligentSurveillanceTestSuite().run();
process.exit(results.failed > 0 ? 1 : 0);