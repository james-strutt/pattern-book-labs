/**
 * Serialised React Flow graph for Pattern Book placement; Giraffe evaluates it via
 * `rpc.invoke("evaluateFeatures", [...])`.
 *
 * Do not change node or edge UUIDs — they bind to Giraffe flow-node types (see
 * `flowDagAdapter.ts`). Sync the whole export from `_legacy/constants.ts` if the
 * pipeline is regenerated.
 */

const PATTERN_BOOK_ENVELOPE_DEFAULT = {
  type: "envelope",
  parameters: {
    version: "beta",
    maxHeight: 12,
    fillEnabled: true,
    sideIndices: {
      rear: [],
      front: [0],
      isManual: true,
    },
    setbackSteps: {
      rear: [{ inset: 3, height: 0 }, { inset: 3 }],
      side: [{ inset: 3, height: 0 }, { inset: 3 }],
      front: [{ inset: 3, height: 0 }, { inset: 3 }],
    },
    hasSetbackOutput: true,
  },
} as const;

function duplicateEnvelopeDefault(): typeof PATTERN_BOOK_ENVELOPE_DEFAULT {
  return structuredClone(PATTERN_BOOK_ENVELOPE_DEFAULT);
}

const PATTERN_BOOK_ENVELOPE_FOR_NODE = duplicateEnvelopeDefault();
const PATTERN_BOOK_ENVELOPE_FOR_INPUTS = duplicateEnvelopeDefault();

const PATTERN_BOOK_KEYS_DEFAULT = ["b7e1d65b312e4d60a65463857af07bb8", "dddd", null] as const;

const PATTERN_BOOK_ROTATION_DEFAULT = '{"444b634388694c898af93f3a35043a5e": 1, "b": 2, "c": 3}';

