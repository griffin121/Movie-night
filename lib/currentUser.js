const { cookies } = require("next/headers");
const { getUserByToken, SESSION_COOKIE } = require("./auth");

function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return getUserByToken(token);
}

module.exports = { getCurrentUser };
