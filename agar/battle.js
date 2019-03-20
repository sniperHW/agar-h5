var battle = battle || {}


battle.init = function(visibleSize,battleSize) {

	var group = new PIXI.display.Group(0, true);
	group.on('sort', function (circle) {
    	circle.zOrder = -circle.ball.r;
	});

	battle.scaleFactor = 1.0;
	battle.visibleSize = visibleSize;
	battle.battleSize = battleSize;
	battle.over = false;

	battle.gameTick = 0;
	battle.lastTick = util.getMilliseconds();

	battle.viewBounderyBottomRight = {
		x : battle.battleSize.width + battle.visibleSize.width/2,
		y : battle.battleSize.height + battle.visibleSize.height/2
	};

	battle.viewBounderyTopLeft = {
		x : 0 - battle.visibleSize.width/2,
		y : 0 - battle.visibleSize.height/2
	};

	battle.origin = {x:0,y:0};

	battle.centralPos = {x:battle.battleSize.width/2,y:battle.battleSize.height/2};
		
	battle.setViewPort(battle.visibleSize.width,battle.visibleSize.height);
	battle.updateViewPortTopLeft();

	var background = new PIXI.Graphics();  
  	background.beginFill(0x123456);  
  	background.drawRect(0,0,battle.visibleSize.width,battle.visibleSize.height);  
  	background.endFill();  
  	battle.background = background;
  	battle.balls = new Map();

  	battle.container = new PIXI.Container();
  	battle.container.addChild(background);


  	battle.starContainer = new PIXI.Container();
  	battle.container.addChild(battle.starContainer);

  	battle.ballContainer = new PIXI.Container();
  	battle.container.addChild(battle.ballContainer);

  	battle.container.addChild(new PIXI.display.Layer(group));

  	battle.group = group;
  	app.stage.addChild(this.container);
	
}

battle.addBall = function(newBall) {
	newBall.circle.parentGroup = battle.group;
	battle.balls.set(newBall.id,newBall);
	battle.ballContainer.addChild(newBall.circle);
}

battle.removeBall = function(ballID) {
	var ball_ = battle.getBall(ballID);
	if(ball_) {
		battle.balls.delete(ballID);
		battle.ballContainer.removeChild(ball_.circle);
	}
}

battle.getBall = function(ballID) {
	return battle.balls.get(ballID);
}

battle.onMouseDown = function(onMouseDown){
	battle.background.interactive = true;
	battle.background.on("mousedown",onMouseDown);
}


battle.viewPort2Screen = function(viewPortPos) {
	viewPortPos.x = viewPortPos.x * battle.scaleFactor + battle.origin.x;
	viewPortPos.y = viewPortPos.y * battle.scaleFactor + battle.origin.y;
	return viewPortPos;
}

battle.world2ViewPort = function(worldPos) {
	var vPos = {
		x : worldPos.x - battle.viewPort.topLeft.x,
		y : worldPos.y - battle.viewPort.topLeft.y
	};
	return vPos;
}

battle.isInViewPort = function(viewPortPos) {
	if(viewPortPos.x < 0 || viewPortPos.y < 0) {
		return false;
	}

	if(viewPortPos.x > battle.viewPort.width || viewPortPos.y > battle.viewPort.height) {
		return false;
	}

	return true;
}


battle.updateTick = function() {
	var nowTick = util.getMilliseconds();
	battle.elapse = nowTick - battle.lastTick;
	battle.gameTick = battle.gameTick + battle.elapse;
	battle.lastTick = nowTick;
}

battle.getServerTick = function() {
	return battle.gameTick;	
}

battle.updateViewPortTopLeft = function() {
	var topLeft = {
		x : battle.centralPos.x - battle.viewPort.width/2,
		y : battle.centralPos.y - battle.viewPort.height/2
	};

	if(topLeft.x < battle.viewBounderyTopLeft.x) {
		topLeft.x = battle.viewBounderyTopLeft.x;
	}

	if(topLeft.y < battle.viewBounderyTopLeft.y) {
		topLeft.y = battle.viewBounderyTopLeft.y;
	}

	if(topLeft.x + battle.viewPort.width > battle.viewBounderyBottomRight.x) {
		topLeft.x = battle.viewBounderyBottomRight.x - battle.viewPort.width;
	}

	if(topLeft.y + battle.viewPort.height > battle.viewBounderyBottomRight.y) {
		topLeft.y = battle.viewBounderyBottomRight.y - battle.viewPort.height;
	}

	battle.viewPort.topLeft = topLeft;
	
}


