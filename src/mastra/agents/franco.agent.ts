import { Agent } from '@mastra/core/agent';
import { francoPersona } from '../instructions/franco-persona.js';
import { francoFlow } from '../instructions/franco-flow.js';
import { buildBlueDropKnowledge } from '../instructions/blue-drop-knowledge.js';
import { francoMemory } from '../memory/index.js';
import { saveLeadDataTool } from '../tools/save-lead-data.tool.js';
import { sendResourceTool } from '../tools/send-resource.tool.js';
import { handoffToAsesorTool } from '../tools/handoff-to-asesor.tool.js';

export const francoAgent = new Agent({
  id: 'franco',
  name: 'Franco',
  instructions: () =>
    `${francoPersona}\n\n${francoFlow}\n\n## Base de conocimiento (única fuente de verdad, no inventes datos fuera de aquí)\n${buildBlueDropKnowledge()}`,
  // Confirmado disponible vía `node .agents/skills/mastra/scripts/provider-registry.mjs --provider openai`.
  model: 'openai/gpt-4.1-mini',
  tools: { saveLeadDataTool, sendResourceTool, handoffToAsesorTool },
  memory: francoMemory,
});
