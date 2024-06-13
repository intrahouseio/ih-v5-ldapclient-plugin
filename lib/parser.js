/**
 * 
 */

class Parser {
  constructor(params) {
    this.useAD = params.ldaptype == 'ad';
    this.userAttributes = {
      login: params.attr_user_login || this.defUserAttr('login'),
      name: params.attr_user_name || this.defUserAttr('name'),
      guid: this.defUserAttr('guid'),
      memberOf:'memberOf',
      dn:'dn'
    };
    this.groupAttributes = {
      name: params.attr_group_name || this.defGroupAttr('name'),
      guid: this.defGroupAttr('guid'),
      dn:'dn'
    }
  }

  
  defUserAttr(attr) {
    // Уникальный идентификатор - 
    if (attr == 'guid') return this.useAD ? 'objectGUID;binary' : 'uidNumber';

    if (attr == 'login') return this.useAD ? 'sAMAccountName' : 'dn';
    if (attr == 'name') return this.useAD ? 'name' : 'cn';
  }

  defGroupAttr(attr) {
    // Уникальный идентификатор - 
    if (attr == 'guid') return this.useAD ? 'objectGUID;binary' : 'gidNumber';
    if (attr == 'name') return this.useAD ? 'name' : 'cn';
  }


  getMappedUsers(arr) {
    const f_login = this.userAttributes.login;
    const f_name = this.userAttributes.name;
    const f_guid = this.userAttributes.guid;
    const result = [];
    arr.forEach(item => {
      result.push({ dn: item.dn, guid: item[f_guid], login: item[f_login], name:item[f_name], memberOf: item.memberOf });
    });
    return result;
  }

  getMappedGroups(arr) {
    const f_name = this.userAttributes.name;
    const f_guid = this.userAttributes.guid;
    const result = [];
    arr.forEach(item => {
      result.push({ dn: item.dn, guid: item[f_guid], name:item[f_name]});
    });
    return result;
  }

  getUserSearchAttributes() {
    return Object.values(this.userAttributes);
  }

  getGroupSearchAttributes() {
    return Object.values(this.groupAttributes);
  }

}

module.exports = Parser;

// WINDOWS - AD
// (objectClass=group)
/*
  {
    dn: 'CN=Пользователи домена,CN=Users,DC=ih-systems,DC=lan',
    objectClass: [ 'top', 'group' ],
    cn: 'Пользователи домена',
    description: 'Все пользователи домена',
    distinguishedName: 'CN=Пользователи домена,CN=Users,DC=ih-systems,DC=lan',
    instanceType: '4',
    whenCreated: '20240527144211.0Z',
    whenChanged: '20240527144211.0Z',
    uSNCreated: '12348',
    memberOf: 'CN=Пользователи,CN=Builtin,DC=ih-systems,DC=lan',
    uSNChanged: '12350',
    name: 'Пользователи домена',
    objectGUID: 'L�����\x1BN��)�Ʉ+�',
    objectSid: '\x01\x05\x00\x00\x00\x00\x00\x05\x15\x00\x00\x00\x05h�\x02��78&�5�\x01\x02\x00\x00',
    sAMAccountName: 'Пользователи домена',
    sAMAccountType: '268435456',
    groupType: '-2147483646',
    objectCategory: 'CN=Group,CN=Schema,CN=Configuration,DC=ih-systems,DC=lan',
    isCriticalSystemObject: 'TRUE',
    dSCorePropagationData: [ '20240527144211.0Z', '16010101000001.0Z' ]
  },
  */

// (objectClass=person)
/*
{
  dn: 'CN=admin1,CN=Users,DC=ih-systems,DC=lan',
  objectClass: [ 'top', 'person', 'organizationalPerson', 'user' ],
  cn: 'admin1',
  givenName: 'admin1',
  distinguishedName: 'CN=admin1,CN=Users,DC=ih-systems,DC=lan',
  instanceType: '4',
  whenCreated: '20240527150542.0Z',
  whenChanged: '20240529123214.0Z',
  displayName: 'admin1',
  uSNCreated: '12806',
  memberOf: [
    'CN=Администраторы основного уровня предприятия,CN=Users,DC=ih-systems,DC=lan',
    'CN=Администраторы основного уровня,CN=Users,DC=ih-systems,DC=lan',
    'CN=Администраторы домена,CN=Users,DC=ih-systems,DC=lan',
    'CN=Администраторы Hyper-V,CN=Builtin,DC=ih-systems,DC=lan',
    'CN=Пользователи удаленного рабочего стола,CN=Builtin,DC=ih-systems,DC=lan',
    'CN=Администраторы,CN=Builtin,DC=ih-systems,DC=lan'
  ],
  uSNChanged: '218625',
  name: 'admin1',
  objectGUID: '���gP�\\M��O%*\f�/',
  userAccountControl: '4784640',
  badPwdCount: '0',
  codePage: '0',
  countryCode: '0',
  badPasswordTime: '133614715542503178',
  lastLogoff: '0',
  lastLogon: '133614719527515344',
  pwdLastSet: '133614595341218404',
  primaryGroupID: '513',
  objectSid: '\x01\x05\x00\x00\x00\x00\x00\x05\x15\x00\x00\x00\x05h�\x02��78&�5�Q\x04\x00\x00',
  adminCount: '1',
  accountExpires: '9223372036854775807',
  logonCount: '52',
  sAMAccountName: 'admin1',
  sAMAccountType: '805306368',
  userPrincipalName: 'HTTP/intrascada2.ih-systems.lan@ih-systems.lan',
  servicePrincipalName: [
    'HTTP/intrascada2.ih-systems.lan',
    'HTTP/intrascada2.ih-systems.lan@ih-systems.lan'
  ],
  objectCategory: 'CN=Person,CN=Schema,CN=Configuration,DC=ih-systems,DC=lan',
  dSCorePropagationData: [
    '20240528135721.0Z',
    '20240528132653.0Z',
    '20240527150542.0Z',
    '16010101000000.0Z'
  ],
  lastLogonTimestamp: '133613004774614062',
  'msDS-SupportedEncryptionTypes': '16'
}
*/

