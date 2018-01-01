var graphql = require('graphql.js');
var configs = require('./src/configs');
// var fs = require('fs');

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

	var self = this;

	return this._auth().then(function(result) {
		if(result.getAccessTokenByAppSecret) {
			self.authed = true;
			self.authSuccess = true;
			self.accessToken = 'Bearer ' + result.getAccessTokenByAppSecret;
			self.initUserService();
		}else {
			self.authed = true;
			self.authSuccess = false;
		}
		return self;
	}).catch(function(error) {
		self.authed = true;
		self.authSuccess = false;
		throw 'auth failed, please check your secret and client ID.'
	});	
}

Authing.prototype = {

	constructor: Authing,

	_auth: function() {

		if(!this._AuthService) {
			this._AuthService = graphql(configs.services.user.host, {
			  	method: "POST"
			});
		}

		let options = {
			secret: this.opts.secret,
			clientId: this.opts.clientId,
		}

		return this._AuthService(`
			query ($secret: String, $clientId: String){
			  getAccessTokenByAppSecret(secret: $secret, clientId: $clientId)
			}
		`, options);
	},

	_authUser: function() {

		if(!this.authed) {

			var self = this;

			return this._auth().then(function(result) {
				if(result.getAccessTokenByAppSecret) {
					self.authed = true;
					self.authSuccess = true;
					self.accessToken = 'Bearer ' + result.getAccessTokenByAppSecret;
					self.initUserService();
				}
			}).catch(function(error) {
				self.authed = true;
				self.authSuccess = true;
				throw 'auth failed, please check your secret and client ID.'
			});

		}

	},

	_readOAuthList: function() {

		if(!this._OAuthService) {
			this._OAuthService = graphql(configs.services.oauth.host, {
			  	method: "POST"
			});
		}

		return this._OAuthService(`
			query getOAuthList($clientId: String!) {
				ReadOauthList(clientId: $clientId) {
					_id
					name
					image
					description
					enabled
				}
			}
		`, {
			clientId: this.opts.clientId
		});

	},

// 	ui() {

// 		var inClient = typeof window !== 'undefined';
		
// 		var loginHtml = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
// 	<meta charset="UTF-8">
// 	<meta name="viewport" content="width=device-width, initial-scale=1.0">
// 	<meta http-equiv="X-UA-Compatible" content="ie=edge">
// 	<title>Document</title>
// 	<style>
// 		article, aside, blockquote, body, button, dd, details, div, dl, dt, fieldset, figcaption, figure, footer, form, h1, h2, h3, h4, h5, h6, header, hgroup, hr, input, legend, li, menu, nav, ol, p, section, td, textarea, th, ul {
// 			margin: 0;
// 			padding: 0;
// 		}
// 		.login-wrapper {
// 			position: fixed;
// 			left: 0;
// 			top: 0;
// 			right: 0;
// 			bottom: 0;
// 			background: rgba(0, 0, 0, .2);
// 			display: flex;
// 			align-items: center;
// 			justify-content: center;
// 		}
// 		.form-wrapper {
// 			width: 366px;
// 			text-align: center;
// 			background: #fff;
// 		}
// 		.title {
// 			margin-bottom: 20px;
// 		}
// 		.description {
// 			margin-bottom: 40px;
// 		}
// 		.description p {
// 			font-weight: 400;
// 			font-size: 14px;
// 			line-height: 24px;
// 			color: #000;
// 		}
// 		.form {
// 			text-align: center;
// 		}
// 		.custom-row {
// 			transition: all .3s ease;
// 			border-bottom: 1px solid #d8d8d8;
// 			margin: 0 40px 0 40px;
// 		}
// 		.input {
// 			position: relative;
// 			width: 100%;
// 			margin: 0 auto;
// 			height: 37px;
// 			line-height: 37px;
// 		}
// 		.a0-iconlist {
// 			width: 88%;
// 			margin: 20px auto 0 auto;
// 		}
// 		.a0-zocial.a0-github {
// 			background-color: #eee;
// 			color: #050505;
// 		}
// 		.a0-zocial {
// 			color: #fff;
// 			text-align: left;
// 			text-decoration: none;
// 			white-space: nowrap;
// 			-moz-user-select: none;
// 			-webkit-user-select: none;
// 			-ms-user-select: none;
// 			user-select: none;
// 			position: relative;
// 			display: block;
// 			border-radius: 3px;
// 			padding: 0;
// 			margin-bottom: 6px;
// 			cursor: pointer;
// 			overflow: hidden;
// 			transition: opacity .2s ease;
// 			font-family: "Avenir Next", Avenir, -apple-system, BlinkMacSystemFont, Roboto, Hevetica, sans-serif;
// 		}
// 		.a0-zocial span {
// 			text-transform: uppercase;
// 			font-weight: 500;
// 			font-size: 10px;
// 			letter-spacing: .3px;
// 			line-height: 40px;
// 			display: inline-block;
// 			padding-left: 4%;
// 			width: 86%;
// 			cursor: pointer;
// 			transition: all .2s ease;
// 		}
// 		.oauth-img {
// 			width: 44px;
// 			height: 26px;
// 			vertical-align: middle;
// 			margin-left: 20px;
// 		}
// 		.login-input {
// 			border: none;
// 			background-color: transparent;
// 			width: 100%;
// 			display: block;
// 			text-align: center;
// 			font-size: 14px;
// 			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
// 			border-radius: 0;
// 			padding: 0;
// 			margin: 0 auto;
// 			height: 37px;
// 			line-height: 27px;
// 			max-width: 100%;
// 			outline: none;
// 		}
// 	</style>
// </head>
// <body>
// 	<div class="login-wrapper">
// 		<div class="form-wrapper">
// 			<div class="title">
// 				<h1>登录认证</h1>
// 			</div>
// 			<div class="description">
// 				<p>
// 					填写您的邮箱帐号即可
// 					<br> 如果您没有帐号，我们会自动创建。您也可以选择使用密码创建账号
// 				</p>
// 			</div>
// 			<div class="form">
// 				<form id="loginForm">
// 					<div style="display: flex; align-items: center;">
// 						<div class="ivu-tooltip">
// 							<div class="ivu-tooltip-rel">
// 								<button type="button" class="ivu-btn ivu-btn-ghost ivu-btn-circle ivu-btn-icon-only"
// 									style="display: none;">
// 									<!---->
// 									<i class="ivu-icon ivu-icon-ios-arrow-up"></i>
// 									<!---->
// 								</button>
// 							</div>
// 							<div class="ivu-tooltip-popper" style="display: none;">
// 								<div class="ivu-tooltip-content">
// 									<div class="ivu-tooltip-arrow"></div>
// 									<div class="ivu-tooltip-inner">使用密码</div>
// 								</div>
// 							</div>
// 						</div>
// 						<div class="custom-row" style="flex: 1 1 0%;">
// 							<div class="input">
// 								<input class="login-input" id="emailInput" type="email" autocorrect="off" autocapitalize="off" placeholder="you@domain.com">
// 								<div class="suggestion-wrap">
// 									<div class="suggestion"></div>
// 								</div>
// 							</div>
// 						</div>
// 					</div>
// 					<div class="custom-row" style="margin-top: 15px;">
// 						<div class="input">
// 							<input class="login-input" id="passwordInput" type="password" placeholder="请输入密码">
// 						</div>
// 					</div>
// 					<div style="display: none; margin-top: 15px;">
// 						<div class="custom-row" style="flex: 1 1 0%; margin-right: 0px;">
// 							<div class="input">
// 								<input class="login-input" id="verifyInput" type="text">
// 							</div>
// 						</div>
// 						<div style="flex: 1 1 0%;">
// 							<img width="80" height="30" src="">
// 						</div>
// 					</div>
// 				</form>
// 			</div>
// 			<div class="a0-iconlist">
// 				<div title="Github OAuth" class="a0-zocial a0-block a0-github">
// 					<img src="http://oxacbp94f.bkt.clouddn.com/oauth/logo/github.svg" class="oauth-img">
// 					<span>Github OAuth</span>
// 				</div>
// 				<div title="Sina Weibo OAuth" class="a0-zocial a0-block a0-github">
// 					<img src="http://oxacbp94f.bkt.clouddn.com/oauth/logo/weibo.svg" class="oauth-img">
// 					<span>Sina Weibo OAuth</span>
// 				</div>
// 			</div>
// 		</div>
// 	</div>

// 	<script src="./index.js"></script>

// 	<script>
// 		window.onload = function() {

// 			var auth = new Authing({
// 				clientId: '${this.opts.clientId}',
// 				secret: '${this.opts.secret}',
// 				debug: ${this.opts.debug || false}	
// 			});

// 			var passwordInput = document.querySelector('#passwordInput'),
// 				password = passwordInput.value,
// 				emailInput = document.querySelector('#emailInput'),
// 				email = emailInput.value,
// 				verifyInput = document.querySelector('#verifyInput'),
// 				loginForm = document.querySelector('#loginForm');
// 			loginForm.addEventListener('keyup', function (event) {
// 				if(event.keyCode === 13) {
// 					auth.login({
// 						email: email,
// 						password: password
// 					}).then(function(res) {
// 						console.log('登录成功')		
// 						console.log(res);
// 					}).catch(function(error) {
// 						console.log('login')
// 						console.log(error);
// 					});
// 				}
// 			})
// 		}
// 	</script>

// </body>
// </html>
// 		` 
// 		fs.writeFile(__dirname + '/index.html', loginHtml, function (err) {
// 			if(err) {
// 				throw err;
// 			} else {
// 				console.log('写入成功');
// 			}
// 		});
// 	},

	haveAccess: function() {
		if(!this.authSuccess) {
			throw 'have no access, please check your secret and client ID.';
		}
	},

	initUserService: function(authToken) {

		this.haveAccess();

		let self = this;

		if(this.accessToken) {
			if(authToken) {
				this.UserService = graphql(configs.services.user.host, {
				  	method: "POST",
				  	headers: {
				  		'Authorization': authToken
				  	}
				});				
			}else {
				this.UserService = graphql(configs.services.user.host, {
			  		method: "POST"
				});
			}
		}

	},

	_login: function(options) {

		if(!options) {
			throw 'options is not provided';
		}

		options['registerInClient'] = this.opts.clientId;

		if(options.password) {
			options.password = _encryption(options.password);
		}

		this.haveAccess();

		return this.UserService(`
			mutation login($unionid: String, $email: String, $password: String, $lastIP: String, $registerInClient: String!, $verifyCode: String) {
			    login(unionid: $unionid, email: $email, password: $password, lastIP: $lastIP, registerInClient: $registerInClient, verifyCode: $verifyCode) {
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
		`, options).then(function(res) {
			return res.login;
		});

	},

	login: function(options) {
		let self = this;
		return this._login(options).then(function(user) {
			self.initUserService(user.token);
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

		return this.UserService(`
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
					nickname: $nickname,
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
		`, options).then(function(res) {
			return res.register;
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

		return this.UserService(`
			query users($registerInClient: String!, $page: Int, $count: Int) {
			  users(registerInClient: $registerInClient, page: $page, count: $count) {
			  	list {
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
				    userLocation {
				      _id
				      when
				      where
				    }
				    userLoginHistory {
				      list {
				      	_id
				      	when
				      	success
				      	ip
				      }
				      totalCount
				    }
			  	}
			  	totalCount
			  }
			}
		`, options).then(function(res) {
			return res.users;
		});
	},

	remove: function(_id) {

		this.haveAccess();

		if(!_id) {
			throw '_id is not provided';
		}

		return this.UserService(`
			mutation removeUsers($ids: [String]){
			  removeUsers(ids: $ids) {
			    _id
			  }
			}
		`, {
			ids: [_id]
		}).then(function(res) {
			return res.removeUsers;
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

		return this.UserService(`
			mutation UpdateUser(${_argsString}){
			  updateUser(options: {
			  	${_argsFiller.join(', ')}
			  }) {
			    _id
			  }
			}
		`, options).then(function(res) {
			return res.updateUser;
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
		}).catch(function(e) {
			// console.log(e);
			throw '获取oauth服务失败';
		});
	}
}

module.exports = Authing;
