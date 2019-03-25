var QuadTree = QuadTree || {}

QuadTree.maxLevel = 15
QuadTree.maxObjs = 5

QuadTree.Rect = function(topLeftX,topLeftY,bottomRightX,bottomRightY) {
	this.topLeft = {x:topLeftX,y:topLeftY};
	this.bottomRight = {x:bottomRightX,y:bottomRightY};
}

QuadTree.in_range = function(topLeft,bottomRight,x,y) {
	if(x >= topLeft.x && y >= topLeft.y && x <= bottomRight.x && y <= bottomRight.y) {
		return true;
	} else {
		return false;
	}
}

QuadTree.Rect.prototype.height = function() {
	return this.bottomRight.y - this.topLeft.y;
}

QuadTree.Rect.prototype.width = function() {
	return this.bottomRight.x - this.topLeft.x;
}

QuadTree.Rect.prototype.intersect = function(other) {
	var oBottomLeft = {x:other.topLeft.x , y:other.bottomRight.y};
	var oTopRight = {x:other.bottomRight.x , y:other.topLeft.y};
	if(QuadTree.in_range(this.topLeft,this.bottomRight,oBottomLeft.x,oBottomLeft.y)){
		return true;
	}

	if(QuadTree.in_range(this.topLeft,this.bottomRight,oTopRight.x,oTopRight.y)){
		return true;
	}

	if(QuadTree.in_range(this.topLeft,this.bottomRight,other.topLeft.x,other.topLeft.y)){
		return true;
	}	

	if(QuadTree.in_range(this.topLeft,this.bottomRight,other.bottomRight.x,other.bottomRight.y)){
		return true;
	}		

	return false;
}

//返回是否包含other
QuadTree.Rect.prototype.include = function(other) {
	var oBottomLeft = {x:other.topLeft.x , y:other.bottomRight.y};
	var oTopRight = {x:other.bottomRight.x , y:other.topLeft.y};
	if(!QuadTree.in_range(this.topLeft,this.bottomRight,oBottomLeft.x,oBottomLeft.y)){
		return false;
	}

	if(!QuadTree.in_range(this.topLeft,this.bottomRight,oTopRight.x,oTopRight.y)){
		return false;
	}

	if(!QuadTree.in_range(this.topLeft,this.bottomRight,other.topLeft.x,other.topLeft.y)){
		return false;
	}	

	if(!QuadTree.in_range(this.topLeft,this.bottomRight,other.bottomRight.x,other.bottomRight.y)){
		return false;
	}		

	return true;
}


QuadTree.QuadTree = function(index,rect,level){
	this.rect = rect;
	this.objs = new Map();
	this.level = level;
	this.idx = index;
	this.obj_count = 0;
	this.nodes = null;
}

/*
1 | 2
-----
3 | 4

--获取rect所在象限
*/

QuadTree.QuadTree.prototype.getSubTree = function(rect) {
	if(this.nodes){
		for(var i in this.nodes){
			var node = this.nodes[i];
			if(node && node.rect.include(rect)){
				return node;
			}
		}
	}
	return null;
}

QuadTree.QuadTree.prototype.split = function() {
	var subWidth = Math.ceil(this.rect.width()/2);
	var subHeight = Math.ceil(this.rect.height()/2);
	var topLeft = this.rect.topLeft;
	var bottomRight = this.rect.bottomRight;
	this.nodes = [];

	this.nodes[1] = new QuadTree.QuadTree(1,new QuadTree.Rect(topLeft.x,topLeft.y,topLeft.x+subWidth,topLeft.y+subHeight),this.level + 1);
	this.nodes[2] = new QuadTree.QuadTree(2,new QuadTree.Rect(topLeft.x+subWidth,topLeft.y,bottomRight.x,topLeft.y+subHeight),this.level + 1);	
	this.nodes[3] = new QuadTree.QuadTree(3,new QuadTree.Rect(topLeft.x,topLeft.y+subHeight,topLeft.x+subWidth,topLeft.y+subHeight),this.level + 1);
	this.nodes[4] = new QuadTree.QuadTree(1,new QuadTree.Rect(topLeft.x+subWidth,topLeft.y+subHeight,bottomRight.x,bottomRight.y),this.level + 1);

}


QuadTree.QuadTree.prototype.insert = function(obj) {
	if(obj.tree){
		return false;
	}

	if(!this.rect.include(obj.rect)){
		return false;
	}

	var subTree = this.getSubTree(obj.rect);
	if(subTree) {
		return subTree.insert(obj);
	} else {
		if(this.obj_count + 1 > QuadTree.maxObjs && this.level < QuadTree.maxLevel && !this.nodes) {
			this.split();
		}
		obj.tree = this;
		this.objs.set(obj,obj);
		this.obj_count++;
		return true;
	}
}

//--获取与rect相交的空间内的所有对象
QuadTree.QuadTree.prototype.retrive = function(rect,objs) {
	//console.log(rect);
	if(!this.rect.intersect(rect)){
		return;
	}

	if(this.nodes){
		for(var i in this.nodes){
			var node = this.nodes[i];
			if(node) {
				node.retrive(rect,objs);
			}
		}
	}
	this.objs.forEach(function (v){
		objs[objs.length] = v;
	})
}

//--对每个与rect相交的空间内的对象执行func
QuadTree.QuadTree.prototype.rectCall = function(rect,fn) {
	if(!this.rect.intersect(rect)){
		return;
	}

	if(this.nodes){
		for(var i in this.nodes){
			var node = this.nodes[i];
			if(node) {
				node.rectCall(rect,fn);
			}
		}


		this.objs.forEach(function (v){
			fn(v);
		})
	}
}

QuadTree.QuadTree.prototype.remove = function(obj) {
	if(obj.tree == this) {
		if(this.objs.has(obj)){
			obj.tree = null;
			this.objs.delete(obj);
			this.obj_count--;
		}
	}
}

QuadTree.QuadTree.prototype.update = function(obj) {
	if(this.level != 1){
		return;
	}
	var tree = obj.tree;	
	if(tree){
		/*--[[
		需要执行更新的条件
		1 当前子树不能完全容纳obj.rect
		2 当前子树有任意一个子节点能完全容纳obj.rect	
		]]*/
		for(; tree;){
			if(!tree.rect.include(obj.rect)){
				break;
			}
			var nodes = tree.nodes;
			if(nodes && (nodes[1].rect.include(obj.rect) || nodes[2].rect.include(obj.rect) || nodes[3].rect.include(obj.rect) || nodes[3].rect.include(obj.rect))){
				break;
			}
			return;
		}

		tree.remove(obj);
		this.index(obj);
	}
}

QuadTree.new = function(rect) {
	return new QuadTree.QuadTree(0,rect,1);
}

