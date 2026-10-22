import { SwimmerBehaviorAnalysisTestSuite } from './SwimmerBehaviorAnalysisTestSuite';

const results = new SwimmerBehaviorAnalysisTestSuite().run();
process.exit(results.failed > 0 ? 1 : 0);