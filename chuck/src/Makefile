CFLAGS  = -g -Wall -fno-strict-aliasing 
LDFLAGS = -lpthread -lm
DEPDIR  = 
INCLUDE = -I./ -I../deps/lua-5.3.0/src -I../deps -I../ -I../deps/
DEFINE  = -DUSE_BUFFER_POOL
LIBNAME = libchuck.a
MAKE    =
CC      =
LIBRARY = -L../deps/lua-5.3.0/src

# Platform-specific overrides
uname_S := $(shell sh -c 'uname -s 2>/dev/null || echo not')
ifeq ($(uname_S),Linux)
	MAKE += make
	CC += gcc
	DEFINE += -D_LINUX
	LDFLAGS += -lrt -ldl
	SHAREFLAGS += -shared
endif

ifeq ($(uname_S),Darwin)
	MAKE += make
	CC += gcc
	DEFINE += -D_MACH
	SHAREFLAGS += -bundle -undefined dynamic_lookup	
endif

source.lib =  util/chk_log.c\
			  util/chk_timer.c\
			  util/chk_exception.c\
			  util/chk_bytechunk.c\
			  util/lookup8.c\
			  util/chk_signal.c\
			  util/chk_util.c\
			  util/sds.c\
			  util/base64.c\
			  util/sha1.c\
			  util/chk_error.c\
			  lua/chk_lua.c\
			  socket/chk_stream_socket.c\
			  socket/chk_datagram_socket.c\
			  socket/chk_socket_helper.c\
			  socket/chk_acceptor.c\
			  socket/chk_connector.c\
			  socket/chk_decoder.c\
			  socket/chk_buffer_reader.c\
			  event/chk_event_loop.c\
			  redis/chk_client.c\
			  thread/chk_thread.c

source.so =   util/chk_log.c\
			  util/chk_timer.c\
			  util/chk_exception.c\
			  util/chk_bytechunk.c\
			  util/lookup8.c\
			  util/chk_util.c\
			  util/chk_signal.c\
			  util/sds.c\
			  util/base64.c\
			  util/sha1.c\
			  util/chk_error.c\
			  lua/chk_lua.c\
			  socket/chk_stream_socket.c\
			  socket/chk_datagram_socket.c\
			  socket/chk_socket_helper.c\
			  socket/chk_acceptor.c\
			  socket/chk_connector.c\
			  socket/chk_decoder.c\
			  event/chk_event_loop.c\
			  redis/chk_client.c\
			  thread/chk_thread.c

$(LIBNAME):
	$(CC) -fpic $(CFLAGS) -c $(source.lib) $(INCLUDE) $(DEFINE)
	ar -rc $(LIBNAME) *.o
	rm *.o
	mv $(LIBNAME) ../lib/$(LIBNAME)
		

chuck.so:$(source.so) $(HTTP_PARSER) $(OPENSSL) $(CRYPTO)
	$(CC) -fpic $(CFLAGS) -c luabind/chuck.c $(source.so) $(INCLUDE) $(DEFINE) -DCHUCK_LUA
	$(CC) $(CFLAGS) $(SHAREFLAGS) -o chuck.so *.o $(LDFLAGS) $(LIBRARY)
	rm *.o



clean:
	rm *.o
	rm *.a
	rm *.so	