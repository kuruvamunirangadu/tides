import { Phase8ForensicTimelineTestSuite } from './Phase8ForensicTimelineTestSuite';

const results = new Phase8ForensicTimelineTestSuite().run();
process.exit(results.failed > 0 ? 1 : 0);