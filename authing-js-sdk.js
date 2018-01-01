var ApolloClientPreset = require('apollo-client-preset');
var ApolloLinkHttp = require('apollo-link-http');
var ApolloLinkPreset = require('apollo-link');

var ApolloCacheInmemory = require('apollo-cache-inmemory');
var gql = require('graphql-tag');
var fetch = require('node-fetch');

var ApolloClient = ApolloClientPreset.ApolloClient;
var HttpLink = ApolloLinkHttp.HttpLink;
var InMemoryCache = ApolloCacheInmemory.InMemoryCache;

var ApolloLink = ApolloLinkPreset.ApolloLink;
var concat = ApolloLinkPreset.concat;

var configs = require('./src/configs');

var _encryption;
if(configs.inBrowser) {
	var JSEncrypt = require('jsencrypt');
	_encryption = function(paw) {
		var encrypt = new JSEncrypt.JSEncrypt(); // 实例化加密对象
		encrypt.setPublicKey(configs.openSSLSecret); // 设置公钥
		var encryptoPasswd = encrypt.encrypt(paw); // 加密明文
		return encryptoPasswd;
	};
}else {
	var crypto = require('crypto');
	_encryption = function(paw) {
		var publicKey = configs.openSSLSecret;
		var pawBuffer, encryptText;
		pawBuffer = new Buffer(paw); // jsencrypt 库在加密后使用了base64编码,所以这里要先将base64编码后的密文转成buffer
		encryptText = crypto.publicEncrypt({
			key: new Buffer(publicKey), // 如果通过文件方式读入就不必转成Buffer
			padding: crypto.constants.RSA_PKCS1_PADDING
		}, pawBuffer).toString('base64');
		// console.log(encryptText)
		return encryptText;
	}
}

var Authing = function(opts) {
	if(!opts.clientId) {
		throw 'clientId is not provided';
	}

	if(!opts.secret) {
		throw 'app secret is not provided';
	}

	if(opts.host) {
		configs.services.user.host = opts.host.user || configs.services.user.host;
		configs.services.oauth.host = opts.host.oauth || configs.services.oauth.host;
	}

	this.opts = opts;
	this.authed = false;
	this.authSuccess = false;

	this.initUserClient();
	this.initOAuthClient();

	var self = this;

	return this._auth().then(function(token) {
		if(token) {
			self.authed = true;
			self.authSuccess = true;
			self.accessToken = 'Bearer ' + token;
		}else {
			self.authed = true;
			self.authSuccess = false;
			throw 'auth failed, please check your secret and client ID.';			
		}
		return self;
	}).catch(function(error) {
		console.log(error);
		self.authed = true;
		self.authSuccess = false;
		throw 'auth failed: ' + error.message;
	});	
}

