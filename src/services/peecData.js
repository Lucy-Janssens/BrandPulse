/**
 * Peec Data Service — Direct MCP tool calls for all dashboard modules.
 * 
 * Transforms the columnar {columns, rows} response format from Peec
 * into usable JS objects for React components.
 */

import { mcpCall, listTools } from './mcp.js';

// --- Helpers ---

/**
 * Convert Peec's columnar format {columns, rows} into an array of objects.
 * e.g. {columns: ["a","b"], rows: [[1,2],[3,4]]} → [{a:1,b:2},{a:3,b:4}]
 */
export function toObjects(result) {
  // Handle the MCP callTool response format
  const data = result?.content?.[0]?.text 
    ? JSON.parse(result.content[0].text)
    : result;
  
  if (!data?.columns || !data?.rows) return [];
  return data.rows.map(row => {
    const obj = {};
    data.columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function parseMcpResponse(result) {
  if (result?.content?.[0]?.text) {
    return JSON.parse(result.content[0].text);
  }
  return result;
}

/** Date helper: YYYY-MM-DD */
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

/** Get date range: last N days */
export function getDateRange(days = 30) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start_date: formatDate(start), end_date: formatDate(end) };
}

// --- Context fetchers (run once on mount) ---

export async function fetchProjects() {
  const result = await mcpCall('list_projects', {});
  return toObjects(result);
}

export async function fetchBrands(projectId) {
  const result = await mcpCall('list_brands', { project_id: projectId });
  return toObjects(result);
}

export async function fetchModels(projectId) {
  const result = await mcpCall('list_models', { project_id: projectId });
  return toObjects(result);
}

export async function fetchTopics(projectId) {
  const result = await mcpCall('list_topics', { project_id: projectId });
  return toObjects(result);
}

/**
 * Fetch everything needed for initial context in one shot.
 */
export async function fetchProjectContext() {
  const projects = await fetchProjects();
  if (projects.length === 0) throw new Error('No Peec projects found');
  
  const project = projects[0]; // Use first project by default
  const brands = await fetchBrands(project.id);
  const models = await fetchModels(project.id);
  const topics = await fetchTopics(project.id);

  const ownBrand = brands.find(b => b.is_own === true) || brands[0];

  return { project, brands, models, topics, ownBrand };
}

// --- Overview Dashboard ---

export async function fetchOverviewKPIs(projectId, dateRange) {
  const result = await mcpCall('get_brand_report', {
    project_id: projectId,
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
  });
  
  const brands = toObjects(result);
  const own = brands.find(b => b.is_own) || brands[0] || {};
  
  return {
    ownBrand: own,
    allBrands: brands,
    visibility: own.visibility,
    shareOfVoice: own.share_of_voice,
    sentiment: own.sentiment,
    position: own.position,
    mentionCount: own.mention_count,
  };
}

export async function fetchVisibilityTrend(projectId, dateRange) {
  const result = await mcpCall('get_brand_report', {
    project_id: projectId,
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
    dimensions: ['date'],
  });
  return toObjects(result);
}

// --- Visibility Deep-Dive ---

export async function fetchVisibilityByModel(projectId, dateRange) {
  const result = await mcpCall('get_brand_report', {
    project_id: projectId,
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
    dimensions: ['model_id'],
  });
  return toObjects(result);
}

export async function fetchVisibilityByTopic(projectId, dateRange) {
  const result = await mcpCall('get_brand_report', {
    project_id: projectId,
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
    dimensions: ['topic_id'],
  });
  return toObjects(result);
}

export async function fetchVisibilityByCountry(projectId, dateRange) {
  const result = await mcpCall('get_brand_report', {
    project_id: projectId,
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
    dimensions: ['country_code'],
  });
  return toObjects(result);
}

// --- Competitor Radar ---

export async function fetchCompetitorTable(projectId, dateRange) {
  const result = await mcpCall('get_brand_report', {
    project_id: projectId,
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
  });
  
  const brands = toObjects(result);
  // Sort by share_of_voice descending
  return brands.sort((a, b) => (b.share_of_voice || 0) - (a.share_of_voice || 0));
}

// --- Citation Gap Audit ---

export async function fetchCitationGapOverview(projectId, dateRange) {
  const result = await mcpCall('get_actions', {
    project_id: projectId,
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
    scope: 'overview',
  });
  return toObjects(result);
}

export async function fetchCitationGapDetails(projectId, dateRange, scope) {
  const result = await mcpCall('get_actions', {
    project_id: projectId,
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
    scope: scope, // 'owned' | 'editorial' | 'reference' | 'ugc'
  });
  return toObjects(result);
}

// --- Sources Explorer ---

export async function fetchTopDomains(projectId, dateRange) {
  const result = await mcpCall('get_domain_report', {
    project_id: projectId,
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
  });
  return toObjects(result);
}

export async function fetchTopURLs(projectId, dateRange) {
  const result = await mcpCall('get_url_report', {
    project_id: projectId,
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
    limit: 25,
  });
  return toObjects(result);
}
