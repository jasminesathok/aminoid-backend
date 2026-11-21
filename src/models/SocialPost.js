const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const SocialPost = {
  list: (eid) => db.query('SELECT * FROM social_posts WHERE enterprise_id = ? ORDER BY created_at DESC', [eid]),
  findById: (id) => db.query('SELECT * FROM social_posts WHERE id = ?', [id]),
  listStats:(eid) => db.query('SELECT * FROM social_platform_stats WHERE enterprise_id = ? OR enterprise_id IS NULL ORDER BY platform ASC', [eid]),

  create: ({ content, platform, status, scheduled_at, campaign_id, eid }) => {
    const id = uuidv4();
    return db.query(
      "INSERT INTO social_posts (id, content, platform, status, likes, comments, shares, reach, scheduled_at, campaign_id, enterprise_id) VALUES (?,?,?,?,0,0,0,'—',?,?,?)",
      [id, content, platform, status || 'Draft', scheduled_at || null, campaign_id || null, eid]
    ).then(() => id);
  },

  update: (id, { content, platform, status, likes, comments, shares, reach, scheduled_at, campaign_id }) =>
    db.query(
      'UPDATE social_posts SET content=COALESCE(?,content), platform=COALESCE(?,platform), status=COALESCE(?,status), likes=COALESCE(?,likes), comments=COALESCE(?,comments), shares=COALESCE(?,shares), reach=COALESCE(?,reach), scheduled_at=COALESCE(?,scheduled_at), campaign_id=COALESCE(?,campaign_id) WHERE id=?',
      [content, platform, status, likes, comments, shares, reach, scheduled_at, campaign_id, id]
    ),

  delete: (id) => db.query('DELETE FROM social_posts WHERE id = ?', [id]),
};

module.exports = SocialPost;