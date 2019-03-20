local config = require("config")
local util = require("util")
local ball = require("ball")
local objtype = require("objtype")
local M = {}

local battleUser = {}
battleUser.__index = battleUser
battleUser.__gc = function (self)
	print("battleUser gc",self.userID)
end

function M.new(player,userID)
	print("new battleUser",userID)
	local o = {}
	o = setmetatable(o,battleUser)
	o.color = math.random(1,#config.colors)
	o.balls = {}
	o.ballCount = 0
	if player then
		o.player = player
		player.battleUser = o
	end	
	o.userID = userID
	o.stop = true
	o.viewPort = {}
	o.viewObjs = {}
	return o
end

function battleUser:IsRealUser()
	return self.userID >= 1000
end

function battleUser:Relive()

	if self.userID == 0 then
		return
	end

	local r = math.ceil(config.Score2R(config.initScore))
	local pos = {}
	local mapWidth = self.battle.mapBorder.topRight.x - self.battle.mapBorder.bottomLeft.x
	local mapHeight = self.battle.mapBorder.topRight.y - self.battle.mapBorder.bottomLeft.y	
	pos.x = math.random(r, mapWidth - r)
	pos.y = math.random(r, mapHeight - r)
	local ballID = self.battle:GetBallID()

	local newBall = ball.new(ballID,self,objtype.ball,pos,config.initScore,self.color)
	if newBall then
		self.battle.visionMgr:Enter(newBall)	
	end
end

function battleUser:UpdateGatherTogeter()
	if self.userID == 0 then
		return
	end
	if self.stop then
		if	self.ballCount > 1 then
			local cx = 0
			local cy = 0
			for k,v in pairs(self.balls) do
				cx = cx + v.pos.x
				cy = cy + v.pos.y
			end
			cx = cx / self.ballCount
			cy = cy / self.ballCount
			for k,v in pairs(self.balls) do
				v:GatherTogeter({x = cx , y = cy})	
			end
		else
			for k,v in pairs(self.balls) do
				if v.moveVelocity and v.moveVelocity.v:mag() > 0 then
					v:Stop()
				end	
			end			
		end	
	end
end

function battleUser:Update(elapse)

	if self.userID ~= 0 and self.ballCount == 0 then
		self:Relive()
	end

	if not self.stop then
		self:UpdateBallMovement()
	else
		self:UpdateGatherTogeter()
	end	
	for k,v in pairs(self.balls) do
		v:Update(elapse)
		if self.userID ~= 0 then
			self.battle.colMgr:CheckCollision(v)
		end
	end
	if self.userID >= 1000 then
		--目前只有真实玩家使用视野
		self.battle.visionMgr:UpdateUserVision(self)
	end
	for k,v in pairs(self.balls) do
		self.battle.visionMgr:UpdateVisionObj(v)
	end
end

function battleUser:RefreshBallsUpdateInfo()
	for k,v in pairs(self.balls) do
		if v.type == objtype.ball then
			if v.r ~= v.clientR or not util.point2D.equal(v.pos,v.clientPos) then
				v.ballUpdateInfo = {
					id = v.id,
					r  = v.r,				
					pos = {x = v.pos.x, y = v.pos.y}
				}
				if predictV then
					v.ballUpdateInfo.v = {x = predictV.x,y = predictV.y}
				end
				v.clientR = v.r
				v.clientPos = {x = v.pos.x,y = v.pos.y}	
			else
				v.ballUpdateInfo = nil 
			end
		end
	end
end

--同步小球的进入/离开视野消息,位置更新
function battleUser:NotifyBalls2Client(elapse)

	if self.player then
		local ballUpdate = {}
		local endSee = {}
		for k,v in pairs(self.viewObjs) do
			if v.ref <= 0 then
				self.viewObjs[k] = nil
				table.insert(endSee,k.id)
			elseif v.enterSee then
				v.enterSee = false
			elseif elapse then
				if k.ballUpdateInfo then
					table.insert(ballUpdate,k.ballUpdateInfo)
				end
			end						
		end

		if self.beginsee and #self.beginsee > 0 then
			local msgBegsee = {
				cmd = "BeginSee",
				timestamp = self.battle.tickCount,
				balls = self.beginsee
			}
			self:Send2Client(msgBegsee)
			self.beginsee = {}
		end

		if #ballUpdate > 0 then
			local msgBallUpdate = {
				cmd = "BallUpdate",
				timestamp = self.battle.tickCount,
				elapse = elapse,
				balls = ballUpdate
			}
			self:Send2Client(msgBallUpdate)		
		end

		if #endSee > 0 then
			local msgEndSee = {
				cmd = "EndSee",
				timestamp = self.battle.tickCount,
				balls = endSee
			}
			self:Send2Client(msgEndSee)		
		end
	else
		for k,v in pairs(self.viewObjs) do
			if v.ref <= 0 then
				self.viewObjs[k] = nil
			end					
		end
	end
end

function battleUser:Move(msg)
	self.stop = nil
	if self.ballCount == 1 then
		for k,v in pairs(self.balls) do
			v:Move(msg.dir)
		end
	end
	self.reqDirection = msg.dir	
end

function battleUser:Stop(msg)
	self.reqDirection = nil
	self.stop = true
	for k,v in pairs(self.balls) do
		v:Stop()
	end		
end

function battleUser:Send2Client(msg)
	if self.player then
		self.player:Send2Client(msg)
	end
end

function battleUser:OnBallDead(ball)
	if ball.owner == self then
		self.balls[ball.id] = nil
		self.ballCount = self.ballCount - 1
	end
end

--吐孢子
function battleUser:Spit()
	for k,v in pairs(self.balls) do
		v:Spit()
	end
end

--分裂
function battleUser:Split()
	local balls = {}
	for k,v in pairs(self.balls) do
		table.insert(balls,v)
	end

	table.sort(balls,function (a,b)
		return a.r > b.r
	end)

	for k,v in pairs(balls) do
		v:Split()
	end
	self:UpdateBallMovement()
end

function battleUser:UpdateBallMovement()
	if self.userID == 0 or self.ballCount < 1 or nil == self.reqDirection then
		return
	else
		--先计算小球的几何重心
		local cx = 0
		local cy = 0
		for k,v in pairs(self.balls) do
			cx = cx + v.pos.x
			cy = cy + v.pos.y
		end
		local centralPos = {x = cx/self.ballCount, y = cy / self.ballCount}
		local maxDis = 0
		for k,v in pairs(self.balls) do
			local dis = util.point2D.distance(v.pos,centralPos) + v.r
			if dis > maxDis then
				maxDis = dis
			end
		end
		local forwordDis = maxDis + 300

		local vDir = util.vector2D.new()

		local forwordPoint = util.point2D.moveto(centralPos , self.reqDirection , forwordDis)
		for k,v in pairs(self.balls) do
			local vv = util.vector2D.new(forwordPoint.x - v.pos.x , forwordPoint.y - v.pos.y)
			v:Move(vv:getDirAngle())
		end
	end
end

return M