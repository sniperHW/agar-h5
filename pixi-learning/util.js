
var util = util || {}


util.path = function(length,point) {
	this.path = new Array()
	for(var i=0;i<length+10;i++){
		this.path[i] = point
	}
	this.head = 0
	this.tail = (this.head + 10) % this.path.length
}

util.path.prototype.add = function(point) {
	this.path[this.tail] = point
	this.tail = (this.tail + 1) % this.path.length
}


util.path.prototype.get = function() {
	var p = this.path[this.head]
	this.head = (this.head + 1) % this.path.length
	return p
}

util.point2D = function(x,y) {
	this.x = x;
	this.y = y;
}

util.point2D.prototype.equal = function(other) {
	return this.x == other.x && this.y == other.y
}


util.point2D.prototype.distance = function(other) {
	var xx = this.x - other.x
	var yy = this.y - other.y
	return Math.sqrt(xx*xx + yy*yy)
}

util.point2D.prototype.moveto = function(dir,dis,topLeft,bottomRight) {
	var target = new util.point2D(this.x,this.y)

	var rad = Math.PI/180 * dir
	target.x += dis * Math.cos(rad)
	target.y += dis * Math.sin(rad)

	if(bottomRight) {
		target.x = Math.max(bottomRight.x,target.x)
		target.y = Math.max(bottomRight.y,target.y)
	}

	if(topLeft) {
		target.x = Math.min(topLeft.x,target.x)
		target.y = Math.min(topLeft.y,target.x)
	}

	return target
}


util.vector2D = function(x,y) {
	this.x = x
	this.y = y
}

util.vector2D.prototype.equal = function(other) {
	return this.x == other.x && this.y == other.y
}

util.vector2D.prototype.add = function(other) {
	return new util.vector2D(this.x + other.x, this.y + other.y)
}

util.vector2D.prototype.sub = function(other) {
	return new util.vector2D(this.x - other.x, this.y - other.y)
}

util.vector2D.prototype.mul = function(n) {
	return new util.vector2D(this.x * n, this.y * n)
}

util.vector2D.prototype.div = function(n) {
	return new util.vector2D(this.x / n, this.y / n)
}

//向量去模
util.vector2D.prototype.mag = function() {
	return Math.sqrt(this.x * this.x + this.y * this.y)
}

//标准化向量
util.vector2D.prototype.normalize = function() {
	return this.div(this.mag())
}

util.vector2D.prototype.getDirAngle = function() {
  return (Math.atan2(this.y,this.x)*180/Math.PI + 360)%360	
}

util.vector2D.prototype.clone = function() {
	return new util.vector2D(this.x, this.y)
}

util.maxinteger = 0xffffffff


util.velocity = function(v0,v1,accelerateTime,duration) {
	this.runTime = 0
	v1 = v1 || v0
	accelerateTime = accelerateTime || 0
	this.duration = duration || util.maxinteger
	this.accRemain = 0
	if(!v0.equal(v1) && accelerateTime > 0){
		this.v = v0.clone()
		this.a = v1.sub(v0).div(accelerateTime/1000)
		this.targetV = v1.clone()
		this.accRemain = accelerateTime
	}else{
		//匀速运动
		this.targetV = v0.clone()
		this.v = v0.clone()
	}

	this.duration = Math.max(this.duration,this.accRemain)
}

util.velocity.prototype.clone = function() {
	return new util.velocity(this.v,this.targetV,this.accRemain,this.duration)
}

util.velocity.prototype.update = function(elapse) {
	if(this.duration == 0){
		return new util.vector2D(0,0)
	}
	this.runTime += elapse
	var deltaAcc = Math.min(elapse,this.accRemain)
	this.accRemain -= deltaAcc
	var delta = Math.min(elapse,this.duration)
	this.duration -= delta

	if(this.accRemain > 0) {
		//变速运动尚未完成
		var lastV = this.v.clone()
		this.v = this.v.add(this.a.mul(deltaAcc/1000))
		return lastV.add(this.v).div(2)
	} else {
		var backV = this.v.clone()
		this.v = this.targetV.clone()
		if(deltaAcc > 0) {
			var v1 = backV.add(this.targetV).div(2).mul(deltaAcc/elapse)
			var v2 = this.targetV.mul((delta-deltaAcc)/elapse)
			return v1.add(v2)
		} else {
			return backV.add(this.targetV).div(2).mul(delta/elapse)
		}
	}
}


util.transformV = function(direction,v) {
	var rad = Math.PI/180*(direction%360)
	return new util.vector2D(Math.cos(rad)*v, Math.sin(rad)*v)
}

