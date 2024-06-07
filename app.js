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

    plugin.log('authUser dn=' + dn + ' pbx=' + pbx);
    const pw = Buffer.from(pbx, 'base64').toString();
    plugin.log('authUser pass=' + pw);

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
    const response = await searchSub(search_groups, { filter: groups_filter, attributes });
    if (response) {
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

  /*
  const client = new LdapClient({ url });

  // bind для проверки
  try {
    plugin.log('Try bind to ' + url);
    await client.bind(login, pass);
    plugin.log('Bind OK');
    
  } catch (e) {
    plugin.exit(1, 'ERROR: Bind to ' + url + ' with dn=' + login + ' failed: ' + util.inspect(e));
  }
 

  plugin.onCommand(async message => {
    plugin.log('Get command ' + util.inspect(message), 1);

    if (message.param == 'authUser') {
      const { param, dn, pbx, uuid } = message;
      try {
        plugin.log('authUser dn=' + dn + ' pbx=' + pbx);
        const userPass = Buffer.from(pbx, 'base64').toString();
        plugin.log('authUser pass=' + userPass);
        await client.bind(dn, userPass);
        plugin.log('Bind OK');
        plugin.sendResponse(message, 1);
      } catch (e) {
        const errStr = 'ERROR: Bind with dn=' + dn + ' failed: ' + utils.getErrStrWoTrace(e);
        plugin.log(errStr);
        plugin.sendResponse({uuid, dn, param, message:errStr}, 0);
      }
      // client.unbind();
      return;
    }

    // Для sync* response не отправляем. После получения данных отправляем
    // {type:'syncGroups', data:[]}  {type:'syncUsers', data:[]}

    if (message.param == 'syncUsers') {
      try {
        const data = await getUsersFromLDAP();
        plugin.send({ type: 'syncUsers', data });
      } catch (e) {
        plugin.log('ERROR: getUsersFromLDAP: ' + util.inspect(e));
      }
      return;
    }

    if (message.param == 'syncGroups') {
      try {
        const data = await getGroupsFromLDAP();
        plugin.send({ type: 'syncGroups', data });
      } catch (e) {
        plugin.log('ERROR: getGroupsFromLDAP: ' + util.inspect(e));
      }
      return;
    }

    plugin.log('ERROR:Unknown command param: ' + message.param);
  });

  async function searchSub(dn_str, opt = {}) {
    try {
      await client.bind(login, pass);
      const result = await client.search(dn_str, { scope: 'sub', ...opt });
      client.unbind();
      return result;
    } catch (e) {
      plugin.exit(2, 'ERROR: search ' + dn_str + ': ' + util.inspect(e));
    }
  }

  async function getUsersFromLDAP() {
    try {
      const attributes = parser.getUserSearchAttributes();
      plugin.log('search attributes ' + util.inspect(attributes));
      const response = await searchSub(search_users, { filter: users_filter, attributes });
      if (!response) throw { message: 'No response for LDAP search: ' + search_users };

      if (!Array.isArray(response))
        throw { message: 'Invalid response for search: ' + util.inspect(response) };

      plugin.log('response for LDAP search: ' + util.inspect(response));
      return parser.getMappedUsers(response);
    } catch (e) {
      throw e;
    }
  }

  async function getGroupsFromLDAP() {
    try {
      const attributes = parser.getGroupSearchAttributes();
      plugin.log('search attributes ' + util.inspect(attributes));

      const response = await searchSub(search_groups, { filter: groups_filter, attributes });
      if (!response) throw { message: 'No response for LDAP search: ' + search_groups };

      if (!Array.isArray(response))
        throw { message: 'Bad response for search: ' + util.inspect(response) };

      plugin.log('response for LDAP search: ' + util.inspect(response));
      return parser.getMappedGroups(response);
    } catch (e) {
      throw e;
    }
  }
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
*/
};