battle.setViewPort = function(width,height) {
	battle.viewPort = battle.viewPort || {};
	battle.viewPort.width = width;
	battle.viewPort.height = height;
	battle.scaleFactor = battle.visibleSize.width/battle.viewPort.width;
}

battle.UpdateViewPort = function(selfBalls) {
	if(selfBalls.length == 0) {
		return;
	}

    var _edgeMaxX = 0;
    var _edgeMaxY = 0;
    var _edgeMinX = 1000000;
    var _edgeMinY = 1000000;

    for(var i=0;i<selfBalls.length;i++){
    	var ball_ = selfBalls[i];
    	var r = ball_.r;
    	var topLeft = {x:ball_.pos.x - r,y:ball_.pos.y - r};
    	var bottomRight = {x:ball_.pos.x + r,y:ball_.pos.y + r};

    	if(_edgeMaxX < bottomRight.x) {
    		_edgeMaxX = bottomRight.x;
    	}

    	if(_edgeMaxY < bottomRight.y) {
    		_edgeMaxY = bottomRight.y;
    	}

    	if(_edgeMinX > topLeft.x) {
    		_edgeMinX = topLeft.x;
    	}

    	if(_edgeMinY > topLeft.y) {
    		_edgeMinY = topLeft.y;
    	}

    }

    var width = _edgeMaxX - _edgeMinX;
    var height = _edgeMaxY - _edgeMinY;


    var para = config.screenSizeFactor;
    var r = Math.max(width,height);
    r = (r * 0.5) / para;

    var a1 = 8 / Math.sqrt(r);
    var a2 = Math.max(a1,1.5);
    var a3 = r * a2;
    var a4 = Math.max(a3,10);
    var a5 = Math.min(a4,100);
    var scale = a5 * para;

    scale = scale / (battle.visibleSize.height / 2);

    var _visionWidth = battle.visibleSize.width * scale;
    var _visionHeight = battle.visibleSize.height * scale;

    battle.setViewPort(_visionWidth,_visionHeight);


}


battle.render = function() {
	star.render();
	this.balls.forEach(function (v){
		var ball_ = v;
		var viewPortPos = battle.world2ViewPort(ball_.pos);
		var topLeft = {x:viewPortPos.x - ball_.r , y:viewPortPos.y - ball_.r};
		var topRight = {x:viewPortPos.x + ball_.r , y:viewPortPos.y - ball_.r};
		var bottomLeft = {x:viewPortPos.x - ball_.r , y:viewPortPos.y + ball_.r};
		var bottomRight = {x:viewPortPos.x + ball_.r , y:viewPortPos.y + ball_.r};

		if(battle.isInViewPort(topLeft) || battle.isInViewPort(topRight) || battle.isInViewPort(bottomLeft) || battle.isInViewPort(bottomRight)){
			var screenPos = battle.viewPort2Screen(viewPortPos);

			if(ball_.userID == battle.userID){
				var oldx = Math.floor(ball_.circle.x);
				var oldy = Math.floor(ball_.circle.y);

				var newx = Math.floor(screenPos.x);
				var newy = Math.floor(screenPos.y);

				if(Math.abs(oldx - newx) > 1 || Math.abs(oldy - newy) > 1){
					console.log(util.getMilliseconds(), newx,newy,oldx,oldy);
				}
			}


			ball_.circle.x = screenPos.x;
			ball_.circle.y = screenPos.y;
			ball_.circle.visible = true;
		} else {
			ball_.circle.visible = false;
		}
	})
}


battle.Update = function(elapse) {
	message.processDelayMsg();

	var ownBallCount = 0;
	var selfBalls = new Array();
	var cx = 0;
	var cy = 0;
	this.balls.forEach(function (v){
		var ball_ = v;
		if(ball_.userID && ball_.userID == battle.userID){
    		ownBallCount++;
    		cx += ball_.pos.x;
    		cy += ball_.pos.y;
    		selfBalls[selfBalls.length] = ball_;		
		}
		ball_.update(elapse,{x:0,y:0},{x:battle.battleSize.width,y:battle.battleSize.height});
	})

    if(ownBallCount > 0) {
	    battle.centralPos.x = cx/ownBallCount;
	    battle.centralPos.y = cy/ownBallCount;
	    battle.UpdateViewPort(selfBalls);
	    battle.updateViewPortTopLeft();
    }

    battle.render();
}
