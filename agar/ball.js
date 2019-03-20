var ball = ball || {}

ball.ball = function(userID,ballID,pos,color,r,velocitys,thorn) {
  var circle = new PIXI.Graphics();
  circle.beginFill(PIXI.utils.rgb2hex([color[0],color[1],color[2]]));
  console.log(color,thorn);  
  if(!thorn){
    circle.drawCircle(0, 0, r);
  } else {
    circle.drawStar(0, 0, 64, r,r*0.9,0); 
  }
  circle.endFill();
  circle.visible = false;
  this.id = ballID;
  this.circle = circle;
  this.v = null;
  this.pos = {x:pos.x,y:pos.y};  
  this.userID = userID;
  this.r = r;
  this.originR = r;
  this.targetR = r;
  this.rChange = 0;
  this.predictV = null;
  if(velocitys){
    this.velocitys = [];
    for(i in velocitys){
      var v = velocitys[i];
      var v0 = new util.vector2D(v.v.x , v.v.y);
      var v1 = new util.vector2D(v.targetV.x , v.targetV.y);
      this.velocitys[this.velocitys.length] = new util.velocity(v0,v1,v.accRemain,v.duration);
    }
  }  
}

ball.createBall = function(userID,ballID,pos,color,r,velocitys,thorn) {
  return new ball.ball(userID,ballID,pos,color,r,velocitys,thorn);
}

ball.ball.prototype.updateR = function(){
  if(this.rChange != 0){
    this.r += this.rChange
  }
  //console.log(this.circle.zOrder);
  //this.circle.zOrder = this.r;
  var factor = (this.r/this.originR)*battle.scaleFactor;
  this.circle.scale.set(factor,factor);
}


ball.ball.prototype.updatePosition = function(averageV,delta,topLeft,bottomRight) {
  this.pos.x += averageV.x * delta/1000;
  this.pos.y += averageV.y * delta/1000;

  var R = this.r * Math.sin(Math.PI/4);

  if(this.pos.x + R > bottomRight.x){
    this.pos.x = bottomRight.x - R;
  }

  if(this.pos.y + R > bottomRight.y){
    this.pos.y = bottomRight.y - R;
  }

  if(this.pos.x - R < topLeft.x){
    this.pos.x = topLeft.x + R;
  }

  if(this.pos.y - R < topLeft.y){
    this.pos.y = topLeft.y + R;
  }  
}


ball.ball.prototype.update = function(elapse,topLeft,bottomRight) {
  this.updateR();
  if(this.v){
    if(this.v.duration <= 0) {
      if(!this.predictV){
        return;
      }

      var predictV = new util.vector2D(this.predictV.x,this.predictV.y);
      if(predictV.mag() <= 0){
        this.predictV = null;
        return;
      }
      this.v = new util.velocity(predictV);
    }
    var v = this.v.update(elapse);
    this.updatePosition(v,elapse,topLeft,bottomRight);

  } else if(this.velocitys) {
    //console.log("velocitys");
    var v = new util.vector2D(0,0);
    for(i in this.velocitys){
      var vv = this.velocitys[i];
      if(vv){
        v = v.add(vv.update(elapse));
        if(vv.duration <= 0) {
          this.velocitys[i] = null;
        }
      }
    }
    this.updatePosition(v,elapse,topLeft,bottomRight);
  } 
}


ball.ball.prototype.onBallUpdate = function(msg,ballInfo,timestamp) {

  if(!this.userID){
    console.log("not user onBallUpdate");
  }

  this.velocitys = null
  this.targetR = ballInfo.r;
  if(Math.abs(this.targetR - this.r) > 3) {
    //改变超过3个像素需要渐变
    this.rChange = (this.targetR - this.r)/10;
  } else {
    this.r = this.targetR;
    this.rChange = 0;
  }

  var delay = battle.getServerTick() - timestamp;
  var elapse = msg.elapse - delay;
  if(elapse <= 0) {
    //延迟太严重无法平滑处理，直接拖拽
    this.predictV = ballInfo.v;
    if(this.predictV){
      this.v = new util.velocity(new util.vector2D(this.predictV.x,this.predictV.y));
    }
    this.pos.x = ballInfo.pos.x;
    this.pos.y = ballInfo.pos.y;
    console.log("拖拽",elapse);
  } else {
    this.predictV = ballInfo.v;
    var v = new util.vector2D(ballInfo.pos.x - this.pos.x, ballInfo.pos.y - this.pos.y);
    v = v.div(elapse/1000);
    this.v = new util.velocity(v,null,null,elapse);
  }
}