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
  },
  {
    type: "function",
    function: {
      name: "list_chats",
      description: "Lists chat sessions where AI models (ChatGPT, Perplexity, Claude, etc.) answered queries related to the tracked project. Use this to find actual verbatim AI answers about the brand or competitors.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
          start_date: { type: "string", description: "YYYY-MM-DD" },
          end_date: { type: "string", description: "YYYY-MM-DD" },
          model_id: { type: "string", description: "Optional: filter by AI model (e.g. 'chatgpt', 'perplexity', 'claude')" },
          topic_id: { type: "string", description: "Optional: filter by topic" },
          limit: { type: "number", description: "Max results, default 20" },
        },
        required: ["project_id", "start_date", "end_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_chat",
      description: "Retrieves the full verbatim conversation from a specific AI chat session — the actual question asked and the AI's full response, including whether the brand was mentioned, cited, or excluded. Use this after list_chats to read real AI responses.",
      parameters: {
        type: "object",
        properties: {
          chat_id: { type: "string", description: "The chat session ID from list_chats" },
          project_id: { type: "string" },
        },
        required: ["chat_id", "project_id"]
      }
    }
  }
];
