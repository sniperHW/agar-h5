package.path = './chuck/lib/?.lua;./agar/server/?.lua'
package.cpath = './chuck/lib/?.so;'

math.randomseed(os.time())

local chuck = require("chuck")
local socket = chuck.socket
local buffer = chuck.buffer
local packet = chuck.packet
local cjson = require("cjson")
event_loop = chuck.event_loop.New()
local log = chuck.log
logger = log.CreateLogfile("Agar.io")

local user = require("user")


local serverAddr = socket.addr(socket.AF_INET,"localhost",9010)

local server = socket.stream.listen(event_loop,serverAddr,function (fd)
	local conn = socket.stream.socket(fd,4096,packet.Decoder(4096))
	if conn then
		conn:Start(event_loop,function (msg)
			if msg then
				local reader = packet.Reader(msg)
				user.OnClientMsg(conn,cjson.decode(reader:ReadRawBytes()))
			else
				log.SysLog(log.info,"client disconnected") 
				conn:Close()
				user.OnClientDisconnected(conn) 
			end
		end)
	end
end)


if server then
	log.SysLog(log.info,"server start")	
	local timer1 = event_loop:AddTimer(1000,function ()
		collectgarbage("collect")
	end)	
	event_loop:WatchSignal(chuck.signal.SIGINT,function()
		log.SysLog(log.info,"recv SIGINT stop server")
		event_loop:Stop()
	end)	
	event_loop:Run()
end
