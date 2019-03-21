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
			star_.visible = false;
		}
	}
}

star.onStarRelive = function(event){
	for(var i=0;i<event.stars.length;i++){	
		var star_ = star.stars[event.stars[i]];
		if(star_){
			star_.visible = true;
		}else{
			star.stars[event.stars[i]] = star.newStar(event.stars[i]);
		}
	}
}