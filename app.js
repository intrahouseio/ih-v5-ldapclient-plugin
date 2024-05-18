/**
 * app.js
 *
 *   Основной модуль плагина
 *
 */
const util = require('util');
const LdapClient = require('ldapjs-client');

module.exports = async function(plugin) {
  const { url, login, pass, search_groups, search_users } = plugin.params;
 
  const client = new LdapClient({ url });
  await bind();

  const gresponse = await searchSub(search_groups);
  plugin.log('Response groups: ' + util.inspect(gresponse));

  const response = await searchSub(search_users);
  plugin.log('Response people: ' + util.inspect(response));

  async function bind() {
    try {
      await client.bind(login, pass);
      plugin.log('Bind to ' + url + ' OK');
    } catch (e) {
      plugin.exit(1, 'ERROR: Bind to ' + url + ': ' + util.inspect(e));
    }
  }

  async function searchSub(dn_str, opt = {}) {
    try {
      return client.search(dn_str, { scope: 'sub', ...opt });
    } catch (e) {
      plugin.exit(2, 'ERROR: search ' + dn_str + ': ' + util.inspect(e));
    }
  }
};

/*
groups: [
  {
    dn: 'ou=groups,dc=ih-systems,dc=com',
    ou: 'groups',
    objectClass: [ 'organizationalUnit', 'top' ]
  },
  {
    dn: 'cn=support,ou=groups,dc=ih-systems,dc=com',
    cn: 'support',
    gidNumber: '502',
    objectClass: [ 'posixGroup', 'top' ]
  },
  {
    dn: 'cn=engineers,ou=groups,dc=ih-systems,dc=com',
    cn: 'engineers',
    gidNumber: '501',
    objectClass: [ 'posixGroup', 'top' ]
  }
]
*/
/*
people: [
  {
    dn: 'ou=people,dc=ih-systems,dc=com',
    ou: 'people',
    objectClass: [ 'organizationalUnit', 'top' ]
  },
  {
    dn: 'cn=ivan ivanov,ou=people,dc=ih-systems,dc=com',
    givenName: 'ivan',
    sn: 'ivanov',
    cn: 'ivan ivanov',
    uid: 'iivanov',
    userPassword: '{MD5}4QrcOUm6Wau+VuBX8g+IPg==',
    uidNumber: '1000',
    gidNumber: '501',
    homeDirectory: '/home/users/iivanov',
    objectClass: [ 'inetOrgPerson', 'posixAccount', 'top' ]
  },
  {
    dn: 'cn=petr petrov,ou=people,dc=ih-systems,dc=com',
    givenName: 'petr',
    sn: 'petrov',
    cn: 'petr petrov',
    uid: 'ppetrov',
    userPassword: '{MD5}4QrcOUm6Wau+VuBX8g+IPg==',
    uidNumber: '1001',
    gidNumber: '501',
    homeDirectory: '/home/users/ppetrov',
    objectClass: [ 'inetOrgPerson', 'posixAccount', 'top' ]
  },
  {
    dn: 'cn=test1 test1,ou=people,dc=ih-systems,dc=com',
    givenName: 'test1',
    sn: 'test1',
    cn: 'test1 test1',
    uid: 'test1',
    userPassword: '{MD5}gdyb21LQTcIANtvYMT7QVQ==',
    uidNumber: '1003',
    gidNumber: '501',
    homeDirectory: '/home/users/test1',
    objectClass: [ 'inetOrgPerson', 'posixAccount', 'top' ]
  },
  {
    dn: 'cn=viktor viktorov,ou=people,dc=ih-systems,dc=com',
    givenName: 'viktor',
    sn: 'viktorov',
    cn: 'viktor viktorov',
    uid: 'vviktorov',
    userPassword: '{MD5}4QrcOUm6Wau+VuBX8g+IPg==',
    uidNumber: '1002',
    gidNumber: '502',
    homeDirectory: '/home/users/vviktorov',
    objectClass: [ 'inetOrgPerson', 'posixAccount', 'top' ]
  }
]
*/
