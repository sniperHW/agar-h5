package main

import (
	"fmt"
	"github.com/sniperHW/kendynet"
	"github.com/sniperHW/kendynet/message"
	connector "github.com/sniperHW/kendynet/socket/connector/tcp"
	listener "github.com/sniperHW/kendynet/socket/listener/websocket"
	//"github.com/sniperHW/kendynet/timer"
	//"net/url"
	//"os"
	//"strconv"
	//"sync/atomic"
	"net"
	"time"
)

const (
	MaxPacketSize uint64 = 65535
	SizeLen       uint64 = 4
)

type Receiver struct {
	buffer []byte
	w      uint64
	r      uint64
}

func NewReceiver() *Receiver {
	receiver := &Receiver{}
	receiver.buffer = make([]byte, MaxPacketSize*2)
	return receiver
}

func (this *Receiver) unPack() (interface{}, error) {
	unpackSize := uint64(this.w - this.r)
	if unpackSize >= SizeLen {
		var payload uint32
		var err error
		var buff []byte
		reader := kendynet.NewReader(kendynet.NewByteBuffer(this.buffer[this.r:], unpackSize))

		if payload, err = reader.GetUint32(); err != nil {
			return nil, err
		}

		fullSize := uint64(payload) + SizeLen

		if fullSize >= MaxPacketSize {
			return nil, fmt.Errorf("packet too large %d", fullSize)
		}

		if uint64(payload) == 0 {
			return nil, fmt.Errorf("zero packet")
		}

		if fullSize <= unpackSize {
			if buff, err = reader.GetBytes(uint64(payload)); err != nil {
				return nil, err
			}
			this.r += fullSize
			return buff, nil
		}
	}
	return nil, nil
}

func (this *Receiver) ReceiveAndUnpack(sess kendynet.StreamSession) (interface{}, error) {
	var msg interface{}
	var err error
	for {
		msg, err = this.unPack()

		if nil != msg {
			return msg, nil
		} else if err == nil {
			if this.w == this.r {
				this.w = 0
				this.r = 0
			} else if uint64(cap(this.buffer))-this.w < MaxPacketSize/4 {
				copy(this.buffer, this.buffer[this.r:this.w])
				this.w = this.w - this.r
				this.r = 0
			}

			conn := sess.GetUnderConn().(*net.TCPConn)
			n, err := conn.Read(this.buffer[this.w:])

			if n > 0 {
				this.w += uint64(n) //增加待解包数据
			}
			if err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}
}

type Encoder struct {
}

func NewEncoder() *Encoder {
	return &Encoder{}
}

func (this *Encoder) EnCode(o interface{}) (kendynet.Message, error) {
	switch o.(type) {
	case []byte:
		msg := o.([]byte)
		totalLen := uint64(len(msg)) + SizeLen
		if uint64(totalLen) > MaxPacketSize {
			return nil, fmt.Errorf("packet too large totalLen:%d", totalLen)
		}
		buff := kendynet.NewByteBuffer(totalLen)
		buff.AppendUint32(uint32(totalLen - SizeLen))
		buff.AppendBytes(msg)
		return buff, nil
		break
	default:
		break
	}
	return nil, fmt.Errorf("invaild object type")
}

func server(service string) {

	server, err := listener.New("tcp4", service, "/echo")
	if server != nil {
		fmt.Printf("server running on:%s\n", service)
		err = server.Serve(func(clientSession kendynet.StreamSession) {
			go func() {
				//向gameserver建立连接
				gameClient, err := connector.New("tcp4", "localhost:9010")
				if err != nil {
					fmt.Printf("NewTcpClient failed:%s\n", err.Error())
					clientSession.Close("dial game failed", 0)
					return
				}

				gameSession, err := gameClient.Dial(time.Second * 10)
				if err != nil {
					fmt.Printf("Dial error:%s\n", err.Error())
				} else {
					gameSession.SetReceiver(NewReceiver())
					gameSession.SetEncoder(NewEncoder())
					gameSession.SetCloseCallBack(func(sess kendynet.StreamSession, reason string) {
						if nil != clientSession {
							clientSession.Close("gameSession close", 0)
							gameSession = nil
						}
					})
					gameSession.Start(func(event *kendynet.Event) {
						if event.EventType == kendynet.EventTypeError {
							event.Session.Close(event.Data.(error).Error(), 0)
						} else {
							//发往clientSession
							if nil != clientSession {
								err := clientSession.SendMessage(message.NewWSMessage(message.WSTextMessage, string(event.Data.([]byte))))
								if nil != err {
									fmt.Println(err)
								}
							}
						}
					})
				}

				clientSession.SetCloseCallBack(func(sess kendynet.StreamSession, reason string) {
					if nil != gameSession {
						gameSession.Close("clientSession close", 0)
						clientSession = nil
					}
				})

				clientSession.Start(func(event *kendynet.Event) {
					if event.EventType == kendynet.EventTypeError {
						event.Session.Close(event.Data.(error).Error(), 0)
					} else {
						//发往gameSession
						if nil != gameSession {
							gameSession.Send(event.Data.(*message.WSMessage).Bytes())
						}
					}
				})
			}()
		})

		if nil != err {
			fmt.Printf("TcpServer start failed %s\n", err)
		}

	} else {
		fmt.Printf("NewTcpServer failed %s\n", err)
	}
}

func main() {

	server("localhost:8080")

	sigStop := make(chan bool)

	_, _ = <-sigStop

	return

}
