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
  	background.drawRect(0,0,battle.battleSize.width,battle.battleSize.height);  
  	background.endFill();  
  	battle.background = background;
  	battle.balls = new Map();

  	battle.container = new PIXI.Container();
  	battle.container.x = 0;
  	battle.container.y = 0;
  	battle.container.width = battleSize.width;
  	battle.container.height = battleSize.height;

  	battle.container.addChild(background);


  	battle.starContainer = new PIXI.Container();
  	battle.container.addChild(battle.starContainer);

  	battle.ballContainer = new PIXI.Container();
  	battle.container.addChild(battle.ballContainer);

  	battle.container.addChild(new PIXI.display.Layer(group));

  	battle.group = group;


  	var bound = new PIXI.Graphics();
	bound.lineStyle(1, 0xFEEB77, 1);
	bound.drawRect(0, 0, battle.battleSize.width, battle.battleSize.height);
	bound.endFill();

	battle.bound = bound;

	battle.container.addChild(bound);

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
		ball_.visible = false;
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

battle.toScreenPos = function(pos) {
	var vPos = {
		x : (pos.x - battle.viewPort.topLeft.x)*battle.scaleFactor,
		y : (pos.y - battle.viewPort.topLeft.y)*battle.scaleFactor
	};
	return vPos;
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

battle.isInViewPort = function(x,y) {
	if(x < battle.viewPort.topLeft.x || y < battle.viewPort.topLeft.y){
		return false;
	}

	if(x > battle.viewPort.topLeft.x + battle.viewPort.width || y > battle.viewPort.topLeft.y + battle.viewPort.height) {
		return false;
	}

	return true;
}

battle.isInScreen = function(x,y) {
	var screenPos = battle.toScreenPos({x:x,y:y});
	if(screenPos.x < 0 || 
	   screenPos.y < 0 ||
	   screenPos.x > battle.visibleSize.width ||
	   screenPos.y > battle.visibleSize.height)	
	{
		return false;
	} else{
		return true;
	}
}

battle.getViewPortRect = function() {
	return new QuadTree.Rect(battle.viewPort.topLeft.x,battle.viewPort.topLeft.y,battle.viewPort.topLeft.x + battle.viewPort.width,battle.viewPort.topLeft.y + battle.viewPort.height);
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
    	var topLeft = {x:ball_.circle.x - r,y:ball_.circle.y - r};
    	var bottomRight = {x:ball_.circle.x + r,y:ball_.circle.y + r};

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

    var _visionWidth = Math.max(battle.visibleSize.width * scale,battle.visibleSize.width);
    var _visionHeight = Math.max(battle.visibleSize.height * scale,battle.visibleSize.height);

    battle.setViewPort(_visionWidth,_visionHeight);

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
    		cx += ball_.circle.x;
    		cy += ball_.circle.y;
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

	var screenPos = battle.toScreenPos({x:0,y:0});
	battle.container.x = screenPos.x;
	battle.container.y = screenPos.y;
	battle.container.scale.set(battle.scaleFactor,battle.scaleFactor);
	//剔除不可见的星星
	star.update();
}
