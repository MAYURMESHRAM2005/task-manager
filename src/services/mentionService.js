const User = require('../models/User');
const Notification = require('../models/Notification');
const { emitToUser } = require('./socketService');

/**
 * Parse @mentions from text content
 * Returns array of mentioned usernames
 */
const parseMentions = (text) => {
  if (!text) return [];
  const mentionRegex = /@(\w+(?:\.\w+)*)/g;
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return [...new Set(mentions)];
};

/**
 * Resolve usernames to user IDs
 */
const resolveMentions = async (usernames) => {
  if (!usernames || usernames.length === 0) return [];

  // Build regex for exact word matching
  const patterns = usernames.map((name) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));

  const users = await User.find({
    $or: [
      { name: { $in: patterns } },
      { email: { $in: patterns } },
    ],
  }).select('_id name email');

  return users;
};

/**
 * Send mention notifications to users
 */
const notifyMentions = async (mentionedUsers, { entityType, entityId, entityTitle, actorId, actorName }) => {
  for (const user of mentionedUsers) {
    if (user._id.toString() === actorId.toString()) continue; // Don't notify yourself

    const notification = await Notification.create({
      user: user._id,
      type: 'COMMENT_ADDED', // Reuse existing type for mentions
      message: `${actorName} mentioned you in "${entityTitle}"`,
      relatedEntity: { type: entityType, id: entityId },
    });

    // Real-time push via Socket.IO
    emitToUser(user._id, 'notification', {
      type: 'MENTION',
      message: notification.message,
      entityType,
      entityId,
      timestamp: notification.createdAt,
    });
  }
};

module.exports = { parseMentions, resolveMentions, notifyMentions };
