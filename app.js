/**
 * app.js
 *
 *   Основной модуль плагина
 *
 */

const util = require('util');

const LDAPConnection = require('./lib/client');
const Parser = require('./lib/parser');

module.exports = async function(plugin) {
  const {
    url,
    login,
    pass,
    search_groups,
    groups_filter,
    search_users,
    users_filter
  } = plugin.params;

  const parser = new Parser(plugin.params);

  // bind для проверки
  await tryStartBind(login, pass);

  async function tryStartBind(dn, pw) {
    const con = new LDAPConnection({ url, dn, pw }, plugin);
    await con.tryBind();
    if (con.error) plugin.exit(1, con.error);
  }

  plugin.onCommand(async message => {
    plugin.log('Get command ' + util.inspect(message), 1);
    if (message.param == 'authUser') return authUser(message);
    if (message.param == 'syncUsers') return getUsersFromLDAP();
    if (message.param == 'syncGroups') return getGroupsFromLDAP();

    plugin.log('ERROR:Unknown command param: ' + message.param);
  });

  async function authUser(message) {
    const { param, dn, pbx, uuid } = message;

    // plugin.log('authUser dn=' + dn + ' pbx=' + pbx);
    const pw = Buffer.from(pbx, 'base64').toString();
    // plugin.log('authUser pass=' + pw);

    const con = new LDAPConnection({ url, dn, pw }, plugin);
    await con.tryBind();
    if (!con.error) {
      plugin.sendResponse(message, 1);
    } else {
      plugin.sendResponse({ uuid, dn, param, message: con.error }, 0);
    }
  }

  async function getUsersFromLDAP() {
    const attributes = parser.getUserSearchAttributes();
    plugin.log('search attributes ' + util.inspect(attributes));
    const response = await searchSub(search_users, { filter: users_filter, attributes });
    if (response) {
      const data = parser.getMappedUsers(response);
      plugin.send({ type: 'syncUsers', data });
    }
  }

  async function getGroupsFromLDAP() {
    const attributes = parser.getGroupSearchAttributes();
    plugin.log('search attributes ' + util.inspect(attributes));
    let response = await searchSub(search_groups, { filter: groups_filter, attributes });
    if (response) {
      response = response.map(i => ({ ...i, name: i.cn }))
      const data = parser.getMappedGroups(response);
      plugin.send({ type: 'syncGroups', data });
    }
  }

  async function searchSub(dn_str, opt = {}) {
    const con = new LDAPConnection({ url, dn: login, pw: pass }, plugin);
    let result = await con.bindAndSearch(dn_str, { scope: 'sub', ...opt });

    if (!result) {
      con.error = 'No response for LDAP search: ' + dn_str;
    } else if (!Array.isArray(result)) {
      con.error = 'Bad response for search: ' + util.inspect(result);
      result = '';
    }

    if (con.error) plugin.log('ERROR: ' + con.error);
    return result;
  }
};
