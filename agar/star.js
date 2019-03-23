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
  	circle.dead = false;
  	circle.x = starConfig.x;
  	circle.y = starConfig.y;	
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
			star_.dead = true;
		}
	}
}

star.onStarRelive = function(event){
	for(var i=0;i<event.stars.length;i++){	
		var star_ = star.stars[event.stars[i]];
		if(star_){
			star_.dead = false;
		}else{
			star.stars[event.stars[i]] = star.newStar(event.stars[i]);
		}
	}
}

star.viewElimination = function() {
	for(var i in star.stars) {
		var star_ = star.stars[i];
		if(star_.dead){
			star_.visible = false;
		} else{
			var screenPos = battle.toScreenPos({x:star_.x,y:star_.y});
			if(screenPos.x < 0 || 
			   screenPos.y < 0 ||
			   screenPos.x > battle.visibleSize.width ||
			   screenPos.y > battle.visibleSize.height)	
			{
				star_.visible = false;
			} else{
				star_.visible = true;
			}
		}
	}
}