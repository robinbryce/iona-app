import './nodeconsole.css'
import { LitElement, html } from 'lit';
import { connect } from 'pwa-helpers';
import '@vaadin/vaadin-text-field';
import '@vaadin/vaadin-button';

import { ethers } from 'ethers'
import MetaMaskOnboarding from '@metamask/onboarding';

import { store } from '../redux/store.js';

import {
  updateProviderPath,
  updateMethod,
  updateParams,
  updateAPIKey,
  callRawMethod,
  callProviderMethod,
} from './nodeconsole-actions.js'

const METAMASK_CONNECT = "connect";
const METAMASK_INSTALL = "install";

class NodeConsole extends connect(store)(LitElement) {

  render() {
    return html`
     <style>
        node-console {
          display: block;
          max-width: 800px;
          margin: 0 auto;
        }
        node-console .input-layout {
          width: 100%;
          display: flex;
        }
        node-console .input-layout vaadin-text-field {
          flex: 1;
          margin-right: var(--spacing);
        }
        node-console .results-list {
          margin-top: var(--spacing);
        }
        node-console .visibility-filters {
          margin-top: calc(4 * var(--spacing));
        }
      </style>

      <vaadin-button theme="primary" data-val="${MetaMaskOnboarding.isMetaMaskInstalled() ? METAMASK_CONNECT : METAMASK_INSTALL}"
          @click="${this.onClickConnectOrInstall}">
          ${MetaMaskOnboarding.isMetaMaskInstalled() ? "Connect Wallet" : "Install MetaMask"}
      </vaadin-button>

      <vaadin-list-box selected="0">
      ${
        (this.accounts ? this.accounts : [])
        .map(
        a => html`
        <vaadin-item>${a}</vaadin-item>
        `
        )
      }
      </vaadin-list-box>

      <div class="input-layout"
        @keyup="${this.shortcutListener}"> 

      <vaadin-text-field
        placeholder="path to provider, relative, same host or remote"
        value="${this.providerpath}" 
        @change="${this.updateProviderPath}"> 
      </vaadin-text-field>

      <vaadin-text-field
        placeholder="Method, eg eth_blockNumber"
        value="${this.method}" 
        @change="${this.updateMethod}"> 
      </vaadin-text-field>

      <vaadin-text-field
        placeholder="Method params, eg []"
        value="${this.params}" 
        @change="${this.updateParams}"> 
      </vaadin-text-field>

      <vaadin-text-field
        placeholder="API key for request"
        value="${this.apikey}" 
        @change="${this.updateAPIKey}"> 
      </vaadin-text-field>


      <vaadin-button
        theme="primary"
        @click="${this.callRawMethod}"
        > 
          Raw Call
      </vaadin-button>

      <vaadin-button
        theme="primary"
        @click="${this.callProviderMethod}"
        > 
          Call
      </vaadin-button>

      <div class="results-list">
        ${
          this.results.map(
            r => html`
              <div class="result-item">
              <ul>
                <li>
                    ${JSON.stringify({method: r.request.method, params: r.request.params, id: r.request.id}, null, 2)}
                    ${r.response.ok ? JSON.stringify(r.response.data, null, 2) : `${r.request.path} ${r.response.data.statusText}`}
                </li>
              </ul>
              </div>
            `
          )
        }
      </div>
    </div>
    `;
  }

  static get properties() {
    return {
      providerpath: {type: String},
      method: {type: String},
      params: {type: String},
      apikey: {type: String},
      results: {type: Array},
      accounts: {type: Array}
    };
  }

  constructor () {
    super();

    this.notices = [];

    this.chainId = null;
    this.network = null;
    this.idToken = null;
    this.apikey = '';
    this.accounts = [];

    this.requestId = 1;
    this.provider = null;
    this.onboarding = null;
  }

  stateChanged(state) {

    this.chainId = state.nodeConsole.chainId;
    this.providerpath = state.nodeConsole.providerpath;
    this.nodename = state.nodeConsole.nodename;
    this.idToken = state.auth.idToken;

    this.accounts = state.nodeConsole.accounts;
    this.method = state.nodeConsole.method;
    this.params = state.nodeConsole.params;
    this.apikey = state.nodeConsole.apikey;
    this.results = state.nodeConsole.results;
  }

  async createProvider(chainId) {
    const ethereum = window.ethereum;

    if (ethereum == null) {
      throw new Error('ethereum provider not present');
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum, chainId);
    const accounts = await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    return [provider, signer, accounts];
  }

