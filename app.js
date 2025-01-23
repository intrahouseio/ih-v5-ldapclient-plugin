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
  if (!plugin.params.pass) {
    plugin.params.pass = plugin.getPassword(plugin.params);
  }

  const { url, login, pass, search_groups, groups_filter, search_users, users_filter } = plugin.params;

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
    if (message.param == 'syncUsers') return getUsersFromLDAP(message);
    if (message.param == 'syncGroups') return getGroupsFromLDAP(message);

    plugin.log('ERROR:Unknown command param: ' + message.param);
  });

  async function authUser(message) {
    const { param, dn, pbx, uuid } = message;
    const pw = Buffer.from(pbx, 'base64').toString();

    const con = new LDAPConnection({ url, dn, pw }, plugin);
    await con.tryBind();
    if (!con.error) {
      plugin.sendResponse(message, 1);
    } else {
      plugin.sendResponse({ uuid, dn, param, message: con.error }, 0);
    }
  }

  async function getUsersFromLDAP(message) {
    const attributes = parser.getUserSearchAttributes();
    plugin.log('search attributes ' + util.inspect(attributes));

    const response = await searchSub(search_users, { filter: users_filter, attributes });
    if (response && !response.error) {
      const data = parser.getMappedUsers(response);
      plugin.send({ type: 'syncUsers', data });
      plugin.sendResponse(message, 1);
    } else {
      const error = response ? response.error : 'Failed syncUsers operation';
      plugin.sendResponse({ ...message, message: error }, 0);
    }
    /**
    // Для теста без обращения к LDAP серверу
    const data = [
      {
        dn: 'CN=testLDAP55,CN=Users,DC=ih-systems,DC=lan',
        guid: 5555,
        login: 'testLDAP55',
        name: 'LDAP test 55',
        memberOf: 'CN=Пользователи домена,CN=Users,DC=ih-systems,DC=lan'
      }
    ];
    plugin.send({ type: 'syncUsers', data });
    plugin.sendResponse(message, 1);
    */
  }

  async function getGroupsFromLDAP(message) {
    const attributes = parser.getGroupSearchAttributes();
    plugin.log('search attributes ' + util.inspect(attributes));

    const response = await searchSub(search_groups, { filter: groups_filter, attributes });
    if (response && !response.error) {
      const data = parser.getMappedGroups(response);
      plugin.send({ type: 'syncGroups', data });
      plugin.sendResponse(message, 1);
    } else {
      const error = response ? response.error : 'Failed syncGroups operation';
      plugin.sendResponse({ ...message, message: error }, 0);
    }
  /**
    // Для теста без обращения к LDAP серверу
    const data = [{ dn: 'CN=Пользователи домена,CN=Users,DC=ih-systems,DC=lan', guid: 12345, name: 'Пользователи домена' }];
    plugin.send({ type: 'syncGroups', data });
    plugin.sendResponse(message, 1);
    */
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
    if (!con.error) return result;
  
    plugin.log('ERROR: ' + con.error);
    return {error: con.error};
  }
};
