package main

import (
	"encoding/binary"
	"errors"

	//"github.com/golang/protobuf/proto"
	"log"
	"net"
	"net/http"

	gorilla "github.com/gorilla/websocket"
	"github.com/sniperHW/netgo"

	//"net/url"
	//"sync/atomic"
	//"testing"
	"time"
)

type PacketReceiver struct {
	r    int
	w    int
	buff []byte
}

func (r *PacketReceiver) read(readable netgo.ReadAble, deadline time.Time) (n int, err error) {
	if deadline.IsZero() {
		readable.SetReadDeadline(time.Time{})
		n, err = readable.Read(r.buff[r.w:])
	} else {
		readable.SetReadDeadline(deadline)
		n, err = readable.Read(r.buff[r.w:])
	}
	return
}

func (r *PacketReceiver) Recv(readable netgo.ReadAble, deadline time.Time) (pkt []byte, err error) {
	const lenHead int = 4
	for {
		rr := r.r
		pktLen := 0
		if (r.w-rr) >= lenHead && uint32(r.w-rr-lenHead) >= binary.BigEndian.Uint32(r.buff[rr:]) {
			pktLen = int(binary.BigEndian.Uint32(r.buff[rr:]))
			rr += lenHead
		}

		if pktLen > 0 {
			if pktLen > (len(r.buff) - lenHead) {
				err = errors.New("pkt too large")
				return
			}
			if (r.w - rr) >= pktLen {
				pkt = r.buff[rr : rr+pktLen]
				rr += pktLen
				r.r = rr
				if r.r == r.w {
					r.r = 0
					r.w = 0
				}
				return
			}
		}

		if r.r > 0 {
			//移动到头部
			copy(r.buff, r.buff[r.r:r.w])
			r.w = r.w - r.r
			r.r = 0
		}

		var n int
		n, err = r.read(readable, deadline)
		if n > 0 {
			r.w += n
		}
		//log.Println("n:", n, "err:", err)
		if nil != err {
			return
		}
	}
}

func main() {
	tcpAddr, _ := net.ResolveTCPAddr("tcp", "localhost:8080")

	listener, _ := net.ListenTCP("tcp", tcpAddr)

	upgrader := &gorilla.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}

	http.HandleFunc("/echo", func(w http.ResponseWriter, r *http.Request) {
		cliConn, err := upgrader.Upgrade(w, r, nil)
		if nil != err {
			log.Println(err)
			return
		}

		cliConn.SetPingHandler(func(appData string) error {
			log.Println("WebSocket:on ping")
			cliConn.WriteMessage(gorilla.PongMessage, []byte(appData))
			return nil
		})

		log.Println("on client connect")
		//connect game
		dialer := &net.Dialer{}
		gameConn, err := dialer.Dial("tcp", "localhost:9010")
		if err != nil {
			cliConn.Close()
			log.Println(err)
			return
		}

		gameSocket := netgo.NewTcpSocket(gameConn.(*net.TCPConn), &PacketReceiver{buff: make([]byte, 65535)})
		cliSocket := netgo.NewWebSocket(cliConn)

		go func() {
			for {
				packet, err := cliSocket.Recv()
				if nil != err {
					log.Println("cliSocket recv err:", err)
					break
				}

				//if len(packet) == 0 {
				//	continue
				//}

				log.Println("on client packet", string(packet))
				buff := make([]byte, 4+len(packet))
				binary.BigEndian.PutUint32(buff, uint32(len(packet)))
				copy(buff[4:], packet)
				gameSocket.Send(buff)
			}
			cliSocket.Close()
			gameSocket.Close()
		}()

		go func() {
			for {
				packet, err := gameSocket.Recv()
				if nil != err {
					log.Println("gameSocket recv err:", err)
					break
				}
				log.Println("on game packet", string(packet))
				cliSocket.Send(packet)
			}
			cliSocket.Close()
			gameSocket.Close()
		}()
	})

	log.Println("gateway start on http://localhost:8080/echo")

	http.Serve(listener, nil)
}