export const PATTERN_BOOK_SHORT_LIST = {
  id: "c2e900a2c1824f30b80b79a31191f165",
  name: "pattern-book-site",
  edges: [
    {
      id: "reactflow__edge-16a59d37-7b43-4eb2-bdfd-c324801f90ebplaced-d04f97c6-8570-4c08-b17b-3d17dc8981c7feature",
      type: "giraffeNodesEdge",
      source: "16a59d37-7b43-4eb2-bdfd-c324801f90eb",
      target: "d04f97c6-8570-4c08-b17b-3d17dc8981c7",
      sourceHandle: "placed",
      targetHandle: "feature",
    },
    {
      id: "reactflow__edge-c2de082d-e4b1-420e-b509-7336a126c32aobject-d04f97c6-8570-4c08-b17b-3d17dc8981c7feature",
      type: "giraffeNodesEdge",
      source: "c2de082d-e4b1-420e-b509-7336a126c32a",
      target: "d04f97c6-8570-4c08-b17b-3d17dc8981c7",
      sourceHandle: "object",
      targetHandle: "feature",
    },
    {
      id: "reactflow__edge-UVBE2hEvv49cafFVoPdbBlist-00be7e4f-622e-491a-b1ad-09fa7b296d52value",
      type: "giraffeNodesEdge",
      source: "UVBE2hEvv49cafFVoPdbB",
      target: "00be7e4f-622e-491a-b1ad-09fa7b296d52",
      sourceHandle: "list",
      targetHandle: "value",
    },
    {
      id: "reactflow__edge-qC96pVfi6llSZSLD2Y7xEvalue-CS8WQhflSkUh15YnJor6dvalue",
      type: "giraffeNodesEdge",
      source: "qC96pVfi6llSZSLD2Y7xE",
      target: "CS8WQhflSkUh15YnJor6d",
      sourceHandle: "value",
      targetHandle: "value",
    },
    {
      id: "reactflow__edge-vxQlMbRUkPIDhubm_XK3dvalue-MU_X6xVS_TdT7h0JrVjEFkeys",
      data: {
        smoothStep: true,
        sourceHandleIndex: 1,
      },
      type: "giraffeNodesEdge",
      source: "vxQlMbRUkPIDhubm_XK3d",
      target: "MU_X6xVS_TdT7h0JrVjEF",
      sourceHandle: "value",
      targetHandle: "keys",
    },
    {
      id: "reactflow__edge-OsMn8j1ZGawcfCT7jLI54list-qC96pVfi6llSZSLD2Y7xElist",
      type: "giraffeNodesEdge",
      source: "OsMn8j1ZGawcfCT7jLI54",
      target: "qC96pVfi6llSZSLD2Y7xE",
      sourceHandle: "list",
      targetHandle: "list",
    },
    {
      id: "reactflow__edge-MU_X6xVS_TdT7h0JrVjEFobject-OsMn8j1ZGawcfCT7jLI54object",
      type: "giraffeNodesEdge",
      source: "MU_X6xVS_TdT7h0JrVjEF",
      target: "OsMn8j1ZGawcfCT7jLI54",
      sourceHandle: "object",
      targetHandle: "object",
    },
    {
      id: "reactflow__edge-X1wOeKiorVQNgBgkpM81_object-MU_X6xVS_TdT7h0JrVjEFobject",
      type: "giraffeNodesEdge",
      source: "X1wOeKiorVQNgBgkpM81_",
      target: "MU_X6xVS_TdT7h0JrVjEF",
      sourceHandle: "object",
      targetHandle: "object",
    },
    {
      id: "reactflow__edge-Mm41BJ12z6gDsxcNz_eBZvalue-X1wOeKiorVQNgBgkpM81_string",
      type: "giraffeNodesEdge",
      source: "Mm41BJ12z6gDsxcNz_eBZ",
      target: "X1wOeKiorVQNgBgkpM81_",
      sourceHandle: "value",
      targetHandle: "string",
    },
    {
      id: "reactflow__edge-CS8WQhflSkUh15YnJor6dobject-j9u1j5YuZuj8Act3AQ-mzlist",
      type: "giraffeNodesEdge",
      source: "CS8WQhflSkUh15YnJor6d",
      target: "j9u1j5YuZuj8Act3AQ-mz",
      sourceHandle: "object",
      targetHandle: "list",
    },
    {
      id: "reactflow__edge-XrqceT91XP1vPyJF-hJpmobject-CS8WQhflSkUh15YnJor6dobject",
      type: "giraffeNodesEdge",
      source: "XrqceT91XP1vPyJF-hJpm",
      target: "CS8WQhflSkUh15YnJor6d",
      sourceHandle: "object",
      targetHandle: "object",
    },
    {
      id: "reactflow__edge-JMujwVWSNfPwpo1V0mfjXgroups-16a59d37-7b43-4eb2-bdfd-c324801f90ebpatterns",
      type: "giraffeNodesEdge",
      source: "JMujwVWSNfPwpo1V0mfjX",
      target: "16a59d37-7b43-4eb2-bdfd-c324801f90eb",
      sourceHandle: "groups",
      targetHandle: "patterns",
    },
    {
      id: "reactflow__edge-UVBE2hEvv49cafFVoPdbBlist-JMujwVWSNfPwpo1V0mfjXlist",
      type: "giraffeNodesEdge",
      source: "UVBE2hEvv49cafFVoPdbB",
      target: "JMujwVWSNfPwpo1V0mfjX",
      sourceHandle: "list",
      targetHandle: "list",
    },
    {
      id: "reactflow__edge-vxQlMbRUkPIDhubm_XK3dresult-UVBE2hEvv49cafFVoPdbBlist",
      type: "giraffeNodesEdge",
      source: "vxQlMbRUkPIDhubm_XK3d",
      target: "UVBE2hEvv49cafFVoPdbB",
      sourceHandle: "result",
      targetHandle: "list",
    },
    {
      id: "reactflow__edge-AWZkKlQFXdoqC--hlOPvpfeature-vxQlMbRUkPIDhubm_XK3dreturn value",
      data: {
        smoothStep: true,
        sourceHandleIndex: 1,
      },
      type: "giraffeNodesEdge",
      source: "AWZkKlQFXdoqC--hlOPvp",
      target: "vxQlMbRUkPIDhubm_XK3d",
      sourceHandle: "feature",
      targetHandle: "return value",
    },
    {
      id: "reactflow__edge-vxQlMbRUkPIDhubm_XK3dvalue-XrqceT91XP1vPyJF-hJpmvalue",
      data: {
        smoothStep: true,
        sourceHandleIndex: 1,
      },
      type: "giraffeNodesEdge",
      source: "vxQlMbRUkPIDhubm_XK3d",
      target: "XrqceT91XP1vPyJF-hJpm",
      sourceHandle: "value",
      targetHandle: "value",
    },
    {
      id: "reactflow__edge-vxQlMbRUkPIDhubm_XK3dvalue-EfwaCSa9cHXEtVExaumifvalue",
      data: {
        smoothStep: true,
        sourceHandleIndex: 1,
      },
      type: "giraffeNodesEdge",
      source: "vxQlMbRUkPIDhubm_XK3d",
      target: "EfwaCSa9cHXEtVExaumif",
      sourceHandle: "value",
      targetHandle: "value",
    },
    {
      id: "reactflow__edge-7a34f53e-93c5-47df-b653-8102627ccf67value-vxQlMbRUkPIDhubm_XK3dlist",
      type: "giraffeNodesEdge",
      source: "7a34f53e-93c5-47df-b653-8102627ccf67",
      target: "vxQlMbRUkPIDhubm_XK3d",
      sourceHandle: "value",
      targetHandle: "list",
    },
    {
      id: "reactflow__edge-EfwaCSa9cHXEtVExaumifobject-XrqceT91XP1vPyJF-hJpmobject",
      type: "giraffeNodesEdge",
      source: "EfwaCSa9cHXEtVExaumif",
      target: "XrqceT91XP1vPyJF-hJpm",
      sourceHandle: "object",
      targetHandle: "object",
    },
    {
      id: "reactflow__edge-j9u1j5YuZuj8Act3AQ-mzvalue-AWZkKlQFXdoqC--hlOPvpfeature",
      type: "giraffeNodesEdge",
      source: "j9u1j5YuZuj8Act3AQ-mz",
      target: "AWZkKlQFXdoqC--hlOPvp",
      sourceHandle: "value",
      targetHandle: "feature",
    },
    {
      id: "reactflow__edge-KIhrfKlVNnU1Rnf3Z_Qumvalue-EfwaCSa9cHXEtVExaumifobject",
      type: "giraffeNodesEdge",
      source: "KIhrfKlVNnU1Rnf3Z_Qum",
      target: "EfwaCSa9cHXEtVExaumif",
      sourceHandle: "value",
      targetHandle: "object",
    },
    {
      id: "reactflow__edge-7a9998bceab94bda81093b8c6f84ee89setback-c2de082d-e4b1-420e-b509-7336a126c32aobject",
      type: "giraffeNodesEdge",
      source: "7a9998bceab94bda81093b8c6f84ee89",
      target: "c2de082d-e4b1-420e-b509-7336a126c32a",
      sourceHandle: "setback",
      targetHandle: "object",
    },
    {
      id: "reactflow__edge-7a9998bceab94bda81093b8c6f84ee89envelope-16a59d37-7b43-4eb2-bdfd-c324801f90ebsite",
      type: "giraffeNodesEdge",
      source: "7a9998bceab94bda81093b8c6f84ee89",
      target: "16a59d37-7b43-4eb2-bdfd-c324801f90eb",
      sourceHandle: "envelope",
      targetHandle: "site",
    },
    {
      id: "reactflow__edge-27c92de04d8e432ebbd56d446d881dcctransform-7a9998bceab94bda81093b8c6f84ee89transform",
      type: "giraffeNodesEdge",
      source: "27c92de04d8e432ebbd56d446d881dcc",
      target: "7a9998bceab94bda81093b8c6f84ee89",
      sourceHandle: "transform",
      targetHandle: "transform",
    },
    {
      id: "reactflow__edge-ee235e8c8c9a4c149d4a8730f2ea5aebfeature-7a9998bceab94bda81093b8c6f84ee89input",
      type: "giraffeNodesEdge",
      source: "ee235e8c8c9a4c149d4a8730f2ea5aeb",
      target: "7a9998bceab94bda81093b8c6f84ee89",
      sourceHandle: "feature",
      targetHandle: "input",
    },
  ],
  nodes: [
    {
      id: "16a59d37-7b43-4eb2-bdfd-c324801f90eb",
      data: { value: { "2": -90 } },
      type: "daf90960-ae06-4503-a73d-148c1628dfd4",
      position: { x: 535, y: 332 },
    },
    {
      id: "ee235e8c8c9a4c149d4a8730f2ea5aeb",
      data: {},
      type: "1a4c8f02-f831-4bdd-b2f8-c9b647b10266",
      position: { x: -289, y: 401 },
    },
    {
      id: "7a9998bceab94bda81093b8c6f84ee89",
      data: {},
      type: "2fee2ab8-18fb-42d3-bd2e-153c2c291058",
      position: { x: 18, y: 450 },
    },
    {
      id: "27c92de04d8e432ebbd56d446d881dcc",
      data: { defaultValue: PATTERN_BOOK_ENVELOPE_FOR_NODE },
      type: "7bc5a2c9-09fe-47f8-961d-f8986f0b76b0",
      position: { x: -274, y: 481 },
    },
    {
      id: "d04f97c6-8570-4c08-b17b-3d17dc8981c7",
      data: {},
      type: "ed22a41d-e114-4734-876f-2362d02fc5ce",
      position: { x: 696, y: 525 },
    },
    {
      id: "c2de082d-e4b1-420e-b509-7336a126c32a",
      data: {
        value: {
          "1": "properties.layerId",
          "2": "patternBookSite",
        },
      },
      type: "2abd0c49-e62f-4139-86fd-c4c127420a3a",
      position: { x: 231, y: 526 },
    },
    {
      id: "JMujwVWSNfPwpo1V0mfjX",
      data: { value: { "1": "properties.id" } },
      type: "3c1349ec-fe2b-43ae-8570-42ce17748fab",
      position: { x: 393, y: 635 },
    },
    {
      id: "7a34f53e-93c5-47df-b653-8102627ccf67",
      data: {
        name: "keys",
        type: "string",
        isList: true,
        description: "the keys to pick",
        defaultValue: [...PATTERN_BOOK_KEYS_DEFAULT],
      },
      type: "71b71b93-a9ed-432f-94c4-b19cf60aa85b",
      position: { x: -481, y: 642 },
    },
    {
      id: "vxQlMbRUkPIDhubm_XK3d",
      data: {},
      type: "294538e6-0b31-40bd-bb0b-28ccd078a5ed",
      position: { x: 25, y: 728 },
    },
    {
      id: "UVBE2hEvv49cafFVoPdbB",
      data: {},
      type: "5c414178-576d-4d96-8551-582c0eccfce9",
      position: { x: 223, y: 729 },
    },
    {
      id: "00be7e4f-622e-491a-b1ad-09fa7b296d52",
      data: {
        width: 426.4000244140625,
        height: 668,
      },
      type: "ab62ba2f-ae3c-4670-b494-814760721566",
      style: { width: 256, height: 128 },
      position: { x: 1202, y: 842 },
    },
    {
      id: "j9u1j5YuZuj8Act3AQ-mz",
      data: {},
      type: "27bf350c-28f3-440d-a8ad-0ddc2278d537",
      position: { x: 474, y: 893 },
    },
    {
      id: "CS8WQhflSkUh15YnJor6d",
      data: { value: { "1": "properties.rotation" } },
      type: "2abd0c49-e62f-4139-86fd-c4c127420a3a",
      position: { x: 296, y: 941 },
    },
    {
      id: "KIhrfKlVNnU1Rnf3Z_Qum",
      data: {
        name: "point",
        type: "featureId",
        supportedShapes: ["LineString", "Polygon"],
      },
      type: "71b71b93-a9ed-432f-94c4-b19cf60aa85b",
      position: { x: -547, y: 971 },
    },
    {
      id: "XrqceT91XP1vPyJF-hJpm",
      data: { value: { "1": "properties.id" } },
      type: "2abd0c49-e62f-4139-86fd-c4c127420a3a",
      position: { x: -102, y: 1013 },
    },
    {
      id: "EfwaCSa9cHXEtVExaumif",
      data: {
        value: {
          "1": "properties.blockId",
          "2": "b7e1d65b312e4d60a65463857af07bb8",
        },
      },
      type: "2abd0c49-e62f-4139-86fd-c4c127420a3a",
      position: { x: -259, y: 1013 },
    },
    {
      id: "AWZkKlQFXdoqC--hlOPvp",
      data: {},
      type: "8095e934-4965-41fc-86ed-296b9078741d",
      position: { x: 656, y: 1026 },
    },
    {
      id: "Mm41BJ12z6gDsxcNz_eBZ",
      data: {
        name: "rotation",
        type: "string",
        defaultValue: PATTERN_BOOK_ROTATION_DEFAULT,
      },
      type: "71b71b93-a9ed-432f-94c4-b19cf60aa85b",
      position: { x: -539, y: 1225 },
    },
    {
      id: "X1wOeKiorVQNgBgkpM81_",
      data: {},
      type: "9fbbeceb-d9f0-45ed-81dd-00ea45ec670e",
      position: { x: -234, y: 1225 },
    },
    {
      id: "qC96pVfi6llSZSLD2Y7xE",
      data: {},
      type: "27bf350c-28f3-440d-a8ad-0ddc2278d537",
      position: { x: 351, y: 1280 },
    },
    {
      id: "OsMn8j1ZGawcfCT7jLI54",
      data: {},
      type: "2d51e023-f23a-40d7-93bb-d8f250322fbf",
      position: { x: 199, y: 1301 },
    },
    {
      id: "MU_X6xVS_TdT7h0JrVjEF",
      data: { value: { "1": "a" } },
      type: "f3330b82-fff3-493f-9fd7-bfbadcce2a2c",
      position: { x: 56, y: 1302 },
    },
  ],
  inputs: {
    keys: {
      name: "keys",
      type: "string",
      default: [...PATTERN_BOOK_KEYS_DEFAULT],
      description: "the keys to pick",
      isList: true,
    },
    point: {
      name: "point",
      type: "featureId",
      supportedShapes: ["LineString", "Polygon"],
    },
    rotation: {
      name: "rotation",
      type: "string",
      default: PATTERN_BOOK_ROTATION_DEFAULT,
    },
    feature: {
      name: "feature",
      type: "feature",
      description: "the feature to read",
    },
    "27c92de04d8e432ebbd56d446d881dcc": {
      name: "27c92de04d8e432ebbd56d446d881dcc",
      type: "7bc5a2c9-09fe-47f8-961d-f8986f0b76b0",
      default: PATTERN_BOOK_ENVELOPE_FOR_INPUTS,
    },
  },
  outputs: {
    feature: {
      name: "feature",
      type: "feature",
      description: "the feature to write",
    },
  },
  dependencies: [],
} as const;

export type PatternBookFlowDag = typeof PATTERN_BOOK_SHORT_LIST;