  async ensureNetwork() {

    const ethereum = window.ethereum;

    if (ethereum == null) {
      throw new Error('ethereum provider not present');
    }

    let scheme = 'https'
    let url = this.providerpath;
    if (! url.startswith('http')) {
      scheme = window.location.host.startsWith('localhost') ? 'http' : 'https';
      if (! url.startswith('/') ) {
        url = "/" + url;
      }
    }
    url = `{scheme}://{window.location.host}{url}`

    const network = {
      chainId: this.chainId,
      chainName: "iona chain1",
      rpcUrls: [`{url}/${this.idToken}`],
    };

    try {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [network]
      });
      return network;
    } catch (addError) {
      console.log(`Adding network failed: ${addError.toString()}`);
      throw (addError);
    }

    /*
    try {
      await ethereum.request({method: 'wallet_switchEthereumChain', params: [{chainId: network.chainId}]})
      return network;

    } catch (err) {
      if (err.code === 4001) {
        console.log(`User denied the request to switch networks: ${err.toString()}`)
        throw (err);
      }
      // this.notices.push(`Adding network failed: ${err.toString()}`);
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [network]
        });
        return network;

      } catch (addError) {
        // this.notices.push(`Adding network failed: ${addError.toString()}`);
        throw (addError);
      }
    }
    */
  }

  onClickConnectOrInstall(e) {

    const action = e.target.getAttribute('data-val');
    if (action == METAMASK_CONNECT) {

      this.ensureNetwork()
        .then(network => {
          this.network = network;
          return this.createProvider(parseInt(network.chainId));
        })
        .then(ensured => {
            [this.provider, this.signer, this.accounts] = ensured;
        });
      return;
    }

    if (action != METAMASK_INSTALL) {
        return;
    }
    if (!this.onboarding) {
        this.onboarding = new MetaMaskOnboarding();
    }
    this.onboarding.startOnboarding();
    // There is no need to 'stop' on boarding. MetaMask does its own thing (its a browser plugin)
  }


  shortcutListener(e) {
    if (e.key === 'Enter') {
      this.rawRequest();
    }
  }

  updateMethod(e) {
    store.dispatch(updateMethod(e.target.value))
  }
  updateParams(e) {
    store.dispatch(updateParams(e.target.value))
  }
  updateAPIKey(e) {
    store.dispatch(updateAPIKey(e.target.value))
  }

  _callRawMethod0(request, token) {

    return new Promise((resolve, reject) => {

        const params = JSON.parse(request.params);

        const data=JSON.stringify({jsonrpc:"2.0", method: request.method, params: params, id: request.id});
        $.ajax({
          url: request.path,
          type: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          data: data,
          success: function(result) {
            resolve(result);
          },
          error: function(error) {
            reject(error);
          }
        })
    });
  }

  _callRawMethod(request) {

    return new Promise((resolve, reject) => {

      const params = JSON.parse(request.params);
      const data=JSON.stringify({jsonrpc:"2.0", method: request.method, params: params, id: request.id});

      $.ajax({
        url: request.path,
        type: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        data: data,
        success: function(result) {
          resolve(result);
        },
        error: function(error) {
          reject(error);
        }
      })
    });
  }

  _callProviderMethod(request) {
    // if (!request.method.startsWith('get')) {
    //   store.dispatch(callProviderMethod, {ok: false, data: {responseText:`${request.method} is not a get method`}});
    // }
    // const args = JSON.parse(request.params);
    // this.provider[request.method](...args)

    const params = JSON.parse(request.params);
    return this.provider.send(request.method, params);
  }

  callProviderMethod(){
    const request = {
      id: this.requestId,
      path: this.providerpath,
      method: this.method,
      params: this.params
    };

    this.requestId += 1;
    this._callProviderMethod(request)
    .then((data) => {
      const response = {
        data: data,
        ok: true
      };
      store.dispatch(callProviderMethod(request, response));
    })
    .catch((error) => {
      const response = {
        data: error,
        ok: false
      };
      store.dispatch(callProviderMethod(request, response));
    });

  }

  buildRawRequestURL() {
    let url;

    // TODO: Authorization: Basic {APIKEY} 
    //       Authorization: Bearer {ID_TOKEN}
    if (this.apikey && this.apikey.length > 0) {
        url = [this.providerpath,  this.apikey].join('/');
    } else {
        url = [this.providerpath, this.idToken].join('/');
    }

    // If the url is already a full href we are done
    if (url.startsWith('http:') || url.startsWith('https:')) {
      return url;
    }

    // We need to make an href. If the providerpath is relative, append it to
    // the window href. Otherwise use the window protocol & hostname to make an
    // href based on the absoloute path.
    if (url.startsWith('/')) {
        let href = window.location.href;
        if (!href.endsWith('/')) {
          href = href + '/';
        }
        return `${window.location.href}${url}`;
    }

    return `${window.location.protocol}//${window.location.host}/${url}`
  }

  callRawMethod() {

    const url = this.buildRawRequestURL();

    const request = {
      id: this.requestId,
      path: url,
      method: this.method,
      params: this.params
    };

    this.requestId += 1;

    this._callRawMethod(request)
    .then((data) => {
      const response = {
        data: data.result,
        ok: true
      };
      store.dispatch(callRawMethod(request, response));
    })
    .catch((error) => {
      const response = {
        data: error,
        ok: false
      };
      store.dispatch(callRawMethod(request, response));
    });
  }
}

customElements.define('node-console', NodeConsole);
