var graphql = require('graphql.js');
var configs = require('./src/configs');

var Authing = function(opts) {

	if(!opts.clientId) {
		throw 'clientId is not provided';
	}

	if(!opts.email) {
		throw 'email is not provided';
	}

	if(!opts.password) {
		throw 'password is not provided';
	}

	if(opts.debug) {
		configs.services.user.host = 'http://localhost:5555/graphql'
	}

	this.opts = opts;
	this.authed = false;
	this.authSuccess = false;

	var self = this;

	return this._auth().then(function(result) {
		if(result) {
			self.authed = true;
			self.authSuccess = true;
			self.initUserService();
		}else {
			self.authed = true;
			self.authSuccess = false;
		}
		return self;
	}).catch(function(error) {
		self.authed = true;
		self.authSuccess = true;
		throw 'auth failed, please check your email, password and client ID.'
	});	
}

Authing.prototype = {

	_auth: function() {

		if(!this._AuthService) {
			this._AuthService = graphql(configs.services.user.host, {
			  	method: "POST"
			});
		}

		let options = {
			email: this.opts.email,
			password: this.opts.password,
			clientId: this.opts.clientId,
			registerInClient: this.opts.clientId
		}

		return this._AuthService(`
			query ($email: String, $password: String, $clientId: String){
			  isClientOfUser(email: $email, password: $password, clientId: $clientId)
			}
		`, options);
	},

	_authUser: function() {

		if(!this.authed) {

			var self = this;

			return this._auth().then(function(result) {
				if(result) {
					console.log('success')
					self.authed = true;
					self.authSuccess = true;
					self.initUserService();
				}
			}).catch(function(error) {
				self.authed = true;
				self.authSuccess = true;
				throw 'auth failed, please check your email, password and client ID.'
			});

		}

	},

	haveAccess: function() {
		if(!this.authSuccess) {
			throw 'have no access, please check your email, password and client ID.';			
		}
	},

	initUserService: function(headers) {

		this.haveAccess();

		if(headers) {
			this.UserService = graphql(configs.services.user.host, {
			  	method: "POST",
			  	headers: headers
			});
		}else {
			this.UserService = graphql(configs.services.user.host, {
			  	method: "POST",
			});
		}

	},

	_login: function(options) {

		if(!options) {
			throw 'options is not provided';
		}

		this.haveAccess();

		return this.UserService(`
			mutation login($email: String!, $password: String, $lastIP: String, $registerInClient: String) {
			    login(email: $email, password: $password, lastIP: $lastIP, registerInClient: $registerInClient) {
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
		return this._login(options);
	},

	register: function(options) {

		this.haveAccess();

		if(!options) {
			throw 'options is not provided';
		}

		options.registerInClient = this.opts.clientId;

		return this.UserService(`
			mutation register(
			    $email: String!, 
			    $password: String, 
			    $lastIP: String, 
			    $forceLogin: Boolean,
			    $registerInClient: String!
			) {
			    register(userInfo: {
			        email: $email,
			        password: $password,
			        lastIP: $lastIP,
			        forceLogin: $forceLogin,
			        registerInClient: $registerInClient
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
			query users($registerInClient: String, $page: Int, $count: Int) {
			  users(registerInClient: $registerInClient, page: $page, count: $count) {
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
			      _id
			      when
			      success
			      ip
			    }
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
				registerInClient: 'String',
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
	}
}

module.exports = Authing;
