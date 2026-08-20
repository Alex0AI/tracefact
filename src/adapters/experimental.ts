import type { TraceAdapter } from "./sdk.js";
import { genericAdapter } from "./generic.js";

function experimental(
  id: string,
  displayName: string,
  markers: RegExp,
): TraceAdapter {
  return {
    id,
    displayName,
    version: "0.1.0",
    stability: "experimental",
    detect(input) {
      return markers.test(JSON.stringify(input).slice(0, 30000)) ? 0.7 : 0;
    },
    parse(input, context) {
      const trace = genericAdapter.parse(input, context);
      return {
        ...trace,
        source: { ...trace.source, adapter: id, adapterVersion: "0.1.0" },
        agent: { ...trace.agent, name: displayName },
        extensions: { ...trace.extensions, experimentalAdapter: true },
      };
    },
  };
}

export const experimentalAdapters = [
  experimental(
    "opencode",
    "OpenCode",
    /sessionID|callID|providerID|step-start/,
  ),
  experimental(
    "agent-browser",
    "agent-browser",
    /snapshot|selector|agent-browser|requestId/,
  ),
  experimental(
    "openhands",
    "OpenHands",
    /EventStream|Action|Observation|openhands/,
  ),
];
