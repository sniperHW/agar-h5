var login = login || {}

login.init = function(onLoginClick){
	var input_style = {
		fontFamily: 'Arial',
		fontSize: '10pt',
		padding: '14px',
		width: '180px',
		color: '#26272E'
	};

	var box_styles = {
		idle: {fill: 0xE8E9F3, rounded: 16, stroke: {color: 0xCBCEE0, width: 4}},
		active: {fill: 0xE1E3EE, rounded: 16, stroke: {color: 0xABAFC6, width: 4}},
		disabled: {fill: 0xDBDBDB, rounded: 16}
	};


	input = new PIXI.TextInput(input_style,box_styles);
	input.placeholder = 'name';
	input.pivot.x = input.width/2;
	input.pivot.y = input.height/2;


	var start = new PIXI.Sprite(resources["images/start.png"].texture);
	start.anchor.set(0.5,0.5);
	start.x = app.screen.width/2;
	start.y = app.screen.height/5*3;
	start.interactive = true;

	start.on("mousedown",function(){
		console.log("login");
		onLoginClick(input.text);
		input.visible = false;
	});	

	var background = new PIXI.Sprite(resources["images/back.png"].texture);
	
	background.scale.set(app.screen.width/background.width,app.screen.height/background.height);	

	var loginUI = new PIXI.Sprite(resources["images/login.png"].texture);
	loginUI.anchor.set(0.5,0.5);
	loginUI.x = app.screen.width/2;
	loginUI.y = app.screen.height/2;


	var name = new PIXI.Sprite(resources["images/editbox.png"].texture);
	name.anchor.set(0.5,0.5);
	name.x = app.screen.width/2 + 20;
	name.y = app.screen.height/2 - 80;

	input.x = name.x;
	input.y = name.y;


	var passwd = new PIXI.Sprite(resources["images/editbox.png"].texture);
	passwd.anchor.set(0.5,0.5);
	passwd.x = name.x;
	passwd.y = name.y + 80; 

	var loginContainer = new PIXI.Container();

	loginContainer.addChild(background);
	loginContainer.addChild(loginUI);
	loginContainer.addChild(name);
	loginContainer.addChild(passwd);
	loginContainer.addChild(input);
	loginContainer.addChild(start);

  	app.stage.addChild(loginContainer);

  	login.container = loginContainer;

}

login.onLoginOK = function() {
	console.log("login ok");
	login.container.visible = false;

	battle.init({width:app.screen.width,height:app.screen.height},{width:config.mapWidth,height:config.mapWidth})

	battle.onMouseDown(function(){
		socket.send({cmd:"Stop"});
	});


	joystick.createJoystick(resources["images/rocker/plate.png"].texture,
		resources["images/rocker/stick.png"].texture,
		null,
		null,
		function(dir){
			socket.send({cmd:"Move",dir:dir});
		}
	);

	var spit = new PIXI.Sprite(resources["images/spit.png"].texture);
	var split = new PIXI.Sprite(resources["images/split.png"].texture);
	spit.interactive = true;
	split.interactive = true;

	spit.x = app.screen.width - app.screen.width/5;
	spit.y = app.screen.height/5*4;
	spit.anchor.set(0.5,0.5);
	spit.scale.set(0.7,0.7);

	split.x = app.screen.width - app.screen.width/14;
	split.y = app.screen.height/5*4;
	split.anchor.set(0.5,0.5);
	split.scale.set(0.7,0.7);

	app.stage.addChild(spit);
	app.stage.addChild(split);

	spit.on("mousedown",function(){
		socket.send({cmd:"Spit",dir:dir});
	});

	split.on("mousedown",function(){
		socket.send({cmd:"Split",dir:dir});
	});

	socket.send({cmd:"EnterBattle"});

	var tf = new PIXI.Text("fps:0", {
		fontFamily: '24px Arial',
		fill: 0xff1010,
		align: 'left'
	});
	app.stage.addChild(tf);

	var gameover = new PIXI.Text("GameOver", {
		fontFamily: '32px Arial',
		fill: 0xff1010,
		align: 'middle'
	});
	gameover.anchor.set(0.5,0.5);
	gameover.x = app.screen.width/2;
	gameover.y = app.screen.height/2;
	gameover.visible = false;
	app.stage.addChild(gameover);

	var msgPerSecond = new PIXI.Text("msg/s:0", {
		fontFamily: '24px Arial',
		fill: 0xff1010,
		align: 'left'
	});
	msgPerSecond.y = 100;
	app.stage.addChild(msgPerSecond);

	var refreshTime = util.getMilliseconds();
	battle.msgCount = 0;


	var gameLoop = function(delta) {
		if(!battle.over){
			battle.updateTick();
			battle.Update(battle.elapse);
		}else{
			gameover.visible = true;
		}
		

		var now = util.getMilliseconds();
		if(now > refreshTime){
			msgPerSecond.text = "msg/s:"+battle.msgCount;
			battle.msgCount = 0;
			refreshTime = now + 1000;
			tf.text = "fps:"+Math.round(app.ticker.FPS/delta);
		}
	}

	//Start the game loop 
	app.ticker.add(delta => gameLoop(delta));
}
