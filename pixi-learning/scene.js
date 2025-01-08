var scene = scene || {}


scene.init = function(visibleSize,sceneSize) {

	//console.log("scene init")

	scene.scaleFactor = 1.0;
	scene.visibleSize = visibleSize;
	scene.sceneSize = sceneSize;

	scene.viewBounderyBottomRight = {
		x : scene.sceneSize.width + scene.visibleSize.width/2,
		y : scene.sceneSize.height + scene.visibleSize.height/2
	}

	scene.viewBounderyTopLeft = {
		x : 0 - scene.visibleSize.width/2,
		y : 0 - scene.visibleSize.height/2
	}

	scene.origin = {x:0,y:0}

	scene.centralPos = {x:scene.sceneSize.width/2,y:scene.sceneSize.height/2}
	scene.oldCentralPos = {x:scene.centralPos.x,y:scene.centralPos.y}
	scene.setViewPort(scene.visibleSize.width,scene.visibleSize.height)
	scene.updateViewPortTopLeft()

	var background = new PIXI.Graphics();  
  	background.beginFill(0x123456);  
  	background.drawRect(0,0,scene.sceneSize.width,scene.sceneSize.height);  
  	background.endFill();  


  	var container = new PIXI.Container();
  	container.x = 0;
  	container.y = 0
  	container.width = scene.sceneSize.width;
  	container.height = scene.sceneSize.height;

  	container.addChild(background);
  	scene.background = background;

  	var bound = new PIXI.Graphics();
	bound.lineStyle(2, 0xFEEB77, 1);
	bound.drawRect(0, 0, scene.sceneSize.width, scene.sceneSize.height);
	bound.endFill();

	container.addChild(bound);
	scene.bound = bound;
	scene.container = container;

	app.stage.addChild(container);

}

scene.onMouseDown = function(onMouseDown){
	scene.background.interactive = true;
	scene.background.on("mousedown",onMouseDown)
}

scene.toScreenPos = function(pos) {
	var vPos = {
		x : pos.x - scene.viewPort.topLeft.x,
		y : pos.y - scene.viewPort.topLeft.y
	}
	return vPos
}

scene.updateViewPortTopLeft = function() {
	var topLeft = {
		x : scene.centralPos.x - scene.viewPort.width/2,
		y : scene.centralPos.y - scene.viewPort.height/2
	}

	if(topLeft.x < scene.viewBounderyTopLeft.x) {
		topLeft.x = scene.viewBounderyTopLeft.x
	}

	if(topLeft.y < scene.viewBounderyTopLeft.y) {
		topLeft.y = scene.viewBounderyTopLeft.y
	}

	if(topLeft.x + scene.viewPort.width > scene.viewBounderyBottomRight.x) {
		topLeft.x = scene.viewBounderyBottomRight.x - scene.viewPort.width
	}

	if(topLeft.y + scene.viewPort.height > scene.viewBounderyBottomRight.y) {
		topLeft.y = scene.viewBounderyBottomRight.y - scene.viewPort.height
	}

	scene.viewPort.topLeft = topLeft	
}


scene.setViewPort = function(width,height) {
	scene.viewPort = scene.viewPort || {}
	scene.viewPort.width = width
	scene.viewPort.height = height
	scene.scaleFactor = scene.visibleSize.width/scene.viewPort.width
}

scene.UpdateViewPort = function(selfBalls) {
	if(selfBalls.length == 0) {
		return
	}

    var _edgeMaxX = 0
    var _edgeMaxY = 0
    var _edgeMinX = 1000000
    var _edgeMinY = 1000000

    for(var i=0;i<selfBalls.length;i++){
    	var ball_ = selfBalls[i]
    	var r = ball_.radius
    	var topLeft = {x:ball_.x - r,y:ball_.y - r}
    	var bottomRight = {x:ball_.x + r,y:ball_.y + r}

    	if(_edgeMaxX < bottomRight.x) {
    		_edgeMaxX = bottomRight.x
    	}

    	if(_edgeMaxY < bottomRight.y) {
    		_edgeMaxY = bottomRight.y
    	}

    	if(_edgeMinX > topLeft.x) {
    		_edgeMinX = topLeft.x
    	}

    	if(_edgeMinY > topLeft.y) {
    		_edgeMinY = topLeft.y
    	}

    }

    var width = _edgeMaxX - _edgeMinX
    var height = _edgeMaxY - _edgeMinY


    var para = 30
    var r = Math.max(width,height)
    r = (r * 0.5) / para

    var a1 = 8 / Math.sqrt(r)
    var a2 = Math.max(a1,1.5)
    var a3 = r * a2
    var a4 = Math.max(a3,10)
    var a5 = Math.min(a4,100)
    var scale = a5 * para

    scale = scale / (scene.visibleSize.height / 2)


    var _visionWidth = Math.max(scene.visibleSize.width * scale,scene.visibleSize.width);
    var _visionHeight = Math.max(scene.visibleSize.height * scale,scene.visibleSize.height);

    scene.setViewPort(_visionWidth,_visionHeight)

}


scene.render = function(balls) {
	var screenPos = scene.toScreenPos({x:0,y:0});
	scene.container.x = screenPos.x;
	scene.container.y = screenPos.y;
}


scene.Update = function(elapse,balls) {
	var ownBallCount = 0
	var selfBalls = new Array()
	var cx = 0
	var cy = 0	
    for(var i=0;i<balls.length;i++){
    	var ball_ = balls[i]
    	if(ball_.isUserBall){
    		ownBallCount++
    		ball.update(ball_,elapse,{x:0,y:0},{x:scene.sceneSize.width,y:scene.sceneSize.height})
    		cx += ball_.x
    		cy += ball_.y
    		selfBalls[selfBalls.length] = ball_
    	}
    }

    if(ownBallCount > 0) {
    	scene.centralPos.x = cx/ownBallCount
    	scene.centralPos.y = cy/ownBallCount
    	scene.UpdateViewPort(selfBalls)
    	scene.updateViewPortTopLeft()
    }

    scene.render(balls)
}
