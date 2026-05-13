export const GITHUB_PROJECT_FIELDS = {
  taskId: "Task ID",
  status: "Status",
  priority: "Priority",
  workType: "Work Type",
  owner: "Owner",
  goalRole: "Goal Role",
  agentResponsible: "Agent Responsible",
  agentLane: "Agent Lane",
  credentialGate: "Credential Gate",
  parentId: "Parent ID",
  dependsOn: "Depends On",
  receiptSummary: "Receipt Summary",
  verify: "Verify",
  allowedFiles: "Allowed Files",
  updated: "Goal Updated",
};

export const GITHUB_PROJECT_VIEWS = {
  board: {
    name: "Goal Board",
    layout: "board",
    graphqlLayout: "BOARD_LAYOUT",
    fields: [
      "priority",
      "status",
      "workType",
      "owner",
      "goalRole",
      "agentResponsible",
      "agentLane",
      "credentialGate",
    ],
  },
};

const STATUS_OPTIONS = [
  { name: "Blocked", color: "RED", description: "Task is blocked." },
  { name: "In Progress", color: "YELLOW", description: "Task is currently active." },
  { name: "Todo", color: "GRAY", description: "Task is waiting." },
  { name: "Done", color: "GREEN", description: "Task is complete." },
];

const TYPE_OPTIONS = [
  { name: "Discovery", color: "BLUE", description: "Evidence gathering and mapping." },
  { name: "Decision", color: "PURPLE", description: "Review, decision, or audit." },
  { name: "Execution", color: "ORANGE", description: "Bounded implementation or recovery." },
  { name: "Coordination", color: "GREEN", description: "Board, handoff, or PM work." },
  { name: "Recovery", color: "RED", description: "Unblocking or repairing failed verification." },
];

const PRIORITY_OPTIONS = [
  { name: "P0", color: "RED", description: "Urgent blocker or safety-critical work." },
  { name: "P1", color: "ORANGE", description: "Important current-tranche work." },
  { name: "P2", color: "YELLOW", description: "Useful but not first-order." },
  { name: "P3", color: "GRAY", description: "Parking lot or follow-up." },
];

const AGENT_LANE_OPTIONS = [
  { name: "PM", color: "GREEN", description: "GoalBuddy PM coordination work." },
  { name: "Scout", color: "BLUE", description: "GoalBuddy evidence mapping work." },
  { name: "Judge", color: "PURPLE", description: "GoalBuddy decision and audit work." },
  { name: "Worker", color: "ORANGE", description: "GoalBuddy bounded implementation work." },
  { name: "User", color: "GRAY", description: "Owner-gated or human action work." },
];

const TEXT_FIELD_SPECS = [
  ["taskId", GITHUB_PROJECT_FIELDS.taskId],
  ["owner", GITHUB_PROJECT_FIELDS.owner],
  ["goalRole", GITHUB_PROJECT_FIELDS.goalRole],
  ["agentResponsible", GITHUB_PROJECT_FIELDS.agentResponsible],
  ["credentialGate", GITHUB_PROJECT_FIELDS.credentialGate],
  ["parentId", GITHUB_PROJECT_FIELDS.parentId],
  ["dependsOn", GITHUB_PROJECT_FIELDS.dependsOn],
  ["receiptSummary", GITHUB_PROJECT_FIELDS.receiptSummary],
  ["verify", GITHUB_PROJECT_FIELDS.verify],
  ["allowedFiles", GITHUB_PROJECT_FIELDS.allowedFiles],
  ["updated", GITHUB_PROJECT_FIELDS.updated],
];

const SINGLE_SELECT_FIELD_SPECS = [
  ["status", GITHUB_PROJECT_FIELDS.status, STATUS_OPTIONS],
  ["priority", GITHUB_PROJECT_FIELDS.priority, PRIORITY_OPTIONS],
  ["workType", GITHUB_PROJECT_FIELDS.workType, TYPE_OPTIONS],
  ["agentLane", GITHUB_PROJECT_FIELDS.agentLane, AGENT_LANE_OPTIONS],
];

export class GitHubProjectsError extends Error {
  constructor(message) {
    super(message);
    this.name = "GitHubProjectsError";
  }
}

