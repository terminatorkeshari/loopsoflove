const { verifyUser, isAdminEmail } = require('./_lib/supabase');

module.exports = async (req, res) => {
  const json = (statusCode, body) => res.status(statusCode).json(body);
  const user = await verifyUser(req);
  if (!user) return json(200, { user: null });
  return json(200, { user: { id: user.id, email: user.email, isAdmin: isAdminEmail(user.email) } });
};
