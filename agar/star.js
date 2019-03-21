var star = star || {}

star.stars = {}

star.newStar = function(starID){
	var starConfig = config.stars[starID-1];
	var color = config.colors[starConfig.color-1];	
	var circle = new PIXI.Graphics();
  	circle.beginFill(PIXI.utils.rgb2hex([color[0],color[1],color[2]]));
  	circle.drawCircle(0, 0, 2);
  	circle.endFill();
  	circle.visible = true;
  	circle.pos = {x:starConfig.x,y:starConfig.y}; 
	//circle.dead = false;	
	battle.starContainer.addChild(circle);
	return circle;
}

star.onStars = function(event) {
	for(var i=0;i<event.stars.length;i++){
		for(var j=0;j<32;j++){
			if((1 << j) > 0){
				var starID = i * 32 + j + 1;
				star.stars[starID] = star.newStar(starID);
			}
		}
	}
}

star.onStarDead = function(event){
	for(var i=0;i<event.stars.length;i++){	
		var star_ = star.stars[event.stars[i]];
		if(star_) {
			//star_.dead = true;
			star_.visible = false;
		}
	}
}

star.onStarRelive = function(event){
	for(var i=0;i<event.stars.length;i++){	
		var star_ = star.stars[event.stars[i]];
		if(star_){
			//star_.dead = false;
			star_.visible = true;
		}else{
			star.stars[event.stars[i]] = star.newStar(event.stars[i]);
		}
	}
}

star.render = function(){
	for(var i in star.stars){
		var star_ = star.stars[i];
		var viewPortPos = battle.world2ViewPort(star_.pos);
		var screenPos = battle.viewPort2Screen(viewPortPos);
  		star_.scale.set(battle.scaleFactor,battle.scaleFactor);
		star_.x = screenPos.x;
		star_.y = screenPos.y;
		/*if(battle.isInViewPort(viewPortPos) && !star_.dead){
			var screenPos = battle.viewPort2Screen(viewPortPos);
  			star_.scale.set(battle.scaleFactor,battle.scaleFactor);
			star_.x = screenPos.x;
			star_.y = screenPos.y;
			star_.visible = true;
		} else {
			star_.visible = false;
		}*/
	}
}