Authing.prototype = {

	constructor: Authing,

	initUserClient: function(token) {
		if(token) {
			var httpLink = new HttpLink({ 
		  		uri: configs.services.user.host, 
		  		fetch: fetch
		  	});
			var authMiddleware = new ApolloLink((operation, forward) => {
			  operation.setContext({
			    headers: {
			      authorization: 'Bearer ' + token,
			    } 
			  });

			  return forward(operation);
			});			
			this.UserClient = new ApolloClient({
			  	link: concat(authMiddleware, httpLink),
			  	cache: new InMemoryCache()
			});
		}else {
			this.UserClient = new ApolloClient({
			  	link: new HttpLink({ uri: configs.services.user.host, fetch: fetch }),
			  	cache: new InMemoryCache()
			});
		}
	},

	initOAuthClient: function() {
		this.OAuthClient = new ApolloClient({
		  link: new HttpLink({ uri: configs.services.oauth.host, fetch: fetch }),
		  cache: new InMemoryCache()
		});
	},

	_auth: function() {

		if(!this._AuthService) {
			this._AuthService = new ApolloClient({
		  		link: new HttpLink({ uri: configs.services.user.host, fetch: fetch }),
		  		cache: new InMemoryCache()
			});
		}

		let options = {
			secret: this.opts.secret,
			clientId: this.opts.clientId,
		}

		return this._AuthService.query({
		  query: gql`
		  	query {
 	 			getAccessTokenByAppSecret(secret: "${options.secret}", clientId: "${options.clientId}")
		   	}
		  `,
		})
	  	.then(function(data) {
	  		return data.data.getAccessTokenByAppSecret;
	  	});
	},

	_readOAuthList: function() {

		if(!this._OAuthService) {
			this._OAuthService = new ApolloClient({
			  	link: new HttpLink({ 
			  		uri: configs.services.oauth.host, 
			  		fetch: fetch,
			  	}),
			  	cache: new InMemoryCache()
			});
		}

		return this._OAuthService.query({
			query: gql`
				query getOAuthList($clientId: String!) {
					ReadOauthList(clientId: $clientId) {
						_id
						name
						image
						description
						enabled
					}
				}
			`,
			variables: {
				clientId: this.opts.clientId				
			}
		})
		.then(function(res) {
			console.log(res);
			return res.data.readOAuthList;
		});
	},

	haveAccess: function() {
		if(!this.authSuccess) {
			throw 'have no access, please check your secret and client ID.';
		}
	},

	_login: function(options) {

		if(!options) {
			throw 'options is not provided.';
		}

		options['registerInClient'] = this.opts.clientId;

		if(options.password) {
			options.password = _encryption(options.password);
		}

		this.haveAccess();

		return this.UserClient.mutate({
			mutation: gql`
				mutation login($unionid: String, $email: String, $password: String, $lastIP: String, $registerInClient: String!) {
				    login(unionid: $unionid, email: $email, password: $password, lastIP: $lastIP, registerInClient: $registerInClient) {
					    _id
					    email
					    emailVerified
					    username
					    nickname
					    company
					    photo
					    browser
					    token
					    tokenExpiredAt
					    loginsCount
					    lastLogin
					    lastIP
					    signedUp
					    blocked
					    isDeleted
				    }
				}
			`,
			variables: options
		}).then(function(res) {
			return res.data.login;
		});

	},

	login: function(options) {
		let self = this;
		return this._login(options).then(function(user) {
			if(user) {
				self.initUserClient(user.token);				
			}
			return user;
		});
	},

	register: function(options) {

		this.haveAccess();

		if(!options) {
			throw 'options is not provided';
		}

		options.registerInClient = this.opts.clientId;

		if(options.password) {
			options.password = _encryption(options.password);
		}

		return this.UserClient.mutate({
			mutation: gql`
				mutation register(
					$unionid: String,
				    $email: String, 
				    $password: String, 
				    $lastIP: String, 
				    $forceLogin: Boolean,
				    $registerInClient: String!,
				    $oauth: String,
				    $username: String,
				    $nickname: String,
				    $registerMethod: String,
				    $photo: String
				) {
				    register(userInfo: {
				    	unionid: $unionid,
				        email: $email,
				        password: $password,
				        lastIP: $lastIP,
				        forceLogin: $forceLogin,
				        registerInClient: $registerInClient,
				        oauth: $oauth,
				        registerMethod: $registerMethod,
				        photo: $photo,
				        username: $username,
				        nickname: $nickname
				    }) {
				        _id,
				        email,
				        emailVerified,
				        username,
				        nickname,
				        company,
				        photo,
				        browser,
				        password,
				        token,
				        group {
				            name
				        },
				        blocked
				    }
				}
			`,
			variables: options
		})
		.then(function(res) {
			return res.data.register;
		});
	},

	logout: function(_id) {

		this.haveAccess();

		if(!_id) {
			throw '_id is not provided';
		}

		return this.update({
			_id: _id,
			tokenExpiredAt: 0
		});

	},

	list: function(page, count) {

		this.haveAccess();

		page = page || 1;
		count = count || 10;

		var options = {
			registerInClient: this.opts.clientId,
			page: page,
			count: count
		}

		return this.UserClient.query({
			query: gql`query users($registerInClient: String, $page: Int, $count: Int){
				  users(registerInClient: $registerInClient, page: $page, count: $count) {
				    totalCount
				    list {
				      _id
				      email
				      emailVerified
				      username
				      nickname
				      company
				      photo
				      browser
				      password
				      registerInClient
				      token
				      tokenExpiredAt
				      loginsCount
				      lastLogin
				      lastIP
				      signedUp
				      blocked
				      isDeleted
				      group {
				        _id
				        name
				        descriptions
				        createdAt
				      }
				      clientType {
				        _id
				        name
				        description
				        image
				        example
				      }
				      userLocation {
				        _id
				        when
				        where
				      }
				      userLoginHistory {
				        totalCount
				        list{
				          _id
				          when
				          success
				          ip
				          result
				        }
				      }
				      systemApplicationType {
				        _id
				        name
				        descriptions
				        price
				      }
				    }
				  }
				}
			`,
			variables: options
		}).then(function(res) {
			return res.data.users;
		});
	},

	remove: function(_id) {

		this.haveAccess();

		if(!_id) {
			throw '_id is not provided';
		}

		return this.UserClient.mutate({
			mutation: gql `
				mutation removeUsers($ids: [String]){
				  removeUsers(ids: $ids) {
				    _id
				  }
				}
			`,
			variables: {
				ids: [_id]
			}
		}).then(function(res) {
			return res.data.removeUsers;
		});	

	},

	update: function(options) {

		this.haveAccess();

		if(!options) {
			throw 'options is not provided';
		}

		if(!options._id) {
			throw '_id in options is not provided';
		}

		var 
			_args = [],
			_argsString = '',

			_argsFiller = [],

			keyTypeList = {
				_id: 'String',
				email: 'String',
				emailVerified: 'Boolean',
				username: 'String',
				nickname: 'String',
				company: 'String',
				photo: 'String',
				browser: 'String',
				password: 'String',
				registerInClient: 'String!',
				token: 'String',
				tokenExpiredAt: 'String',
				loginsCount: 'Int',
				lastLogin: 'String',
				lastIP: 'String',
				signedUp: 'String',
				blocked: 'Boolean',
				isDeleted: 'Boolean'
			};

		for(var key in options) {
			if(keyTypeList[key]) {
				_args.push('$' + key + ': ' + keyTypeList[key]);
				_argsFiller.push(key + ': $' + key);
			}
		}

		_argsString = _args.join(', ');

		return this.UserClient.mutate({
			mutation: gql`
				mutation UpdateUser(${_argsString}){
				  updateUser(options: {
				  	${_argsFiller.join(', ')}
				  }) {
				    _id
				  }
				}
			`,
			variables: options
		}).then(function(res) {
			return res.data.updateUser;
		});	
	},

	readOAuthList: function() {
		var self = this;
		return this._readOAuthList().then(function(data) {
			var list = data.ReadOauthList;
			return list.filter(function(item) {
				return item.enabled;
			});
		}).then(function(list) {
			var promises = [];
			if(configs.inBrowser) {
				promises = list.map(function(item){
					return fetch(`${configs.services.oauth.host.replace('/graphql', '')}/oauth/${item.name}/url/${self.opts.clientId}`).then(function(data){
						return data.json();
					});
				})
			}else {
				var http = require('http');
				promises = list.map(function(item){
					return new Promise(function(resolve, reject){
						http.get(`${configs.services.oauth.host.replace('/graphql', '')}/oauth/${item.name}/url/${self.opts.clientId}`, function(response) {
							var str = '';
							response.setEncoding('utf8');
							response.on('data', function (chunk) { str += chunk });
							response.on('end', function () {
								resolve(JSON.parse(str));
							});
							response.on('error', function(e) {
								reject(e);
							})
						})
					});
				});

			}

			return Promise.all(promises);
			
		}).then(function(list) {
			return list;
		});
	}	
}

module.exports = Authing;
