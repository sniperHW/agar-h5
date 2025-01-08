var ball = ball || {}

ball.createBall = function(stage,x,y,radius,color) {
  var circle = new PIXI.Graphics();
  circle.beginFill(color);
  circle.drawCircle(0, 0, radius);
  circle.endFill();
  circle.radius = radius;
  circle.v = new util.vector2D(0,0);
  circle.x = x;
  circle.y = y;
  //circle.pos = {x:x,y:y};
  //circle.visible = false;
  //stage.addChild(circle);
  scene.container.addChild(circle);

  return circle;
}


ball.updatePosition = function(b,averageV,delta,topLeft,bottomRight) {

  /*b.pos.x += averageV.x * delta/1000
  b.pos.y += averageV.y * delta/1000

  if(b.pos.x + b.radius > bottomRight.x){
  	b.pos.x = bottomRight.x - b.radius
  }

  if(b.pos.y + b.radius > bottomRight.y){
  	b.pos.y = bottomRight.y - b.radius
  }

  if(b.pos.x - b.radius < topLeft.x){
  	b.pos.x = topLeft.x + b.radius
  }

  if(b.pos.y - b.radius < topLeft.y){
  	b.pos.y = topLeft.y + b.radius
  }*/

  b.x += averageV.x * delta/1000
  b.y += averageV.y * delta/1000

  if(b.x + b.radius > bottomRight.x){
    b.x = bottomRight.x - b.radius
  }

  if(b.y + b.radius > bottomRight.y){
    b.y = bottomRight.y - b.radius
  }

  if(b.x - b.radius < topLeft.x){
    b.x = topLeft.x + b.radius
  }

  if(b.y - b.radius < topLeft.y){
    b.y = topLeft.y + b.radius
  }


}

ball.update = function(b,delta,topLeft,bottomRight) {
  if(b.isUserBall){
    delta = Math.round(app.ticker.elapsedMS)
    if(b.velocity){
      b.v = b.velocity.update(delta)
      if(b.v.mag() != 0){
        ball.updatePosition(b,b.v,delta,topLeft,bottomRight)        
      }else{
        b.velocity = null
      }
    }
    b.inPutPath.add(new util.point2D(b.x,b.y))
    
    var next = b.next
    while(next){
      var point = next.followPath.get()
      next.x = point.x
      next.y = point.y
      next.inPutPath.add(new util.point2D(next.x,next.y))
      next = next.next
    }
  }
}