import AsyncStorage from '@react-native-async-storage/async-storage';

const NODE_ID_KEY = '@sentinelmesh_node_id';
const MESH_MESSAGES_KEY = '@sentinelmesh_messages_v1';
const DEFAULT_TTL = 5;
const MAX_MESSAGES = 500;

function createNodeId() {
  const bytes = Array.from({ length: 3 }, () => Math.floor(Math.random() * 256));
  return `SM-${bytes.map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

async function readMessages() {
  try {
    const raw = await AsyncStorage.getItem(MESH_MESSAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeMessages(messages) {
  await AsyncStorage.setItem(MESH_MESSAGES_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
}

export async function getNodeId() {
  let nodeId = await AsyncStorage.getItem(NODE_ID_KEY);
  if (!nodeId) {
    nodeId = createNodeId();
    await AsyncStorage.setItem(NODE_ID_KEY, nodeId);
  }
  return nodeId;
}

export async function createEnvelope({ messageType, payload, priority = 'NORMAL', ttl = DEFAULT_TTL }) {
  const nodeId = await getNodeId();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const messageId = `${nodeId}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  return {
    protocolVersion: 1,
    messageId,
    originNodeId: nodeId,
    currentNodeId: nodeId,
    messageType,
    createdAt,
    expiresAt,
    ttl,
    hopCount: 0,
    priority,
    payload,
    deliveryState: 'QUEUED',
  };
}

export async function acceptEnvelope(envelope, currentNodeId) {
  if (!envelope?.messageId || !envelope?.originNodeId || !envelope?.messageType) {
    return { accepted: false, reason: 'INVALID_ENVELOPE' };
  }
  if (envelope.protocolVersion !== 1) return { accepted: false, reason: 'UNSUPPORTED_PROTOCOL' };
  if (new Date(envelope.expiresAt).getTime() <= Date.now()) return { accepted: false, reason: 'EXPIRED' };
  if (!Number.isInteger(envelope.ttl) || envelope.ttl <= 0 || envelope.hopCount >= envelope.ttl) {
    return { accepted: false, reason: 'TTL_EXHAUSTED' };
  }

  const receivingNodeId = currentNodeId || await getNodeId();
  const messages = await readMessages();
  const existing = messages.find((item) => item.messageId === envelope.messageId);
  if (existing) return { accepted: false, duplicate: true, reason: 'DUPLICATE', message: existing };

  const stored = {
    ...envelope,
    currentNodeId: receivingNodeId,
    hopCount: envelope.hopCount + 1,
    deliveryState: 'RECEIVED',
    receivedAt: new Date().toISOString(),
  };
  messages.push(stored);
  await writeMessages(messages);
  return { accepted: true, message: stored };
}

export async function markMessageState(messageId, deliveryState, details = {}) {
  const messages = await readMessages();
  const index = messages.findIndex((item) => item.messageId === messageId);
  if (index < 0) return null;
  messages[index] = { ...messages[index], deliveryState, ...details, updatedAt: new Date().toISOString() };
  await writeMessages(messages);
  return messages[index];
}

export async function getMeshMessages() {
  return readMessages();
}

export async function getPendingMeshMessages() {
  const messages = await readMessages();
  return messages.filter((message) => ['QUEUED', 'RECEIVED', 'RELAYING'].includes(message.deliveryState));
}
