var joystick = joystick || {}


joystick.distance = function(a,b) {
  var xx = a.x - b.x
  var yy = a.y - b.y
  return Math.sqrt(xx*xx + yy*yy)
}

joystick.angle = function(a,b) {
  var x = b.x - a.x
  var y = b.y - a.y
  return (Math.atan2(y,x)*180/Math.PI + 360)%360
}

joystick.moveto = function(p,dir,dis) {
  var target = {x:p.x , y:p.y}
  var rad = (Math.PI/180)*dir

  target.x += dis * Math.cos(rad)
  target.y += dis * Math.sin(rad)
  return target
}

joystick.createJoystick = function(texturePlate,textureStick,onMouseDown,onMouseUp,onMouseMove) {
  var plate,stick;

  plate = new Sprite(texturePlate);
  plate.y = 520;
  plate.x = plate.x + 50 

  stick = new Sprite(textureStick);
  stick.x = stick.x + 5 + 50
  stick.y = 520 + 7;

  app.stage.addChild(plate);

  app.stage.addChild(stick);


  var oriX = stick.position.x;
  var oriY = stick.position.y;

  var drag = false;  

  createDragAndDropFor(stick)

  function createDragAndDropFor(target){  
    target.interactive = true;

    var onStart = function(e) {
      drag = target;
      if(onMouseDown) {
        onMouseDown()
      }      
    }

    var onEnd = function(e) {
      if(drag){
        drag.position.x = oriX;
        drag.position.y = oriY;
        drag = false;
        if(onMouseUp){
          onMouseUp()
        }
      }      
    }

    var onMove = function(e) {
      if(drag){

        var x = drag.position.x + e.data.originalEvent.movementX
        var y = drag.position.y + e.data.originalEvent.movementY

        var dis = joystick.distance({x:x,y:y},{x:oriX,y:oriY})

        if(dis > 60) {
          dis = 60
        }
        dir = joystick.angle({x:oriX,y:oriY},{x:x,y:y})

        var targetP = joystick.moveto({x:oriX,y:oriY},dir,dis)

        drag.position.x = targetP.x

        drag.position.y = targetP.y

        if(onMouseMove){
          onMouseMove(dir)
        }
      }      
    }

    target.on("mousedown",onStart)
      .on("mouseup",onEnd)
      .on("mouseupoutside",onEnd)
      .on("mousemove", onMove)
      .on("touchstart",onStart)
      .on("touchend",onEnd)
      .on("touchendoutside",onEnd)
      .on("touchcancel",onEnd)
      .on("touchmove", onMove)
  }

}