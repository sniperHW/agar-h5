var socket = socket || {}

socket.ws = null

socket.connect = function(url,onopen,onclose,onmessage) {
    if(socket.ws == null) {
        socket.ws = new WebSocket(url);
        socket.ws.onopen = onopen;
        socket.ws.onclose = onclose;

        if(onmessage){
            socket.ws.onmessage = onmessage;
        }else{
            socket.ws.onmessage = function(evt) {
                var msg = JSON.parse(evt.data);
                //console.log(msg)
                message.DispatchMessage(msg); 
            }
        }
    }
}

socket.close = function() {
    if(socket.ws) {
        var ws = socket.ws;
        socket.ws = nil;
        ws.close();
    }
}

socket.send = function(msg) {
    if(socket.ws) {
        return socket.ws.send(JSON.stringify(msg));
    }
}