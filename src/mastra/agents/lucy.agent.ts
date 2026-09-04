import { Agent } from '@mastra/core/agent';
import { lucyPersona } from '../instructions/lucy-persona.js';
import { tallerKnowledge } from '../instructions/taller-knowledge.js';
import { lucyMemory } from '../memory/index.js';
import { saveLeadNameTool } from '../tools/save-lead-name.tool.js';
import { markInterestedTool } from '../tools/mark-interested.tool.js';
import { handoffToReneTool } from '../tools/handoff-to-rene.tool.js';

export const lucyAgent = new Agent({
  id: 'lucy',
  name: 'Lucy',
  instructions: `${lucyPersona}\n\n## Información de referencia sobre el taller (única fuente de verdad, no inventes datos fuera de aquí)\n${tallerKnowledge}`,
  model: 'openai/gpt-5.4-mini',
  tools: { saveLeadNameTool, markInterestedTool, handoffToReneTool },
  memory: lucyMemory,
});
