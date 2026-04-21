// Constants containing Tool schemas to feed to OpenRouter.
export const MCP_TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "get_brand_report",
      description: "Gets standard visibility metrics (visibility, share of voice, sentiment) for tracking brands.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
          start_date: { type: "string", description: "YYYY-MM-DD" },
          end_date: { type: "string", description: "YYYY-MM-DD" },
          dimensions: {
            type: "array",
            items: { type: "string", enum: ["model_id", "topic_id", "date", "country_code"] },
            description: "Breakdown the report by these dimensions"
          }
        },
        required: ["project_id", "start_date", "end_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_actions",
      description: "Gets specific actions (citation gaps) where the brand missed out on being mentioned.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
          start_date: { type: "string", description: "YYYY-MM-DD" },
          end_date: { type: "string", description: "YYYY-MM-DD" },
          scope: { type: "string", enum: ["overview", "owned", "editorial", "reference", "ugc"] }
        },
        required: ["project_id", "start_date", "end_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_domain_report",
      description: "Gets a list of domains cited by AI models.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
          start_date: { type: "string", description: "YYYY-MM-DD" },
          end_date: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["project_id", "start_date", "end_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_url_report",
      description: "Gets a list of specific URLs cited by AI models.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
          start_date: { type: "string", description: "YYYY-MM-DD" },
          end_date: { type: "string", description: "YYYY-MM-DD" },
          limit: { type: "number" }
        },
        required: ["project_id", "start_date", "end_date"]
      }
    }
  }
];
