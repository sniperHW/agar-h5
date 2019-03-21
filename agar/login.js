var login = login || {}

login.init = function(onLoginClick){
	var input_style = {
		fontFamily: 'Arial',
		fontSize: '25pt',
		padding: '14px',
		width: '500px',
		color: '#26272E'
	};

	var box_styles = {
		idle: {fill: 0xE8E9F3, rounded: 16, stroke: {color: 0xCBCEE0, width: 4}},
		active: {fill: 0xE1E3EE, rounded: 16, stroke: {color: 0xABAFC6, width: 4}},
		disabled: {fill: 0xDBDBDB, rounded: 16}
	};


	input = new PIXI.TextInput(input_style,box_styles);
	input.placeholder = 'Enter your Text...';
	input.x = 300;
	input.y = 300;
	input.pivot.x = input.width/2;
	input.pivot.y = input.height/2;


	var circle = new PIXI.Graphics();
	circle.beginFill(0x9966FF);
	circle.drawCircle(0, 0, 32);
	circle.endFill();
	circle.x = 700;
	circle.y = 300;
	circle.interactive = true;

	circle.on("mousedown",function(){
		onLoginClick(input.text);
	});	

	var background = new PIXI.Graphics();  
	background.beginFill(0x123456);  
	background.drawRect(0,0,1024,768);  
	background.endFill(); 
  
	var loginContainer = new PIXI.Container();

	loginContainer.addChild(background);
	loginContainer.addChild(input);
	loginContainer.addChild(circle);

  	app.stage.addChild(loginContainer);

  	login.container = loginContainer;

}

login.onLoginOK = function() {
	console.log("login ok");

	login.container.visible = false;

	battle.init({width:1024,height:768},{width:config.mapWidth,height:config.mapWidth})

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

	spit.x = 1024 - 1024/5;
	spit.y = 768/5*4;
	spit.anchor.set(0.5,0.5);
	spit.scale.set(0.7,0.7);

	split.x = 1024 - 1024/14;
	split.y = 768/5*4;
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
	gameover.x = 1024/2;
	gameover.y = 768/2;
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
		tf.text = "fps:"+Math.round(app.ticker.FPS/delta);

		var now = util.getMilliseconds();
		if(now > refreshTime){
			msgPerSecond.text = "msg/s:"+battle.msgCount;
			battle.msgCount = 0;
			refreshTime = now + 1000;
		}
	}

	//Start the game loop 
	app.ticker.add(delta => gameLoop(delta));
}
