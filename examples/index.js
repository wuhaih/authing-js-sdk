var Authing = require('../index.js');

var email = "xieyang@dodora.cn";
var password = "xieyang123!";
var secret = '1caa5332db050488028670a9293501ac';

var auth = new Authing({
	clientId: '59f86b4832eb28071bdd9214',
	secret: secret,
	debug: true
});

auth.then(function(auth) {

	// auth.list().then(function(res) {
	// 	console.log('list',res);
	// }).catch(function(error) {
	// 	console.log('list')
	// 	console.log(error);
	// });

	// auth.readOAuthList().then(function(list) {
	// 	console.log(list[0].data);
	// });

	// auth.register({
	// 	email: email,
	// 	password: password
	// }).then(function(res) {
	// 	console.log('注册成功')
	// 	console.log(res);
	// }).catch(function(error) {
	// 	console.log('sss')
	// 	console.log(error);
	// });

	auth.login({
		email: email,
		password: password
	}).then(function(res) {
		console.log('登录成功')		
		console.log(res);
	}).catch(function(error) {
		console.log('login')
		console.log(error);
	});


	// auth.update({
	// 	_id: '5a11386528245a0001fdca83',
	// 	nickname: 'fucku',
	// 	username: 'fuckuuu'
	// })
	// .then(function(res) {
	// 	console.log('修改成功')
	// 	console.log(res);
	// }).catch(function(error) {
	// 	console.log('sss')
	// 	console.log(error);
	// });

});

