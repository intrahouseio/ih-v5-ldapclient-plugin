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
  const passw = plugin.getPassword(plugin.params)
  // bind для проверки
  await tryStartBind(login, passw);

  async function tryStartBind(dn, pw) {
    const con = new LDAPConnection({ url, dn, pw }, plugin);
    await con.tryBind();
    if (con.error) plugin.exit(1, con.error);
  }

  plugin.onCommand(async message => {
    try {
      plugin.log('Get command ' + util.inspect(message), 1);
      if (message.param == 'authUser') return await authUser(message);
      if (message.param == 'syncUsers') return await getUsersFromLDAP(message);
      if (message.param == 'syncGroups') return await getGroupsFromLDAP(message);
      throw {message:'Unknown command param: ' + message.param};
    } catch (e) {
      const errstr = typeof e === 'object' ? e.message : message.param +' error';
      plugin.sendResponse({ ...message, message: errstr }, 0);
      plugin.log('ERROR: ' + errstr);
    }
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

  async function getUsersFromLDAP(message) {
    const attributes = parser.getUserSearchAttributes();
    plugin.log('search attributes ' + util.inspect(attributes));
    let response = await searchSub(search_users, { filter: users_filter, attributes });
    if (!response || !Array.isArray(response)) {
      throw {message:'No valid users response '};  
    }

    // Если AD, расширяем memberOf до транзитивного
    if (parser.useAD) {
      plugin.log('Expanding to transitive group membership for AD', 1);
      for (let user of response) {
        if (user.dn) {
          const transitiveGroups = await searchTransitiveGroups(user.dn);
          if (transitiveGroups && Array.isArray(transitiveGroups)) {
            // Обновляем memberOf: массив DN групп
            user.memberOf = transitiveGroups.map(g => g.dn).sort(); // Сортируем для consistency
            const loginField = parser.userAttributes.login || 'dn';
            plugin.log(`User ${user[loginField]} has ${user.memberOf.length} transitive groups`, 2);
          } else {
            plugin.log(`No transitive groups for user ${user.dn}`, 2);
            user.memberOf = []; // Fallback
          }
        }
      }

      // Добавляем primary group, если не Domain Users или нужно явно
      plugin.log('Adding primary group to users', 2);
      for (let user of response) {
        const pgId = user.primaryGroupID;
        if (pgId && pgId != 513) {  // 513 = Domain Users
          const primaryGroupDn = await searchPrimaryGroup(pgId);
          if (primaryGroupDn && !user.memberOf.includes(primaryGroupDn)) {
            user.memberOf.push(primaryGroupDn);
            user.memberOf.sort();
            plugin.log(`Added primary group ${primaryGroupDn} for user ${user[parser.userAttributes.login || 'dn']}`, 2);
          }
        } else if (pgId == 513) {
          // Опционально: Добавь Domain Users явно
          const domainUsersDn = 'CN=Domain Users,CN=Users,DC=basis,DC=net';  // Из твоего примера; вынеси в params
          if (!user.memberOf.includes(domainUsersDn)) {
            user.memberOf.push(domainUsersDn);
            user.memberOf.sort();
            plugin.log(`Added default Domain Users for ${user[parser.userAttributes.login || 'dn']}`, 2);
          }
        }
      }
    }

    const data = parser.getMappedUsers(response);
    plugin.send({ type: 'syncUsers', data });
    plugin.sendResponse({...message}, 1);
  }

  async function getGroupsFromLDAP(message) {
    const attributes = parser.getGroupSearchAttributes();
    plugin.log('search attributes ' + util.inspect(attributes));
    const response = await searchSub(search_groups, { filter: groups_filter, attributes });
    if (!response || !Array.isArray(response)) {
      throw {message:'No valid groups'};  
    }

    const data = parser.getMappedGroups(response);
    plugin.send({ type: 'syncGroups', data });
    plugin.sendResponse({...message}, 1);
  }

  async function searchSub(dn_str, opt = {}) {
    const con = new LDAPConnection({ url, dn: login, pw: passw }, plugin);
    let result = await con.bindAndSearch(dn_str, { scope: 'sub', ...opt });

    if (!result) {
      throw{message: 'No response for LDAP search: ' + dn_str};
    } 
    if (!Array.isArray(result)) {
      throw{message:'Bad response for search: ' + util.inspect(result)};

    }

    return result;
  }

  async function searchTransitiveGroups(userDn) {
    if (!userDn) return [];

    const chainOid = '1.2.840.113556.1.4.1941'; // LDAP_MATCHING_RULE_IN_CHAIN для AD
    const groupFilter = `(&(objectClass=group)(member:${chainOid}:=${userDn}))`;
    const groupAttributes = parser.getGroupSearchAttributes(); // name, guid, dn

    plugin.log(`Searching transitive groups for user ${userDn} with filter: ${groupFilter}`, 2);
    const response = await searchSub(search_groups, { 
      filter: groupFilter, 
      attributes: groupAttributes 
    });

    if (!response || !Array.isArray(response)) {
      plugin.log(`No transitive groups response for ${userDn}`, 2);
      return [];
    }

    // Маппим только нужное (dn уже есть)
    return parser.getMappedGroups(response); // Возвращаем массив {dn, guid, name}, но используем только dn
  }

  async function searchPrimaryGroup(groupId) {
    if (!groupId) return null;

    const primaryFilter = parser.useAD 
      ? `(primaryGroupToken=${groupId})`  // AD-specific
      : `(gidNumber=${groupId})`;  // Non-AD

    const fullFilter = `(&(objectClass=group)${primaryFilter})`;
    plugin.log(`Searching primary group ID ${groupId} with filter: ${fullFilter}`, 2);

    const response = await searchSub(search_groups, { 
      filter: fullFilter, 
      attributes: ['dn']  // Только DN нужно
    });

    if (response && Array.isArray(response) && response.length > 0) {
      return response[0].dn;  // Первая (и единственная) группа
    }
    plugin.log(`No primary group found for ID ${groupId}`, 2);
    return null;
  }
};
