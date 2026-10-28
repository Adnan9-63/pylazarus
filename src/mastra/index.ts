/**
 * src/mastra/index.ts - Mastra Instance Export
 */

import { resurrectionWorkflow, ofrendaNecromancerAgent } from './resurrection-workflow';

export const mastra = {
  workflows: {
    resurrectionWorkflow,
  },
  agents: {
    ofrendaNecromancerAgent,
  },
};

export default mastra;
