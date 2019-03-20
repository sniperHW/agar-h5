var message = message || {}

message.handler = {}

message.delayMsgQue = new util.fifo();

message.handler["Login"] = function(event) {
	login.onLoginOK();
}

message.handler["FixTime"] = function(event) {
	var nowTick = util.getMilliseconds();
	var elapse = nowTick - battle.lastTick;
	battle.gameTick = event.serverTick - elapse;
	self.lastFixTime = nowTick;
}

message.handler["ServerTick"] = function(event) {
	var nowTick = util.getMilliseconds();
	var elapse = nowTick - battle.lastTick;
	battle.gameTick = event.serverTick - elapse;
	self.lastFixTime = nowTick;
}

message.handler["BeginSee"] = function(event) {
	for(i in event.balls){
		var color;
		var thorn = false;
		var v = event.balls[i];
		if(v.color == config.thornColorID){
			color = config.thornColor;
			thorn = true;
		} else{
			color = config.colors[v.color-1];
		}
		var newBall = ball.createBall(v.userID,v.id,v.pos,color,v.r,v.velocitys,thorn);
		battle.addBall(newBall);
	}
}

message.handler["EndSee"] = function(event) {
	for(i in event.balls){
		battle.removeBall(event.balls[i]);
	}	
}

message.handler["BallUpdate"] = function(event) {
	for(i in event.balls){
		var v = event.balls[i];
		var ball_ = battle.getBall(v.id);
		if(ball_){
			ball_.onBallUpdate(event,v,event.timestamp);
		}
	}
}

message.handler["EnterRoom"] = function(event) {
	star.onStars(event);
}

message.handler["StarDead"] = function(event) {
	star.onStarDead(event);
}

message.handler["StarRelive"] = function(event) {
	star.onStarRelive(event);
}

message.handler["GameOver"] = function(event) {
	battle.over = true;
}

message.processDelayMsg = function() {
	var tick = battle.getServerTick();
	for(var msg = message.delayMsgQue.first(); msg; msg = message.delayMsgQue.first()) {
		if(msg.timestamp <= tick) {
			message.delayMsgQue.pop();
			var handler = message.handler[msg.cmd];
			if(handler){
				handler(msg);
			}
		} else {
			return;
		}
	}
}

message.DispatchMessage = function(msg) {
	var cmd = msg.cmd;
	if(cmd.timestamp) {
		//将消息延时M.delayTick处理
		var nowTick = battle.getServerTick();
		var elapse = nowTick - battle.lastTick;		 
		msg.timestamp = msg.timestamp + battle.delayTick - elapse;
		message.delayMsgQue.push(msg);
	} else {
		var handler = message.handler[msg.cmd];
		if(handler){
			handler(msg);
		}		
	}
}