export class GitHubProjectsClient {
  constructor({ token, fetchImpl = globalThis.fetch } = {}) {
    if (!token) {
      throw new GitHubProjectsError("Missing GITHUB_TOKEN or GH_TOKEN.");
    }
    if (!fetchImpl) {
      throw new GitHubProjectsError("This Node runtime does not provide fetch.");
    }
    this.token = token;
    this.fetchImpl = fetchImpl;
  }

  async graphql(query, variables = {}) {
    const response = await this.fetchImpl("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
        "user-agent": "goal-board-sync",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new GitHubProjectsError(`GitHub GraphQL failed with HTTP ${response.status}.`);
    }

    const data = await response.json();
    if (data.errors?.length) {
      throw new GitHubProjectsError(data.errors.map((error) => error.message).join("; "));
    }
    return data.data;
  }

  async rest(path, { method = "GET", body } = {}) {
    const response = await this.fetchImpl(`https://api.github.com/${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.token}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "user-agent": "goal-board-sync",
        "x-github-api-version": "2026-03-10",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new GitHubProjectsError(data.message || `GitHub REST failed with HTTP ${response.status}.`);
    }
    return data;
  }

  projectById(projectId, cursor = null) {
    return this.graphql(PROJECT_BY_ID_QUERY, { projectId, cursor });
  }

  projectByOwnerNumber(owner, number, cursor = null) {
    return this.graphql(PROJECT_BY_OWNER_NUMBER_QUERY, { owner, number, cursor });
  }

  createTextField(projectId, name) {
    return this.graphql(CREATE_FIELD_MUTATION, {
      input: {
        projectId,
        name,
        dataType: "TEXT",
      },
    });
  }

  createSingleSelectField(projectId, name, options) {
    return this.graphql(CREATE_FIELD_MUTATION, {
      input: {
        projectId,
        name,
        dataType: "SINGLE_SELECT",
        singleSelectOptions: options,
      },
    });
  }

  updateSingleSelectField(fieldId, options) {
    return this.graphql(UPDATE_FIELD_MUTATION, {
      input: {
        fieldId,
        singleSelectOptions: options,
      },
    });
  }

  addDraftIssue(projectId, title, body) {
    return this.graphql(ADD_DRAFT_ISSUE_MUTATION, {
      input: {
        projectId,
        title,
        body,
      },
    });
  }

  updateDraftIssue(draftIssueId, title, body) {
    return this.graphql(UPDATE_DRAFT_ISSUE_MUTATION, {
      input: {
        draftIssueId,
        title,
        body,
      },
    });
  }

  updateItemField(projectId, itemId, fieldId, value) {
    return this.graphql(UPDATE_ITEM_FIELD_MUTATION, {
      input: {
        projectId,
        itemId,
        fieldId,
        value,
      },
    });
  }
}

export async function loadProject({ client, projectId, owner, number }) {
  const pages = [];
  let cursor = null;
  let baseProject = null;

  do {
    const data = projectId
      ? await client.projectById(projectId, cursor)
      : await client.projectByOwnerNumber(owner, number, cursor);
    const project = projectId
      ? data.node
      : data.user?.projectV2 || data.organization?.projectV2;

    if (!project) {
      throw new GitHubProjectsError("GitHub Project not found. Check project ID or owner/project number.");
    }
    if (!project.id) {
      throw new GitHubProjectsError("The supplied GitHub node is not a ProjectV2.");
    }

    baseProject ||= project;
    pages.push(...(project.items?.nodes || []));
    cursor = project.items?.pageInfo?.hasNextPage ? project.items.pageInfo.endCursor : null;
  } while (cursor);

  return {
    ...baseProject,
    items: {
      ...baseProject.items,
      nodes: pages,
    },
  };
}

export async function ensureGoalProjectFields(client, project) {
  const byName = indexFieldsByName(project.fields?.nodes || []);
  const fields = {};

  for (const [key, name] of TEXT_FIELD_SPECS) {
    let field = byName.get(name);
    if (!field) {
      const response = await client.createTextField(project.id, name);
      field = response.createProjectV2Field.projectV2Field;
      byName.set(name, field);
    } else if (field.dataType !== "TEXT") {
      throw new GitHubProjectsError(`Existing project field "${name}" must be a text field.`);
    }
    fields[key] = field;
  }

  for (const [key, name, options] of SINGLE_SELECT_FIELD_SPECS) {
    let field = byName.get(name);
    if (!field) {
      const response = await client.createSingleSelectField(project.id, name, options);
      field = response.createProjectV2Field.projectV2Field;
    } else if (field.__typename !== "ProjectV2SingleSelectField" || field.dataType !== "SINGLE_SELECT") {
      throw new GitHubProjectsError(`Existing project field "${name}" must be a single-select field.`);
    } else {
      const missing = missingOptions(field, options);
      if (missing.length) {
        const merged = [
          ...(field.options || []).map((option) => ({
            name: option.name,
            color: option.color || "GRAY",
            description: option.description || option.name,
          })),
          ...missing,
        ];
        const response = await client.updateSingleSelectField(field.id, merged);
        field = response.updateProjectV2Field.projectV2Field;
      }
    }
    fields[key] = field;
  }

  return fields;
}

export function planGitHubProjectSync(tasks, existingItems) {
  const byTaskId = indexProjectItemsByTaskId(existingItems);
  return tasks.map((task) => {
    const existing = byTaskId.get(task.id);
    if (!existing) {
      return {
        type: "create",
        taskId: task.id,
        task,
      };
    }

    return {
      type: "update",
      taskId: task.id,
      task,
      itemId: existing.itemId,
      draftIssueId: existing.draftIssueId,
    };
  });
}

export async function executeGitHubProjectSync({ client, project, fields, tasks, board }) {
  const operations = planGitHubProjectSync(tasks, project.items?.nodes || []);

  for (const operation of operations) {
    const body = buildDraftIssueBody(operation.task, board);
    let itemId = operation.itemId;

    if (operation.type === "create") {
      const response = await client.addDraftIssue(project.id, operation.task.title, body);
      itemId = response.addProjectV2DraftIssue.projectItem.id;
    } else if (operation.draftIssueId) {
      await client.updateDraftIssue(operation.draftIssueId, operation.task.title, body);
    }

    for (const update of buildFieldUpdates(operation.task, fields)) {
      await client.updateItemField(project.id, itemId, update.fieldId, update.value);
    }
  }

  return operations;
}

export async function ensureGoalProjectViews({ client, project, fields }) {
  const owner = project.owner;
  if (!owner?.login || !project.number) {
    throw new GitHubProjectsError("Cannot create GitHub Project views without project owner and number.");
  }

  const ownerPath = owner.__typename === "Organization"
    ? `orgs/${owner.login}`
    : `users/${owner.login}`;
  const existingViews = project.views?.nodes || [];
  const ensured = {};

  for (const [key, spec] of Object.entries(GITHUB_PROJECT_VIEWS)) {
    const existing = existingViews.find((view) => view.name === spec.name && view.layout === spec.graphqlLayout);
    if (existing) {
      ensured[key] = existing;
      continue;
    }

    ensured[key] = await client.rest(`${ownerPath}/projectsV2/${project.number}/views`, {
      method: "POST",
      body: buildViewRequestBody(spec, fields),
    });
  }

  return ensured;
}

export async function ensureGoalBoardView({ client, project, fields }) {
  const views = await ensureGoalProjectViews({ client, project, fields });
  return views.board;
}

export function buildFieldUpdates(task, fields) {
  return [
    textUpdate(fields.taskId, task.id),
    singleSelectUpdate(fields.status, projectStatusForTask(task.status)),
    singleSelectUpdate(fields.priority, priorityForTask(task)),
    singleSelectUpdate(fields.workType, workTypeForTask(task.type)),
    singleSelectUpdate(fields.agentLane, agentLaneForTask(task)),
    textUpdate(fields.owner, task.assignee),
    textUpdate(fields.goalRole, task.goalRole),
    textUpdate(fields.agentResponsible, task.agentResponsible),
    textUpdate(fields.credentialGate, task.credentialGate),
    textUpdate(fields.parentId, task.parentId),
    textUpdate(fields.dependsOn, task.dependsOn.join(", ")),
    textUpdate(fields.receiptSummary, task.receiptSummary),
    textUpdate(fields.verify, task.verify.join("\n")),
    textUpdate(fields.allowedFiles, task.allowedFiles.join("\n")),
    textUpdate(fields.updated, task.updatedLabel),
  ].filter(Boolean);
}

export function buildDraftIssueBody(task, board) {
  const lines = [
    `Mirrors ${board.sourcePath}.`,
    "",
    "YAML remains the source of truth. Edit the GoalBuddy board, then rerun the sync.",
    "",
    `Task ID: ${task.id}`,
    `Status: ${task.status}`,
    `Priority: ${priorityForTask(task)}`,
    `Work type: ${workTypeForTask(task.type)}`,
    `Owner: ${task.assignee || "unassigned"}`,
    `Goal role: ${task.goalRole || "unassigned"}`,
    `Agent responsible: ${task.agentResponsible || "unassigned"}`,
    `Credential gate: ${task.credentialGate || "None"}`,
    "",
    "Objective:",
    task.objective || "None",
  ];

  if (task.parentId) {
    lines.push("", `Parent: ${task.parentId}`);
  }
  if (task.dependsOn.length) {
    lines.push("", "Depends on:", ...task.dependsOn.map((id) => `- ${id}`));
  }
  if (task.receiptSummary) {
    lines.push("", "Receipt:", task.receiptSummary);
  }
  if (task.verify.length) {
    lines.push("", "Verify:", ...task.verify.map((command) => `- ${command}`));
  }
  if (task.allowedFiles.length) {
    lines.push("", "Allowed files:", ...task.allowedFiles.map((file) => `- ${file}`));
  }

  return lines.join("\n").slice(0, 65000);
}

export function dryRunGitHubOperations(board) {
  return board.tasks.map((task) => ({
    type: "upsert",
    taskId: task.id,
    title: task.title,
    status: task.status,
    projectStatus: projectStatusForTask(task.status),
    priority: priorityForTask(task),
    typeLabel: workTypeForTask(task.type),
    goalRole: task.goalRole,
    agentResponsible: task.agentResponsible,
    credentialGate: task.credentialGate,
    agentLane: agentLaneForTask(task),
  }));
}

export function projectStatusForTask(status) {
  if (status === "queued") return "Todo";
  if (status === "active") return "In Progress";
  if (status === "blocked") return "Blocked";
  if (status === "done") return "Done";
  return "Todo";
}

export function priorityForTask(task) {
  if (task.priority) return task.priority;
  if (task.status === "blocked") return "P0";
  if (task.status === "active") return "P1";
  if (task.status === "done") return "P3";
  return "P2";
}

export function workTypeForTask(type) {
  if (type === "scout") return "Discovery";
  if (type === "judge") return "Decision";
  if (type === "worker") return "Execution";
  if (type === "pm") return "Coordination";
  return "Coordination";
}

export function agentLaneForTask(task) {
  const candidates = [
    task.agentResponsible,
    task.goalRole,
    task.assignee,
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (["PM", "Scout", "Judge", "Worker"].includes(candidate)) return candidate;
    if (candidate === "User" || candidate === "Owner") return "User";
  }
  return "User";
}

function buildViewRequestBody(spec, fields) {
  return {
    name: spec.name,
    layout: spec.layout,
    visible_fields: fieldDatabaseIds(spec.fields, fields),
  };
}

function fieldDatabaseIds(fieldKeys = [], fields) {
  return fieldKeys
    .map((fieldKey) => fields[fieldKey]?.databaseId)
    .filter(Boolean);
}

function indexFieldsByName(fields) {
  return new Map((fields || []).filter(Boolean).map((field) => [field.name, field]));
}

function missingOptions(field, requiredOptions) {
  const existing = new Set((field.options || []).map((option) => option.name));
  return requiredOptions.filter((option) => !existing.has(option.name));
}

function indexProjectItemsByTaskId(items) {
  const byTaskId = new Map();

  for (const item of items || []) {
    const taskId = item.taskId?.text?.trim();
    if (!taskId) continue;
    const draftIssueId = item.content?.__typename === "DraftIssue" ? item.content.id : null;
    byTaskId.set(taskId, {
      itemId: item.id,
      draftIssueId,
      item,
    });
  }

  return byTaskId;
}

function textUpdate(field, text) {
  if (!field?.id) return null;
  return {
    fieldId: field.id,
    value: {
      text: String(text ?? "").slice(0, 1024),
    },
  };
}

function singleSelectUpdate(field, name) {
  if (!field?.id) return null;
  const option = (field.options || []).find((candidate) => candidate.name === name);
  if (!option) {
    throw new GitHubProjectsError(`Field "${field.name}" is missing option "${name}".`);
  }
  return {
    fieldId: field.id,
    value: {
      singleSelectOptionId: option.id,
    },
  };
}

const PROJECT_FIELDS_FRAGMENT = `
  id
  number
  title
  url
  owner {
    __typename
    ... on User {
      login
    }
    ... on Organization {
      login
    }
  }
  fields(first: 100) {
    nodes {
      __typename
      ... on ProjectV2Field {
        id
        databaseId
        name
        dataType
      }
      ... on ProjectV2SingleSelectField {
        id
        databaseId
        name
        dataType
        options {
          id
          name
          color
          description
        }
      }
    }
  }
  items(first: 100, after: $cursor) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      id
      taskId: fieldValueByName(name: "Task ID") {
        ... on ProjectV2ItemFieldTextValue {
          text
        }
      }
      content {
        __typename
        ... on DraftIssue {
          id
          title
          body
        }
      }
    }
  }
  views(first: 50) {
    nodes {
      id
      number
      name
      layout
    }
  }
`;

const PROJECT_BY_ID_QUERY = `
  query GoalBoardProjectById($projectId: ID!, $cursor: String) {
    node(id: $projectId) {
      ... on ProjectV2 {
        ${PROJECT_FIELDS_FRAGMENT}
      }
    }
  }
`;

const PROJECT_BY_OWNER_NUMBER_QUERY = `
  query GoalBoardProjectByOwnerNumber($owner: String!, $number: Int!, $cursor: String) {
    user(login: $owner) {
      projectV2(number: $number) {
        ${PROJECT_FIELDS_FRAGMENT}
      }
    }
    organization(login: $owner) {
      projectV2(number: $number) {
        ${PROJECT_FIELDS_FRAGMENT}
      }
    }
  }
`;

const CREATE_FIELD_MUTATION = `
  mutation GoalBoardCreateField($input: CreateProjectV2FieldInput!) {
    createProjectV2Field(input: $input) {
      projectV2Field {
        __typename
        ... on ProjectV2Field {
          id
          databaseId
          name
          dataType
        }
        ... on ProjectV2SingleSelectField {
          id
          databaseId
          name
          dataType
          options {
            id
            name
            color
            description
          }
        }
      }
    }
  }
`;

const UPDATE_FIELD_MUTATION = `
  mutation GoalBoardUpdateField($input: UpdateProjectV2FieldInput!) {
    updateProjectV2Field(input: $input) {
      projectV2Field {
        __typename
        ... on ProjectV2SingleSelectField {
          id
          databaseId
          name
          dataType
          options {
            id
            name
            color
            description
          }
        }
      }
    }
  }
`;

const ADD_DRAFT_ISSUE_MUTATION = `
  mutation GoalBoardAddDraftIssue($input: AddProjectV2DraftIssueInput!) {
    addProjectV2DraftIssue(input: $input) {
      projectItem {
        id
        content {
          __typename
          ... on DraftIssue {
            id
          }
        }
      }
    }
  }
`;

const UPDATE_DRAFT_ISSUE_MUTATION = `
  mutation GoalBoardUpdateDraftIssue($input: UpdateProjectV2DraftIssueInput!) {
    updateProjectV2DraftIssue(input: $input) {
      draftIssue {
        id
      }
    }
  }
`;

const UPDATE_ITEM_FIELD_MUTATION = `
  mutation GoalBoardUpdateItemField($input: UpdateProjectV2ItemFieldValueInput!) {
    updateProjectV2ItemFieldValue(input: $input) {
      projectV2Item {
        id
      }
    }
  }
`;
