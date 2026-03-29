interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

interface JiraTicket {
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
  };
}

interface JiraTransition {
  id: string;
  name: string;
}

interface JiraTransitionsResponse {
  transitions: JiraTransition[];
}

interface JiraCreateResponse {
  key: string;
}

function getConfig(): JiraConfig {
  const baseUrl = import.meta.env.VITE_JIRA_BASE_URL as string | undefined;
  const email = import.meta.env.VITE_JIRA_EMAIL as string | undefined;
  const apiToken = import.meta.env.VITE_JIRA_API_TOKEN as string | undefined;
  const projectKey = import.meta.env.VITE_JIRA_PROJECT_KEY as string | undefined;

  if (!baseUrl || !email || !apiToken || !projectKey) {
    throw new Error(
      "Missing Jira credentials. Ensure VITE_JIRA_BASE_URL, VITE_JIRA_EMAIL, " +
        "VITE_JIRA_API_TOKEN, and VITE_JIRA_PROJECT_KEY are set."
    );
  }

  return { baseUrl, email, apiToken, projectKey };
}

function authHeaders(config: JiraConfig): HeadersInit {
  const credentials = btoa(`${config.email}:${config.apiToken}`);
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function jiraFetch<T>(
  url: string,
  options: RequestInit,
  config: JiraConfig
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: authHeaders(config),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Jira API error ${response.status} ${response.statusText}: ${body}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function createTicket(
  summary: string,
  description: string,
  issueType: string
): Promise<string> {
  const config = getConfig();

  const data = await jiraFetch<JiraCreateResponse>(
    `${config.baseUrl}/rest/api/3/issue`,
    {
      method: "POST",
      body: JSON.stringify({
        fields: {
          project: { key: config.projectKey },
          summary,
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: description }],
              },
            ],
          },
          issuetype: { name: issueType },
        },
      }),
    },
    config
  );

  return data.key;
}

export async function moveTicket(issueKey: string, status: string): Promise<void> {
  const config = getConfig();

  const { transitions } = await jiraFetch<JiraTransitionsResponse>(
    `${config.baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
    { method: "GET" },
    config
  );

  const transition = transitions.find(
    (t) => t.name.toLowerCase() === status.toLowerCase()
  );

  if (!transition) {
    const available = transitions.map((t) => t.name).join(", ");
    throw new Error(
      `Transition "${status}" not found for ${issueKey}. Available: ${available}`
    );
  }

  await jiraFetch<undefined>(
    `${config.baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
    {
      method: "POST",
      body: JSON.stringify({ transition: { id: transition.id } }),
    },
    config
  );
}

export async function addComment(issueKey: string, comment: string): Promise<void> {
  const config = getConfig();

  await jiraFetch<unknown>(
    `${config.baseUrl}/rest/api/3/issue/${issueKey}/comment`,
    {
      method: "POST",
      body: JSON.stringify({
        body: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: comment }],
            },
          ],
        },
      }),
    },
    config
  );
}

interface JiraIssueLinkRequest {
  type: { name: string };
  inwardIssue: { key: string };
  outwardIssue: { key: string };
}

/**
 * Links two Jira issues together.
 *
 * - "blocks": fromIssueKey blocks toIssueKey (fromIssue is the blocker)
 * - "is blocked by": fromIssueKey is blocked by toIssueKey (toIssue is the blocker;
 *   inward/outward are swapped so the semantic direction matches the Jira "Blocks" link type)
 * - "relates to": a non-directional relationship between the two issues
 */
export async function linkTickets(
  fromIssueKey: string,
  toIssueKey: string,
  linkType: "blocks" | "is blocked by" | "relates to"
): Promise<void> {
  const config = getConfig();

  let body: JiraIssueLinkRequest;

  if (linkType === "blocks") {
    body = {
      type: { name: "Blocks" },
      inwardIssue: { key: fromIssueKey },
      outwardIssue: { key: toIssueKey },
    };
  } else if (linkType === "is blocked by") {
    body = {
      type: { name: "Blocks" },
      inwardIssue: { key: toIssueKey },
      outwardIssue: { key: fromIssueKey },
    };
  } else {
    body = {
      type: { name: "Relates" },
      inwardIssue: { key: fromIssueKey },
      outwardIssue: { key: toIssueKey },
    };
  }

  await jiraFetch<undefined>(
    `${config.baseUrl}/rest/api/3/issueLink`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    config
  );
}

export async function getTicket(
  issueKey: string
): Promise<{ status: string; summary: string }> {
  const config = getConfig();

  const data = await jiraFetch<JiraTicket>(
    `${config.baseUrl}/rest/api/3/issue/${issueKey}?fields=summary,status`,
    { method: "GET" },
    config
  );

  return {
    status: data.fields.status.name,
    summary: data.fields.summary,
  };
}
