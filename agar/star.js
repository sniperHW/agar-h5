var star = star || {}

star.stars = {}
star.showOnce = false;

star.newStar = function(starID){

	if(!star.QuadTree) {
		star.views = []
		star.QuadTree = QuadTree.new(new QuadTree.Rect(0, 0, battle.battleSize.width, battle.battleSize.height));
	}

	var starConfig = config.stars[starID-1];
	var color = config.colors[starConfig.color-1];	
	var circle = new PIXI.Graphics();
  	circle.beginFill(PIXI.utils.rgb2hex([color[0],color[1],color[2]]));
  	circle.drawCircle(0, 0, 2);
  	circle.endFill();
  	circle.starID = starID;
  	//circle.visible = true;
  	circle.rect = new QuadTree.Rect(starConfig.x,starConfig.y,starConfig.x,starConfig.y);
  	circle.dead = false;
  	circle.x = starConfig.x;
  	circle.y = starConfig.y;	
	battle.starContainer.addChild(circle);
	star.QuadTree.insert(circle);	
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

star.diff = function(arrayA,arrayAIdx,arrayB,arrayBIdx,enter,leave,unchage) {
	if(arrayA.length <= arrayAIdx) {
		for(var i = arrayBIdx;i < arrayB.length; i++){
			enter(arrayB[i]);
		}
		return;
	}

	if(arrayB.length <= arrayBIdx) {
		for(var i = arrayAIdx; i < arrayA.length; i++){
			leave(arrayA[i]);
		}
		return;
	}

	if(arrayA[arrayAIdx].starID == arrayB[arrayBIdx].starID) {
		unchage(arrayA[arrayAIdx]);
		return star.diff(arrayA,arrayAIdx+1,arrayB,arrayBIdx+1,enter,leave,unchage);
	} else {
		//寻找下一个匹配点
		if(arrayA[arrayAIdx].starID < arrayB[arrayBIdx].starID) {
			leave(arrayA[arrayAIdx]);
			return star.diff(arrayA,arrayAIdx+1,arrayB,arrayBIdx,enter,leave,unchage);
		} else {
			enter(arrayB[arrayBIdx]);
			return star.diff(arrayA,arrayAIdx,arrayB,arrayBIdx+1,enter,leave,unchage);
		}
	}
}

star.update = function() {

	if(!star.QuadTree) {
		star.views = [];
		star.QuadTree = QuadTree.new(new QuadTree.Rect(0, 0, battle.battleSize.width, battle.battleSize.height));
	}

	var newViews = [];
	star.QuadTree.retrive(battle.getViewPortRect(),newViews);
	
	newViews.sort(function(a,b){
		if(a.starID < b.starID){
			return -1;
		}else if(a.starID == b.starID){
			return 0;
		} else {
			return 1;
		}
	})

	star.diff(star.views,0,newViews,0,function(v){
		if(v.dead || !battle.isInViewPort(v.x,v.y)){
			v.visible = false;
		} else{
			v.visible = true;
		}
	},function(v){
		v.visible = false;
	},function(v){
		if(v.dead || !battle.isInViewPort(v.x,v.y)){
			v.visible = false;
		} else{
			v.visible = true;
		}
	})

	star.views = newViews;
	/*
	for(var i in star.stars) {
		var star_ = star.stars[i];
		if(star_.dead){
			star_.visible = false;
		} else{
			if(battle.isInViewPort(star_.x,star_.y)){
				star_.visible = true;
			} else {
				star_.visible = false;
			}
		}
	}*/
}