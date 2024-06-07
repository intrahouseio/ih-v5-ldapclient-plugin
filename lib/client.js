/**
 * client.js
 *
 */

const LdapClient = require('ldapjs-client');

const utils = require('./utils');

class LDAPConnection {
  constructor({ url, dn, pw }, plugin) {
    this.plugin = plugin;
    this.url = url;
    this.dn = dn;
    this.pw = pw;
    this.client = new LdapClient({ url });
  }

  async bind() {
    try {
      this.plugin.log('Try bind to ' + this.url + ' for ' + this.dn, 1);
      await this.client.bind(this.dn, this.pw);
      this.plugin.log('Bind OK', 1);
    } catch (e) {
      this.error =
        'Bind to ' + this.url + ' for ' + this.dn + ' failed: ' + utils.getErrStrWoTrace(e);
    }
  }

  async tryBind() {
    await this.bind();
    const result = this.error ? this.error : 'OK';
    this.client.destroy();
    return result;
  }

  async bindAndSearch(dn_str, opt = {}) {
    try {
      await this.bind();
      if (this.error) return;
      const result = await this.client.search(dn_str, { scope: 'sub', ...opt });
      this.client.destroy();
      return result;
    } catch (e) {
      this.error =
        'Search ' +
        dn_str +
        ' with opt =' +
        JSON.stringify(opt) +
        ' failed: ' +
        utils.getErrStrWoTrace(e);
    }
  }
}

module.exports = LDAPConnection;
